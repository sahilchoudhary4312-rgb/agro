import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "@/lib/useApi";
import { Badge, Card, DemoChip, EmptyState, ErrorState, Spinner, num } from "@/components/ui";
import { Icon } from "@/components/Icon";

interface StockListing { listing_id: string; farmer_id: string; quantity_qtl: number; quality_grade: string; village: string }
interface StockRow {
  crop_id: string;
  crop_name: string;
  crop_icon: string;
  total_qtl: number;
  farmer_count: number;
  grades: string[];
  listings: StockListing[];
}

export default function FpoStock() {
  const { t } = useTranslation();
  const stock = useApi<StockRow[]>("/fpos/me/stock");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { document.title = "Collective Stock · AgriMitra"; }, []);

  const rows = stock.data ?? [];
  const totalQtl = rows.reduce((s, r) => s + r.total_qtl, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.stock")} <DemoChip className="ml-1 align-middle" /></h1>
        {rows.length > 0 && <span className="text-sm font-semibold text-ink-mute">{num(totalQtl, 1)} qtl total</span>}
      </div>

      {stock.loading ? (
        <Spinner />
      ) : stock.error ? (
        <ErrorState message={stock.error} onRetry={stock.refetch} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon="warehouse" title="No collective stock" hint="Stock appears here once member farmers list produce as available." />
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const open = expanded === r.crop_id;
            return (
              <Card key={r.crop_id}>
                <button
                  onClick={() => setExpanded(open ? null : r.crop_id)}
                  className="w-full flex items-center gap-3 text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-leaf-100 text-primary-700 flex items-center justify-center shrink-0 text-xl">
                    {r.crop_icon ?? "🌱"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-ink">{r.crop_name}</div>
                    <div className="text-xs text-ink-mute">
                      {r.farmer_count} farmer{r.farmer_count === 1 ? "" : "s"} · grades {r.grades.join(", ")}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-primary-800">{num(r.total_qtl, 1)} qtl</div>
                    <div className="text-[11px] text-ink-mute">{r.listings.length} listing{r.listings.length === 1 ? "" : "s"}</div>
                  </div>
                  <Icon name="chevronR" className={`w-4 h-4 text-ink-mute shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
                </button>

                {open && (
                  <div className="mt-3 border-t border-gray-100 pt-3 space-y-1.5">
                    {r.listings.map((l) => (
                      <div key={l.listing_id} className="flex items-center gap-2 text-sm">
                        <span className="text-ink-soft flex-1 truncate">{l.village || "—"}</span>
                        <Badge tone={l.quality_grade === "A" ? "green" : l.quality_grade === "B" ? "blue" : "gray"}>{l.quality_grade}</Badge>
                        <span className="font-semibold text-ink w-20 text-right">{num(l.quantity_qtl, 1)} qtl</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-ink-mute">
        {t("common.notLive")} — aggregated from member farmers' available listings in the seeded demo database.
      </p>
    </div>
  );
}
