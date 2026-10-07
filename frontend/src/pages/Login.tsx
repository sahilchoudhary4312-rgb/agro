import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/store/auth";
import { errMessage } from "@/lib/api";
import { Icon } from "@/components/Icon";

const DEMOS = [
  { email: "farmer@demo.com", password: "Farmer@123", role: "farmer", icon: "sprout" },
  { email: "buyer@demo.com", password: "Buyer@123", role: "buyer", icon: "store" },
  { email: "fpo@demo.com", password: "Fpo@123", role: "fpo", icon: "users" },
  { email: "admin@demo.com", password: "Admin@123", role: "admin", icon: "shield" },
] as const;

export default function Login() {
  const { t } = useTranslation();
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("expired") ? t("auth.expired") : null,
  );

  const doLogin = async (e: string, p: string) => {
    setBusy(true);
    setError(null);
    try {
      const out = await login(e, p);
      const dest = location.state?.from && !location.state.from.startsWith("/login") ? location.state.from : `/app/${out.role}`;
      navigate(dest, { replace: true });
    } catch (err) {
      const msg = errMessage(err);
      setError(msg.includes("Invalid") ? t("auth.invalid") : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between bg-primary-800 p-10 text-white">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Icon name="leaf" className="w-6 h-6" />
          </div>
          <span className="text-xl font-extrabold">{t("app.name")}</span>
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold leading-tight max-w-md">{t("landing.heroTitle")}</h1>
          <p className="mt-4 text-primary-100 max-w-md">{t("landing.heroSub")}</p>
        </div>
        <p className="text-xs text-primary-200">Prototype · SIH 2026 · All data DEMO DATA</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-5 py-10 sm:px-12 bg-surface">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden mb-6 flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary-700 text-white flex items-center justify-center">
              <Icon name="leaf" className="w-5 h-5" />
            </div>
            <span className="text-lg font-extrabold text-primary-800">{t("app.name")}</span>
          </div>

          <h2 className="text-2xl font-extrabold text-ink">{t("auth.welcome")}</h2>
          <p className="mt-1 text-sm text-ink-mute">{t("auth.signInTo")}</p>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">
              <Icon name="alert" className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              doLogin(email, password);
            }}
          >
            <div>
              <label className="label" htmlFor="email">{t("auth.email")}</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@demo.com"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">{t("auth.password")}</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? t("auth.signingIn") : t("auth.signIn")}
              {!busy && <Icon name="arrowRight" className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-4 text-sm text-ink-soft">
            {t("auth.noAccount")}{" "}
            <Link to="/register" className="font-bold text-primary-700 hover:underline">
              {t("auth.createAccount")}
            </Link>
          </p>

          <div className="mt-8">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[11px] font-bold uppercase tracking-wide text-ink-mute">
                {t("auth.demoAccounts")}
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMOS.map((d) => (
                <button
                  key={d.role}
                  onClick={() => doLogin(d.email, d.password)}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink hover:border-primary-300 hover:bg-leaf-50 disabled:opacity-50"
                >
                  <Icon name={d.icon} className="w-4 h-4 text-primary-700" />
                  {t(`roles.${d.role}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
