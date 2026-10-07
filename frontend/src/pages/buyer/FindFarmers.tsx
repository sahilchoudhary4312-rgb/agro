import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, errMessage } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Badge, Card, DemoChip, EmptyState, ErrorState, Spinner, inr, num } from "@/components/ui";
import { Icon } from "@/components/Icon";

interface Crop { id: string; name: string; icon: string | null }
interface MyReq {
  id: string; crop_id: string; crop_name: string | null; crop_icon: string | null;
  quantity_min_qtl: number; quantity_max_qtl: number; quality_grade: string;
  price_per_qtl: number; status: string;
}
interface Match {
  listing_id: string; crop_name: string | null;
  quantity_qtl: number; quality_grade: string; moisture_pct: number | null;
  village: string | null; district: string | null;
  farmer_name: string | null; listed_price_expectation: number | null;
  price_match: number; quality_match: number; quantity_match: number;
  distance_match: number; payment_trust: number; overall_score: number; distance_km: number | null;
}
interface BrowseListing {
  id: string; crop_name: string | null; crop_icon: string | null; title: string | null;
  quantity_qtl: number; quality_grade: string; moisture_pct: number | null;
  price_expectation: number | null; village: string | null; district: string | null;
  farmer_name: string | null; distance_km: number | null;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-14 text-ink-mute capitalize">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="w-8 text-right font-semibold text-ink-soft">{Math.round(value)}</span>
    </div>
  );
}

export default function FindFarmers() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"matches" | "browse">("matches");

  const reqs = useApi<MyReq[]>("/buyers/requirements/mine");
  const crops = useApi<Crop[]>("/public/crops");
  const openReqs = useMemo(() => (reqs.data ?? []).filter((r) => r.status === "open"), [reqs.data]);

  const [reqId, setReqId] = useState("");
  const selected = openReqs.find((r) => r.id === reqId) ?? openReqs[0];
  const matches = useApi<{ matches: Match[] }>(
    selected ? `/buyers/requirements/${selected.id}/matching-farmers` : null,
    [selected?.id],
  );

  const [cropFilter, setCropFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const browseQuery = `/buyers/browse-listings?${new URLSearchParams({
    ...(cropFilter ? { crop_id: cropFilter } : {}),
    ...(districtFilter ? { district: districtFilter } : {}),
  }).toString()}`;
  const browse = useApi<BrowseListing[]>(browseQuery);

  const [offerFor, setOfferFor] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => { document.title = "Find Farmers · AgriMitra"; }, []);

  const sendOffer = async (listingId: string) => {
    setBusy(true);
    setError("");
    try {
      await api.post("/offers", {
        listing_id: listingId,
        price_per_qtl: Number(price),
        quantity_qtl: Number(qty),
        message: message || undefined,
      });
      setOfferFor(null);
      setPrice(""); setQty(""); setMessage("");
      setFlash(`Offer sent: ${inr(Number(price))}/qtl for ${num(Number(qty))} qtl`);
      setTimeout(() => setFlash(""), 3000);
      matches.refetch();
      browse.refetch();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const openOffer = (listingId: string, basePrice: number | null, baseQty: number) => {
    setOfferFor(listingId);
    setPrice(basePrice != null && basePrice > 0 ? String(Math.round(basePrice)) : "");
    setQty(String(baseQty));
    setMessage("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.findFarmers")} <DemoChip className="ml-1 align-middle" /></h1>
        <div className="flex rounded-xl bg-gray-100 p-1">
          {(["matches", "browse"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setTab(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${tab === m ? "bg-white text-primary-800 shadow-sm" : "text-ink-mute"}`}
            >
              {m === "matches" ? "For my requirements" : "Browse all"}
            </button>
          ))}
        </div>
      </div>

      {flash && <div className="rounded-xl bg-leaf-100 text-primary-800 px-4 py-2.5 text-sm font-semibold">{flash}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">{error}</div>}

      {tab === "matches" && (
        <>
          {openReqs.length === 0 ? (
            <Card>
              <EmptyState icon="clipboard" title="No open requirements" hint="Post a requirement first — then AgriMitra will rank compatible farmer listings for it." />
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {openReqs.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setReqId(r.id)}
                    className={`chip ${selected?.id === r.id ? "bg-leaf-100 text-primary-800 font-bold" : "bg-gray-100 text-gray-600"}`}
                  >
                    {r.crop_icon ?? "🌱"} {r.crop_name} · {num(r.quantity_min_qtl)}–{num(r.quantity_max_qtl)} qtl
                  </button>
                ))}
              </div>

              {selected && (
                <div className="text-xs text-ink-mute">
                  Matches for <strong className="text-ink-soft">{selected.crop_name}</strong> · offering {inr(selected.price_per_qtl)}/qtl · grade {selected.quality_grade} · ranked by overall score
                </div>
              )}

              {matches.loading ? (
                <Spinner />
              ) : matches.error ? (
                <ErrorState message={matches.error} onRetry={matches.refetch} />
              ) : (matches.data?.matches ?? []).length === 0 ? (
                <Card><EmptyState icon="sprout" title="No compatible listings yet" hint="Try Browse all to send a direct offer on any available listing." /></Card>
              ) : (
                <div className="space-y-3">
                  {matches.data!.matches.map((m) => (
                    <Card key={m.listing_id}>
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-leaf-100 text-primary-700 flex items-center justify-center shrink-0 text-xl">🌱</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-ink">{m.farmer_name ?? "Farmer"}</span>
                            <Badge tone="blue">score {m.overall_score}</Badge>
                            <Badge tone="gray">G{m.quality_grade}</Badge>
                            {m.moisture_pct != null && <Badge tone="gray">{num(m.moisture_pct)}% moisture</Badge>}
                          </div>
                          <div className="text-sm text-ink-soft mt-0.5">
                            {m.crop_name} · {num(m.quantity_qtl)} qtl
                            {m.listed_price_expectation != null && <> · expects {inr(m.listed_price_expectation)}/qtl</>}
                          </div>
                          <div className="text-xs text-ink-mute mt-0.5">
                            {m.village ?? "—"}, {m.district ?? "—"}
                            {m.distance_km != null && <> · {num(m.distance_km, 0)} km away</>}
                          </div>
                        </div>
                        <button onClick={() => openOffer(m.listing_id, m.listed_price_expectation, Math.min(m.quantity_qtl, selected!.quantity_max_qtl))} className="btn-primary !py-2 text-xs shrink-0">
                          Send offer
                        </button>
                      </div>
                      <div className="mt-3 border-t border-gray-100 pt-2.5 space-y-1">
                        <ScoreBar label="Price" value={m.price_match} />
                        <ScoreBar label="Quality" value={m.quality_match} />
                        <ScoreBar label="Quantity" value={m.quantity_match} />
                        <ScoreBar label="Distance" value={m.distance_match} />
                        <ScoreBar label="Trust" value={m.payment_trust} />
                      </div>
                      {offerFor === m.listing_id && (
                        <div className="mt-3 border border-gray-200 rounded-xl p-3 space-y-2">
                          <div className="grid sm:grid-cols-2 gap-2">
                            <label className="block">
                              <span className="label">Your price (₹/qtl)</span>
                              <input className="input" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} />
                            </label>
                            <label className="block">
                              <span className="label">Quantity (qtl)</span>
                              <input className="input" type="number" min="1" max={m.quantity_qtl} value={qty} onChange={(e) => setQty(e.target.value)} />
                            </label>
                          </div>
                          <label className="block">
                            <span className="label">{t("page.message")}</span>
                            <input className="input" value={message} onChange={(e) => setMessage(e.target.value)} />
                          </label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => sendOffer(m.listing_id)}
                              disabled={busy || !(Number(price) > 0) || !(Number(qty) > 0)}
                              className="btn-primary !py-2 text-xs disabled:opacity-50"
                            >
                              {busy ? "…" : t("page.sendOffer")}
                            </button>
                            <button onClick={() => setOfferFor(null)} className="btn-ghost !py-2 text-xs">{t("common.cancel")}</button>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === "browse" && (
        <>
          <div className="flex flex-wrap gap-2">
            <select className="input !w-auto text-xs" value={cropFilter} onChange={(e) => setCropFilter(e.target.value)}>
              <option value="">All crops</option>
              {(crops.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.icon ? c.icon + " " : ""}{c.name}</option>
              ))}
            </select>
            <input className="input !w-44 text-xs" placeholder="Filter by district…" value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} />
          </div>

          {browse.loading ? (
            <Spinner />
          ) : browse.error ? (
            <ErrorState message={browse.error} onRetry={browse.refetch} />
          ) : (browse.data ?? []).length === 0 ? (
            <Card><EmptyState icon="sprout" title="No available listings" hint="Adjust the filters or check back later." /></Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {browse.data!.map((l) => (
                <Card key={l.id}>
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-leaf-100 text-primary-700 flex items-center justify-center shrink-0 text-xl">
                      {l.crop_icon ?? "🌱"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-ink">{l.crop_name}</span>
                        <Badge tone="gray">G{l.quality_grade}</Badge>
                        {l.moisture_pct != null && <Badge tone="gray">{num(l.moisture_pct)}% moisture</Badge>}
                      </div>
                      <div className="text-sm text-ink-soft mt-0.5">
                        {num(l.quantity_qtl)} qtl
                        {l.price_expectation != null && <> · expects {inr(l.price_expectation)}/qtl</>}
                      </div>
                      <div className="text-xs text-ink-mute mt-0.5">
                        {l.farmer_name ?? "Farmer"} · {l.village ?? "—"}, {l.district ?? "—"}
                        {l.distance_km != null && <> · {num(l.distance_km, 0)} km</>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <button onClick={() => openOffer(l.id, l.price_expectation, l.quantity_qtl)} className="btn-primary !py-1.5 text-xs inline-flex items-center gap-1">
                      <Icon name="doc" className="w-3.5 h-3.5" /> Send offer
                    </button>
                    {offerFor === l.id && (
                      <div className="mt-3 border border-gray-200 rounded-xl p-3 space-y-2">
                        <div className="grid sm:grid-cols-2 gap-2">
                          <label className="block">
                            <span className="label">Your price (₹/qtl)</span>
                            <input className="input" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} />
                          </label>
                          <label className="block">
                            <span className="label">Quantity (qtl)</span>
                            <input className="input" type="number" min="1" max={l.quantity_qtl} value={qty} onChange={(e) => setQty(e.target.value)} />
                          </label>
                        </div>
                        <label className="block">
                          <span className="label">{t("page.message")}</span>
                          <input className="input" value={message} onChange={(e) => setMessage(e.target.value)} />
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => sendOffer(l.id)}
                            disabled={busy || !(Number(price) > 0) || !(Number(qty) > 0)}
                            className="btn-primary !py-2 text-xs disabled:opacity-50"
                          >
                            {busy ? "…" : t("page.sendOffer")}
                          </button>
                          <button onClick={() => setOfferFor(null)} className="btn-ghost !py-2 text-xs">{t("common.cancel")}</button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
