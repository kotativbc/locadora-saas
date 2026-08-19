export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function StatusBadge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return <span className={`badge badge--${variant}`}>{label}</span>;
}
