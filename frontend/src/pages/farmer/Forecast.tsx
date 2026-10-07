import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "@/lib/useApi";
import type { ForecastData } from "@/types";
import { Badge, Card, EmptyState, ErrorState, Spinner, inr, num } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { TrendChart } from "@/components/TrendChart";

interface CropOpt { id: string; name: string; icon: string }
type Forecast = ForecastData & { crop_name?: string };

const HORIZONS = ["3", "7", "15", "30"];

export default function ForecastPage() {
  const { t } = useTranslation();
  const crops = useApi<CropOpt[]>("/public/crops");
  const [cropId, setCropId] = useState("");
  const fc = useApi<Forecast>(cropId ? `/forecast/${cropId}` : null, [cropId]);

  useEffect(() => { document.title = "Price Forecast · AgriMitra"; }, []);

  useEffect(() => {
    if (!cropId && crops.data?.length) setCropId(crops.data[0].id);
  }, [crops.data, cropId]);

  const chartData = useMemo(
    () => (fc.data?.chart ?? []).map((c) => ({ label: `+${c.day}d`, value: c.estimated_price })),
    [fc.data],
  );

  const wait = fc.data?.sell_recommendation?.recommendation === "wait";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.forecast")}</h1>
        <select className="input !w-auto" value={cropId} onChange={(e) => setCropId(e.target.value)}>
          {(crops.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl bg-amber-50 border border-accent-200 px-4 py-2.5 text-xs font-semibold text-amber-900 flex items-center gap-2">
        <Icon name="alert" className="w-4 h-4 shrink-0" />
        {t("page.estimatedOnly")}
      </div>

      {fc.loading ? (
        <Spinner />
      ) : fc.error ? (
        <ErrorState message={fc.error} onRetry={fc.refetch} />
      ) : !fc.data?.available ? (
        <Card><EmptyState icon="cloudSun" title="Forecast unavailable" hint="Not enough price history for this crop yet." /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <div className="text-[11px] uppercase tracking-wide text-ink-mute font-bold">{t("page.currentPrice")}</div>
              <div className="text-2xl font-extrabold text-ink tabular-nums">{inr(fc.data.current_price)}</div>
              <div className="text-[11px] text-ink-mute">per qtl (avg of demo mandis)</div>
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wide text-ink-mute font-bold">7-day trend</div>
              <div className={`text-2xl font-extrabold flex items-center gap-1.5 ${
                fc.data.trend === "upward" ? "text-primary-700" : fc.data.trend === "downward" ? "text-red-600" : "text-ink"
              }`}>
                <Icon name={fc.data.trend === "downward" ? "trendDown" : "trendUp"} className="w-6 h-6" />
                {fc.data.trend}
              </div>
              <div className="text-[11px] text-ink-mute">
                {fc.data.horizons["7"] ? `${fc.data.horizons["7"].change_pct! > 0 ? "+" : ""}${num(fc.data.horizons["7"].change_pct, 1)}% vs today` : ""}
              </div>
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wide text-ink-mute font-bold">{t("page.confidence")}</div>
              <div className="text-2xl font-extrabold text-ink">{num(fc.data.confidence ?? 0, 0)}%</div>
              <div className="text-[11px] text-ink-mute">{fc.data.model ?? "baseline_linear"}</div>
            </Card>
            <Card className={wait ? "!border-accent-300" : "!border-primary-300"}>
              <div className="text-[11px] uppercase tracking-wide text-ink-mute font-bold">Suggestion</div>
              <div className={`text-lg font-extrabold ${wait ? "text-accent-700" : "text-primary-800"}`}>
                {wait ? t("reco.wait") : t("reco.sellNow")}
              </div>
            </Card>
          </div>

          {fc.data.sell_recommendation && (
            <Card className="bg-gradient-to-r from-leaf-50 to-white">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${wait ? "bg-accent-100 text-accent-700" : "bg-leaf-100 text-primary-700"}`}>
                  <Icon name="clipboard" className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-ink">{wait ? t("reco.wait") : t("reco.sellNow")}</div>
                  <p className="text-sm text-ink-soft leading-snug">{fc.data.sell_recommendation.message}</p>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-ink">{fc.data.crop_name} — next 15 days</div>
              <Badge tone="amber">ESTIMATED</Badge>
            </div>
            <TrendChart data={chartData} dashed />
            <div className="text-[11px] text-ink-mute mt-1.5">
              Chart shows model-estimated prices on DEMO DATA — never live government prices.
            </div>
          </Card>

          <Card>
            <div className="font-bold text-ink mb-2">Horizons</div>
            <div className="grid grid-cols-4 gap-2">
              {HORIZONS.map((h) => {
                const hz = fc.data?.horizons[h];
                if (!hz) return <div key={h} />;
                const up = (hz.change_pct ?? 0) > 0;
                return (
                  <div key={h} className="rounded-xl bg-gray-50 px-3 py-2.5 text-center">
                    <div className="text-[11px] font-bold text-ink-mute">+{h} days</div>
                    <div className="font-extrabold text-ink tabular-nums">{inr(hz.predicted_price ?? hz.price)}</div>
                    <div className={`text-[11px] font-bold ${up ? "text-primary-700" : (hz.change_pct ?? 0) < 0 ? "text-red-600" : "text-ink-mute"}`}>
                      {(hz.change_pct ?? 0) > 0 ? "+" : ""}{num(hz.change_pct, 1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
