import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "@/lib/useApi";
import { Card, DemoChip, EmptyState, ErrorState, Spinner, inr, num } from "@/components/ui";
import { Icon } from "@/components/Icon";

interface Facility {
  id: string; name: string; facility_type: string;
  village: string; district: string;
  capacity_qtl: number; available_qtl: number;
  cost_per_qtl_month: number;
  suitable_crops: string[]; contact: string | null;
  distance_km: number | null;
}

export default function Storage() {
  const { t } = useTranslation();
  const profile = useApi<{ farmer: { latitude: number | null; longitude: number | null; district: string | null } }>("/farmers/profile");
  const f = profile.data?.farmer;

  const qs = new URLSearchParams();
  if (f?.latitude != null) qs.set("lat", String(f.latitude));
  if (f?.longitude != null) qs.set("lon", String(f.longitude));
  const storage = useApi<Facility[]>(`/logistics/storage?${qs}`, [f?.latitude, f?.longitude]);

  useEffect(() => { document.title = "Storage · AgriMitra"; }, []);

  const list = useMemo(() => storage.data ?? [], [storage.data]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold text-ink">
        {t("nav.storage")} <DemoChip className="ml-1 align-middle" />
      </h1>

      {profile.loading ? (
        <Spinner />
      ) : storage.loading ? (
        <Spinner />
      ) : storage.error ? (
            <ErrorState message={storage.error} onRetry={storage.refetch} />
          ) : list.length === 0 ? (
            <Card><EmptyState icon="warehouse" title="No storage facilities found" hint="Try again later or widen your district." /></Card>
          ) : (
            <div className="space-y-3">
              {list.map((s) => (
                <Card key={s.id}>
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Icon name="warehouse" className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-ink">{s.name}</div>
                      <div className="text-xs text-ink-mute">
                        {s.facility_type.replace(/_/g, " ")} · {s.village}, {s.district}
                        {s.distance_km != null && <> · {num(s.distance_km, 0)} km away</>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-ink-soft">
                        <span>{t("page.capacity")}: {num(s.capacity_qtl, 0)} qtl</span>
                        <span className="text-primary-700 font-semibold">{t("page.availableCap")}: {num(s.available_qtl, 0)} qtl</span>
                        <span>{t("page.rate")}: {inr(s.cost_per_qtl_month)}/qtl/month</span>
                      </div>
                      {s.suitable_crops.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {s.suitable_crops.slice(0, 6).map((c) => (
                            <span key={c} className="chip bg-gray-100 text-gray-600 text-[10px]">{c}</span>
                          ))}
                          {s.suitable_crops.length > 6 && <span className="text-[10px] text-ink-mute">+{s.suitable_crops.length - 6}</span>}
                        </div>
                      )}
                      <div className="mt-1.5 text-xs text-ink-mute">{t("page.contact")}: {s.contact ?? "—"}</div>
                    </div>
                  </div>
                </Card>
              ))}
              <div className="text-[11px] text-ink-mute">Distances are straight-line estimates on demo data.</div>
            </div>
          )}
    </div>
  );
}
