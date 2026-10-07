import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, errMessage } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Card, DemoChip, ErrorState, Spinner } from "@/components/ui";

interface Setting { key: string; value: string; description: string | null }

const WEIGHT_KEYS = ["price", "quality", "quantity", "distance", "payment"] as const;

export default function AdminSettings() {
  const { t } = useTranslation();
  const settings = useApi<Setting[]>("/admin/settings");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => { document.title = "Settings · AgriMitra"; }, []);

  const valueOf = (s: Setting) => edits[s.key] ?? s.value;

  const save = async (s: Setting) => {
    setBusyKey(s.key);
    setError("");
    try {
      await api.put("/admin/settings", null, { params: { key: s.key, value: valueOf(s), description: s.description ?? undefined } });
      setEdits((e) => {
        const next = { ...e };
        delete next[s.key];
        return next;
      });
      setFlash(`Saved ${s.key}`);
      setTimeout(() => setFlash(""), 2500);
      settings.refetch();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusyKey(null);
    }
  };

  const weightsRaw = (settings.data ?? []).find((s) => s.key === "matching_weights");
  let weights: Record<string, number> | null = null;
  if (weightsRaw) {
    try {
      const parsed = JSON.parse(valueOf(weightsRaw));
      if (parsed && typeof parsed === "object" && WEIGHT_KEYS.every((k) => typeof parsed[k] === "number")) {
        weights = parsed;
      }
    } catch {
      weights = null;
    }
  }

  const setWeight = (k: string, v: number) => {
    if (!weightsRaw || !weights) return;
    const next = { ...weights, [k]: v };
    setEdits((e) => ({ ...e, [weightsRaw.key]: JSON.stringify(next) }));
  };

  const input = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none font-mono";

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.settings")} <DemoChip className="ml-1 align-middle" /></h1>

      {flash && <div className="rounded-xl bg-leaf-100 text-primary-800 px-4 py-2.5 text-sm font-semibold">{flash}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">{error}</div>}

      {settings.loading ? (
        <Spinner />
      ) : settings.error ? (
        <ErrorState message={settings.error} onRetry={settings.refetch} />
      ) : (
        <div className="space-y-3">
          {weights && weightsRaw && (
            <Card>
              <div className="font-bold text-ink">Matching weights</div>
              <p className="text-xs text-ink-mute mt-0.5 mb-3">
                Relative importance of each factor when scoring farmer-listing ↔ buyer-requirement matches (0–100 each).
              </p>
              <div className="space-y-3">
                {WEIGHT_KEYS.map((k) => (
                  <div key={k} className="flex items-center gap-3">
                    <span className="w-20 text-sm font-semibold text-ink capitalize">{k}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={weights![k]}
                      onChange={(e) => setWeight(k, Number(e.target.value))}
                      className="flex-1 accent-primary-700"
                    />
                    <span className="w-10 text-right text-sm font-bold text-primary-800">{weights![k]}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => save(weightsRaw)}
                disabled={busyKey === weightsRaw.key || !edits[weightsRaw.key]}
                className="btn-primary mt-4 !py-2 text-xs disabled:opacity-60"
              >
                {busyKey === weightsRaw.key ? t("common.saving") : t("common.save")}
              </button>
            </Card>
          )}

          {(settings.data ?? [])
            .filter((s) => s.key !== "matching_weights")
            .map((s) => (
              <Card key={s.key}>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-ink text-sm">{s.key}</div>
                    {s.description && <div className="text-xs text-ink-mute mt-0.5">{s.description}</div>}
                    <input
                      className={`${input} mt-2`}
                      value={valueOf(s)}
                      onChange={(e) => setEdits((prev) => ({ ...prev, [s.key]: e.target.value }))}
                    />
                  </div>
                  <button
                    onClick={() => save(s)}
                    disabled={busyKey === s.key || !edits[s.key] || edits[s.key] === s.value}
                    className="btn-primary !py-2 text-xs disabled:opacity-60"
                  >
                    {busyKey === s.key ? t("common.saving") : t("common.save")}
                  </button>
                </div>
              </Card>
            ))}
        </div>
      )}

      <p className="text-[11px] text-ink-mute">
        Settings apply platform-wide in this prototype and are stored in the demo database.
      </p>
    </div>
  );
}
