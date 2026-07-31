import type { ColumnsType, TableProps } from 'antd/es/table';
import { Table } from 'antd';

export interface DataTableColumn<RecordType extends { id: string }> extends Omit<
  ColumnsType<RecordType>[number],
  'key'
> {
  width?: number | string;
}

interface DataTableProps<RecordType extends { id: string }> extends Omit<
  TableProps<RecordType>,
  'columns'
> {
  columns: DataTableColumn<RecordType>[];
  dataSource?: RecordType[];
}

export function DataTable<RecordType extends { id: string }>({
  columns,
  dataSource,
  scroll,
  ...props
}: DataTableProps<RecordType>) {
  const tableColumns = columns.map((col) => ({
    ...col,
    width: col.width,
  }));

  return (
    <Table
      columns={tableColumns}
      dataSource={dataSource}
      rowKey="id"
      scroll={{ x: 'max-content', y: 600, ...scroll }}
      {...props}
    />
  );
}

export default DataTable;
