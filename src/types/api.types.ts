import { User } from "./user.types";

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  phone: string;
  password: string;
  fullName: string;
  role: string;
  nomCommercial?: string;
  adresse?: string;
  gouvernorat?: string;
  ville?: string;
  codePostal?: string;
  matricule?: string;
}
