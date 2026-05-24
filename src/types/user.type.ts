export interface User {
  id: string;
  email: string;
  fullName: string;
  avatar: string | null;
  roleCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
