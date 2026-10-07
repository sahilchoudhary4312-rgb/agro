import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApi } from "@/lib/useApi";
import { Card, DemoChip, ErrorState, Spinner, Stat, TrustBadges, num } from "@/components/ui";
import { Icon } from "@/components/Icon";

interface Member { farmer_id: string; name: string; village: string; district: string; land_size_acres: number | null }
interface FpoProfile { fpo: { name: string; district: string; village: string; member_count: number; registration_no: string; trust_score: number }; members: Member[] }
interface StockRow { crop_id: string; crop_name: string; crop_icon: string; total_qtl: number; farmer_count: number }

export default function FpoDashboard() {
  const { t } = useTranslation();
  const profile = useApi<FpoProfile>("/fpos/me");
  const stock = useApi<StockRow[]>("/fpos/me/stock");

  useEffect(() => { document.title = "Dashboard · AgriMitra"; }, []);

  if (profile.loading || stock.loading) return <Spinner />;
  if (profile.error) return <ErrorState message={profile.error} onRetry={profile.refetch} />;

  const fpo = profile.data!.fpo;
  const members = profile.data!.members;
  const stockRows = stock.data ?? [];
  const totalQtl = stockRows.reduce((s, r) => s + r.total_qtl, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.dashboard")} <DemoChip className="ml-1 align-middle" /></h1>

      <Card>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-leaf-100 text-primary-700 flex items-center justify-center shrink-0">
            <Icon name="users" className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-ink truncate">{fpo.name}</div>
            <div className="text-xs text-ink-mute">
              {fpo.village ? `${fpo.village}, ` : ""}{fpo.district} · Reg. {fpo.registration_no}
            </div>
            <TrustBadges trustScore={fpo.trust_score} verified className="mt-2" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Members" value={num(fpo.member_count, 0)} icon="users" />
        <Stat label="Member listings" value={num(members.length, 0)} sub="farmers with profiles" icon="sprout" tone="blue" />
        <Stat label="Collective stock" value={`${num(totalQtl, 0)} qtl`} icon="warehouse" tone="amber" />
        <Stat label="Crops in stock" value={num(stockRows.length, 0)} icon="leaf" tone="amber" />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { to: "/app/fpo/members", icon: "users" as const, title: "Members", desc: "Directory of farmer members and their villages" },
          { to: "/app/fpo/stock", icon: "warehouse" as const, title: "Collective stock", desc: "Crop-wise aggregation across all members" },
          { to: "/app/fpo/aggregation", icon: "scale" as const, title: "Aggregation", desc: "Match bulk quantities to buyer requirements" },
        ].map((q) => (
          <Link key={q.to} to={q.to} className="card hover:border-primary-300 transition-colors block">
            <div className="flex items-center gap-2 mb-1">
              <Icon name={q.icon} className="w-4.5 h-4.5 w-[18px] h-[18px] text-primary-700" />
              <span className="font-bold text-ink text-sm">{q.title}</span>
              <Icon name="chevronR" className="w-4 h-4 text-ink-mute ml-auto" />
            </div>
            <p className="text-xs text-ink-mute">{q.desc}</p>
          </Link>
        ))}
      </div>

      {stockRows.length > 0 && (
        <Card>
          <div className="font-bold text-ink mb-3">Top crops available collectively</div>
          <div className="space-y-2">
            {stockRows.slice(0, 5).map((r) => (
              <div key={r.crop_id} className="flex items-center gap-3">
                <span className="text-xl shrink-0">{r.crop_icon ?? "🌱"}</span>
                <span className="text-sm font-semibold text-ink flex-1 truncate">{r.crop_name}</span>
                <span className="text-xs text-ink-mute">{r.farmer_count} farmers</span>
                <span className="text-sm font-bold text-primary-800">{num(r.total_qtl, 1)} qtl</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="text-[11px] text-ink-mute">
        Demo platform — all figures on this page come from seeded demo data, not live government data.
      </p>
    </div>
  );
}
