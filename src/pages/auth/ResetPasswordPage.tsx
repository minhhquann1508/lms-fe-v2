import { Button, Form, Input, Typography, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '@/services';
import { usePageTitle } from '@/hooks';

const { Title, Text } = Typography;

export default function ResetPasswordPage() {
  usePageTitle('Đặt lại mật khẩu');
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  if (!token || !email) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <Title level={3}>Liên kết không hợp lệ</Title>
        <Text type="secondary">Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</Text>
        <div style={{ marginTop: 24 }}>
          <Button type="primary" onClick={() => navigate('/auth')}>
            Đến trang đăng nhập
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (values: { password: string; confirmPassword: string }) => {
    if (values.password !== values.confirmPassword) {
      message.error('Mật khẩu xác nhận không khớp');
      return;
    }

    if (values.password.length < 6) {
      message.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, email, values.password);
      message.success('Mật khẩu đã được đặt lại thành công!');
      navigate('/auth');
    } catch {
      message.error('Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <LockOutlined style={{ fontSize: 40, color: '#1677ff', marginBottom: 12 }} />
        <Title level={3} style={{ marginBottom: 4 }}>Đặt lại mật khẩu</Title>
        <Text type="secondary">Nhập mật khẩu mới cho tài khoản {email}</Text>
      </div>

      <Form layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="password"
          label="Mật khẩu mới"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
          ]}
        >
          <Input.Password size="large" placeholder="Mật khẩu mới" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Xác nhận mật khẩu"
          rules={[
            { required: true, message: 'Vui lòng xác nhận mật khẩu' },
          ]}
        >
          <Input.Password size="large" placeholder="Xác nhận mật khẩu" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            Đặt lại mật khẩu
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
