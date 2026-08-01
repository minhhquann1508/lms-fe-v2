import { Form, Switch } from 'antd';

interface CoursePublishFieldProps {
  title: string;
  description: string;
  initialValue?: boolean;
  className?: string;
}

export function CoursePublishField({
  title,
  description,
  initialValue,
  className,
}: CoursePublishFieldProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '12px 16px',
        background: 'var(--color-surface-muted)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{description}</div>
      </div>
      <Form.Item
        name="isPublished"
        valuePropName="checked"
        initialValue={initialValue}
        style={{ margin: 0, flexShrink: 0 }}
      >
        <Switch className="lms-custom-switch" />
      </Form.Item>
    </div>
  );
}

export default CoursePublishField;
