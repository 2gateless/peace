import express from "express";
import { clearUserSessionCookie, requireAuth, setFlash } from "../auth.js";
import { AVAILABLE_LOCALES } from "../i18n.js";
import { deleteLogPhotoFiles } from "./headache_logs.js";

export function settingsRoutes(db) {
  const router = express.Router();
  router.use(requireAuth);

  router.get("/settings", (req, res) => {
    res.render("settings/show", {
      title: res.locals.t("settings.title"),
      navbarTitle: res.locals.t("settings.title")
    });
  });

  router.post("/settings/preferences", (req, res) => {
    const locale = AVAILABLE_LOCALES.includes(req.body.locale) ? req.body.locale : null;
    const timeFormat = req.body.time_format === "12h" || req.body.time_format === "24h" ? req.body.time_format : null;

    db.prepare("UPDATE users SET locale = ?, time_format = ?, updated_at = datetime('now') WHERE id = ?").run(
      locale,
      timeFormat,
      req.user.id
    );

    if (locale) {
      res.cookie("peace_locale", locale, { httpOnly: false, sameSite: "lax", path: "/" });
    } else {
      res.clearCookie("peace_locale", { path: "/" });
    }

    setFlash(res, "notice", res.locals.t("settings.saved"));
    res.redirect("/settings");
  });

  router.post("/settings/account/delete", (req, res) => {
    deleteLogPhotoFiles(db, req.user.id);
    db.prepare("DELETE FROM users WHERE id = ?").run(req.user.id);
    clearUserSessionCookie(res);
    setFlash(res, "notice", res.locals.t("settings.account_deleted"));
    res.redirect("/users/sign_in");
  });

  return router;
}

