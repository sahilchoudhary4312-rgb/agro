import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import { useAuth } from "../../store/auth";
import type { FarmerProfileData } from "../../types";
import { Card } from "../../components/ui";

const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
];

export default function Profile() {
  const { t } = useTranslation();
  const setLanguage = useAuth((s) => s.setLanguage);
  const [data, setData] = useState<FarmerProfileData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    village: "",
    district: "",
    pincode: "",
    land_size_acres: "",
    irrigation: "rainfed" as "rainfed" | "irrigated",
    preferred_language: "en",
  });

  useEffect(() => {
    api
      .get<FarmerProfileData>("/farmers/profile")
      .then(({ data: p }) => {
        setData(p);
        setForm({
          full_name: p.user.full_name ?? "",
          phone: p.user.phone ?? "",
          village: p.farmer.village ?? "",
          district: p.farmer.district ?? "",
          pincode: p.farmer.pincode ?? "",
          land_size_acres: p.farmer.land_size_acres != null ? String(p.farmer.land_size_acres) : "",
          irrigation: p.farmer.irrigation === "irrigated" ? "irrigated" : "rainfed",
          preferred_language: p.user.preferred_language || "en",
        });
      })
      .catch(() => setLoadError(true));
  }, []);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setFlash("");
    try {
      await api.put("/farmers/profile", {
        full_name: form.full_name,
        phone: form.phone,
        village: form.village,
        district: form.district,
        pincode: form.pincode || null,
        land_size_acres: form.land_size_acres ? Number(form.land_size_acres) : null,
        irrigation: form.irrigation,
        preferred_language: form.preferred_language,
      });
      setLanguage(form.preferred_language as "en" | "hi" | "mr");
      setFlash(t("page.saved"));
    } catch {
      setFlash(t("common.retry"));
    } finally {
      setSaving(false);
    }
  };

  const input =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-primary-600 focus:outline-none";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-ink">{t("nav.profile")}</h1>

      {loadError && <Card>Could not load your profile. Try refreshing.</Card>}

      {data && (
        <>
          {flash && <div className="rounded-xl bg-leaf-100 px-4 py-2.5 text-sm font-semibold text-primary-800">{flash}</div>}

          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-leaf-100 text-primary-700 flex items-center justify-center font-extrabold text-lg">
                {data.user.full_name?.[0] ?? "?"}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-ink truncate">{data.user.full_name}</div>
                <div className="text-xs text-ink-mute truncate">{data.user.email}</div>
              </div>
              <span className="ml-auto chip bg-leaf-100 text-primary-800">{t("roles.farmer")}</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">{t("auth.fullName")}</span>
                <input className={input} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">{t("auth.phone")}</span>
                <input className={input} value={form.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">{t("auth.village")}</span>
                <input className={input} value={form.village} onChange={(e) => set("village", e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">{t("auth.district")}</span>
                <input className={input} value={form.district} onChange={(e) => set("district", e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">Pincode</span>
                <input className={input} value={form.pincode} onChange={(e) => set("pincode", e.target.value)} inputMode="numeric" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">Land size (acres)</span>
                <input
                  className={input}
                  value={form.land_size_acres}
                  onChange={(e) => set("land_size_acres", e.target.value)}
                  inputMode="decimal"
                />
              </label>
              <div>
                <span className="mb-1 block text-xs font-semibold text-ink-soft">Irrigation</span>
                <div className="flex gap-2">
                  {(["rainfed", "irrigated"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set("irrigation", v)}
                      className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize ${
                        form.irrigation === v
                          ? "border-primary-600 bg-leaf-100 text-primary-800"
                          : "border-gray-200 bg-white text-ink-soft"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="mb-1 block text-xs font-semibold text-ink-soft">{t("page.languagePref")}</span>
                <div className="flex gap-2">
                  {LANGS.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => set("preferred_language", l.code)}
                      className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                        form.preferred_language === l.code
                          ? "border-primary-600 bg-leaf-100 text-primary-800"
                          : "border-gray-200 bg-white text-ink-soft"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={save} disabled={saving} className="btn-primary mt-5 w-full sm:w-auto disabled:opacity-60">
              {saving ? t("common.saving") : t("common.save")}
            </button>
          </Card>

          <p className="text-[11px] text-ink-mute">
            {t("page.estimatedOnly")} · Location powers nearby-storage distances and buyer matches.
          </p>
        </>
      )}
    </div>
  );
}
