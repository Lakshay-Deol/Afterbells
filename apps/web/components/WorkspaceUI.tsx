import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";

export function ErrorState({
  error,
  retry,
  id,
}: {
  error: Error | null;
  id?: string;
  retry?: () => void;
}) {
  if (!error) return null;
  return (
    <div id={id} className="error-state" role="alert">
      <AlertTriangle size={18} />
      <div>
        <strong>Request could not be completed</strong>
        <p>{error.message}</p>
      </div>
      {retry && (
        <button className="secondary-action" onClick={retry}>
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  children,
  href,
  action,
}: {
  title: string;
  children: ReactNode;
  href?: string;
  action?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark" aria-hidden="true">
        —
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      {href && (
        <Link className="text-action" href={href}>
          {action ?? "Open workspace"}
          <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note: string;
}) {
  return (
    <div className="workspace-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
export function LoadingState({ children }: { children: ReactNode }) {
  return (
    <div className="workspace-loading" role="status">
      <span className="loading-rule" />
      <p>{children}</p>
    </div>
  );
}
