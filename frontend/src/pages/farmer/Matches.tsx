import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, errMessage } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import type { Listing } from "@/types";
import { Badge, Card, DemoChip, EmptyState, ErrorState, Spinner, inr, num } from "@/components/ui";
import { Icon } from "@/components/Icon";

interface FarmerMatch {
  requirement_id: string;
  listing_id: string;
  buyer_id?: string;
  buyer_name: string;
  crop_name: string;
  crop_icon?: string;
  quantity_min_qtl: number;
  quantity_max_qtl: number;
  quality_grade: string;
  district: string | null;
  valid_until?: string | null;
  distance_km: number;
  overall_score: number;
  offer_price_per_qtl?: number;
  payment_terms?: string;
  pickup_preference?: string;
}

export default function Matches() {
  const { t } = useTranslation();
  const listings = useApi<Listing[]>("/farmers/produce");
  const matches = useApi<{ matches: FarmerMatch[] }>("/matching/farmer-buyers");

  useEffect(() => { document.title = "Buyer Matches · AgriMitra"; }, []);

  const available = useMemo(() => (listings.data ?? []).filter((l) => l.status === "available"), [listings.data]);
  const [responding, setResponding] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  const respond = async (requirementId: string) => {
    if (!selectedListing) return;
    setBusy(true);
    setError("");
    try {
      const listing = available.find((l) => l.id === selectedListing);
      if (!listing) {
        setError("Select one of your available listings first.");
        return;
      }
      const match = (matches.data?.matches ?? []).find((m) => m.requirement_id === requirementId);
      const candidates = [listing.price_expectation, match?.offer_price_per_qtl].filter(
        (v): v is number => v != null && v > 0,
      );
      const price = candidates.length ? Math.max(...candidates) : 0;
      if (price <= 0) {
        setError("Set a price expectation on your listing before sending an offer.");
        return;
      }
      const quantity = Math.min(listing.quantity_qtl, match?.quantity_max_qtl ?? listing.quantity_qtl);
      await api.post(
        `/offers/to-requirement?requirement_id=${encodeURIComponent(requirementId)}`,
        { listing_id: selectedListing, price_per_qtl: price, quantity_qtl: quantity },
      );
      setResponding(null);
      setSelectedListing("");
      setFlash(`Offer sent: ${listing.crop_name} ${quantity} qtl at ${inr(price)}/qtl`);
      setTimeout(() => setFlash(""), 2500);
      matches.refetch();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  };  const byScore = matches.data?.matches ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.matches")} <DemoChip className="ml-1 align-middle" /></h1>

      {flash && <div className="rounded-xl bg-leaf-100 text-primary-800 px-4 py-2.5 text-sm font-semibold">{flash}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">{error}</div>}

      {matches.loading ? (
        <Spinner />
      ) : matches.error ? (
        <ErrorState message={matches.error} onRetry={matches.refetch} />
      ) : byScore.length === 0 ? (
        <Card>
          <EmptyState
            icon="handshake"
            title="No buyer matches right now"
            hint="Matches appear when your available produce fits open buyer requirements. Try listing more produce or check back later."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {byScore.map((m) => (
            <Card key={m.requirement_id}>
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-leaf-100 text-primary-700 flex items-center justify-center shrink-0 text-xl">
                  {m.crop_icon ?? "🌱"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-ink">{m.buyer_name}</span>
                    <Badge tone="blue">Score {num(m.overall_score)}</Badge>
                    <Badge tone="gray">Grade {m.quality_grade} wanted</Badge>
                  </div>
                  <div className="text-sm text-ink-soft mt-0.5">
                    wants {m.crop_name} · {num(m.quantity_min_qtl, 0)}–{num(m.quantity_max_qtl, 0)} qtl
                    {m.district && <> · {m.district}</>}
                    {m.offer_price_per_qtl != null && <> · offers {inr(m.offer_price_per_qtl)}/qtl</>}
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-xs text-ink-mute mt-1">
                    <span className="inline-flex items-center gap-1"><Icon name="map" className="w-3.5 h-3.5" />{num(m.distance_km, 0)} km away</span>
                    {m.payment_terms && <span className="inline-flex items-center gap-1"><Icon name="wallet" className="w-3.5 h-3.5" />{m.payment_terms.replace(/_/g, " ")}</span>}
                    {m.pickup_preference === "farm_gate" && <span className="inline-flex items-center gap-1"><Icon name="truck" className="w-3.5 h-3.5" />farm pickup</span>}
                  </div>
                </div>
                <button
                  onClick={() => { setResponding(responding === m.requirement_id ? null : m.requirement_id); setSelectedListing(m.listing_id); }}
                  className="btn-primary !py-2 text-xs shrink-0"
                  disabled={available.length === 0}
                  title={available.length === 0 ? "List produce first" : undefined}
                >
                  {t("page.respondToRequirement")}
                </button>
              </div>

              {responding === m.requirement_id && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <label className="label">{t("page.selectListing")}</label>
                  <div className="flex flex-wrap gap-2">
                    {available.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setSelectedListing(l.id)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${selectedListing === l.id ? "border-primary-600 bg-leaf-100 text-primary-800" : "border-gray-200 text-ink-soft"}`}
                      >
                        {l.crop_icon} {l.crop_name} · {l.quantity_qtl} qtl · G{l.quality_grade}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => respond(m.requirement_id)} disabled={busy || !selectedListing} className="btn-primary mt-3 !py-2 text-xs">
                    {busy ? "…" : t("page.sendOffer")}
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
