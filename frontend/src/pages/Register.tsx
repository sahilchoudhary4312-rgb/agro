import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/store/auth";
import { errMessage } from "@/lib/api";
import { Icon } from "@/components/Icon";

const DISTRICTS = [
  "Pune", "Nashik", "Nagpur", "Kolhapur", "Ahilyanagar",
  "Chhatrapati Sambhajinagar", "Solapur", "Satara", "Sangli", "Amravati",
];

const ROLES = [
  { value: "farmer", icon: "sprout" },
  { value: "buyer", icon: "store" },
  { value: "fpo", icon: "users" },
] as const;

export default function Register() {
  const { t } = useTranslation();
  const register = useAuth((s) => s.register);
  const navigate = useNavigate();

  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("farmer");
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", password: "",
    district: "Pune", village: "", pincode: "", land_size_acres: "",
    business_name: "", fpo_name: "",
    preferred_language: "en",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload: Record<string, unknown> = {
      full_name: form.full_name,
      email: form.email,
      phone: form.phone || undefined,
      password: form.password,
      role,
      district: form.district,
      preferred_language: form.preferred_language,
    };
    if (role === "farmer") {
      payload.village = form.village || undefined;
      payload.pincode = form.pincode || undefined;
      payload.land_size_acres = form.land_size_acres ? parseFloat(form.land_size_acres) : undefined;
    } else if (role === "buyer") {
      payload.business_name = form.business_name;
    } else {
      payload.fpo_name = form.fpo_name;
    }
    try {
      const out = await register(payload);
      navigate(`/app/${out.role}`, { replace: true });
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-surface px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Link to="/" className="mb-6 inline-flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary-700 text-white flex items-center justify-center">
            <Icon name="leaf" className="w-5 h-5" />
          </div>
          <span className="text-lg font-extrabold text-primary-800">{t("app.name")}</span>
        </Link>

        <h1 className="text-2xl font-extrabold text-ink">{t("auth.createAccount")}</h1>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">
            <Icon name="alert" className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <span className="label">{t("auth.iAmA")}</span>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-xs font-bold ${
                    role === r.value
                      ? "border-primary-600 bg-leaf-100 text-primary-800"
                      : "border-gray-200 bg-white text-ink-soft"
                  }`}
                >
                  <Icon name={r.icon} className="w-5 h-5" />
                  {t(`roles.${r.value}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="full_name">{t("auth.fullName")}</label>
              <input id="full_name" required className="input" value={form.full_name} onChange={set("full_name")} />
            </div>
            <div>
              <label className="label" htmlFor="phone">{t("auth.phone")} ({t("common.optional")})</label>
              <input id="phone" className="input" value={form.phone} onChange={set("phone")} placeholder="98XXXXXXXX" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="email">{t("auth.email")}</label>
            <input id="email" type="email" required className="input" value={form.email} onChange={set("email")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="password">{t("auth.password")}</label>
              <input id="password" type="password" required minLength={8} className="input" value={form.password} onChange={set("password")} />
            </div>
            <div>
              <label className="label" htmlFor="district">{t("auth.district")}</label>
              <select id="district" className="input" value={form.district} onChange={set("district")}>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {role === "farmer" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label" htmlFor="village">{t("auth.village")}</label>
                <input id="village" className="input" value={form.village} onChange={set("village")} />
              </div>
              <div>
                <label className="label" htmlFor="pincode">Pincode</label>
                <input id="pincode" className="input" value={form.pincode} onChange={set("pincode")} />
              </div>
              <div>
                <label className="label" htmlFor="land">Land (acres)</label>
                <input id="land" type="number" step="0.1" min="0" className="input" value={form.land_size_acres} onChange={set("land_size_acres")} />
              </div>
            </div>
          )}

          {role === "buyer" && (
            <div>
              <label className="label" htmlFor="business">Business name</label>
              <input id="business" required className="input" value={form.business_name} onChange={set("business_name")} />
            </div>
          )}

          {role === "fpo" && (
            <div>
              <label className="label" htmlFor="fpo">FPO name</label>
              <input id="fpo" required className="input" value={form.fpo_name} onChange={set("fpo_name")} />
            </div>
          )}

          <div>
            <label className="label" htmlFor="lang">Language</label>
            <select id="lang" className="input" value={form.preferred_language} onChange={set("preferred_language")}>
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="mr">मराठी</option>
            </select>
          </div>

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "…" : t("auth.createAccount")}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-soft">
          Already registered?{" "}
          <Link to="/login" className="font-bold text-primary-700 hover:underline">
            {t("common.login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
