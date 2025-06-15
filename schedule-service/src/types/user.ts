export interface User {
  id: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  userId: string;
  password: string;
}

export interface LoginRequest {
  userId: string;
  password: string;
}

export interface UserSession {
  id: string;
}