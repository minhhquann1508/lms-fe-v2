import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Switch, message } from 'antd';
import { MinusOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { AdminButton, AdminPageHead, AdminSectionCard } from '@/components';
import { queryKeys } from '@/config/query-keys';
import { siteSettingService } from '@/services';
import { usePageTitle } from '@/hooks';
import type { SiteSetting } from '@/types';

export default function SiteSettingsPage() {
  usePageTitle('Cài đặt trang web');
  const queryClient = useQueryClient();
  const [form] = Form.useForm<SiteSetting>();

  const { data: settings, isLoading } = useQuery({
    queryKey: queryKeys.siteSettings.all,
    queryFn: () => siteSettingService.get(),
  });

  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        logoUrl: settings.logoUrl ?? '',
        logoAlt: settings.logoAlt ?? '',
        footerBrandName: settings.footerBrandName,
        heroTitle: settings.heroTitle,
        heroSubtitle: settings.heroSubtitle ?? '',
        heroDescription: settings.heroDescription ?? '',
        heroImageUrl: settings.heroImageUrl ?? '',
        heroShowStats: settings.heroShowStats,
        ctaTitle: settings.ctaTitle ?? '',
        ctaDescription: settings.ctaDescription ?? '',
        ctaButtonText: settings.ctaButtonText ?? '',
        footerCopyright: settings.footerCopyright ?? '',
        footerLinks:
          settings.footerLinks?.length > 0
            ? settings.footerLinks
            : [{ label: '', url: '' }],
      });
    }
  }, [settings, form]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SiteSetting>) => siteSettingService.update(data),
    onSuccess: () => {
      message.success('Đã lưu cài đặt');
      queryClient.invalidateQueries({ queryKey: queryKeys.siteSettings.all });
    },
    onError: () => message.error('Không thể lưu cài đặt'),
  });

  const handleSave = async () => {
    const values = await form.validateFields();
    updateMutation.mutate(values);
  };

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;
  }

  return (
    <div>
      <AdminPageHead
        title="Cài đặt trang web"
        subtitle="Quản lý nội dung hiển thị trên trang chủ, CTA, footer và logo."
        actions={
          <AdminButton
            variant="primary"
            icon={<SaveOutlined />}
            loading={updateMutation.isPending}
            onClick={handleSave}
          >
            Lưu thay đổi
          </AdminButton>
        }
      />

      <Form form={form} layout="vertical" className="lms-admin-setting-form" style={{ marginTop: 24 }}>
        <AdminSectionCard
          title="Logo & Thương hiệu"
          description="Logo hiển thị trên header và tên thương hiệu dùng ở footer."
        >
          <Form.Item label="Logo URL" name="logoUrl">
            <Input placeholder="https://example.com/logo.png" />
          </Form.Item>
          <Form.Item label="Logo alt text" name="logoAlt">
            <Input placeholder="Mô tả logo cho screen reader" />
          </Form.Item>
          <Form.Item
            label="Tên thương hiệu"
            name="footerBrandName"
            rules={[{ required: true, message: 'Vui lòng nhập tên thương hiệu' }]}
          >
            <Input placeholder="LMS Platform" />
          </Form.Item>
        </AdminSectionCard>

        <AdminSectionCard
          title="Hero Section"
          description="Phần hiển thị nổi bật trên đầu trang chủ."
        >
          <Form.Item
            label="Tiêu đề Hero"
            name="heroTitle"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề Hero' }]}
          >
            <Input.TextArea rows={2} placeholder="Phát triển bản thân mỗi ngày..." />
          </Form.Item>
          <Form.Item label="Badge / Subtitle" name="heroSubtitle">
            <Input placeholder="Nền tảng học tập số 1 Việt Nam" />
          </Form.Item>
          <Form.Item label="Mô tả" name="heroDescription">
            <Input.TextArea rows={3} placeholder="Hàng trăm khoá học online..." />
          </Form.Item>
          <Form.Item label="Hero image URL" name="heroImageUrl">
            <Input placeholder="https://example.com/hero.png" />
          </Form.Item>
          <Form.Item name="heroShowStats" valuePropName="checked">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--color-surface-muted)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Hiển thị thống kê</div>
                <div style={{ fontSize: 12, color: 'var(--color-textSecondary)' }}>
                  Hiển thị hàng số liệu (khoá học, học viên, giảng viên) dưới hero
                </div>
              </div>
              <Switch className="lms-custom-switch" />
            </div>
          </Form.Item>
        </AdminSectionCard>

        <AdminSectionCard
          title="CTA Section"
          description="Phần kêu gọi hành động ở cuối trang chủ."
        >
          <Form.Item label="Tiêu đề CTA" name="ctaTitle">
            <Input placeholder="Sẵn sàng bắt đầu hành trình học tập?" />
          </Form.Item>
          <Form.Item label="Mô tả CTA" name="ctaDescription">
            <Input.TextArea rows={2} placeholder="Tham gia cùng hàng ngàn học viên..." />
          </Form.Item>
          <Form.Item label="Text nút CTA" name="ctaButtonText">
            <Input placeholder="Khám phá ngay" />
          </Form.Item>
        </AdminSectionCard>

        <AdminSectionCard
          title="Footer"
          description="Thông tin copyright và links ở footer."
        >
          <Form.Item label="Copyright" name="footerCopyright">
            <Input placeholder="© 2024 LMS Platform. All rights reserved." />
          </Form.Item>
          <Form.Item label="Footer links">
            <Form.List name="footerLinks">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field) => (
                    <div key={field.key} className="lms-admin-footer-links__row">
                      <Form.Item
                        name={[field.name, 'label']}
                        rules={[{ required: true, message: 'Label' }]}
                      >
                        <Input placeholder="Tên link" />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'url']}
                        rules={[{ required: true, message: 'URL' }]}
                      >
                        <Input placeholder="/" />
                      </Form.Item>
                      <button
                        type="button"
                        className="lms-admin-footer-links__remove"
                        onClick={() => remove(field.name)}
                        aria-label="Xoá link"
                      >
                        <MinusOutlined />
                      </button>
                    </div>
                  ))}
                  <AdminButton
                    variant="outline"
                    size="sm"
                    icon={<PlusOutlined />}
                    onClick={() => add({ label: '', url: '' })}
                  >
                    Thêm link
                  </AdminButton>
                </>
              )}
            </Form.List>
          </Form.Item>
        </AdminSectionCard>
      </Form>
    </div>
  );
}
