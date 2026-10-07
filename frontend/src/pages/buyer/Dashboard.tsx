import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApi } from "@/lib/useApi";
import { Badge, Card, DemoChip, ErrorState, Spinner, Stat, TrustBadges } from "@/components/ui";
import { Icon } from "@/components/Icon";

interface BuyerInfo {
  business_name: string; business_type: string; verification_status: string;
  city: string | null; district: string | null; about: string | null;
  trust_score: number; total_transactions: number; successful_transactions: number;
  on_time_payment_pct: number; farmer_rating: number | null; dispute_count: number;
  contact_email: string | null; contact_phone: string | null;
}
interface Dash {
  buyer: BuyerInfo;
  open_requirements: number;
  total_matches: number;
}

export default function BuyerDashboard() {
  const { t } = useTranslation();
  const dash = useApi<Dash>("/buyers/me/dashboard");

  useEffect(() => { document.title = "Buyer Dashboard · AgriMitra"; }, []);

  if (dash.loading) return <Spinner />;
  if (dash.error) return <ErrorState message={dash.error} onRetry={dash.refetch} />;
  const b = dash.data?.buyer;
  if (!b) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.dashboard")} <DemoChip className="ml-1 align-middle" /></h1>

      <Card>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-leaf-100 text-primary-700 flex items-center justify-center font-extrabold text-lg">
            {b.business_name?.[0] ?? "B"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-ink">{b.business_name}</span>
              <Badge tone={b.verification_status === "verified" ? "green" : "amber"}>
                <Icon name="shield" className="w-3 h-3" /> {b.verification_status}
              </Badge>
            </div>
            <div className="text-sm text-ink-soft">{b.business_type} · {b.city ?? "—"}, {b.district ?? "—"}</div>
            <TrustBadges trustScore={b.trust_score} onTime={b.on_time_payment_pct} rating={b.farmer_rating} verified={b.verification_status === "verified"} className="mt-1.5" />
            <div className="text-xs text-ink-mute mt-1.5">
              {b.total_transactions} transactions · {b.successful_transactions} successful · {b.dispute_count} disputes
            </div>
          </div>
        </div>
        {b.about && <p className="text-sm text-ink-soft mt-3 border-t border-gray-100 pt-3">{b.about}</p>}
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Open requirements" value={dash.data!.open_requirements} icon="clipboard" />
        <Stat label="Total matches" value={dash.data!.total_matches} icon="handshake" tone="blue" />
        <Stat label="Trust score" value={b.trust_score} icon="star" tone="amber" sub="updated from payment history" />
        <Stat label="On-time payments" value={`${b.on_time_payment_pct}%`} icon="wallet" />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Link to="/app/buyer/requirements" className="card p-4 hover:shadow-pop transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-leaf-100 text-primary-700 flex items-center justify-center mb-2">
            <Icon name="clipboard" className="w-5 h-5" />
          </div>
          <div className="font-bold text-ink text-sm">Post a requirement</div>
          <div className="text-xs text-ink-mute mt-0.5">Tell farmers what you need — crop, quantity, quality, price.</div>
        </Link>
        <Link to="/app/buyer/matches" className="card p-4 hover:shadow-pop transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-leaf-100 text-primary-700 flex items-center justify-center mb-2">
            <Icon name="sprout" className="w-5 h-5" />
          </div>
          <div className="font-bold text-ink text-sm">Find farmers</div>
          <div className="text-xs text-ink-mute mt-0.5">Scored matches for your requirements, or browse all listings.</div>
        </Link>
        <Link to="/app/buyer/offers" className="card p-4 hover:shadow-pop transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-leaf-100 text-primary-700 flex items-center justify-center mb-2">
            <Icon name="doc" className="w-5 h-5" />
          </div>
          <div className="font-bold text-ink text-sm">Offers</div>
          <div className="text-xs text-ink-mute mt-0.5">Accept, counter or decline. Record payments after pickup.</div>
        </Link>
      </div>

      <p className="text-[11px] text-ink-mute">
        Demo platform — all figures on this page come from seeded demo data, not live government data.
      </p>
    </div>
  );
}
