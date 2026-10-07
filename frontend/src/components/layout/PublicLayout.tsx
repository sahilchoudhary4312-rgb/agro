import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";

export function PublicHeader() {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-700 text-white flex items-center justify-center">
            <Icon name="leaf" className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-primary-800">{t("app.name")}</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/markets" className="hidden sm:block font-semibold text-ink-soft hover:text-primary-700">
            {t("nav.market")}
          </Link>
          <Link to="/login" className="btn-primary !py-2 !px-3.5 text-xs">
            {t("common.login")}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicLayout() {
  return (
    <div className="min-h-dvh">
      <PublicHeader />
      <Outlet />
      <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-ink-mute">
        AgriMitra · Demo prototype for SIH 2026 (PS 26132) · All data labelled DEMO DATA — not live government data
      </footer>
    </div>
  );
}
