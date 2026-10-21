import axios from "axios";

interface ValidationErrors {
  [field: string]: string | string[] | undefined;
}

interface ApiErrorResponse {
  message?: unknown;
  errors?: ValidationErrors;
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallback;
  }

  const data = error.response?.data;

  if (typeof data?.message === "string") {
    return data.message;
  }

  const validationMessage = Object.values(data?.errors ?? {}).find((value) => value);

  if (Array.isArray(validationMessage) && typeof validationMessage[0] === "string") {
    return validationMessage[0];
  }

  if (typeof validationMessage === "string") {
    return validationMessage;
  }

  if (error.response?.status === 422) {
    return "Please check the entered details and try again.";
  }

  if (error.response?.status === 401) {
    return "The email or password is incorrect.";
  }

  if (error.response?.status === 404) {
    return "The sign-in service is unavailable. Please try again shortly.";
  }

  if (error.response && error.response.status >= 500) {
    return "The sign-in service is temporarily unavailable. Please try again shortly.";
  }

  if (!error.response || error.code === "ERR_NETWORK") {
    return "Unable to reach the sign-in service. Please check your connection and try again.";
  }

  return fallback;
}
