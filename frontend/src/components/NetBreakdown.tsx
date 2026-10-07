import { useTranslation } from "react-i18next";
import { inr } from "./ui";

/** Visual gross − transport − handling − mandi fee = NET equation. */
export function NetBreakdown({
  gross,
  transport,
  handling = 0,
  fees = 0,
  net,
  quantity,
  className = "",
}: {
  gross: number;
  transport: number;
  handling?: number;
  fees?: number;
  net: number;
  quantity?: number;
  className?: string;
}) {
  const { t } = useTranslation();
  const rows = [
    { label: t("net.gross"), value: gross, sign: "", strong: false },
    { label: t("net.transport"), value: transport, sign: "−", strong: false },
    ...(handling > 0 ? [{ label: t("net.handling"), value: handling, sign: "−", strong: false }] : []),
    ...(fees > 0 ? [{ label: t("net.mandiFee"), value: fees, sign: "−", strong: false }] : []),
  ];
  return (
    <div className={className}>
      <div className="rounded-xl bg-leaf-50/70 border border-leaf-100 px-3 py-2.5 text-sm">
        {rows.map((r, i) => (
          <div key={r.label} className={`flex items-center justify-between py-0.5 ${i > 0 ? "border-t border-dashed border-leaf-200/70" : ""}`}>
            <span className="text-ink-soft">
              {r.sign && <span className="font-bold text-ink-mute mr-1">{r.sign}</span>}
              {r.label}
            </span>
            <span className="tabular-nums text-ink">{inr(r.value, 2)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-1.5 mt-1 border-t-2 border-primary-200">
          <span className="font-bold text-primary-800">{t("net.net")}</span>
          <span className="font-extrabold tabular-nums text-primary-800 text-base">{inr(net, 2)}</span>
        </div>
      </div>
      {quantity != null && quantity > 0 && (
        <div className="mt-2 text-sm flex items-center justify-between">
          <span className="text-ink-soft">{t("net.netTotal")} ({quantity} qtl)</span>
          <span className="font-extrabold text-primary-800 tabular-nums">{inr(net * quantity)}</span>
        </div>
      )}
    </div>
  );
}
