import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, errMessage } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Badge, Card, DemoChip, EmptyState, ErrorState, Spinner, inr, num, TrustBadges } from "@/components/ui";
import { Icon } from "@/components/Icon";

interface OfferMsg { sender_user_id: string; message: string | null; counter_price: number | null; created_at: string }
interface Offer {
  id: string;
  requirement_id: string | null;
  buyer_name: string;
  buyer_trust: number | null;
  crop_name: string;
  crop_icon?: string;
  quantity_qtl: number;
  price_per_qtl: number;
  message: string | null;
  status: string;
  distance_km: number | null;
  created_at: string;
  messages: OfferMsg[];
}

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "gray" | "blue"> = {
  sent: "blue", negotiating: "amber", accepted: "green", rejected: "red", withdrawn: "gray",
};

export default function FarmerOffers() {
  const { t } = useTranslation();
  const offers = useApi<Offer[]>("/offers");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [panel, setPanel] = useState<{ id: string; mode: "counter" | "reject" } | null>(null);
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => { document.title = "Offers · AgriMitra"; }, []);

  const act = async (offerId: string, action: "accept" | "reject" | "counter" | "withdraw", extra?: { counter_price?: number; message?: string }) => {
    setBusyId(offerId);
    setError("");
    try {
      await api.post(`/offers/${offerId}/action`, { action, ...extra });
      setPanel(null);
      setPrice("");
      setMessage("");
      setFlash(
        action === "accept" ? "Offer accepted — transaction created"
        : action === "reject" ? "Offer rejected"
        : action === "withdraw" ? "Offer withdrawn"
        : "Counter offer sent",
      );
      setTimeout(() => setFlash(""), 3000);
      offers.refetch();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const openPanel = (id: string, mode: "counter" | "reject", currentPrice?: number) => {
    setPanel({ id, mode });
    setPrice(mode === "counter" && currentPrice ? String(currentPrice) : "");
    setMessage("");
  };

  const sorted = [...(offers.data ?? [])].sort((a, b) => {
    const open = (s: string) => (s === "sent" || s === "negotiating" ? 0 : 1);
    return open(a.status) - open(b.status) || b.created_at.localeCompare(a.created_at);
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.offers")} <DemoChip className="ml-1 align-middle" /></h1>

      {flash && <div className="rounded-xl bg-leaf-100 text-primary-800 px-4 py-2.5 text-sm font-semibold">{flash}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">{error}</div>}

      {offers.loading ? (
        <Spinner />
      ) : offers.error ? (
        <ErrorState message={offers.error} onRetry={offers.refetch} />
      ) : sorted.length === 0 ? (
        <Card><EmptyState icon="doc" title={t("page.noOffers")} hint={t("page.noOffersHint")} /></Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((o) => {
            const open = o.status === "sent" || o.status === "negotiating";
            const mine = o.requirement_id != null; // farmer responded to a requirement — buyer decides
            const lastCounter = [...(o.messages ?? [])].reverse().find((m) => m.counter_price != null);
            return (
              <Card key={o.id}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-leaf-100 text-primary-700 flex items-center justify-center shrink-0 text-xl">
                    {o.crop_icon ?? "🌱"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-ink">{o.buyer_name}</span>
                      <Badge tone={STATUS_TONE[o.status] ?? "gray"}>{o.status}</Badge>
                      {mine && <Badge tone="gray">sent by you</Badge>}
                      {lastCounter && <Badge tone="amber">counter {inr(lastCounter.counter_price!)}/qtl</Badge>}
                    </div>
                    <div className="text-sm text-ink-soft mt-0.5">
                      {o.crop_name} · {num(o.quantity_qtl)} qtl · {inr(o.price_per_qtl)}/qtl
                      {" "}= <strong className="text-primary-800">{inr(o.price_per_qtl * o.quantity_qtl)}</strong>
                      {o.distance_km != null && <> · {num(o.distance_km, 0)} km</>}
                    </div>
                    <TrustBadges trustScore={o.buyer_trust} className="mt-1.5" />
                    {o.message && <div className="text-xs text-ink-soft italic mt-1.5">“{o.message}”</div>}
                    <div className="text-[11px] text-ink-mute mt-1">{new Date(o.created_at).toLocaleString("en-IN")}</div>
                  </div>
                </div>

                {open && !mine && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                    <button onClick={() => act(o.id, "accept")} disabled={busyId === o.id} className="btn-primary !py-2 text-xs inline-flex items-center gap-1">
                      <Icon name="check" className="w-3.5 h-3.5" /> {t("page.accept")}
                    </button>
                    <button onClick={() => openPanel(o.id, "counter", o.price_per_qtl)} className="btn-ghost !py-2 text-xs">
                      {t("page.counter")}
                    </button>
                    <button onClick={() => openPanel(o.id, "reject")} className="btn-ghost !py-2 text-xs !text-red-600">
                      {t("page.reject")}
                    </button>
                  </div>
                )}

                {open && mine && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                    {o.status === "sent" ? (
                      <span className="text-xs text-ink-mute">Waiting for {o.buyer_name} to respond — they can accept, counter or decline.</span>
                    ) : lastCounter ? (
                      <button onClick={() => act(o.id, "accept")} disabled={busyId === o.id} className="btn-primary !py-2 text-xs inline-flex items-center gap-1">
                        <Icon name="check" className="w-3.5 h-3.5" /> Accept {inr(lastCounter.counter_price!)}/qtl
                      </button>
                    ) : null}
                    {o.status === "negotiating" && (
                      <button onClick={() => openPanel(o.id, "counter", lastCounter?.counter_price ?? o.price_per_qtl)} className="btn-ghost !py-2 text-xs">
                        {t("page.counter")}
                      </button>
                    )}
                    <button onClick={() => act(o.id, "withdraw")} disabled={busyId === o.id} className="btn-ghost !py-2 text-xs !text-red-600">
                      Withdraw
                    </button>
                  </div>
                )}

                {panel?.id === o.id && (
                  <div className="mt-3 border border-gray-200 rounded-xl p-3 space-y-2">
                    {panel.mode === "counter" && (
                      <div>
                        <label className="label">{t("page.counterPrice")}</label>
                        <input className="input" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} />
                      </div>
                    )}
                    <div>
                      <label className="label">{t("page.message")}</label>
                      <input className="input" value={message} onChange={(e) => setMessage(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          panel.mode === "counter"
                            ? act(o.id, "counter", { counter_price: Number(price), message: message || undefined })
                            : act(o.id, "reject", { message: message || undefined })
                        }
                        disabled={busyId === o.id || (panel.mode === "counter" && !price)}
                        className="btn-primary !py-2 text-xs"
                      >
                        {busyId === o.id ? "…" : panel.mode === "counter" ? t("page.sendOffer") : t("page.reject")}
                      </button>
                      <button onClick={() => setPanel(null)} className="btn-ghost !py-2 text-xs">{t("common.cancel")}</button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
