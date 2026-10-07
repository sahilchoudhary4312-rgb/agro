import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={`card p-4 sm:p-5 ${onClick ? "cursor-pointer hover:shadow-pop transition-shadow" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  action,
}: {
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base sm:text-lg font-bold text-ink">{title}</h2>
      {action}
    </div>
  );
}

const TONES: Record<string, string> = {
  green: "bg-leaf-100 text-primary-800",
  amber: "bg-accent-100 text-accent-800",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  gray: "bg-gray-100 text-gray-600",
};

export function Badge({
  tone = "gray",
  children,
  className = "",
}: {
  tone?: "green" | "amber" | "red" | "blue" | "gray";
  children: ReactNode;
  className?: string;
}) {
  return <span className={`chip ${TONES[tone]} ${className}`}>{children}</span>;
}

export function DemoChip({ label, className = "" }: { label?: string; className?: string }) {
  return (
    <Badge tone="amber" className={`uppercase tracking-wide ${className}`}>
      {label ?? "DEMO DATA"}
    </Badge>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-10 ${className}`}>
      <div className="w-7 h-7 rounded-full border-[3px] border-leaf-200 border-t-primary-700 animate-spin" />
    </div>
  );
}

export function EmptyState({
  icon = "package",
  title,
  hint,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
}) {
  return (
    <div className="text-center py-12 px-4">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-leaf-100 text-primary-700 flex items-center justify-center mb-3">
        <Icon name={icon} className="w-6 h-6" />
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="text-sm text-ink-mute mt-1 max-w-xs mx-auto">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
        <Icon name="alert" className="w-6 h-6" />
      </div>
      <p className="font-semibold text-ink">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost mt-4">
          Try again
        </button>
      )}
    </div>
  );
}

export const inr = (v: number | null | undefined, decimals = 0) =>
  v == null || Number.isNaN(v)
    ? "—"
    : `₹${v.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}`;

export const num = (v: number | null | undefined, decimals = 1) =>
  v == null || Number.isNaN(v)
    ? "—"
    : v.toLocaleString("en-IN", { maximumFractionDigits: decimals });

export function Stat({
  label,
  value,
  sub,
  icon,
  tone = "green",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: IconName;
  tone?: "green" | "amber" | "blue" | "gray";
}) {
  const bg = { green: "bg-leaf-100 text-primary-700", amber: "bg-accent-100 text-accent-700", blue: "bg-blue-100 text-blue-600", gray: "bg-gray-100 text-gray-500" }[tone];
  return (
    <Card className="flex items-center gap-3">
      {icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
          <Icon name={icon} className="w-5 h-5" />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-xl font-extrabold leading-tight text-ink">{value}</div>
        <div className="text-xs text-ink-mute truncate">{label}</div>
        {sub && <div className="text-xs mt-0.5">{sub}</div>}
      </div>
    </Card>
  );
}

export function TrustBadges({
  trustScore,
  onTime,
  rating,
  verified,
  className = "",
}: {
  trustScore?: number | null;
  onTime?: number | null;
  rating?: number | null;
  verified?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {verified != null && (
        <Badge tone={verified ? "green" : "gray"}>
          <Icon name="shield" className="w-3 h-3" />
          {verified ? "Verified" : "Unverified"}
        </Badge>
      )}
      {trustScore != null && (
        <Badge tone="blue">
          <Icon name="star" className="w-3 h-3" /> Trust {Math.round(trustScore)}
        </Badge>
      )}
      {onTime != null && (
        <Badge tone="green">
          <Icon name="wallet" className="w-3 h-3" /> {onTime}% on-time
        </Badge>
      )}
      {rating != null && (
        <Badge tone="amber">
          <Icon name="star" className="w-3 h-3" /> {rating.toFixed(1)}★
        </Badge>
      )}
    </div>
  );
}
