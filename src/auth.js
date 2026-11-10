import crypto from "node:crypto";

const SESSION_COOKIE = "peace_session";
const OAUTH_STATE_COOKIE = "peace_oauth_state";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getSecret() {
  return process.env.SESSION_SECRET || "peace-local-dev-secret-change-in-production";
}

function sign(payloadB64) {
  return crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
}

export function encodeSignedToken(data) {
  const payloadB64 = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function decodeSignedToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function allowedEmails() {
  return String(process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  const allowList = allowedEmails();
  return allowList.length === 0 || allowList.includes(normalized);
}

export function upsertGoogleUser(db, profile) {
  const email = String(profile?.email || "").trim().toLowerCase();
  if (!isEmailAllowed(email)) return null;

  const provider = "google_oauth2";
  const uid = String(profile.sub || profile.id || "");
  const name = profile.name ? String(profile.name).trim() : email.split("@")[0];
  const avatarUrl = profile.picture ? String(profile.picture) : null;
  const username = email.split("@")[0].replace(/[^a-zA-Z0-9_.-]/g, "_") || "user";

  const existing =
    (uid && db.prepare("SELECT * FROM users WHERE provider = ? AND uid = ?").get(provider, uid)) ||
    db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (existing) {
    db.prepare(
      `UPDATE users SET provider = ?, uid = ?, email = ?, name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(provider, uid || existing.uid, email, name || existing.name, avatarUrl ?? existing.avatar_url, existing.id);
    return db.prepare("SELECT * FROM users WHERE id = ?").get(existing.id);
  }

  const info = db
    .prepare(
      `INSERT INTO users (email, provider, uid, name, username, avatar_url) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(email, provider, uid || null, name, username, avatarUrl);

  return db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
}

function isSecureCookie() {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return String(process.env.GOOGLE_CALLBACK_URL || "").startsWith("https://");
}

export function setUserSessionCookie(res, userId) {
  const token = encodeSignedToken({ userId, exp: Date.now() + THIRTY_DAYS_MS });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    maxAge: THIRTY_DAYS_MS,
    path: "/"
  });
}

export function clearUserSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionUser(req, db) {
  const token = req.cookies?.[SESSION_COOKIE];
  const payload = decodeSignedToken(token);
  if (!payload?.userId) return null;
  return db.prepare("SELECT * FROM users WHERE id = ?").get(payload.userId) || null;
}

export function googleOAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function buildGoogleAuthUrl(req, res) {
  const state = crypto.randomBytes(24).toString("hex");
  const stateToken = encodeSignedToken({ state, exp: Date.now() + 10 * 60 * 1000 });
  res.cookie(OAUTH_STATE_COOKIE, stateToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    maxAge: 10 * 60 * 1000,
    path: "/"
  });

  const redirectUri = resolveCallbackUrl(req);
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function verifyOAuthState(req, res) {
  const token = req.cookies?.[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });
  const parsed = decodeSignedToken(token);
  return Boolean(parsed?.state && req.query?.state && parsed.state === req.query.state);
}

export function resolveCallbackUrl(req) {
  if (process.env.GOOGLE_CALLBACK_URL) return process.env.GOOGLE_CALLBACK_URL;
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  return `${proto}://${req.get("host")}/auth/google/callback`;
}

export async function exchangeGoogleCode(req, code) {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: resolveCallbackUrl(req),
      grant_type: "authorization_code"
    })
  });
  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${tokenRes.status}`);
  }
  const tokenJson = await tokenRes.json();
  const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` }
  });
  if (!userRes.ok) {
    throw new Error(`Userinfo fetch failed: ${userRes.status}`);
  }
  return userRes.json();
}

export function setFlash(res, type, message) {
  const token = encodeSignedToken({ type, message, exp: Date.now() + 2 * 60 * 1000 });
  res.cookie("peace_flash", token, { httpOnly: true, sameSite: "lax", path: "/" });
}

export function consumeFlash(req, res) {
  const token = req.cookies?.peace_flash;
  if (!token) return null;
  res.clearCookie("peace_flash", { path: "/" });
  return decodeSignedToken(token);
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.redirect("/users/sign_in");
  }
  next();
}

