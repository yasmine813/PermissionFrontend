import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { authApi } from "../services/api";
import { LoginRequest } from "../types/api.types";
import { User } from "../types/user.types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;

}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (token) {
        const { data } = await authApi.me(token);
        set({ user: data.data.user, accessToken: token, isInitialized: true });
      } else {
        set({ isInitialized: true });
      }
    } catch {
      await AsyncStorage.removeItem("accessToken");
      set({ isInitialized: true });
    }
  },

  login: async ({ email, password }) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login({ email, password });
      const { user, accessToken, refreshToken } = data.data;
      await AsyncStorage.setItem("accessToken", accessToken);
      await AsyncStorage.setItem("refreshToken", refreshToken);
      set({ user, accessToken, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem("accessToken");
    await AsyncStorage.removeItem("refreshToken");
    set({ user: null, accessToken: null });
  },
  updateUser: (data) => set(s => ({ user: s.user ? { ...s.user, ...data } : null })),
}));
