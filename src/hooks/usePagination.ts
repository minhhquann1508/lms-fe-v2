import { useMemo, useState } from 'react';

export function usePagination(initialPage = 1, pageSize = 10, total = 0) {
  const [current, setCurrent] = useState(initialPage);

  return useMemo(
    () => ({
      current,
      pageSize,
      total,
      onChange: setCurrent,
      setCurrent,
    }),
    [current, pageSize, total],
  );
}
