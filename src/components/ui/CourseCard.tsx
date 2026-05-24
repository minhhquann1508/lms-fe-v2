import { Card, Progress, Tag, Typography } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { Course } from '@/types';

const { Text, Paragraph } = Typography;

export interface CourseCardProps {
  /** Course data displayed inside the card. */
  course?: Partial<Course> | null;
  /** Destination path opened when the card is clicked. */
  href?: string;
  /** Optional progress percentage for enrolled courses. */
  progress?: number;
  /** Optional status label rendered below progress. */
  statusLabel?: string;
  /** Optional right-side action area for admin controls. */
  actions?: React.ReactNode;
}

function truncateDescription(value?: string) {
  if (!value) return '';
  return value.length > 100 ? `${value.slice(0, 100).trim()}...` : value;
}

function CourseCover({ thumbnail, title }: { thumbnail?: string | null; title: string }) {
  const [failed, setFailed] = useState(false);

  if (!thumbnail || failed) {
    return (
      <div className="lms-course-card__placeholder" role="img" aria-label="Ảnh khoá học mặc định">
        <BookOutlined />
      </div>
    );
  }

  return (
    <img
      alt={title}
      className="lms-course-card__image"
      onError={() => setFailed(true)}
      src={thumbnail}
    />
  );
}

export function CourseCard({ course, href, progress, statusLabel, actions }: CourseCardProps) {
  const title = course?.name || 'Khoá học chưa đặt tên';
  const author = course?.author?.fullName || '';
  const duration = Math.round(((course?.duration ?? 0) || 0) / 60);
  const price = course?.price ?? 0;

  const card = (
    <Card
      className="lms-course-card lms-animate-fade-up"
      cover={<CourseCover thumbnail={course?.thumbnail} title={title} />}
      hoverable
    >
      <div className="lms-course-card__body">
        <div className="lms-course-card__main">
          <Text strong className="lms-course-card__title">
            {title}
          </Text>
          {author ? <Text className="lms-course-card__author">{author}</Text> : null}
          {course?.category ? (
            <Tag color="geekblue" style={{ width: 'fit-content', fontSize: 11 }}>
              {course.category.name}
            </Tag>
          ) : null}
          <Paragraph className="lms-course-card__description">
            {truncateDescription(course?.description)}
          </Paragraph>
        </div>
        {typeof progress === 'number' ? (
          <Progress percent={Math.round(progress)} size="small" />
        ) : null}
        <div className="lms-course-card__footer">
          <Tag>{duration > 0 ? `${duration} phút` : 'Linh hoạt'}</Tag>
          <Text strong className="lms-course-card__price">
            {price > 0 ? `${price.toLocaleString()}đ` : 'Miễn phí'}
          </Text>
        </div>
        {statusLabel || actions ? (
          <div className="lms-course-card__actions">
            {statusLabel ? <Tag color="blue">{statusLabel}</Tag> : <span />}
            {actions}
          </div>
        ) : null}
        {href ? (
          <div className="lms-course-card__detail-wrap">
            <Link className="lms-course-card__detail-link" to={href}>
              Xem chi tiết <span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : null}
      </div>
    </Card>
  );

  if (!href) return card;

  return (
    <Link className="lms-card-link" to={href}>
      {card}
    </Link>
  );
}
