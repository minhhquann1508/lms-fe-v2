export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  relatedEnrollmentId: string | null;
  createdAt: string;
  updatedAt: string;
}
