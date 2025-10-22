// API client functions for making HTTP requests
import { Member } from "./types";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.message || data.error || "An error occurred",
      response.status
    );
  }

  return data;
}

export const authApi = {
  async login(email: string, password: string) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    return handleResponse<ApiResponse<unknown>>(response);
  },

  async register(
    email: string,
    password: string,
    name: string,
    orgName: string
  ) {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, name, orgName }),
    });

    return handleResponse<ApiResponse<unknown>>(response);
  },

  async logout() {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    return handleResponse<ApiResponse<unknown>>(response);
  },
};

export const organizationApi = {
  async getMembers(organizationId: string) {
    const response = await fetch(
      `/api/organizations/${organizationId}/members`
    );

    return handleResponse<{ success: boolean; members: Member[] }>(response);
  },
};

export { ApiError };
