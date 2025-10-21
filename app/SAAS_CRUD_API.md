# SaaS User CRUD API Documentation

This document describes the API endpoints that allow external SaaS applications to perform CRUD operations on their users.

## Overview

AuthForge provides a multi-tenant user management system where each SaaS application can manage its own users through an authenticated API. The API uses OAuth-like credentials (client ID and secret) for authentication.

## Authentication

All CRUD API requests require Bearer token authentication using an access token obtained from the `/api/auth/token` endpoint.

### Step 1: Get API Credentials

When your SaaS app registers with AuthForge via `/api/auth/register`, you receive:
- `clientId` - Unique identifier for your app
- `clientSecret` - Secret key for your app (store securely!)

### Step 2: Exchange for Access Token

```bash
curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret"
  }'
```

Response:
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

### Step 3: Use Access Token for CRUD Operations

Include the access token in the `Authorization` header:

```bash
Authorization: Bearer <accessToken>
```

## API Endpoints

### 1. List Users

**Endpoint:** `GET /api/organizations/{orgId}/users`

**Description:** Retrieve a paginated list of users in your organization.

**Query Parameters:**
- `skip` (optional, default: 0) - Number of users to skip
- `take` (optional, default: 10, max: 100) - Number of users to retrieve
- `search` (optional) - Search by email or name (case-insensitive)

**Example:**
```bash
curl -X GET "http://localhost:3000/api/organizations/550e8400-e29b-41d4-a716-446655440000/users?skip=0&take=10&search=john" \
  -H "Authorization: Bearer your-access-token"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "email": "john.doe@example.com",
        "name": "John Doe",
        "emailVerified": "2024-01-15T10:30:00.000Z",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "skip": 0,
      "take": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

### 2. Create User

**Endpoint:** `POST /api/organizations/{orgId}/users`

**Description:** Create a new user in your organization.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "password": "SecurePassword123!"
}
```

**Validation Rules:**
- `email` - Must be a valid email format and unique
- `name` - Required, max 255 characters
- `password` - Required, minimum 8 characters

**Example:**
```bash
curl -X POST http://localhost:3000/api/organizations/550e8400-e29b-41d4-a716-446655440000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-access-token" \
  -d '{
    "email": "newuser@example.com",
    "name": "New User",
    "password": "SecurePassword123!"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "newuser@example.com",
    "name": "New User",
    "emailVerified": "2024-01-15T10:35:00.000Z",
    "createdAt": "2024-01-15T10:35:00.000Z"
  },
  "message": "User created successfully"
}
```

**Error Responses:**
- `400` - Invalid request body or validation error
- `409` - Email already exists
- `401` - Unauthorized (invalid token)
- `403` - Cannot access other organizations

### 3. Get User

**Endpoint:** `GET /api/organizations/{orgId}/users/{userId}`

**Description:** Retrieve a specific user's details.

**Example:**
```bash
curl -X GET http://localhost:3000/api/organizations/550e8400-e29b-41d4-a716-446655440000/users/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer your-access-token"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "emailVerified": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `404` - User not found in organization
- `401` - Unauthorized
- `403` - Cannot access other organizations

### 4. Update User

**Endpoint:** `PATCH /api/organizations/{orgId}/users/{userId}`

**Description:** Update a user's information.

**Request Body (all fields optional):**
```json
{
  "email": "updated@example.com",
  "name": "Updated Name",
  "password": "NewPassword123!"
}
```

**Validation Rules:**
- `email` - Valid email format, must be unique if changed
- `name` - Max 255 characters if changed
- `password` - Minimum 8 characters if changed

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/organizations/550e8400-e29b-41d4-a716-446655440000/users/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-access-token" \
  -d '{
    "name": "Updated Name",
    "password": "NewPassword123!"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "email": "john.doe@example.com",
    "name": "Updated Name",
    "emailVerified": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "User updated successfully"
}
```

**Error Responses:**
- `400` - Invalid request body
- `404` - User not found in organization
- `409` - Email is already in use
- `401` - Unauthorized
- `403` - Cannot access other organizations

### 5. Delete User

**Endpoint:** `DELETE /api/organizations/{orgId}/users/{userId}`

**Description:** Remove a user from the organization. Optionally delete the user account entirely if they have no other organization memberships.

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/organizations/550e8400-e29b-41d4-a716-446655440000/users/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer your-access-token"
```

**Response (200):**
```json
{
  "success": true,
  "message": "User removed from organization"
}
```

**Error Responses:**
- `404` - User not found in organization
- `401` - Unauthorized
- `403` - Cannot access other organizations

## Error Handling

All endpoints return standard error responses in the following format:

```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

### Common Status Codes

- `200` - Success (GET, PATCH, DELETE)
- `201` - Resource created (POST)
- `400` - Bad request (invalid input)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (no access to resource)
- `404` - Not found
- `409` - Conflict (resource already exists)
- `429` - Rate limited
- `500` - Internal server error

## Rate Limiting

API requests are rate limited to 60 requests per minute per IP address.

When rate limited, responses include:
- `X-RateLimit-Limit` - Request limit
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Unix timestamp when limit resets

## CORS Support

The API supports CORS requests from whitelisted origins. Configure allowed origins in the `ALLOWED_ORIGINS` environment variable (comma-separated list).

For development, all origins are allowed if `NODE_ENV` is not set to `production`.

## Security Considerations

1. **Store Credentials Securely**: Never expose your `clientSecret` in client-side code. Use environment variables or secure vaults.

2. **Token Management**: Access tokens expire after 1 hour. Use refresh tokens to obtain new access tokens without re-authenticating with your secret.

   ```bash
   curl -X POST http://localhost:3000/api/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{
       "refreshToken": "your-refresh-token"
     }'
   ```

3. **HTTPS Only**: Always use HTTPS in production. The API enforces HTTPS in production environments.

4. **Password Security**: Passwords are hashed with bcryptjs (10 salt rounds) before storage.

5. **Data Privacy**: Users created via API are automatically marked as email-verified. Only authenticated API clients can access user data.

## Integration Example (Node.js)

```javascript
const API_BASE_URL = "http://localhost:3000";
const CLIENT_ID = "your-client-id";
const CLIENT_SECRET = "your-client-secret";

// Get access token
async function getAccessToken() {
  const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    }),
  });

  const data = await response.json();
  return data.accessToken;
}

// Create user
async function createUser(orgId, email, name, password) {
  const token = await getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${orgId}/users`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, name, password }),
    }
  );

  return response.json();
}

// List users
async function listUsers(orgId, skip = 0, take = 10) {
  const token = await getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${orgId}/users?skip=${skip}&take=${take}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.json();
}

// Update user
async function updateUser(orgId, userId, updates) {
  const token = await getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${orgId}/users/${userId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    }
  );

  return response.json();
}

// Delete user
async function deleteUser(orgId, userId) {
  const token = await getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${orgId}/users/${userId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.json();
}

// Usage
(async () => {
  const orgId = "550e8400-e29b-41d4-a716-446655440000";

  // Create a user
  const newUser = await createUser(orgId, "test@example.com", "Test User", "password123");
  console.log("Created:", newUser);

  // List users
  const users = await listUsers(orgId);
  console.log("Users:", users);

  // Update user
  if (newUser.data?.id) {
    const updated = await updateUser(orgId, newUser.data.id, { name: "Updated Name" });
    console.log("Updated:", updated);

    // Delete user
    const deleted = await deleteUser(orgId, newUser.data.id);
    console.log("Deleted:", deleted);
  }
})();
```

## Multi-Organization Support

Each SaaS application is represented as an `Organization` in AuthForge. Your API credentials are tied to a specific organization, so:

- You can only access users within your organization
- Attempting to access another organization's users will return `403 Forbidden`
- Each organization has its own set of API credentials

## Support

For issues or questions regarding the SaaS CRUD API, please refer to the main documentation or contact support.
