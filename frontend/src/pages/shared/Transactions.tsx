import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, errMessage } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Badge, Card, DemoChip, EmptyState, ErrorState, Spinner, inr, num, TrustBadges } from "@/components/ui";
import { Icon } from "@/components/Icon";

export const TX_STATUSES = [
  "listed", "matched", "offer_sent", "negotiation", "accepted",
  "pickup_scheduled", "in_transit", "delivered", "payment_pending",
  "payment_completed", "completed",
] as const;

const SHORT_LABEL: Record<string, string> = {
  listed: "Listed", matched: "Matched", offer_sent: "Offer sent", negotiation: "Negotiating",
  accepted: "Accepted", pickup_scheduled: "Pickup", in_transit: "In transit", delivered: "Delivered",
  payment_pending: "Payment due", payment_completed: "Paid", completed: "Completed",
};

interface Payment { id: string; amount: number; method: string; reference: string | null; status: string; paid_at: string | null }
interface Tx {
  id: string; code: string;
  farmer_name: string; buyer_name: string; buyer_trust: number | null;
  crop_name: string; crop_icon?: string;
  quantity_qtl: number; quality_grade: string;
  agreed_price: number; logistics_cost_per_qtl: number | null; handling_cost_per_qtl: number | null;
  net_realization_per_qtl: number | null; total_value: number; net_total: number | null;
  status: string; created_at: string; distance_km: number | null;
  scheduled_pickup_at: string | null; delivered_at: string | null;
  payments: Payment[];
  logistics: { provider: string; vehicle_type: string; status: string; estimated_hours: number } | null;
}

const PAY_METHODS = ["upi", "bank_transfer", "cash", "cheque"] as const;

export default function Transactions({ viewer }: { viewer: "farmer" | "buyer" | "fpo" }) {
  const { t } = useTranslation();
  const txs = useApi<Tx[]>("/transactions");

  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<(typeof PAY_METHODS)[number]>("upi");
  const [payRef, setPayRef] = useState("");
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => { document.title = "Transactions · AgriMitra"; }, []);

  const advance = async (tx: Tx) => {
    const idx = TX_STATUSES.indexOf(tx.status as (typeof TX_STATUSES)[number]);
    const next = TX_STATUSES[idx + 1];
    if (!next) return;
    setBusy(tx.id);
    setError("");
    try {
      await api.put(`/transactions/${tx.id}/status`, { status: next });
      setFlash(`${tx.code} → ${SHORT_LABEL[next]}`);
      setTimeout(() => setFlash(""), 2500);
      txs.refetch();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusy("");
    }
  };

  const recordPayment = async (tx: Tx) => {
    setBusy(tx.id);
    setError("");
    try {
      await api.post(`/transactions/${tx.id}/payment`, {
        method: payMethod,
        reference: payRef || undefined,
      });
      setPayFor(null);
      setPayRef("");
      setFlash(`Payment of ${inr(tx.total_value)} recorded for ${tx.code}`);
      setTimeout(() => setFlash(""), 3000);
      txs.refetch();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusy("");
    }
  };

  const counterparty = (tx: Tx) => (viewer === "farmer" ? tx.buyer_name : tx.farmer_name);
  const canAdvance = (tx: Tx) => {
    const idx = TX_STATUSES.indexOf(tx.status as (typeof TX_STATUSES)[number]);
    const next = TX_STATUSES[idx + 1];
    if (!next) return null;
    if (viewer === "fpo") return null;
    if (next === "payment_completed" || next === "completed") return null;
    return next;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.transactions")} <DemoChip className="ml-1 align-middle" /></h1>

      {flash && <div className="rounded-xl bg-leaf-100 text-primary-800 px-4 py-2.5 text-sm font-semibold">{flash}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">{error}</div>}

      {txs.loading ? (
        <Spinner />
      ) : txs.error ? (
        <ErrorState message={txs.error} onRetry={txs.refetch} />
      ) : !txs.data?.length ? (
        <Card>
          <EmptyState
            icon="receipt"
            title="No transactions yet"
            hint={viewer === "farmer" ? "Accept an offer to start your first transaction." : "Transactions appear here once an offer is accepted."}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {txs.data.map((tx) => {
            const idx = TX_STATUSES.indexOf(tx.status as (typeof TX_STATUSES)[number]);
            const next = canAdvance(tx);
            const paid = tx.payments?.some((p) => p.status === "completed" || p.status === "paid");
            return (
              <Card key={tx.id}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-leaf-100 text-primary-700 flex items-center justify-center shrink-0 text-xl">
                    {tx.crop_icon ?? "🌱"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-ink-mute">{tx.code}</span>
                      <Badge tone={tx.status === "completed" || tx.status === "payment_completed" ? "green" : "blue"}>{SHORT_LABEL[tx.status] ?? tx.status}</Badge>
                      {paid && <Badge tone="green"><Icon name="check" className="w-3 h-3" /> paid</Badge>}
                    </div>
                    <div className="text-sm text-ink-soft mt-0.5">
                      {tx.crop_name} · {num(tx.quantity_qtl)} qtl · G{tx.quality_grade} · {counterparty(tx)}
                    </div>
                    <div className="text-xs text-ink-mute mt-0.5">
                      {inr(tx.agreed_price)}/qtl · total {inr(tx.total_value)}
                      {tx.net_realization_per_qtl != null && <> · net {inr(tx.net_realization_per_qtl)}/qtl ({inr(tx.net_total ?? 0)})</>}
                      {tx.logistics_cost_per_qtl != null && <> · logistics {inr(tx.logistics_cost_per_qtl)}/qtl</>}
                    </div>
                    {viewer === "farmer" && <TrustBadges trustScore={tx.buyer_trust} className="mt-1.5" />}
                  </div>
                </div>

                {/* lifecycle strip — forward only */}
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink-mute mb-1.5">{t("page.txTimeline")}</div>
                  <div className="flex items-center gap-0.5 overflow-x-auto">
                    {TX_STATUSES.map((s, i) => (
                      <div key={s} className="flex items-center shrink-0">
                        <div
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap ${
                            i < idx ? "bg-leaf-100 text-primary-700"
                            : i === idx ? "bg-primary-700 text-white"
                            : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {SHORT_LABEL[s]}
                        </div>
                        {i < TX_STATUSES.length - 1 && <div className={`w-1.5 h-px ${i < idx ? "bg-primary-300" : "bg-gray-200"}`} />}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button onClick={() => setOpen(open === tx.id ? null : tx.id)} className="btn-ghost !py-1.5 text-xs">
                    {open === tx.id ? t("common.close") : t("common.viewAll")}
                  </button>
                  {next && (
                    <button onClick={() => advance(tx)} disabled={busy === tx.id} className="btn-primary !py-1.5 text-xs inline-flex items-center gap-1">
                      <Icon name="arrowRight" className="w-3.5 h-3.5" /> {t("page.nextStatus")}: {SHORT_LABEL[next]}
                    </button>
                  )}
                  {tx.status === "payment_pending" && !paid && viewer === "farmer" && (
                    <span className="text-xs text-amber-700 font-semibold">Waiting for buyer payment ({inr(tx.total_value)})</span>
                  )}
                  {tx.status === "payment_pending" && !paid && viewer === "buyer" && (
                    <button onClick={() => { setPayFor(payFor === tx.id ? null : tx.id); setPayMethod("upi"); setPayRef(""); }} className="btn-primary !py-1.5 text-xs inline-flex items-center gap-1">
                      <Icon name="wallet" className="w-3.5 h-3.5" /> {t("page.recordPayment")} ({inr(tx.total_value)})
                    </button>
                  )}
                </div>

                {payFor === tx.id && viewer === "buyer" && (
                  <div className="mt-3 border border-gray-200 rounded-xl p-3 space-y-2">
                    <div className="text-xs font-bold text-ink">Confirm that you paid the farmer {inr(tx.total_value)} for {tx.code}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {PAY_METHODS.map((m) => (
                        <button
                          key={m}
                          onClick={() => setPayMethod(m)}
                          className={`chip ${payMethod === m ? "bg-leaf-100 text-primary-800 font-bold" : "bg-gray-100 text-gray-600"}`}
                        >
                          {m.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                    <input className="input" placeholder="Payment reference / UTR (optional)" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={() => recordPayment(tx)} disabled={busy === tx.id} className="btn-primary !py-2 text-xs">
                        {busy === tx.id ? "…" : "Confirm payment"}
                      </button>
                      <button onClick={() => setPayFor(null)} className="btn-ghost !py-2 text-xs">{t("common.cancel")}</button>
                    </div>
                  </div>
                )}

                {open === tx.id && (
                  <div className="mt-3 border-t border-gray-100 pt-3 space-y-2 text-sm">
                    {tx.scheduled_pickup_at && <div className="text-ink-soft">{t("page.schedulePickup")}: {new Date(tx.scheduled_pickup_at).toLocaleString("en-IN")}</div>}
                    {tx.delivered_at && <div className="text-ink-soft">Delivered: {new Date(tx.delivered_at).toLocaleString("en-IN")}</div>}
                    {tx.distance_km != null && <div className="text-ink-soft">Distance: {num(tx.distance_km, 0)} km</div>}
                    {tx.logistics && (
                      <div className="text-ink-soft">
                        Logistics: {tx.logistics.provider ?? "—"} ({tx.logistics.vehicle_type ?? "—"}, {tx.logistics.status})
                      </div>
                    )}
                    {tx.payments?.length > 0 && (
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink-mute mt-2 mb-1">{t("page.recordPayment")}</div>
                        {tx.payments.map((p) => (
                          <div key={p.id} className="flex flex-wrap gap-x-4 text-xs text-ink-soft">
                            <span>{t("page.amount")}: <strong>{inr(p.amount)}</strong></span>
                            <span>{t("page.paymentMethod")}: {p.method}</span>
                            {p.reference && <span>{t("page.reference")}: {p.reference}</span>}
                            <span className={`font-semibold ${p.status === "completed" || p.status === "paid" ? "text-primary-700" : "text-amber-700"}`}>{p.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
