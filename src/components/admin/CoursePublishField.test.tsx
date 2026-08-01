import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Form } from 'antd';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CoursePublishField } from './CoursePublishField';

beforeAll(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('CoursePublishField', () => {
  it('updates form isPublished when switch is toggled', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const captured: Array<{ isPublished?: boolean }> = [];

    function TestForm() {
      const [form] = Form.useForm();
      return (
        <Form form={form} initialValues={{ isPublished: false }}>
          <CoursePublishField title="Công khai khoá học" description="Cho phép học viên tìm thấy" />
          <button
            type="button"
            data-testid="capture"
            onClick={() => captured.push(form.getFieldsValue())}
          >
            Capture
          </button>
        </Form>
      );
    }

    await act(async () => {
      root.render(<TestForm />);
    });
    await act(async () => {
      container
        .querySelector('.ant-switch')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      container
        .querySelector('[data-testid="capture"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(captured[0]).toEqual({ isPublished: true });
    root.unmount();
    container.remove();
  });
});
