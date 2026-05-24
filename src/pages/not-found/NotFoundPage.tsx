import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks';

export default function NotFoundPage() {
  const navigate = useNavigate();
  usePageTitle('Không tìm thấy trang');

  return (
    <Result
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          Về trang chủ
        </Button>
      }
      status="404"
      subTitle="Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển."
      title="Không tìm thấy trang"
    />
  );
}
