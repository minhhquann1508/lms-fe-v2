import { Alert, Button, Result } from 'antd';

export interface ErrorStateProps {
  /** Human-readable explanation of the failed request. */
  message?: string;
  /** Retry callback that re-runs the failed request. */
  onRetry?: () => void;
  /** Whether the error should preserve surrounding content as an inline banner. */
  inline?: boolean;
}

export function ErrorState({ message, onRetry, inline = false }: ErrorStateProps) {
  const text = (message || 'Không tải được dữ liệu. Vui lòng thử lại.').slice(0, 100);

  if (inline) {
    return (
      <Alert
        action={onRetry ? <Button onClick={onRetry}>Thử lại</Button> : undefined}
        message={text}
        showIcon
        type="error"
      />
    );
  }

  return (
    <Result
      extra={
        onRetry ? (
          <Button type="primary" onClick={onRetry}>
            Thử lại
          </Button>
        ) : null
      }
      status="error"
      title={text}
    />
  );
}
