import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { buildApp } from "../src/app.js";
import { encodeSignedToken, upsertGoogleUser } from "../src/auth.js";
import { createDatabase } from "../src/db.js";
import { computeCycles } from "../src/domain/cycles.js";
import { importLogsFromCsv } from "../src/domain/headache_logs.js";

describe("Peace Node.js app", () => {
  let db;
  let server;
  let baseUrl;
  let user;
  let authCookie;

  before(async () => {
    db = createDatabase(":memory:");
    const app = buildApp(db);
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    user = upsertGoogleUser(db, {
      sub: "google-123",
      email: "owner@gmail.com",
      name: "Owner"
    });
    const token = encodeSignedToken({ userId: user.id, exp: Date.now() + 3600_000 });
    authCookie = `peace_session=${token}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  });

  it("enforces ALLOWED_EMAILS in upsertGoogleUser", () => {
    const prev = process.env.ALLOWED_EMAILS;
    process.env.ALLOWED_EMAILS = "owner@gmail.com, other@gmail.com";
    try {
      assert.equal(
        upsertGoogleUser(db, { sub: "x", email: "stranger@gmail.com", name: "Stranger" }),
        null
      );
      const allowed = upsertGoogleUser(db, { sub: "y", email: "Other@gmail.com", name: "Other" });
      assert.equal(allowed.email, "other@gmail.com");
    } finally {
      if (prev === undefined) delete process.env.ALLOWED_EMAILS;
      else process.env.ALLOWED_EMAILS = prev;
    }
  });

  it("computes streaks, cycles, and ICHD remissions accurately", () => {
    const cycles = computeCycles(
      [
        { start_time: "2026-06-01T02:00", end_time: "2026-06-01T02:45", intensity: 8 },
        { start_time: "2026-06-03T02:00", end_time: "2026-06-03T02:40", intensity: 7 },
        { start_time: "2026-09-28T02:00", end_time: "2026-09-28T03:00", intensity: 9 }
      ],
      "2026-10-02"
    );

    assert.equal(cycles.current_streak, 4);
    assert.equal(cycles.longest_streak, 116);
    assert.equal(cycles.total_attack_days, 3);
    assert.equal(cycles.cycles.length, 2);
    assert.equal(cycles.remissions[0].ichd_remission, true);
  });

  it("redirects unauthenticated visitors to Google sign-in", async () => {
    const res = await fetch(`${baseUrl}/`, { redirect: "manual" });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "/users/sign_in");

    const loginRes = await fetch(`${baseUrl}/users/sign_in`);
    assert.equal(loginRes.status, 200);
    const html = await loginRes.text();
    assert.match(html, /\/auth\/google/);
  });

  it("supports creating, viewing, updating, charting, exporting PDF/CSV, and deleting logs", async () => {
    // Create medication
    const medRes = await fetch(`${baseUrl}/medications`, {
      method: "POST",
      headers: { cookie: authCookie, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ name: "Oxygen", kind: "oxygen", default_dose: "15", unit: "L/min", frequency: "as_needed" }),
      redirect: "manual"
    });
    assert.equal(medRes.status, 302);

    // Create headache log
    const createRes = await fetch(`${baseUrl}/headache_logs`, {
      method: "POST",
      headers: { cookie: authCookie, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        start_time: "2026-11-01T03:15",
        end_time: "2026-11-01T04:00",
        intensity: "8",
        triggers: "Sleep, Alcohol",
        barometric_pressure: "1009.4",
        notes: "Right eye pain",
        dose_medication_name: "Oxygen",
        dose_amount: "15",
        dose_unit: "L/min",
        dose_duration_minutes: "15"
      }),
      redirect: "manual"
    });
    assert.equal(createRes.status, 302);

    // Index & Charts & Timeline & Print & Settings
    for (const route of ["/headache_logs", "/charts", "/medications", "/timeline", "/headache_log_print", "/settings"]) {
      const pageRes = await fetch(`${baseUrl}${route}`, { headers: { cookie: authCookie } });
      assert.equal(pageRes.status, 200, `Expected 200 for ${route}`);
    }

    // CSV export + import duplicate skip
    const csvRes = await fetch(`${baseUrl}/headache_log_export.csv`, { headers: { cookie: authCookie } });
    assert.equal(csvRes.status, 200);
    const csvText = await csvRes.text();
    assert.match(csvText, /start_time,end_time,intensity/);
    assert.match(csvText, /1009\.4/);

    const impResult = importLogsFromCsv(db, user.id, csvText);
    assert.equal(impResult.imported, 0);
    assert.equal(impResult.skipped, 1);

    // PDF generation
    const pdfRes = await fetch(`${baseUrl}/headache_log_print.pdf`, { headers: { cookie: authCookie } });
    assert.equal(pdfRes.status, 200);
    assert.equal(pdfRes.headers.get("content-type"), "application/pdf");
    const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
    assert.equal(pdfBuf.subarray(0, 5).toString("ascii"), "%PDF-");

    // Current attack start & end
    const startRes = await fetch(`${baseUrl}/current_attack`, {
      method: "POST",
      headers: { cookie: authCookie, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ intensity: "9" }),
      redirect: "manual"
    });
    assert.equal(startRes.status, 302);

    const endRes = await fetch(`${baseUrl}/current_attack/end`, {
      method: "POST",
      headers: { cookie: authCookie, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ return_to: "/headache_logs" }),
      redirect: "manual"
    });
    assert.equal(endRes.status, 302);
    const ongoingCount = db.prepare("SELECT COUNT(*) as c FROM headache_logs WHERE user_id = ? AND end_time IS NULL").get(user.id).c;
    assert.equal(ongoingCount, 0);

    // Exercise remaining view routes
    const logRow = db.prepare("SELECT id FROM headache_logs WHERE user_id = ? LIMIT 1").get(user.id);
    const medRow = db.prepare("SELECT id FROM medications WHERE user_id = ? LIMIT 1").get(user.id);
    const doseRow = db.prepare("SELECT id FROM medication_doses WHERE user_id = ? LIMIT 1").get(user.id);

    for (const route of [
      "/headache_logs/new",
      "/headache_logs/new?quick=1",
      `/headache_logs/${logRow.id}`,
      `/headache_logs/${logRow.id}/edit`,
      "/current_attack",
      "/medications/new",
      `/medications/${medRow.id}`,
      `/medications/${medRow.id}/edit`,
      "/medication_doses/new",
      `/medication_doses/${doseRow.id}/edit`,
      "/medication_dose_export.csv"
    ]) {
      const r = await fetch(`${baseUrl}${route}`, { headers: { cookie: authCookie } });
      assert.equal(r.status, 200, `Expected 200 for ${route}`);
    }

    // Update preferences & delete account
    const prefRes = await fetch(`${baseUrl}/settings/preferences`, {
      method: "POST",
      headers: { cookie: authCookie, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ locale: "ko", time_format: "24h" }),
      redirect: "manual"
    });
    assert.equal(prefRes.status, 302);

    const delRes = await fetch(`${baseUrl}/settings/account/delete`, {
      method: "POST",
      headers: { cookie: authCookie },
      redirect: "manual"
    });
    assert.equal(delRes.status, 302);
    assert.equal(db.prepare("SELECT COUNT(*) as c FROM users WHERE id = ?").get(user.id).c, 0);
  });
});
