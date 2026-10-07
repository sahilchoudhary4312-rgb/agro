import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, errMessage } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Badge, Card, DemoChip, EmptyState, inr, num, TrustBadges } from "@/components/ui";

interface Crop { id: string; name: string; icon: string }
interface Match {
  requirement_id: string;
  buyer_name: string;
  buyer_trust: number | null;
  crop_name: string;
  quantity_min_qtl: number;
  quantity_max_qtl: number;
  quality_grade: string;
  price_per_qtl: number;
  payment_terms: string | null;
  gross_value: number;
  quantity_fit: number;
  grade_fit: number;
  overall: number;
}

const GRADES = ["A", "B", "C"];

function FitBar({ label, value }: { label: string; value: number }) {
  const tone = value >= 75 ? "bg-primary-600" : value >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div>
      <div className="flex justify-between text-[11px] text-ink-mute mb-0.5">
        <span>{label}</span>
        <span className="font-semibold">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100">
        <div className={`h-1.5 rounded-full ${tone}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

export default function FpoAggregation() {
  const { t } = useTranslation();
  const crops = useApi<Crop[]>("/public/crops");

  const [cropId, setCropId] = useState("");
  const [qty, setQty] = useState("");
  const [grade, setGrade] = useState("A");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { document.title = "Aggregation · AgriMitra"; }, []);

  const run = async () => {
    if (!cropId || !qty || Number(qty) <= 0) {
      setError("Pick a crop and enter a collective quantity.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ crop_id: cropId, quantity_qtl: qty, quality_grade: grade });
      const { data } = await api.get<{ matches: Match[] }>(`/fpos/me/match-bulk?${params.toString()}`);
      setMatches(data.matches);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const input = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-primary-600 focus:outline-none";

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.aggregation")} <DemoChip className="ml-1 align-middle" /></h1>
      <p className="text-sm text-ink-mute -mt-2">
        Pool member produce into a bulk quantity and see which verified buyer requirements it can fulfil — ranked by fit and buyer trust.
      </p>

      <Card>
        <div className="grid sm:grid-cols-4 gap-3">
          <label className="block">
            <span className="label">Crop</span>
            <select className={input} value={cropId} onChange={(e) => setCropId(e.target.value)}>
              <option value="">Select crop…</option>
              {(crops.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Collective quantity (qtl)</span>
            <input className={input} type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 500" />
          </label>
          <div>
            <span className="label">Quality grade</span>
            <div className="flex gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                    grade === g ? "border-primary-600 bg-leaf-100 text-primary-800" : "border-gray-200 bg-white text-ink-soft"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={run} disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? t("common.loading") : "Find buyer requirements"}
            </button>
          </div>
        </div>
      </Card>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">{error}</div>}

      {matches && (
        matches.length === 0 ? (
          <Card>
            <EmptyState icon="handshake" title="No matching requirements" hint="No verified buyer has an open requirement for this crop and grade right now." />
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-ink">{matches.length} open requirement{matches.length === 1 ? "" : "s"} found</div>
            {matches.map((m) => (
              <Card key={m.requirement_id}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-ink">{m.buyer_name}</span>
                      <Badge tone="gray">{m.quality_grade} grade</Badge>
                    </div>
                    <div className="text-sm text-ink-soft mt-0.5">
                      Needs {num(m.quantity_min_qtl, 0)}–{num(m.quantity_max_qtl, 0)} qtl {m.crop_name} · {inr(m.price_per_qtl)}/qtl
                      {m.payment_terms ? ` · ${m.payment_terms}` : ""}
                    </div>
                    <div className="text-sm font-bold text-primary-800 mt-1">
                      Gross value {inr(m.gross_value)}
                    </div>
                    <TrustBadges trustScore={m.buyer_trust} className="mt-1.5" />
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-ink-mute uppercase tracking-wide">Overall fit</div>
                    <div className={`text-2xl font-extrabold ${m.overall >= 75 ? "text-primary-700" : m.overall >= 50 ? "text-amber-600" : "text-red-500"}`}>
                      {Math.round(m.overall)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                  <FitBar label="Quantity fit" value={m.quantity_fit} />
                  <FitBar label="Grade fit" value={m.grade_fit} />
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      <p className="text-[11px] text-ink-mute">{t("page.estimatedOnly")}</p>
    </div>
  );
}
