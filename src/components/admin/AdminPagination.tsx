interface AdminPaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

function getVisiblePages(page: number, totalPages: number): number[] {
  const pages: number[] = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

export default function AdminPagination({ page, totalPages, onChange }: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="lms-admin-pagination">
      <button
        className="lms-admin-pagination__btn"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        type="button"
      >
        ‹
      </button>
      {getVisiblePages(page, totalPages).map((p) => (
        <button
          key={p}
          className={
            p === page
              ? 'lms-admin-pagination__btn lms-admin-pagination__btn--active'
              : 'lms-admin-pagination__btn'
          }
          onClick={() => onChange(p)}
          type="button"
        >
          {p}
        </button>
      ))}
      <button
        className="lms-admin-pagination__btn"
        disabled={page >= totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        type="button"
      >
        ›
      </button>
    </div>
  );
}
