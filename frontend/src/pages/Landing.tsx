import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { DemoChip } from "@/components/ui";

interface Stats {
  farmers: number;
  buyers: number;
  fpos: number;
  markets: number;
  crops: number;
  transactions: number;
  label: string;
}

export default function Landing() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api
      .get<Stats>("/public/stats")
      .then((r) => setStats(r.data))
      .catch(() => setStats(null));
  }, []);

  const features = [
    { icon: "scale" as const, title: t("landing.why1Title"), body: t("landing.why1Body") },
    { icon: "shield" as const, title: t("landing.why2Title"), body: t("landing.why2Body") },
    { icon: "cloudSun" as const, title: t("landing.why3Title"), body: t("landing.why3Body") },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-leaf-100 to-surface">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-3xl sm:text-5xl font-extrabold leading-tight text-primary-900">
            {t("landing.heroTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-ink-soft">{t("landing.heroSub")}</p>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/login" className="btn-primary w-full sm:w-auto">
              {t("landing.ctaStart")}
              <Icon name="arrowRight" className="w-4 h-4" />
            </Link>
            <Link to="/markets" className="btn-ghost w-full sm:w-auto">
              <Icon name="store" className="w-4 h-4 text-primary-700" />
              {t("landing.ctaPrices")}
            </Link>
          </div>
        </div>
      </section>

      {/* Live-ish platform stats (demo) */}
      <section className="mx-auto max-w-6xl px-4 -mt-2 pb-10">
        <div className="flex items-center justify-center gap-2 mb-3 text-xs text-ink-mute">
          <span>{t("landing.liveLabel")}</span>
          <DemoChip />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Farmers", value: stats?.farmers, icon: "sprout" },
            { label: "Buyers", value: stats?.buyers, icon: "store" },
            { label: "FPOs", value: stats?.fpos, icon: "users" },
            { label: "Markets", value: stats?.markets, icon: "landmark" },
            { label: "Crops", value: stats?.crops, icon: "package" },
            { label: "Transactions", value: stats?.transactions, icon: "receipt" },
          ].map((s) => (
            <div key={s.label} className="card flex items-center gap-2.5 p-3.5">
              <div className="w-9 h-9 rounded-xl bg-leaf-100 text-primary-700 flex items-center justify-center shrink-0">
                <Icon name={s.icon} className="w-4.5 h-4.5 w-[18px] h-[18px]" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-extrabold text-ink leading-none">{s.value ?? "—"}</div>
                <div className="text-[11px] text-ink-mute truncate">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why AgriMitra */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card p-5">
              <div className="mb-3 w-10 h-10 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center">
                <Icon name={f.icon} className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink-soft leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Net realization explainer strip */}
      <section className="mx-auto max-w-6xl px-4 py-6 pb-12">
        <div className="rounded-2xl bg-primary-800 p-6 sm:p-8 text-white">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-extrabold">{t("net.breakdown")}</h2>
              <p className="mt-2 text-sm text-primary-100 max-w-xl">{t("landing.why1Body")}</p>
            </div>
            <div className="w-full lg:w-auto grid grid-cols-4 gap-2 text-center text-xs font-semibold">
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-primary-200">Gross</div>
                <div className="text-base font-extrabold">₹2,600</div>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-primary-200">− Transport</div>
                <div className="text-base font-extrabold">₹45</div>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-primary-200">− Mandi fee</div>
                <div className="text-base font-extrabold">₹15</div>
              </div>
              <div className="rounded-xl bg-accent-400 text-ink p-3">
                <div>Net</div>
                <div className="text-base font-extrabold">₹2,540</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
