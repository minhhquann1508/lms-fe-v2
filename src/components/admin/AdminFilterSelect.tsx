import { Select } from 'antd';

interface AdminFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  ariaLabel?: string;
  style?: React.CSSProperties;
}

export default function AdminFilterSelect({ value, onChange, options, ariaLabel, style }: AdminFilterSelectProps) {
  return (
    <Select
      aria-label={ariaLabel}
      value={value}
      onChange={(v) => onChange(v as string)}
      options={options}
      style={{ minWidth: 160, ...style }}
    />
  );
}
