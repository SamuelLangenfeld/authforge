/**
 * SaaS Client Library
 *
 * A TypeScript client for interacting with the AuthForge CRUD API.
 *
 * Usage:
 * ```typescript
 * const client = new SaaSClient({
 *   baseUrl: 'http://localhost:3000',
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 * });
 *
 * // Create a user
 * const user = await client.users.create(orgId, {
 *   email: 'user@example.com',
 *   name: 'User Name',
 *   password: 'secure-password',
 * });
 *
 * // List users
 * const { users, pagination } = await client.users.list(orgId);
 *
 * // Update a user
 * const updated = await client.users.update(orgId, userId, {
 *   name: 'Updated Name',
 * });
 *
 * // Delete a user
 * await client.users.delete(orgId, userId);
 * ```
 */

interface SaaSClientConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

interface TokenResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  emailVerified: string;
  createdAt: string;
}

interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

interface UpdateUserInput {
  email?: string;
  name?: string;
  password?: string;
}

interface ListUsersOptions {
  skip?: number;
  take?: number;
  search?: string;
}

interface ListUsersResponse {
  users: UserData[];
  pagination: {
    skip: number;
    take: number;
    total: number;
    pages: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: unknown;
}

/**
 * Error class for API errors
 */
class SaaSClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "SaaSClientError";
  }
}

/**
 * Main SaaS Client class
 */
class SaaSClient {
  private config: SaaSClientConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  users: UserManager;

  constructor(config: SaaSClientConfig) {
    this.config = config;
    this.users = new UserManager(this);
  }

  /**
   * Get a valid access token, refreshing if needed
   */
  async getAccessToken(): Promise<string> {
    // If token is still valid, return it
    if (
      this.accessToken &&
      this.tokenExpiresAt &&
      Date.now() < this.tokenExpiresAt - 60000 // Refresh 1 minute before expiry
    ) {
      return this.accessToken;
    }

    // If we have a refresh token, try to refresh
    if (this.refreshToken) {
      try {
        await this.refreshAccessToken();
        if (this.accessToken) {
          return this.accessToken;
        }
      } catch {
        // Fall through to authenticate with client credentials
      }
    }

    // Authenticate with client credentials
    await this.authenticate();

    if (!this.accessToken) {
      throw new SaaSClientError("Failed to obtain access token");
    }

    return this.accessToken;
  }

  /**
   * Authenticate using client credentials
   */
  private async authenticate(): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/api/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
      }),
    });

    const data: TokenResponse = await response.json();

    if (!response.ok || !data.success) {
      throw new SaaSClientError(
        "Authentication failed",
        response.status,
        data
      );
    }

    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.tokenExpiresAt = Date.now() + data.expiresIn * 1000;
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new SaaSClientError("No refresh token available");
    }

    const response = await fetch(`${this.config.baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refreshToken: this.refreshToken,
      }),
    });

    const data: TokenResponse = await response.json();

    if (!response.ok || !data.success) {
      // Clear tokens if refresh fails
      this.accessToken = null;
      this.refreshToken = null;
      throw new SaaSClientError(
        "Token refresh failed",
        response.status,
        data
      );
    }

    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.tokenExpiresAt = Date.now() + data.expiresIn * 1000;
  }

  /**
   * Make an authenticated request
   */
  async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new SaaSClientError(
        data.error || "Request failed",
        response.status,
        data.details
      );
    }

    return data;
  }
}

/**
 * User Manager - Handles all user-related operations
 */
class UserManager {
  constructor(private client: SaaSClient) {}

  /**
   * List all users in an organization
   */
  async list(
    orgId: string,
    options: ListUsersOptions = {}
  ): Promise<ListUsersResponse> {
    const { skip = 0, take = 10, search } = options;

    const params = new URLSearchParams();
    params.append("skip", skip.toString());
    params.append("take", take.toString());
    if (search) {
      params.append("search", search);
    }

    const response = await this.client.request<ListUsersResponse>(
      "GET",
      `/api/organizations/${orgId}/users?${params.toString()}`
    );

    return response.data!;
  }

  /**
   * Get a specific user
   */
  async get(orgId: string, userId: string): Promise<UserData> {
    const response = await this.client.request<UserData>(
      "GET",
      `/api/organizations/${orgId}/users/${userId}`
    );

    return response.data!;
  }

  /**
   * Create a new user
   */
  async create(
    orgId: string,
    data: CreateUserInput
  ): Promise<UserData> {
    const response = await this.client.request<UserData>(
      "POST",
      `/api/organizations/${orgId}/users`,
      data
    );

    return response.data!;
  }

  /**
   * Update a user
   */
  async update(
    orgId: string,
    userId: string,
    data: UpdateUserInput
  ): Promise<UserData> {
    const response = await this.client.request<UserData>(
      "PATCH",
      `/api/organizations/${orgId}/users/${userId}`,
      data
    );

    return response.data!;
  }

  /**
   * Delete a user
   */
  async delete(orgId: string, userId: string): Promise<void> {
    await this.client.request<void>(
      "DELETE",
      `/api/organizations/${orgId}/users/${userId}`
    );
  }

  /**
   * Search users by email or name
   */
  async search(
    orgId: string,
    query: string,
    options: { skip?: number; take?: number } = {}
  ): Promise<ListUsersResponse> {
    return this.list(orgId, { ...options, search: query });
  }

  /**
   * Get all users (paginated, handles multiple pages)
   */
  async getAll(orgId: string, pageSize: number = 100): Promise<UserData[]> {
    const allUsers: UserData[] = [];
    let skip = 0;

    while (true) {
      const result = await this.list(orgId, { skip, take: pageSize });
      allUsers.push(...result.users);

      if (allUsers.length >= result.pagination.total) {
        break;
      }

      skip += pageSize;
    }

    return allUsers;
  }
}

export {
  SaaSClient,
  SaaSClientError,
  type SaaSClientConfig,
  type UserData,
  type CreateUserInput,
  type UpdateUserInput,
  type ListUsersOptions,
  type ListUsersResponse,
};
