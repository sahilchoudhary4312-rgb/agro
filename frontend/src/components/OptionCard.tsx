import { useTranslation } from "react-i18next";
import type { SellingOption } from "@/types";
import { Badge, Card, inr, num, TrustBadges } from "./ui";
import { Icon } from "./Icon";
import { NetBreakdown } from "./NetBreakdown";

const REASON_GOOD = /^\+/;

export function OptionCard({
  option,
  rank,
  isBest,
  actions,
  defaultOpen = false,
}: {
  option: SellingOption;
  rank?: number;
  isBest?: boolean;
  actions?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const { t } = useTranslation();
  const isMandi = option.type === "mandi";
  const name = option.buyer_name ?? option.name ?? "—";
  const verified = option.verification_status === "verified";

  return (
    <Card className={`relative overflow-hidden ${isBest ? "!border-primary-300 ring-1 ring-primary-200 !pt-11" : ""}`}>
      {isBest && (
        <div className="absolute top-0 right-0 bg-primary-700 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-bl-xl">
          {t("reco.recommended")}
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isMandi ? "bg-blue-100 text-blue-600" : "bg-leaf-100 text-primary-700"}`}>
          <Icon name={isMandi ? "landmark" : option.direct_offer ? "handshake" : "store"} className="w-5.5 h-5.5 w-[22px] h-[22px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-ink leading-tight">{name}</span>
            {rank != null && <Badge tone="gray">#{rank}</Badge>}
            {option.direct_offer && <Badge tone="green"><Icon name="handshake" className="w-3 h-3" /> Direct offer</Badge>}
            {isMandi && <Badge tone="blue">APMC Mandi</Badge>}
            {!isMandi && verified && <Badge tone="green"><Icon name="shield" className="w-3 h-3" /> {t("trust.verified")}</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-ink-mute">
            <span className="inline-flex items-center gap-1"><Icon name="map" className="w-3.5 h-3.5" />{option.distance_km != null ? `${num(option.distance_km, 0)} km` : "—"}</span>
            <span className="inline-flex items-center gap-1"><Icon name="clock" className="w-3.5 h-3.5" />~{num(option.estimated_hours, 1)} {t("common.hours")}</span>
            {option.payment_terms && <span className="inline-flex items-center gap-1"><Icon name="wallet" className="w-3.5 h-3.5" />{String(option.payment_terms).replace(/_/g, " ")}</span>}
            {option.pickup_preference === "farm_gate" && <span className="inline-flex items-center gap-1"><Icon name="truck" className="w-3.5 h-3.5" />Farm pickup</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wide text-ink-mute font-bold">{t("net.net")}</div>
          <div className="text-xl font-extrabold text-primary-800 leading-tight tabular-nums">{inr(option.net_realization_per_qtl)}</div>
          <div className="text-[11px] text-ink-mute">{t("common.perQtl")}</div>
          <div className="text-[11px] text-ink-soft mt-0.5">
            gross <span className="font-semibold text-ink-soft">{inr(option.gross_price_per_qtl)}</span>
          </div>
        </div>
      </div>

      <TrustBadges
        trustScore={option.trust_score}
        onTime={option.on_time_payment_pct}
        rating={option.farmer_rating ?? undefined}
        className="mt-3"
      />

      <NetBreakdown
        className="mt-3"
        gross={option.gross_price_per_qtl}
        transport={option.transport_per_qtl}
        handling={option.handling_per_qtl}
        fees={isMandi ? 15 : 0}
        net={option.net_realization_per_qtl}
        quantity={option.quantity_qtl}
      />

      {option.reasons && option.reasons.length > 0 && (
        <ul className="mt-3 space-y-1">
          {(defaultOpen ? option.reasons : option.reasons.slice(0, 3)).map((r, i) => {
            const good = REASON_GOOD.test(r);
            return (
              <li key={i} className={`text-xs flex gap-1.5 ${good ? "text-primary-800" : "text-amber-800"}`}>
                <span className="font-bold">{good ? "✓" : "!"}</span>
                <span>{r.replace(/^[+-]\s*/, "")}</span>
              </li>
            );
          })}
        </ul>
      )}

      {option.arrival_tip && (
        <div className="mt-2 text-[11px] text-ink-mute italic">{option.arrival_tip}</div>
      )}

      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </Card>
  );
}
