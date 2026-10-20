
import axios from "axios";

const DEFAULT_API_ORIGIN = "http://127.0.0.1:8000";
const configuredApiOrigin = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL = `${(configuredApiOrigin || DEFAULT_API_ORIGIN).replace(/\/+$/, "").replace(/\/api$/i, "")}/api`;
const TOKEN_KEY = "teamforge_token";

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface ApiUserResponse {
  user: User;
}

export interface ProfileUpdateResponse {
  message: string;
  user: User;
}

export interface ProfilePhotoResponse {
  message: string;
  user: User;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const authApi = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/register", data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/login", data);
    return response.data;
  },

  me: async (): Promise<User> => {
    const response = await api.get<ApiUserResponse>("/user");
    return response.data.user;
  },

  updateProfile: async (name: string): Promise<User> => {
    const response = await api.patch<ProfileUpdateResponse>("/profile", { name });
    return response.data.user;
  },

  uploadProfilePhoto: async (photo: File, onUploadProgress?: (progress: number) => void): Promise<User> => {
    const formData = new FormData();
    formData.append("photo", photo);
    const response = await api.post<ProfilePhotoResponse>("/profile/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total) onUploadProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });
    return response.data.user;
  },

  removeProfilePhoto: async (): Promise<User> => {
    const response = await api.delete<ProfilePhotoResponse>("/profile/photo");
    return response.data.user;
  },

  logout: async (): Promise<void> => {
    await api.post("/logout");
  },
};

export default api;
