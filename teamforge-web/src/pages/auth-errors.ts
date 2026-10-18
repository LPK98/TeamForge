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

  return fallback;
}
