import fs from "node:fs";
import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import ejs from "ejs";
import { consumeFlash, getSessionUser } from "./auth.js";
import { heatmapCellClass } from "./domain/cycles.js";
import { formatAmount } from "./domain/medications.js";
import {
  AVAILABLE_LOCALES,
  createTranslator,
  effectiveTimeFormat,
  formatDurationBetween,
  formatWallClock,
  intensityColor,
  resolveLocale,
  TRANSLATIONS
} from "./i18n.js";
import { authRoutes } from "./routes/auth.js";
import { chartRoutes } from "./routes/charts.js";
import { headacheLogRoutes } from "./routes/headache_logs.js";
import { medicationRoutes } from "./routes/medications.js";
import { settingsRoutes } from "./routes/settings.js";

const VIEWS_DIR = path.join(process.cwd(), "src", "views");
const LAYOUT_PATH = path.join(VIEWS_DIR, "layout.ejs");

export function buildApp(db) {
  const app = express();
  app.set("trust proxy", 1);

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static(path.join(process.cwd(), "public")));

  // Override res.render to wrap templates in src/views/layout.ejs
  app.use((req, res, next) => {
    const user = getSessionUser(req, db);
    req.user = user;

    if (typeof req.query.locale === "string" && AVAILABLE_LOCALES.includes(req.query.locale)) {
      res.cookie("peace_locale", req.query.locale, { httpOnly: false, sameSite: "lax", path: "/" });
    }

    const locale = resolveLocale(req, user);
    const timeFormat = effectiveTimeFormat(user, locale);
    const t = createTranslator(locale);
    const tzCookie = Number(req.cookies?.peace_tz_offset);
    const tzOffsetMinutes = Number.isFinite(tzCookie) ? tzCookie : null;

    const ongoingHeadaches = user
      ? db
          .prepare("SELECT * FROM headache_logs WHERE user_id = ? AND end_time IS NULL ORDER BY start_time DESC")
          .all(user.id)
      : [];

    const flash = consumeFlash(req, res);

    Object.assign(res.locals, {
      currentUser: user,
      locale,
      timeFormat,
      tzOffsetMinutes,
      t,
      AVAILABLE_LOCALES,
      clientTranslations: TRANSLATIONS[locale] || TRANSLATIONS.ko,
      currentPath: req.path,
      currentQuery: req.query,
      ongoingHeadaches,
      flash,
      formatTime: (iso, mode = "date_and_time") => formatWallClock(iso, locale, timeFormat, mode),
      formatDuration: (startIso, endIso) => formatDurationBetween(startIso, endIso, locale),
      formatAmount,
      intensityColor,
      heatmapCellClass,
      title: null,
      navbarTitle: null,
      webButtonHtml: null,
      hideOngoingBanner: false
    });

    res.render = (viewName, locals = {}) => {
      const merged = { ...res.locals, ...locals };
      const viewPath = path.join(VIEWS_DIR, `${viewName}.ejs`);
      const bodyTemplate = fs.readFileSync(viewPath, "utf8");
      const bodyHtml = ejs.render(bodyTemplate, merged, { filename: viewPath });
      const layoutTemplate = fs.readFileSync(LAYOUT_PATH, "utf8");
      const fullHtml = ejs.render(layoutTemplate, { ...merged, body: bodyHtml }, { filename: LAYOUT_PATH });
      res.type("html").send(fullHtml);
    };

    next();
  });

  app.get("/up", (_req, res) => res.status(200).send("OK"));

  app.get("/", (req, res) => {
    if (req.user) return res.redirect("/headache_logs");
    return res.redirect("/users/sign_in");
  });

  app.use(authRoutes(db));
  app.use(headacheLogRoutes(db));
  app.use(chartRoutes(db));
  app.use(medicationRoutes(db));
  app.use(settingsRoutes(db));

  return app;
}

