import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApi } from "@/lib/useApi";
import type { Listing, Recommendations } from "@/types";
import { Badge, Card, DemoChip, EmptyState, ErrorState, SectionTitle, Spinner, inr, num } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { OptionCard } from "@/components/OptionCard";

interface OfferRow { id: string; status: string; price_per_qtl: number; crop_name?: string }
interface TxRow { id: string; code: string; status: string }

export default function FarmerDashboard() {
  const { t } = useTranslation();

  useEffect(() => { document.title = "Dashboard · AgriMitra"; }, []);

  const listings = useApi<Listing[]>("/farmers/produce");
  const offers = useApi<OfferRow[]>("/offers");
  const txs = useApi<TxRow[]>("/transactions");
  const notifs = useApi<{ unread: number }>("/notifications");

  const available = (listings.data ?? []).filter((l) => l.status === "available");
  const hero = available[0];

  const listingQs = hero ? `/matching/recommendations?listing_id=${hero.id}` : null;
  const reco = useApi<Recommendations>(listingQs, [hero?.id]);

  if (listings.loading) return <Spinner />;
  if (listings.error) return <ErrorState message={listings.error} onRetry={listings.refetch} />;

  const sellRec = reco.data?.sell_recommendation ?? null;
  const wait = sellRec?.recommendation === "wait";
  const best = reco.data?.best_option ?? null;

  // the spec's paradox: highest gross is NOT always the best net
  const highestGross = (() => {
    const opts = reco.data?.options ?? [];
    if (opts.length < 2) return null;
    const max = opts.reduce((a, b) => (b.gross_price_per_qtl > a.gross_price_per_qtl ? b : a), opts[0]);
    return best && max !== best && max.gross_price_per_qtl > best.gross_price_per_qtl ? max : null;
  })();

  const openOffers = (offers.data ?? []).filter((o) => o.status === "sent" || o.status === "negotiating").length;
  const activeTx = (txs.data ?? []).filter((x) => !["completed", "payment_completed"].includes(x.status ?? "")).length;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">
          {t("nav.dashboard")} <DemoChip className="ml-2 align-middle" />
        </h1>
      </div>

      {/* WHAT SHOULD I DO TODAY? */}
      {available.length === 0 ? (
        <Card>
          <EmptyState
            icon="sprout"
            title={t("page.noProduce")}
            hint={t("page.noProduceHint")}
          />
          <div className="text-center -mt-4 pb-2">
            <Link to="/app/farmer/produce" className="btn-primary inline-flex items-center gap-2">
              <Icon name="plus" className="w-4 h-4" /> {t("page.addProduce")}
            </Link>
          </div>
        </Card>
      ) : (
        <Card className={`!p-0 overflow-hidden ${wait ? "bg-gradient-to-br from-accent-50 to-white" : "bg-gradient-to-br from-leaf-50 to-white"}`}>
          <div className="px-5 pt-4 pb-5 sm:px-6">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="clipboard" className="w-4 h-4 text-primary-700" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-primary-800">{t("reco.today")}</span>
            </div>

            {reco.loading ? (
              <Spinner className="!py-6" />
            ) : reco.error ? (
              <ErrorState message={reco.error} onRetry={reco.refetch} />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="text-3xl">{hero.crop_icon}</span>
                  <div>
                    <div className="font-extrabold text-ink leading-tight">
                      {hero.crop_name} · {num(hero.quantity_qtl)} qtl · Grade {hero.quality_grade}
                    </div>
                    <div className="text-xs text-ink-mute">
                      {hero.village}, {hero.district}
                      {available.length > 1 && <> · +{available.length - 1} more listing{available.length > 2 ? "s" : ""}</>}
                    </div>
                  </div>
                </div>

                {sellRec && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                    <div className={`shrink-0 rounded-xl px-4 py-2 font-extrabold text-sm tracking-wide text-white ${wait ? "bg-accent-600" : "bg-primary-700"}`}>
                      {wait ? t("reco.wait") : t("reco.sellNow")}
                    </div>
                    <p className="text-sm text-ink-soft leading-snug">{sellRec.message}</p>
                  </div>
                )}

                {reco.data?.forecast?.trend && (
                  <div className="flex flex-wrap items-center gap-2 text-xs mb-4">
                    <Badge tone={reco.data.forecast.trend === "upward" ? "green" : reco.data.forecast.trend === "downward" ? "red" : "gray"}>
                      <Icon name={reco.data.forecast.trend === "downward" ? "trendDown" : "trendUp"} className="w-3 h-3" />
                      7-day outlook: {reco.data.forecast.trend} (ESTIMATED)
                    </Badge>
                    {reco.data.storage_available && <Badge tone="blue"><Icon name="warehouse" className="w-3 h-3" /> Storage available</Badge>}
                  </div>
                )}

                {best && (
                  <div>
                    <SectionTitle title={t("page.bestForYou")} />
                    <OptionCard option={best} isBest rank={best.rank} />
                    {highestGross && (
                      <div className="mt-3 rounded-xl bg-amber-50 border border-accent-200 px-3.5 py-3 text-xs text-amber-900 leading-relaxed">
                        <span className="font-extrabold">{t("reco.higherGross")}: </span>
                        {highestGross.buyer_name} quotes {inr(highestGross.gross_price_per_qtl)}/qtl, but after transport
                        {" "}({inr(highestGross.transport_per_qtl)}) you keep {inr(highestGross.net_realization_per_qtl)}/qtl —
                        {" "}<strong>{inr((best.net_realization_per_qtl - highestGross.net_realization_per_qtl) * (reco.data?.quantity_qtl ?? 0))} more</strong>{" "}
                        with {best.buyer_name}. {t("reco.bestNet")} ≠ highest gross.
                      </div>
                    )}
                    <div className="mt-3">
                      <Link
                        to={`/app/farmer/selling?listing=${hero.id}`}
                        className="btn-primary inline-flex items-center gap-2"
                      >
                        {t("page.compareAll")} <Icon name="arrowRight" className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickStat icon="sprout" label={t("nav.produce")} value={available.length} sub={`${(listings.data ?? []).length} total`} to="/app/farmer/produce" />
        <QuickStat icon="doc" label={t("nav.offers")} value={openOffers} sub="open" to="/app/farmer/offers" />
        <QuickStat icon="receipt" label={t("nav.transactions")} value={activeTx} sub="active" to="/app/farmer/transactions" />
        <QuickStat icon="bell" label={t("nav.notifications")} value={notifs.data?.unread ?? 0} sub={t("page.unreadCount")} to="/app/farmer/notifications" />
      </div>
    </div>
  );
}

function QuickStat({ icon, label, value, sub, to }: { icon: IconName; label: string; value: number; sub: string; to: string }) {
  return (
    <Link to={to} className="card p-4 flex items-center gap-3 hover:shadow-pop transition-shadow">
      <div className="w-10 h-10 rounded-xl bg-leaf-100 text-primary-700 flex items-center justify-center shrink-0">
        <Icon name={icon} className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-extrabold leading-tight text-ink">{value}</div>
        <div className="text-xs text-ink-mute truncate">{label} · {sub}</div>
      </div>
    </Link>
  );
}
