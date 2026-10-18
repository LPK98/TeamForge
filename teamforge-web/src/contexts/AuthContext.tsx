import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  authApi,
  clearToken,
  getToken,
  setToken,
  type LoginData,
  type RegisterData,
  type User,
} from "../services/api";
import { AuthContext, type AuthContextValue } from "./auth-context";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      if (!getToken()) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const restoredUser = await authApi.me();

        if (isMounted) {
          setUser(restoredUser);
          setError(null);
        }
      } catch {
        clearToken();

        if (isMounted) {
          setUser(null);
          setError("Your session has expired. Please sign in again.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (data: LoginData): Promise<User> => {
    setError(null);
    const response = await authApi.login(data);
    setToken(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<User> => {
    setError(null);
    const response = await authApi.register(data);
    setToken(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const updateUser = useCallback(async (name: string): Promise<User> => {
    const updatedUser = await authApi.updateProfile(name);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const uploadProfilePhoto = useCallback(async (photo: File, onUploadProgress?: (progress: number) => void): Promise<User> => {
    const updatedUser = await authApi.uploadProfilePhoto(photo, onUploadProgress);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const removeProfilePhoto = useCallback(async (): Promise<User> => {
    const updatedUser = await authApi.removeProfilePhoto();
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      clearToken();
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      error,
      login,
      register,
      updateUser,
      uploadProfilePhoto,
      removeProfilePhoto,
      logout,
    }),
    [user, isLoading, error, login, register, updateUser, uploadProfilePhoto, removeProfilePhoto, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
