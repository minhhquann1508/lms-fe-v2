interface AdminFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  ariaLabel?: string;
}

export default function AdminFilterSelect({ value, onChange, options, ariaLabel }: AdminFilterSelectProps) {
  return (
    <select
      className="lms-admin-filter-select"
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
