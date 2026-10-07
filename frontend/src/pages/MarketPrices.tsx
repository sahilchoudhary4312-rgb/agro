import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "@/lib/useApi";
import { Card, DemoChip, EmptyState, ErrorState, Spinner, inr, num } from "@/components/ui";
import { Icon } from "@/components/Icon";

interface PriceRow {
  crop_id: string;
  market_id: string;
  market_name: string;
  district: string;
  price_date: string;
  min_price: number;
  max_price: number;
  modal_price: number;
}
interface Crop {
  id: string;
  name: string;
  icon: string;
}

export default function MarketPrices() {
  const { t } = useTranslation();
  const [cropId, setCropId] = useState("");
  const [district, setDistrict] = useState("");

  const crops = useApi<Crop[]>("/public/crops");
  const districts = useApi<{ district: string }[]>("/markets");

  const qs = new URLSearchParams();
  if (cropId) qs.set("crop_id", cropId);
  if (district) qs.set("district", district);
  const prices = useApi<{ source: string; prices: PriceRow[] }>(`/markets/prices?${qs}`, [cropId, district]);

  useEffect(() => {
    document.title = `Market Prices · AgriMitra`;
  }, []);

  const districtList = Array.from(new Set((districts.data ?? []).map((m) => m.district))).sort();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.market")}</h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-ink-mute">
              <span>{prices.data?.source === "DEMO DATA" ? "Seed demo dataset" : ""}</span>
              <DemoChip />
              <span>{t("common.notLive")}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label" htmlFor="crop">{t("common.all")} crops</label>
            <select id="crop" className="input" value={cropId} onChange={(e) => setCropId(e.target.value)}>
              <option value="">{t("common.all")}</option>
              {(crops.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="district">{t("auth.district")}</label>
            <select id="district" className="input" value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="">{t("common.all")}</option>
              {districtList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {prices.loading ? (
          <Spinner />
        ) : prices.error ? (
          <ErrorState message={prices.error} onRetry={prices.refetch} />
        ) : !prices.data?.prices.length ? (
          <EmptyState icon="store" title="No prices found" hint="Try a different crop or district filter." />
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-leaf-50 text-left text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-4 py-3 font-bold">Market</th>
                    <th className="px-4 py-3 font-bold">{t("auth.district")}</th>
                    <th className="px-4 py-3 font-bold text-right">Min</th>
                    <th className="px-4 py-3 font-bold text-right">Max</th>
                    <th className="px-4 py-3 font-bold text-right">Modal price</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.data.prices.map((p) => (
                    <tr key={`${p.market_id}-${p.price_date}`} className="border-t border-gray-100 hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-semibold text-ink">
                        <span className="inline-flex items-center gap-1.5">
                          <Icon name="landmark" className="w-4 h-4 text-primary-600" />
                          {p.market_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{p.district}</td>
                      <td className="px-4 py-3 text-right text-ink-soft">{inr(p.min_price)}</td>
                      <td className="px-4 py-3 text-right text-ink-soft">{inr(p.max_price)}</td>
                      <td className="px-4 py-3 text-right font-extrabold text-primary-800">{inr(p.modal_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-[11px] text-ink-mute">
              {num(prices.data.prices.length)} rows · price_date {prices.data.prices[0]?.price_date} · source: DEMO DATA (seeded for prototype)
            </div>
          </Card>
        )}
      </div>
  );
}
