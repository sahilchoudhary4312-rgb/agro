import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApi } from "@/lib/useApi";
import type { Listing, Recommendations, SellingOption } from "@/types";
import { Badge, Card, DemoChip, EmptyState, ErrorState, Spinner, inr } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { OptionCard } from "@/components/OptionCard";

export default function SellingOptions() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const listings = useApi<Listing[]>("/farmers/produce");

  const available = useMemo(
    () => (listings.data ?? []).filter((l) => l.status === "available"),
    [listings.data],
  );

  const urlId = params.get("listing");
  const selectedId = urlId && available.some((l) => l.id === urlId) ? urlId : available[0]?.id;

  const reco = useApi<Recommendations>(selectedId ? `/matching/recommendations?listing_id=${selectedId}` : null, [selectedId]);

  useEffect(() => { document.title = "Selling Options · AgriMitra"; }, []);

  if (listings.loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("page.optionsFor")} <DemoChip className="ml-1 align-middle" /></h1>
        {selectedId && (
          <Link to="/app/farmer/produce" className="btn-ghost !py-2 text-xs">{t("nav.produce")}</Link>
        )}
      </div>

      {available.length === 0 ? (
        <Card>
          <EmptyState icon="sprout" title={t("page.noProduce")} hint={t("page.noProduceHint")} />
          <div className="text-center -mt-4 pb-2">
            <Link to="/app/farmer/produce" className="btn-primary inline-flex items-center gap-2">
              <Icon name="plus" className="w-4 h-4" /> {t("page.addProduce")}
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* Listing switcher */}
          {available.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {available.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setParams(l.id === selectedId ? {} : { listing: l.id })}
                  className={`shrink-0 rounded-xl border px-3.5 py-2 text-sm font-semibold flex items-center gap-2 ${
                    l.id === selectedId ? "border-primary-600 bg-leaf-100 text-primary-800" : "border-gray-200 bg-white text-ink-soft"
                  }`}
                >
                  <span>{l.crop_icon}</span>
                  {l.crop_name} · {l.quantity_qtl} qtl
                </button>
              ))}
            </div>
          )}

          {reco.loading ? (
            <Spinner />
          ) : reco.error ? (
            <ErrorState message={reco.error} onRetry={reco.refetch} />
          ) : !reco.data?.options.length ? (
            <Card><EmptyState icon="store" title="No selling options found" hint="No verified buyers, requirements or mandi prices match this listing right now." /></Card>
          ) : (
            <>
              <NetHeader reco={reco.data} />
              <div className="space-y-3">
                {reco.data.options.map((o: SellingOption) => (
                  <OptionCard
                    key={(o.offer_id ?? o.requirement_id ?? o.buyer_id ?? o.buyer_name ?? "") + String(o.rank)}
                    option={o}
                    rank={o.rank}
                    isBest={reco.data?.best_option != null && o.rank === reco.data.best_option.rank}
                  />
                ))}
              </div>
              {reco.data.best_option && <GrossParadox reco={reco.data} />}
            </>
          )}
        </>
      )}
    </div>
  );
}

function NetHeader({ reco }: { reco: Recommendations }) {
  const { t } = useTranslation();
  const opts = reco.options;
  const bestNet = Math.max(...opts.map((o) => o.net_realization_per_qtl));
  const maxGross = Math.max(...opts.map((o) => o.gross_price_per_qtl));
  return (
    <Card className="bg-gradient-to-r from-leaf-50 to-white">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-mute font-bold">{t("page.optionsFor")}</div>
          <div className="font-extrabold text-ink">{reco.crop} · {reco.quantity_qtl} qtl</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-mute font-bold">Highest gross on market</div>
          <div className="font-bold text-ink-soft tabular-nums">{inr(maxGross)}/qtl</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-mute font-bold">{t("reco.bestNet")}</div>
          <div className="font-extrabold text-primary-800 tabular-nums">{inr(bestNet)}/qtl</div>
        </div>
        <div className="sm:ml-auto">
          <Badge tone="amber">{opts.length} options · ranked by net, trust & distance</Badge>
        </div>
      </div>
    </Card>
  );
}

function GrossParadox({ reco }: { reco: Recommendations }) {
  const { t } = useTranslation();
  const best = reco.best_option;
  if (!best) return null;
  const higher = reco.options.find((o) => o.gross_price_per_qtl > best.gross_price_per_qtl && o.net_realization_per_qtl < best.net_realization_per_qtl);
  if (!higher) return null;
  const diff = (best.net_realization_per_qtl - higher.net_realization_per_qtl) * reco.quantity_qtl;
  return (
    <Card className="bg-amber-50 !border-accent-200">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
          <Icon name="alert" className="w-5 h-5" />
        </div>
        <div className="text-sm leading-relaxed text-amber-900">
          <span className="font-extrabold">{t("reco.higherGross")} ≠ {t("reco.bestNet")}. </span>
          {higher.buyer_name} offers {inr(higher.gross_price_per_qtl)}/qtl gross — more than {best.buyer_name}'s {inr(best.gross_price_per_qtl)}.
          But {higher.distance_km?.toFixed(0)} km of transport ({inr(higher.transport_per_qtl)}/qtl) brings their net down to{" "}
          {inr(higher.net_realization_per_qtl)}/qtl. Choosing {best.buyer_name} leaves you{" "}
          <strong>{inr(diff)}</strong> richer on {reco.quantity_qtl} qtl.
        </div>
      </div>
    </Card>
  );
}
