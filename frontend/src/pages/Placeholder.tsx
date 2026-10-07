import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";

export default function Placeholder({ titleKey, note }: { titleKey: string; note?: string }) {
  const { t } = useTranslation();
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 w-12 h-12 rounded-2xl bg-accent-100 text-accent-700 flex items-center justify-center">
        <Icon name="settings" className="w-6 h-6" />
      </div>
      <h1 className="text-lg font-bold text-ink">{t(titleKey)}</h1>
      <p className="mt-1 max-w-sm text-sm text-ink-mute">
        {note ?? "This page is being built in the next phase of the prototype."}
      </p>
    </div>
  );
}
