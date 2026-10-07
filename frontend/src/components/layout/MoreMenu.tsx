import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/store/auth";
import { useMoreMenu } from "@/store/moreMenu";
import { NAV } from "./AppShell";
import { Icon } from "@/components/Icon";

export function MoreMenu() {
  const { t } = useTranslation();
  const open = useMoreMenu((s) => s.open);
  const setOpen = useMoreMenu((s) => s.setOpen);
  const { role, fullName, logout } = useAuth();
  const navigate = useNavigate();
  if (!open || !role) return null;

  const items = NAV[role].slice(4);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 pb-8 shadow-pop">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" />
        <div className="mb-3 px-1 text-sm font-bold text-ink">{fullName}</div>
        <div className="grid grid-cols-3 gap-2">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === `/app/${role}`}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-[11px] font-semibold ${
                  isActive ? "border-primary-300 bg-leaf-100 text-primary-800" : "border-gray-100 bg-gray-50 text-ink-soft"
                }`
              }
            >
              <Icon name={it.icon} className="w-5 h-5" />
              <span className="text-center leading-tight">{t(it.key)}</span>
            </NavLink>
          ))}
        </div>
        <button
          onClick={() => {
            setOpen(false);
            logout();
            navigate("/login");
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-3 text-sm font-bold text-red-600"
        >
          <Icon name="logout" className="w-4 h-4" />
          {t("common.logout")}
        </button>
      </div>
    </div>
  );
}
