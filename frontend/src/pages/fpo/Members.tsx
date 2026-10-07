import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "@/lib/useApi";
import { Card, DemoChip, EmptyState, ErrorState, Spinner, num } from "@/components/ui";

interface Member {
  farmer_id: string;
  name: string;
  village: string;
  district: string;
  land_size_acres: number | null;
  phone: string | null;
}

export default function FpoMembers() {
  const { t } = useTranslation();
  const profile = useApi<{ members: Member[] }>("/fpos/me");

  useEffect(() => { document.title = "Members · AgriMitra"; }, []);

  const members = profile.data?.members ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold text-ink">
        {t("nav.members")} <span className="text-sm font-semibold text-ink-mute">({members.length})</span> <DemoChip className="ml-1 align-middle" />
      </h1>

      {profile.loading ? (
        <Spinner />
      ) : profile.error ? (
        <ErrorState message={profile.error} onRetry={profile.refetch} />
      ) : members.length === 0 ? (
        <Card><EmptyState icon="users" title="No members yet" hint="Farmers linked to this FPO will appear here." /></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto -m-1 p-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-mute uppercase tracking-wide">
                  <th className="py-2 pr-3 font-semibold">Farmer</th>
                  <th className="py-2 pr-3 font-semibold">Village</th>
                  <th className="py-2 pr-3 font-semibold">District</th>
                  <th className="py-2 pr-3 font-semibold">Land (acres)</th>
                  <th className="py-2 font-semibold">Phone</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.farmer_id} className="border-t border-gray-100">
                    <td className="py-2.5 pr-3 font-semibold text-ink">{m.name}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">{m.village ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">{m.district ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">{m.land_size_acres != null ? num(m.land_size_acres, 1) : "—"}</td>
                    <td className="py-2.5 text-ink-soft">{m.phone ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-[11px] text-ink-mute">
        Demo data — member details come from the seeded database. Only name, location and land size are shown; no sensitive data.
      </p>
    </div>
  );
}
