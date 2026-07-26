import { useState, useEffect, useCallback } from 'react';
import { Modal, Input, message } from 'antd';
import { AdminButton } from '@/components';

export interface PickerItem {
  id: string;
  cells: React.ReactNode[];
  cols?: number;
}

interface ItemPickerModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  fetchItems: (params: { search: string; page: number; limit: number }) => Promise<{
    items: PickerItem[];
    total: number;
  }>;
  placeholder?: string;
  itemLabel?: string;
  onSubmit: (selectedIds: string[]) => Promise<void>;
  loading?: boolean;
}

export default function ItemPickerModal({
  open,
  onClose,
  title,
  fetchItems,
  placeholder = 'Tìm kiếm...',
  itemLabel = 'mục',
  onSubmit,
  loading = false,
}: ItemPickerModalProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PickerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const limit = 10;

  const loadItems = useCallback(async () => {
    try {
      const res = await fetchItems({ search, page, limit });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setItems([]);
    }
  }, [fetchItems, search, page]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setPage(1);
      setSelectedIds(new Set());
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open, loadItems]);

  const totalPages = Math.ceil(total / limit);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      message.warning('Vui lòng chọn ít nhất một ' + itemLabel);
      return;
    }
    await onSubmit(Array.from(selectedIds));
  };

  const cols = items[0]?.cols ?? 2;

  return (
    <Modal
      className="lms-picker-modal"
      open={open}
      onCancel={loading ? undefined : onClose}
      title={title}
      width={600}
      footer={
        <div className="lms-picker-modal__footer">
          <span className="lms-picker-modal__count">
            Đã chọn: <strong>{selectedIds.size}</strong> {itemLabel}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <AdminButton variant="outline" onClick={onClose} disabled={loading}>
              Huỷ
            </AdminButton>
            <AdminButton variant="primary" onClick={handleSubmit} loading={loading}>
              Thêm
            </AdminButton>
          </div>
        </div>
      }
    >
      <div className="lms-picker-modal__search">
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
            setSelectedIds(new Set());
          }}
          allowClear
          size="large"
        />
      </div>
      <div className="lms-picker-modal__table">
        <table>
          <thead>
            <tr>
              <th className="lms-picker-modal__checkbox">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>#</th>
              <th>Tên</th>
              {cols > 1 ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={cols + 2} style={{ textAlign: 'center', padding: 40, color: 'var(--color-textDisabled)' }}>
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr
                  key={item.id}
                  className={selectedIds.has(item.id) ? 'lms-picker-modal__row--selected' : ''}
                  onClick={() => toggleSelect(item.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="lms-picker-modal__checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                    />
                  </td>
                  <td style={{ color: 'var(--color-textDisabled)', fontSize: 12, width: 40 }}>
                    {(page - 1) * limit + idx + 1}
                  </td>
                  {item.cells.map((cell, ci) => (
                    <td key={ci}>{cell}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="lms-admin-pagination" style={{ borderTop: '1px solid var(--color-hairline-soft)' }}>
          <button
            className="lms-admin-pagination__btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            type="button"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={
                p === page
                  ? 'lms-admin-pagination__btn lms-admin-pagination__btn--active'
                  : 'lms-admin-pagination__btn'
              }
              onClick={() => setPage(p)}
              type="button"
            >
              {p}
            </button>
          ))}
          <button
            className="lms-admin-pagination__btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            type="button"
          >
            ›
          </button>
        </div>
      )}
    </Modal>
  );
}
