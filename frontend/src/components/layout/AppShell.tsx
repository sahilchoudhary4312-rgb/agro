import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/store/auth";
import { useMoreMenu } from "@/store/moreMenu";
import { LANGS, setLang, type Lang } from "@/i18n";
import { Icon, type IconName } from "@/components/Icon";
import { MoreMenu } from "./MoreMenu";
import type { Role } from "@/types";

interface NavItem {
  to: string;
  key: string;
  icon: IconName;
}

export const NAV: Record<Role, NavItem[]> = {
  farmer: [
    { to: "/app/farmer", key: "nav.dashboard", icon: "grid" },
    { to: "/app/farmer/market", key: "nav.market", icon: "store" },
    { to: "/app/farmer/produce", key: "nav.produce", icon: "sprout" },
    { to: "/app/farmer/matches", key: "nav.matches", icon: "handshake" },
    { to: "/app/farmer/offers", key: "nav.offers", icon: "doc" },
    { to: "/app/farmer/transactions", key: "nav.transactions", icon: "receipt" },
    { to: "/app/farmer/forecast", key: "nav.forecast", icon: "cloudSun" },
    { to: "/app/farmer/storage", key: "nav.storage", icon: "warehouse" },
    { to: "/app/farmer/map", key: "nav.map", icon: "map" },
    { to: "/app/farmer/assistant", key: "nav.assistant", icon: "chat" },
    { to: "/app/farmer/notifications", key: "nav.notifications", icon: "bell" },
    { to: "/app/farmer/profile", key: "nav.profile", icon: "user" },
  ],
  buyer: [
    { to: "/app/buyer", key: "nav.dashboard", icon: "grid" },
    { to: "/app/buyer/requirements", key: "nav.requirements", icon: "clipboard" },
    { to: "/app/buyer/matches", key: "nav.findFarmers", icon: "sprout" },
    { to: "/app/buyer/offers", key: "nav.offers", icon: "doc" },
    { to: "/app/buyer/transactions", key: "nav.transactions", icon: "receipt" },
    { to: "/app/buyer/map", key: "nav.map", icon: "map" },
    { to: "/app/buyer/notifications", key: "nav.notifications", icon: "bell" },
    { to: "/app/buyer/profile", key: "nav.profile", icon: "user" },
  ],
  fpo: [
    { to: "/app/fpo", key: "nav.dashboard", icon: "grid" },
    { to: "/app/fpo/members", key: "nav.members", icon: "users" },
    { to: "/app/fpo/stock", key: "nav.stock", icon: "warehouse" },
    { to: "/app/fpo/aggregation", key: "nav.aggregation", icon: "scale" },
    { to: "/app/fpo/map", key: "nav.map", icon: "map" },
    { to: "/app/fpo/notifications", key: "nav.notifications", icon: "bell" },
    { to: "/app/fpo/profile", key: "nav.profile", icon: "user" },
  ],
  admin: [
    { to: "/app/admin", key: "nav.dashboard", icon: "grid" },
    { to: "/app/admin/users", key: "nav.users", icon: "users" },
    { to: "/app/admin/listings", key: "nav.listings", icon: "package" },
    { to: "/app/admin/settings", key: "nav.settings", icon: "settings" },
    { to: "/app/admin/notifications", key: "nav.notifications", icon: "bell" },
    { to: "/app/admin/profile", key: "nav.profile", icon: "user" },
  ],
};

const MOBILE_COUNT = 4;

function LanguageMenu() {
  const { i18n } = useTranslation();
  const { me, setLanguage } = useAuth();
  const [open, setOpen] = useState(false);
  const current = (i18n.language as Lang) || "en";

  const pick = (l: Lang) => {
    setLang(l);
    if (me) setLanguage(l);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink-soft hover:bg-leaf-50"
        aria-label="Language"
      >
        <Icon name="globe" className="w-4.5 h-4.5 w-[18px] h-[18px]" />
        <span>{LANGS.find((l) => l.code === current)?.label}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-36 rounded-xl border border-gray-100 bg-white py-1 shadow-pop">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => pick(l.code)}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-leaf-50 ${
                  l.code === current ? "font-bold text-primary-700" : "text-ink"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const { role, fullName, logout } = useAuth();
  const navigate = useNavigate();
  const setMoreOpen = useMoreMenu((s) => s.setOpen);
  const items = NAV[role ?? "farmer"];
  const mobileItems = items.slice(0, MOBILE_COUNT);
  const notifPath = `/app/${role ?? "farmer"}/notifications`;

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="w-9 h-9 rounded-xl bg-primary-700 text-white flex items-center justify-center">
            <Icon name="leaf" className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-primary-800 leading-none">{t("app.name")}</div>
            <div className="text-[10px] text-ink-mute mt-0.5">{t("roles." + (role ?? "farmer"))}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === `/app/${role}`}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  isActive ? "bg-leaf-100 text-primary-800" : "text-ink-soft hover:bg-gray-50"
                }`
              }
            >
              <Icon name={it.icon} className="w-[18px] h-[18px]" />
              {t(it.key)}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-100 p-3">
          <div className="mb-1 px-3 text-xs font-semibold text-ink truncate">{fullName}</div>
          <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-gray-50">
            <Icon name="logout" className="w-[18px] h-[18px]" />
            {t("common.logout")}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-700 text-white flex items-center justify-center">
            <Icon name="leaf" className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-primary-800">{t("app.name")}</span>
        </div>
        <div className="flex items-center gap-1">
          <LanguageMenu />
          <NavLink
            to={notifPath}
            className={({ isActive }) =>
              `relative rounded-lg p-2 ${isActive ? "text-primary-700 bg-leaf-100" : "text-ink-soft"}`
            }
          >
            <Icon name="bell" className="w-5 h-5" />
          </NavLink>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-4 pb-24 sm:px-6 lg:pb-8 lg:pl-64 lg:pr-8 max-w-6xl mx-auto lg:ml-60">
        <div className="hidden lg:flex items-center justify-end gap-3 mb-4">
          <LanguageMenu />
          <button onClick={doLogout} className="btn-ghost !py-2 text-xs">
            <Icon name="logout" className="w-4 h-4" />
            {t("common.logout")}
          </button>
        </div>
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-gray-200 bg-white/95 backdrop-blur lg:hidden pb-[env(safe-area-inset-bottom)]">
        {mobileItems.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === `/app/${role}`}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${
                isActive ? "text-primary-700" : "text-ink-mute"
              }`
            }
          >
            <Icon name={it.icon} className="w-5 h-5" />
            <span className="max-w-full truncate px-1">{t(it.key)}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold text-ink-mute"
        >
          <Icon name="menu" className="w-5 h-5" />
          <span>{t("nav.more")}</span>
        </button>
      </nav>
      <MoreMenu />
    </div>
  );
}
