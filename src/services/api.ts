import axios from "axios";
import {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from "../types/api.types";
import { User } from "../types/user.types";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

export const authApi = {
  register: (data: RegisterRequest) =>
    api.post<ApiResponse<AuthResponse>>("/auth/register", data),
  login: (data: LoginRequest) =>
    api.post<ApiResponse<AuthResponse>>("/auth/login", data),
  me: (token: string) =>
    api.get<ApiResponse<{ user: User }>>("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const instructorApi = {
  getProfile: (token: string) =>
    api.get("/instructor", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateGeneral: (data: any, token: string) =>
    api.put("/instructor/general", data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateVehicle: (data: any, token: string) =>
    api.put("/instructor/vehicle", data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateVehiclePhotos: (photos: string[], token: string) =>
    api.put(
      "/instructor/vehicle/photos",
      { photos },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  updatePrices: (data: any, token: string) =>
    api.put("/instructor/prices", data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateContact: (data: any, token: string) =>
    api.put("/instructor/contact", data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getStudents: (params: { search?: string }, token: string) =>
    api.get("/instructor/students", {
      params,
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ← API publique pour les élèves (liste moniteurs)
export const instructorsApi = {
  getAll: (
    params: { gouvernorat?: string; ville?: string; permis?: string },
    token: string,
  ) =>
    api.get("/instructors", {
      params,
      headers: { Authorization: `Bearer ${token}` },
    }),
  getById: (id: string, token: string) =>
    api.get(`/instructors/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const userApi = {
  getProfile: (token: string) =>
    api.get("/users/profile", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateProfile: (data: { fullName?: string; phone?: string }, token: string) =>
    api.put("/users/profile", data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updatePassword: (
    data: { oldPassword: string; newPassword: string },
    token: string,
  ) =>
    api.put("/users/password", data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  savePushToken: (pushToken: string, token: string) =>
    api.put(
      "/users/push-token",
      { pushToken },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};

export const invitationsApi = {
  send: (receiverId: string, message: string | undefined, token: string) =>
    api.post(
      "/invitations",
      { receiverId, message },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  getReceived: (token: string) =>
    api.get("/invitations/received", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getSent: (token: string) =>
    api.get("/invitations/sent", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getMyInstructor: (token: string) =>
    api.get("/invitations/my-instructor", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getNotificationCount: (token: string) =>
    api.get("/invitations/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  accept: (id: string, token: string) =>
    api.put(
      `/invitations/${id}/accept`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  refuse: (id: string, token: string) =>
    api.put(
      `/invitations/${id}/refuse`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  cancel: (id: string, token: string) =>
    api.put(
      `/invitations/${id}/cancel`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ),

  getAll: (token: string) =>
    api.get("/invitations/all", {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const sessionsApi = {
  getStudentSessions: (token: string) =>
    api.get("/sessions/student", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  confirm: (id: string, token: string) =>
    api.put(
      `/sessions/${id}/confirm`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  refuse: (id: string, token: string) =>
    api.put(
      `/sessions/${id}/refuse`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  scanQr: (qrCode: string, token: string) =>
    api.post(
      "/sessions/qr-scan",
      { qrCode },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  validate: (id: string, token: string) =>
    api.put(
      `/sessions/${id}/validate`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  deleteSession: (id: string, token: string) =>
    api.delete(`/sessions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  disputeSession: (id: string, reason: string, token: string) =>
    api.put(
      `/sessions/${id}/dispute`,
      { reason },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};

export const notificationsApi = {
  getAll: (token: string) =>
    api.get("/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getCount: (token: string) =>
    api.get("/notifications/count", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  markRead: (id: string, token: string) =>
    api.put(
      `/notifications/${id}/read`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  markAllRead: (token: string) =>
    api.put(
      "/notifications/read-all",
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};

export const financeApi = {
  getFinance: (studentId: string, token: string) =>
    api.get(`/finance/${studentId}/finance`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updatePermit: (studentId: string, data: any, token: string) =>
    api.put(`/finance/${studentId}/permit`, data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  recordPayment: (studentId: string, amount: number, token: string) =>
    api.put(
      `/finance/${studentId}/payment`,
      { amount },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};
