import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Badge, Card, DemoChip, EmptyState, ErrorState, Spinner } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";

interface Notif {
  id: string; type: string; title: string; body: string | null;
  ref_type: string | null; ref_id: string | null;
  is_read: boolean; created_at: string;
}

const TYPE_ICON: Record<string, IconName> = {
  offer: "doc", offer_update: "doc", transaction: "receipt",
  price_alert: "trendUp", system: "bell", requirement: "clipboard",
};

export default function Notifications() {
  const { t } = useTranslation();
  const notifs = useApi<{ unread: number; notifications: Notif[] }>("/notifications");

  useEffect(() => { document.title = "Notifications · AgriMitra"; }, []);

  const markAll = async () => {
    await api.post("/notifications/read-all");
    notifs.refetch();
  };

  const markOne = async (id: string) => {
    await api.post(`/notifications/${id}/read`);
    notifs.refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-extrabold text-ink">
          {t("nav.notifications")}
          {notifs.data && notifs.data.unread > 0 && <Badge tone="amber" className="ml-2">{notifs.data.unread} {t("page.unreadCount")}</Badge>}
          <DemoChip className="ml-1 align-middle" />
        </h1>
        {notifs.data && notifs.data.unread > 0 && (
          <button onClick={markAll} className="btn-ghost !py-2 text-xs">{t("page.markAllRead")}</button>
        )}
      </div>

      {notifs.loading ? (
        <Spinner />
      ) : notifs.error ? (
        <ErrorState message={notifs.error} onRetry={notifs.refetch} />
      ) : !notifs.data?.notifications.length ? (
        <Card><EmptyState icon="bell" title="No notifications" hint="Offers, transaction updates and price alerts will appear here." /></Card>
      ) : (
        <div className="space-y-2">
          {notifs.data.notifications.map((n) => (
            <Card
              key={n.id}
              className={`!p-4 flex items-start gap-3 ${!n.is_read ? "!border-primary-200 bg-leaf-50/50" : ""}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${!n.is_read ? "bg-primary-700 text-white" : "bg-gray-100 text-gray-500"}`}>
                <Icon name={TYPE_ICON[n.type] ?? "bell"} className="w-4.5 h-4.5 w-[18px] h-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${!n.is_read ? "font-bold text-ink" : "font-semibold text-ink-soft"}`}>{n.title}</span>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-accent-500 shrink-0" />}
                </div>
                {n.body && <div className="text-xs text-ink-soft mt-0.5">{n.body}</div>}
                <div className="text-[10px] text-ink-mute mt-1">{new Date(n.created_at).toLocaleString("en-IN")}</div>
              </div>
              {!n.is_read && (
                <button onClick={() => markOne(n.id)} className="text-[11px] font-semibold text-primary-700 hover:underline shrink-0">
                  {t("page.markRead")}
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
