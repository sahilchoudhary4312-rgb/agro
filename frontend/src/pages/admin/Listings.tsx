import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "@/lib/useApi";
import { Badge, Card, DemoChip, EmptyState, ErrorState, Spinner, inr, num } from "@/components/ui";

interface AdminListing {
  id: string;
  crop_name: string;
  crop_icon: string | null;
  quantity_qtl: number;
  quality_grade: string;
  price_expectation: number | null;
  village: string | null;
  district: string | null;
  owner_name: string | null;
  owner_role: string | null;
  status: string;
  created_at: string | null;
}

const STATUSES = ["all", "available", "matched", "sold", "withdrawn"] as const;

const STATUS_TONE: Record<string, "green" | "amber" | "gray" | "blue"> = {
  available: "green", matched: "blue", sold: "gray", withdrawn: "amber",
};

export default function AdminListings() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const path = status === "all" ? "/admin/listings" : `/admin/listings?status=${status}`;
  const listings = useApi<AdminListing[]>(path, [status]);

  useEffect(() => { document.title = "Listings · AgriMitra"; }, []);

  const rows = listings.data ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.listings")} <DemoChip className="ml-1 align-middle" /></h1>

      <div className="flex gap-1.5 overflow-x-auto">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold capitalize whitespace-nowrap ${
              status === s ? "bg-primary-700 text-white" : "bg-leaf-50 text-ink-soft hover:bg-leaf-100"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {listings.loading ? (
        <Spinner />
      ) : listings.error ? (
        <ErrorState message={listings.error} onRetry={listings.refetch} />
      ) : rows.length === 0 ? (
        <Card><EmptyState icon="package" title="No listings" hint={`No listings with status "${status}".`} /></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto -m-1 p-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-mute uppercase tracking-wide">
                  <th className="py-2 pr-3 font-semibold">Crop</th>
                  <th className="py-2 pr-3 font-semibold">Owner</th>
                  <th className="py-2 pr-3 font-semibold">Location</th>
                  <th className="py-2 pr-3 font-semibold text-right">Qty (qtl)</th>
                  <th className="py-2 pr-3 font-semibold text-right">Expected</th>
                  <th className="py-2 pr-3 font-semibold">Grade</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="border-t border-gray-100">
                    <td className="py-2.5 pr-3 font-semibold text-ink whitespace-nowrap">
                      {l.crop_icon ?? "🌱"} {l.crop_name}
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">
                      {l.owner_name}
                      {l.owner_role && <span className="text-[10px] text-ink-mute ml-1 uppercase">{l.owner_role}</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft whitespace-nowrap">{l.district ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-ink">{num(l.quantity_qtl, 1)}</td>
                    <td className="py-2.5 pr-3 text-right text-ink-soft">{l.price_expectation != null ? inr(l.price_expectation) : "—"}</td>
                    <td className="py-2.5 pr-3"><Badge tone={l.quality_grade === "A" ? "green" : l.quality_grade === "B" ? "blue" : "gray"}>{l.quality_grade}</Badge></td>
                    <td className="py-2.5"><Badge tone={STATUS_TONE[l.status] ?? "gray"}>{l.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-ink-mute mt-2">Showing {rows.length} of up to 300 listings · demo data</div>
        </Card>
      )}
    </div>
  );
}
