import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Pagination, Tag, Typography } from 'antd';
import {
  BookOutlined,
  CodeOutlined,
  GlobalOutlined,
  RightOutlined,
  RocketOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  StarOutlined,
  TeamOutlined,
  TrophyOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { CourseCard, EmptyState, ErrorState, LoadingSkeleton } from '@/components';
import { queryKeys } from '@/config/query-keys';
import { categoryService, courseService, publicService, siteSettingService } from '@/services';
import { useDebounce, usePageTitle } from '@/hooks';

const { Title, Paragraph } = Typography;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  code: <CodeOutlined />,
  design: <RocketOutlined />,
  business: <ShoppingCartOutlined />,
  language: <GlobalOutlined />,
  music: <TrophyOutlined />,
};

export default function HomePage() {
  usePageTitle('Khám phá khoá học');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 350);
  const limit = 12;

  const statsQuery = useQuery({
    queryKey: ['public', 'stats'],
    queryFn: () => publicService.getStats(),
    staleTime: 300_000,
  });

  const { data: settings } = useQuery({
    queryKey: queryKeys.siteSettings.all,
    queryFn: () => siteSettingService.get(),
    staleTime: 300_000,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => categoryService.getAll(),
  });

  const featuredQuery = useQuery({
    queryKey: queryKeys.courses.list({
      limit: 6,
      sortBy: 'rating',
      sortOrder: 'DESC',
      isPublished: true,
    }),
    queryFn: () =>
      courseService.getAll({
        limit: 6,
        page: 1,
        sortBy: 'rating',
        sortOrder: 'DESC',
        isPublished: true,
      }),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.courses.list({
      page,
      limit,
      search: debouncedSearch,
      isPublished: true,
      categoryId: selectedCategory ?? undefined,
    }),
    queryFn: () =>
      courseService.getAll({
        page,
        limit,
        search: debouncedSearch,
        isPublished: true,
        categoryId: selectedCategory ?? undefined,
      }),
  });

  const stats = statsQuery.data ?? { totalCourses: 0, totalStudents: 0, averageRating: '0' };

  return (
    <div>
      {/* ── Section 1: Hero Banner ── */}
      <section className="lms-home-hero">
        <div className="lms-home-hero__bg" />
        <div className="lms-home-hero__inner">
          <div className="lms-home-hero__content">
            {settings?.heroSubtitle ? (
              <span className="lms-home-hero__badge">{settings.heroSubtitle}</span>
            ) : null}
            {settings?.heroTitle ? (
              <Title level={1} className="lms-home-hero__title">
                {settings.heroTitle.split('\n').map((line, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {line}
                  </span>
                ))}
              </Title>
            ) : (
              <Title level={1} className="lms-home-hero__title">
                Phát triển bản thân mỗi ngày
                <br />
                với <span className="lms-home-hero__highlight">khoá học chất lượng</span>
              </Title>
            )}
            {settings?.heroDescription ? (
              <Paragraph className="lms-home-hero__desc">
                {settings.heroDescription.split('\n').map((line, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {line}
                  </span>
                ))}
              </Paragraph>
            ) : null}
            <Input
              allowClear
              className="lms-home-hero__search"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Bạn muốn học gì hôm nay?"
              prefix={<SearchOutlined />}
              size="large"
              value={search}
            />
            {settings?.heroShowStats !== false ? (
              <div className="lms-home-hero__stats">
                <div className="lms-home-hero__stat">
                  <BookOutlined />
                  <div>
                    <strong>{stats.totalCourses}</strong>
                    <span>Khoá học</span>
                  </div>
                </div>
                <div className="lms-home-hero__stat">
                  <TeamOutlined />
                  <div>
                    <strong>{stats.totalStudents}</strong>
                    <span>Học viên</span>
                  </div>
                </div>
                <div className="lms-home-hero__stat">
                  <StarOutlined />
                  <div>
                    <strong>{stats.averageRating}</strong>
                    <span>Đánh giá</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="lms-home-hero__visual">
            <div className="lms-home-hero__shape lms-home-hero__shape--1" />
            <div className="lms-home-hero__shape lms-home-hero__shape--2" />
            <div className="lms-home-hero__shape lms-home-hero__shape--3" />
            <div className="lms-home-hero__illustration">
              <VideoCameraOutlined />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Categories ── */}
      {categoriesQuery.data && categoriesQuery.data.length > 0 ? (
        <section className="lms-home-section">
          <div className="lms-home-section__inner">
            <div className="lms-home-section__title">
              <Title level={2}>Khám phá theo lĩnh vực</Title>
              <Paragraph type="secondary">
                Chọn danh mục phù hợp với mục tiêu học tập của bạn
              </Paragraph>
            </div>
            <div className="lms-home-categories">
              {categoriesQuery.data.map((cat) => (
                <button
                  key={cat.id}
                  className={`lms-home-category-card ${selectedCategory === cat.id ? 'lms-home-category-card--active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(selectedCategory === cat.id ? null : cat.id);
                    setPage(1);
                  }}
                  type="button"
                >
                  <span className="lms-home-category-card__icon">
                    {CATEGORY_ICONS[cat.slug] ?? <BookOutlined />}
                  </span>
                  <span className="lms-home-category-card__name">{cat.name}</span>
                  <RightOutlined className="lms-home-category-card__arrow" />
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Section 3: Featured Courses ── */}
      {featuredQuery.data && featuredQuery.data.items.length > 0 ? (
        <section className="lms-home-section lms-home-section--alt">
          <div className="lms-home-section__inner">
            <div className="lms-home-section__title lms-home-section__title--row">
              <div>
                <Title level={2}>Khoá học nổi bật</Title>
                <Paragraph type="secondary">
                  Những khoá học được đánh giá cao nhất từ cộng đồng
                </Paragraph>
              </div>
              <span className="lms-home-section__badge">
                <StarOutlined /> Top đánh giá
              </span>
            </div>
            <div className="lms-grid lms-grid--courses">
              {featuredQuery.data.items.map((course) => (
                <div key={course.id} className="lms-home-featured-item">
                  <CourseCard course={course} href={`/courses/${course.id}`} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Section 4: Categories pills + All Courses ── */}
      <section className="lms-home-section">
        <div className="lms-home-section__inner">
          <div className="lms-home-section__title">
            <Title level={2}>Tất cả khoá học</Title>
            <Paragraph type="secondary">
              {search
                ? `Kết quả tìm kiếm cho "${search}"`
                : 'Khám phá toàn bộ khoá học trên nền tảng'}
            </Paragraph>
          </div>

          {categoriesQuery.data && categoriesQuery.data.length > 0 ? (
            <div className="lms-home-pills">
              <Tag.CheckableTag
                checked={selectedCategory === null}
                onChange={() => {
                  setSelectedCategory(null);
                  setPage(1);
                }}
              >
                Tất cả
              </Tag.CheckableTag>
              {categoriesQuery.data.map((cat) => (
                <Tag.CheckableTag
                  checked={selectedCategory === cat.id}
                  key={cat.id}
                  onChange={() => {
                    setSelectedCategory(selectedCategory === cat.id ? null : cat.id);
                    setPage(1);
                  }}
                >
                  {cat.name}
                </Tag.CheckableTag>
              ))}
            </div>
          ) : null}

          {isLoading ? <LoadingSkeleton count={8} variant="card" /> : null}

          {isError ? <ErrorState onRetry={() => refetch()} /> : null}

          {!isLoading && !isError && !data?.items?.length ? (
            <EmptyState
              description="Thử đổi từ khoá tìm kiếm hoặc quay lại sau khi có khoá học mới."
              icon={<BookOutlined />}
              title="Không tìm thấy khoá học"
            />
          ) : null}

          {!isLoading && !isError && data?.items?.length ? (
            <>
              <div className="lms-grid lms-grid--courses">
                {data.items.map((course) => (
                  <CourseCard key={course.id} course={course} href={`/courses/${course.id}`} />
                ))}
              </div>

              {data.total > limit ? (
                <div className="lms-home-pagination">
                  <Pagination
                    current={page}
                    onChange={setPage}
                    pageSize={limit}
                    showSizeChanger={false}
                    total={data.total}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </section>

      {/* ── Section 5: CTA ── */}
      <section className="lms-home-cta">
        <div className="lms-home-cta__bg" />
        <div className="lms-home-cta__inner">
          {settings?.ctaTitle ? (
            <Title level={2} className="lms-home-cta__title">
              {settings.ctaTitle}
            </Title>
          ) : null}
          {settings?.ctaDescription ? (
            <Paragraph className="lms-home-cta__desc">
              {settings.ctaDescription.split('\n').map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </Paragraph>
          ) : null}
          <Button
            className="lms-home-cta__btn"
            icon={<RocketOutlined />}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            size="large"
            type="primary"
          >
            {settings?.ctaButtonText ?? 'Khám phá ngay'}
          </Button>
        </div>
      </section>
    </div>
  );
}
