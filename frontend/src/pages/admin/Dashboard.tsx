import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useApi } from "@/lib/useApi";
import { Card, DemoChip, ErrorState, Spinner, Stat, inr, num } from "@/components/ui";

interface Metrics {
  total_farmers: number;
  active_farmers: number;
  total_buyers: number;
  verified_buyers: number;
  total_fpos: number;
  produce_listed_qtl: number;
  total_transactions: number;
  transaction_value: number;
  avg_net_realization: number;
  completed_transactions: number;
  pending_transactions: number;
  open_disputes: number;
  avg_buyer_rating: number;
}
interface Charts {
  crop_volume: { name: string; value: number }[];
  transactions_over_time: { date: string; count: number }[];
  demand_vs_supply: { crop: string; demand_qtl: number; supply_qtl: number }[];
  farmer_registrations: { date: string; count: number }[];
  regional_activity: { district: string; listings: number }[];
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const dash = useApi<{ metrics: Metrics; charts: Charts }>("/admin/dashboard");

  useEffect(() => { document.title = "Admin · AgriMitra"; }, []);

  if (dash.loading) return <Spinner />;
  if (dash.error) return <ErrorState message={dash.error} onRetry={dash.refetch} />;

  const m = dash.data!.metrics;
  const c = dash.data!.charts;

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("roles.admin")} {t("nav.dashboard")} <DemoChip className="ml-1 align-middle" /></h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Farmers" value={num(m.total_farmers, 0)} sub={`${m.active_farmers} listing now`} icon="users" />
        <Stat label="Buyers" value={num(m.total_buyers, 0)} sub={`${m.verified_buyers} verified`} icon="store" tone="blue" />
        <Stat label="FPOs" value={num(m.total_fpos, 0)} icon="landmark" tone="gray" />
        <Stat label="Produce listed" value={`${num(m.produce_listed_qtl, 0)} qtl`} icon="package" tone="amber" />
        <Stat label="Transactions" value={num(m.total_transactions, 0)} sub={`${m.completed_transactions} completed · ${m.pending_transactions} in progress`} icon="receipt" />
        <Stat label="Transaction value" value={inr(m.transaction_value)} icon="wallet" tone="blue" />
        <Stat label="Avg net realization" value={`${inr(m.avg_net_realization)}/qtl`} icon="trendUp" tone="amber" />
        <Stat label="Open disputes" value={num(m.open_disputes, 0)} sub={`avg buyer rating ${m.avg_buyer_rating.toFixed(1)}★`} icon="alert" tone="amber" />
      </div>

      <Card>
        <div className="font-bold text-ink mb-3">Traded volume by crop</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={c.crop_volume} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${num(v, 0)} qtl`, "Volume"]} />
              <Bar dataKey="value" fill="#15803d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <div className="font-bold text-ink mb-3">Demand vs supply by crop (qtl)</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={c.demand_vs_supply} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="crop" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${num(v, 0)} qtl`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="demand_qtl" name="Buyer demand" fill="#b45309" radius={[4, 4, 0, 0]} />
              <Bar dataKey="supply_qtl" name="Farmer supply" fill="#15803d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-3">
        <Card>
          <div className="font-bold text-ink mb-3">Transactions over time</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={c.transactions_over_time} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" name="Transactions" stroke="#15803d" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="font-bold text-ink mb-3">Listings by district</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.regional_activity} layout="vertical" margin={{ top: 4, right: 12, left: 24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="district" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="listings" name="Listings" fill="#0e7490" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <p className="text-[11px] text-ink-mute">
        Demo platform — all metrics come from the seeded demo database, not live government data.
      </p>
    </div>
  );
}
