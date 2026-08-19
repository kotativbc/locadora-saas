import type { BadgeVariant } from './StatusBadge';

export interface StatusOption {
  value: string;
  label: string;
  variant: BadgeVariant;
}

export function StatusSelect({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: StatusOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <select
      className={`status-select status-select--${current?.variant ?? 'neutral'}`}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
