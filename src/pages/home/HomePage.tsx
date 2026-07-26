import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input, Pagination, Typography } from 'antd';
import { BookOutlined, SearchOutlined, StarOutlined } from '@ant-design/icons';
import { CourseCard, EmptyState, ErrorState, LoadingSkeleton } from '@/components';
import { GeometricBg } from '@/components';
import { queryKeys } from '@/config/query-keys';
import { categoryService, courseService, publicService, siteSettingService } from '@/services';
import { useDebounce, usePageTitle } from '@/hooks';

const { Title, Paragraph } = Typography;

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
      {/* ── Section 1: Hero ── */}
      <section className="lms-home-hero">
        <GeometricBg />
        <div className="lms-home-hero__inner">
          {settings?.heroSubtitle ? (
            <span className="lms-home-hero__badge">{settings.heroSubtitle}</span>
          ) : null}

          <h1 className="lms-home-hero__title">
            {(settings?.heroTitle ?? 'Phát triển bản thân mỗi ngày với khoá học chất lượng')
              .split('\n')
              .map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
          </h1>

          {settings?.heroDescription ? (
            <p className="lms-home-hero__desc">
              {settings.heroDescription.split('\n').map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
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
                <div>
                  <strong>{stats.totalCourses}</strong>
                  <span>Khoá học</span>
                </div>
              </div>
              <div className="lms-home-hero__stat-divider" />
              <div className="lms-home-hero__stat">
                <div>
                  <strong>{stats.totalStudents}</strong>
                  <span>Học viên</span>
                </div>
              </div>
              <div className="lms-home-hero__stat-divider" />
              <div className="lms-home-hero__stat">
                <div>
                  <strong>{stats.averageRating}</strong>
                  <span>Đánh giá</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* ── Section 2: Featured Courses ── */}
      {featuredQuery.data && featuredQuery.data.items.length > 0 ? (
        <section className="lms-section lms-section--alt">
          <div className="lms-shell">
            <div className="lms-section__header">
              <div>
                <h2 className="lms-section__title">Khoá học nổi bật</h2>
                <p className="lms-section__subtitle">
                  Những khoá học được đánh giá cao nhất từ cộng đồng
                </p>
              </div>
              <span className="lms-section__badge">
                <StarOutlined /> Top đánh giá
              </span>
            </div>
            <div className="lms-course-grid">
              {featuredQuery.data.items.map((course) => (
                <CourseCard key={course.id} course={course} href={`/courses/${course.id}`} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Section 3: All Courses ── */}
      <section className="lms-section">
        <div className="lms-shell">
          <div className="lms-section__header">
            <div>
              <h2 className="lms-section__title">Tất cả khoá học</h2>
              <p className="lms-section__subtitle">
                {search
                  ? `Kết quả tìm kiếm cho "${search}"`
                  : 'Khám phá toàn bộ khoá học trên nền tảng'}
              </p>
            </div>
          </div>

          {categoriesQuery.data && categoriesQuery.data.length > 0 ? (
            <div className="lms-pills">
              <button
                className={`lms-pill${selectedCategory === null ? ' lms-pill--active' : ''}`}
                onClick={() => {
                  setSelectedCategory(null);
                  setPage(1);
                }}
                type="button"
              >
                Tất cả
              </button>
              {categoriesQuery.data.map((cat) => (
                <button
                  key={cat.id}
                  className={`lms-pill${selectedCategory === cat.id ? ' lms-pill--active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(selectedCategory === cat.id ? null : cat.id);
                    setPage(1);
                  }}
                  type="button"
                >
                  {cat.name}
                </button>
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
              <div className="lms-course-grid">
                {data.items.map((course) => (
                  <CourseCard key={course.id} course={course} href={`/courses/${course.id}`} />
                ))}
              </div>

              {data.total > limit ? (
                <div className="lms-pagination">
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

      {/* ── Section 4: CTA ── */}
      <section className="lms-home-cta">
        <div className="lms-home-cta__inner">
          {settings?.ctaTitle ? (
            <Title level={2} className="lms-home-cta__title">
              {settings.ctaTitle}
            </Title>
          ) : (
            <Title level={2} className="lms-home-cta__title">
              Bắt đầu hành trình học tập của bạn ngay hôm nay
            </Title>
          )}
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
          <button
            className="lms-home-cta__btn"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            {settings?.ctaButtonText ?? 'Khám phá ngay'} →
          </button>
        </div>
      </section>
    </div>
  );
}
