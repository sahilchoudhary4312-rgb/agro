import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";

export function OfflineBanner() {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-x-0 bottom-14 z-40 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-semibold text-white lg:bottom-0">
      <Icon name="cloudOff" className="h-4 w-4" />
      {t("common.offline")}
    </div>
  );
}
