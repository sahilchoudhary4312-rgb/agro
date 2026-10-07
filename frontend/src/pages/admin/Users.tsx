import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, errMessage } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Badge, Card, DemoChip, EmptyState, ErrorState, Spinner } from "@/components/ui";
import { Icon } from "@/components/Icon";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  is_active: boolean;
  created_at: string | null;
  business_name?: string;
  buyer_id?: string;
  verification_status?: string;
  trust_score?: number;
  district?: string;
  village?: string;
  fpo_name?: string;
}

const ROLES = ["all", "farmer", "buyer", "fpo", "admin"] as const;

const VERIF_TONE: Record<string, "green" | "amber" | "red" | "gray"> = {
  verified: "green", pending: "amber", rejected: "red",
};

export default function AdminUsers() {
  const { t } = useTranslation();
  const [role, setRole] = useState<(typeof ROLES)[number]>("all");
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");

  const params = new URLSearchParams();
  if (role !== "all") params.set("role", role);
  if (appliedQ) params.set("q", appliedQ);
  const users = useApi<AdminUser[]>(`/admin/users?${params.toString()}`, [role, appliedQ]);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => { document.title = "Users · AgriMitra"; }, []);

  const notify = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 2500);
  };

  const setActive = async (u: AdminUser, active: boolean) => {
    setBusyId(u.id);
    setError("");
    try {
      await api.put(`/admin/users/${u.id}/active?active=${active}`);
      notify(`${u.full_name} ${active ? "activated" : "deactivated"}`);
      users.refetch();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const setVerification = async (u: AdminUser, decision: "verified" | "rejected" | "pending") => {
    if (!u.buyer_id) return;
    setBusyId(u.id);
    setError("");
    try {
      await api.put(`/admin/buyers/${u.buyer_id}/verification?decision=${decision}`);
      notify(`${u.business_name ?? u.full_name} marked ${decision}`);
      users.refetch();
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const input = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary-600 focus:outline-none";

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{t("nav.users")} <DemoChip className="ml-1 align-middle" /></h1>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-1.5 overflow-x-auto">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold capitalize whitespace-nowrap ${
                role === r ? "bg-primary-700 text-white" : "bg-leaf-50 text-ink-soft hover:bg-leaf-100"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2 flex-1 sm:ml-auto sm:max-w-xs"
          onSubmit={(e) => { e.preventDefault(); setAppliedQ(q.trim()); }}
        >
          <input className={input} placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="btn-ghost !px-3" aria-label={t("common.search")}>
            <Icon name="search" className="w-4 h-4" />
          </button>
        </form>
      </div>

      {flash && <div className="rounded-xl bg-leaf-100 text-primary-800 px-4 py-2.5 text-sm font-semibold">{flash}</div>}
      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">{error}</div>}

      {users.loading ? (
        <Spinner />
      ) : users.error ? (
        <ErrorState message={users.error} onRetry={users.refetch} />
      ) : (users.data ?? []).length === 0 ? (
        <Card><EmptyState icon="users" title="No users found" hint="Try a different role filter or search term." /></Card>
      ) : (
        <div className="space-y-2">
          {(users.data ?? []).map((u) => (
            <Card key={u.id}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-ink">{u.full_name}</span>
                    <Badge tone={u.role === "farmer" ? "green" : u.role === "buyer" ? "blue" : "gray"}>
                      {t(`roles.${u.role}`)}
                    </Badge>
                    {u.verification_status && (
                      <Badge tone={VERIF_TONE[u.verification_status] ?? "gray"}>{u.verification_status}</Badge>
                    )}
                    {!u.is_active && <Badge tone="red">deactivated</Badge>}
                  </div>
                  <div className="text-xs text-ink-mute mt-0.5 truncate">
                    {u.email}
                    {u.business_name ? ` · ${u.business_name}` : ""}
                    {u.district ? ` · ${u.village ?? ""}${u.village ? ", " : ""}${u.district}` : ""}
                    {u.fpo_name ? ` · ${u.fpo_name}` : ""}
                    {u.trust_score != null ? ` · trust ${Math.round(u.trust_score)}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  {u.role === "buyer" && (
                    <>
                      {u.verification_status !== "verified" && (
                        <button onClick={() => setVerification(u, "verified")} disabled={busyId === u.id} className="btn-primary !py-1.5 text-xs inline-flex items-center gap-1">
                          <Icon name="check" className="w-3.5 h-3.5" /> Verify
                        </button>
                      )}
                      {u.verification_status !== "rejected" && (
                        <button onClick={() => setVerification(u, "rejected")} disabled={busyId === u.id} className="btn-ghost !py-1.5 text-xs !text-red-600">
                          Reject
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => setActive(u, !u.is_active)}
                    disabled={busyId === u.id}
                    className="btn-ghost !py-1.5 text-xs"
                  >
                    {u.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </Card>
          ))}
          <div className="text-[11px] text-ink-mute">Showing {(users.data ?? []).length} of up to 200 users · demo data</div>
        </div>
      )}
    </div>
  );
}
