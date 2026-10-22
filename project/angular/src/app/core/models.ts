export type Role = 'student' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  rollNo?: string;
  course?: string;
  phone?: string;
  avatar?: string;
  createdAt?: string;
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  isbn?: string;
  category?: string;
  publishedYear?: number;
  copies: number;
  description?: string;
  coverImage?: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
