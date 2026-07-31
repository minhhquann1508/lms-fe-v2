interface AdminSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

export default function AdminSearchInput({ value, onChange, placeholder = 'Tìm kiếm...', id }: AdminSearchInputProps) {
  return (
    <div className="lms-admin-search">
      <input
        type="text"
        className="lms-admin-search__input"
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
