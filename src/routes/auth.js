import express from "express";
import {
  buildGoogleAuthUrl,
  clearUserSessionCookie,
  exchangeGoogleCode,
  googleOAuthConfigured,
  setFlash,
  setUserSessionCookie,
  upsertGoogleUser,
  verifyOAuthState
} from "../auth.js";

export function authRoutes(db) {
  const router = express.Router();

  router.get("/users/sign_in", (req, res) => {
    if (req.user) return res.redirect("/headache_logs");
    res.render("auth/sign_in", {
      title: res.locals.t("auth.title"),
      navbarTitle: null,
      oauthConfigured: googleOAuthConfigured()
    });
  });

  router.post("/auth/google", (req, res) => {
    if (!googleOAuthConfigured()) {
      setFlash(res, "warning", res.locals.t("auth.oauth_missing"));
      return res.redirect("/users/sign_in");
    }
    res.redirect(buildGoogleAuthUrl(req, res));
  });

  router.get("/auth/google/callback", async (req, res) => {
    if (!googleOAuthConfigured()) {
      setFlash(res, "warning", res.locals.t("auth.oauth_missing"));
      return res.redirect("/users/sign_in");
    }

    if (req.query.error || !req.query.code || !verifyOAuthState(req, res)) {
      setFlash(res, "error", res.locals.t("auth.failure"));
      return res.redirect("/users/sign_in");
    }

    try {
      const profile = await exchangeGoogleCode(req, String(req.query.code));
      const user = upsertGoogleUser(db, profile);
      if (!user) {
        setFlash(res, "error", res.locals.t("auth.unauthorized"));
        return res.redirect("/users/sign_in");
      }
      setUserSessionCookie(res, user.id);
      res.redirect("/headache_logs");
    } catch (err) {
      console.error("Google OAuth error:", err);
      setFlash(res, "error", res.locals.t("auth.failure"));
      res.redirect("/users/sign_in");
    }
  });

  const signOutHandler = (req, res) => {
    clearUserSessionCookie(res);
    setFlash(res, "notice", res.locals.t("auth.signed_out"));
    res.redirect("/users/sign_in");
  };

  router.post("/users/sign_out", signOutHandler);
  router.delete("/users/sign_out", signOutHandler);

  return router;
}

