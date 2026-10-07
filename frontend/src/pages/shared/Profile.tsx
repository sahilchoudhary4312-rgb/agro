import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, errMessage } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/store/auth";
import { Badge, Card, DemoChip, ErrorState, Spinner } from "@/components/ui";

interface Me {
  id: string; email: string; full_name: string; role: string;
  phone: string | null; preferred_language: string; is_active: boolean;
}

const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
];

export default function Profile({
  extra,
}: {
  extra?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const setLanguage = useAuth((s) => s.setLanguage);
  const me = useApi<Me>("/auth/me");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState("");
  const [lang, setLang] = useState("en");

  useEffect(() => { document.title = "Profile · AgriMitra"; }, []);
  useEffect(() => { if (me.data) setLang(me.data.preferred_language || "en"); }, [me.data]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.put(`/auth/me/language?language=${encodeURIComponent(lang)}`);
      setLanguage(lang as "en" | "hi" | "mr");
      setFlash(t("page.saved"));
      setTimeout(() => setFlash(""), 2500);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (me.loading) return <Spinner />;
  if (me.error) return <ErrorState message={me.error} onRetry={me.refetch} />;
  if (!me.data) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.profile")} <DemoChip className="ml-1 align-middle" /></h1>

      {flash && <div className="rounded-xl bg-leaf-100 text-primary-800 px-4 py-2.5 text-sm font-semibold">{flash}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">{error}</div>}

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-leaf-100 text-primary-700 flex items-center justify-center font-extrabold text-lg">
            {me.data.full_name?.[0] ?? "?"}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-ink truncate">{me.data.full_name}</div>
            <div className="text-xs text-ink-mute truncate">{me.data.email}</div>
          </div>
          <span className="ml-auto chip bg-leaf-100 text-primary-800">{t("roles." + me.data.role)}</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs font-semibold text-ink-mute">{t("auth.fullName")}</div>
            <div className="font-semibold text-ink">{me.data.full_name}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-ink-mute">{t("auth.phone")}</div>
            <div className="font-semibold text-ink">{me.data.phone ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-ink-mute">Account status</div>
            <Badge tone={me.data.is_active ? "green" : "red"}>{me.data.is_active ? "Active" : "Inactive"}</Badge>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 text-xs font-semibold text-ink-soft">{t("page.languagePref")}</div>
          <div className="flex gap-2">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                  lang === l.code ? "border-primary-600 bg-leaf-100 text-primary-800" : "border-gray-200 bg-white text-ink-soft"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving} className="btn-primary mt-5 w-full sm:w-auto disabled:opacity-60">
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </Card>

      {extra}

      <p className="text-[11px] text-ink-mute">
        {t("common.notLive")} · Profiles show only meaningful, non-sensitive trust indicators.
      </p>
    </div>
  );
}
