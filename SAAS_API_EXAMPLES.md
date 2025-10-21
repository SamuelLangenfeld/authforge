# SaaS CRUD API - Example Usage

This file contains practical examples of how to use the SaaS CRUD API.

## Prerequisites

1. Register your SaaS application:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@myapp.com",
    "password": "AdminPassword123!",
    "name": "Admin User",
    "orgName": "My SaaS App"
  }'
```

Response includes your `clientId` and `clientSecret`. Save these!

2. Get your organization ID from the dashboard or the register response.

## Complete Workflow Example

### 1. Get Access Token

```bash
# Store credentials
CLIENT_ID="your-client-id"
CLIENT_SECRET="your-client-secret"
ORG_ID="your-org-id"
API_URL="http://localhost:3000"

# Get access token
TOKEN_RESPONSE=$(curl -X POST $API_URL/api/auth/token \
  -H "Content-Type: application/json" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"clientSecret\": \"$CLIENT_SECRET\"
  }")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "Access Token: $ACCESS_TOKEN"
```

### 2. Create a User

```bash
curl -X POST $API_URL/api/organizations/$ORG_ID/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "email": "john.doe@example.com",
    "name": "John Doe",
    "password": "SecurePassword123!"
  }' | jq .
```

Expected response:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "emailVerified": "2024-01-15T10:35:00.000Z",
    "createdAt": "2024-01-15T10:35:00.000Z"
  },
  "message": "User created successfully"
}
```

### 3. List Users

```bash
curl -X GET "$API_URL/api/organizations/$ORG_ID/users?skip=0&take=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

### 4. Search Users

```bash
curl -X GET "$API_URL/api/organizations/$ORG_ID/users?search=john&take=5" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

### 5. Get a Specific User

```bash
USER_ID="550e8400-e29b-41d4-a716-446655440001"

curl -X GET "$API_URL/api/organizations/$ORG_ID/users/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

### 6. Update a User

```bash
curl -X PATCH "$API_URL/api/organizations/$ORG_ID/users/$USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "John Smith",
    "password": "NewPassword456!"
  }' | jq .
```

### 7. Delete a User

```bash
curl -X DELETE "$API_URL/api/organizations/$ORG_ID/users/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

## Python Example

```python
import requests
import json

class SaaSAPI:
    def __init__(self, base_url, client_id, client_secret):
        self.base_url = base_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        self.refresh_token = None

    def authenticate(self):
        """Get access token"""
        response = requests.post(
            f"{self.base_url}/api/auth/token",
            json={
                "clientId": self.client_id,
                "clientSecret": self.client_secret
            }
        )
        data = response.json()
        self.access_token = data["accessToken"]
        self.refresh_token = data["refreshToken"]
        return self.access_token

    def _headers(self):
        """Get request headers with auth token"""
        if not self.access_token:
            self.authenticate()

        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}"
        }

    def list_users(self, org_id, skip=0, take=10, search=None):
        """List users in organization"""
        params = {"skip": skip, "take": take}
        if search:
            params["search"] = search

        response = requests.get(
            f"{self.base_url}/api/organizations/{org_id}/users",
            headers=self._headers(),
            params=params
        )
        return response.json()

    def get_user(self, org_id, user_id):
        """Get specific user"""
        response = requests.get(
            f"{self.base_url}/api/organizations/{org_id}/users/{user_id}",
            headers=self._headers()
        )
        return response.json()

    def create_user(self, org_id, email, name, password):
        """Create new user"""
        response = requests.post(
            f"{self.base_url}/api/organizations/{org_id}/users",
            headers=self._headers(),
            json={
                "email": email,
                "name": name,
                "password": password
            }
        )
        return response.json()

    def update_user(self, org_id, user_id, **kwargs):
        """Update user"""
        response = requests.patch(
            f"{self.base_url}/api/organizations/{org_id}/users/{user_id}",
            headers=self._headers(),
            json=kwargs
        )
        return response.json()

    def delete_user(self, org_id, user_id):
        """Delete user"""
        response = requests.delete(
            f"{self.base_url}/api/organizations/{org_id}/users/{user_id}",
            headers=self._headers()
        )
        return response.json()

# Usage
api = SaaSAPI(
    base_url="http://localhost:3000",
    client_id="your-client-id",
    client_secret="your-client-secret"
)

org_id = "your-org-id"

# Create user
result = api.create_user(
    org_id,
    "user@example.com",
    "User Name",
    "Password123!"
)
print(json.dumps(result, indent=2))

# List users
result = api.list_users(org_id)
print(json.dumps(result, indent=2))

# Search users
result = api.list_users(org_id, search="user")
print(json.dumps(result, indent=2))

# Update user
if result["data"]["users"]:
    user_id = result["data"]["users"][0]["id"]
    result = api.update_user(org_id, user_id, name="Updated Name")
    print(json.dumps(result, indent=2))

    # Delete user
    result = api.delete_user(org_id, user_id)
    print(json.dumps(result, indent=2))
```

## JavaScript/Node.js Example (Using the SaaSClient)

```typescript
import { SaaSClient } from './lib/saas-client';

const client = new SaaSClient({
  baseUrl: 'http://localhost:3000',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
});

const orgId = 'your-org-id';

// Create user
const newUser = await client.users.create(orgId, {
  email: 'user@example.com',
  name: 'User Name',
  password: 'SecurePassword123!',
});
console.log('Created user:', newUser);

// List users
const { users, pagination } = await client.users.list(orgId, {
  take: 10,
});
console.log('Users:', users);
console.log('Total users:', pagination.total);

// Search users
const searchResults = await client.users.search(orgId, 'john');
console.log('Search results:', searchResults);

// Get specific user
const user = await client.users.get(orgId, newUser.id);
console.log('User details:', user);

// Update user
const updated = await client.users.update(orgId, newUser.id, {
  name: 'Updated Name',
});
console.log('Updated user:', updated);

// Delete user
await client.users.delete(orgId, newUser.id);
console.log('User deleted');

// Get all users (handles pagination automatically)
const allUsers = await client.users.getAll(orgId);
console.log('All users:', allUsers);
```

## Error Handling Examples

### Handle Authentication Errors

```bash
# Wrong credentials
curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "wrong-id",
    "clientSecret": "wrong-secret"
  }'

# Response: 401 Unauthorized
```

### Handle Validation Errors

```bash
# Invalid email
curl -X POST http://localhost:3000/api/organizations/$ORG_ID/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "email": "invalid-email",
    "name": "John",
    "password": "pass123"
  }'

# Response: 400 Bad Request
# {
#   "error": "Invalid request body",
#   "details": [
#     {
#       "code": "invalid_string",
#       "validation": "email",
#       "message": "Invalid email"
#     }
#   ]
# }
```

### Handle Conflict Errors

```bash
# Email already exists
curl -X POST http://localhost:3000/api/organizations/$ORG_ID/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "email": "existing@example.com",
    "name": "John",
    "password": "SecurePass123!"
  }'

# Response: 409 Conflict
# {
#   "error": "User with this email already exists"
# }
```

### Handle Rate Limiting

```bash
# Make many requests quickly
for i in {1..70}; do
  curl -X GET "http://localhost:3000/api/organizations/$ORG_ID/users" \
    -H "Authorization: Bearer $ACCESS_TOKEN"
done

# Response (after 60 requests): 429 Too Many Requests
# {
#   "error": "Too many requests. Please try again later."
# }
#
# Headers include:
# X-RateLimit-Limit: 60
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: <timestamp>
```

## Bulk Operations Example

```typescript
import { SaaSClient } from './lib/saas-client';

const client = new SaaSClient({
  baseUrl: 'http://localhost:3000',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
});

const orgId = 'your-org-id';

// Bulk create users
async function bulkCreateUsers(users: Array<{ email: string; name: string; password: string }>) {
  const results = [];
  for (const user of users) {
    try {
      const created = await client.users.create(orgId, user);
      results.push({ success: true, user: created });
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }
  return results;
}

// Bulk update users
async function bulkUpdateUsers(updates: Array<{ userId: string; data: any }>) {
  const results = [];
  for (const { userId, data } of updates) {
    try {
      const updated = await client.users.update(orgId, userId, data);
      results.push({ success: true, user: updated });
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }
  return results;
}

// Usage
const newUsers = await bulkCreateUsers([
  { email: 'user1@example.com', name: 'User 1', password: 'Pass123!' },
  { email: 'user2@example.com', name: 'User 2', password: 'Pass123!' },
  { email: 'user3@example.com', name: 'User 3', password: 'Pass123!' },
]);

console.log('Bulk create results:', newUsers);
```

## Testing Checklist

- [ ] Create a user with valid data
- [ ] Attempt to create a user with invalid email format
- [ ] Attempt to create a user with short password (< 8 chars)
- [ ] Attempt to create a duplicate user (same email)
- [ ] List users with default pagination
- [ ] List users with custom skip/take
- [ ] Search users by email
- [ ] Search users by name
- [ ] Get a specific user that exists
- [ ] Get a non-existent user (404)
- [ ] Update user email to a valid new email
- [ ] Update user password
- [ ] Attempt to update email to an existing email (409)
- [ ] Delete an existing user
- [ ] Attempt to access user with invalid token (401)
- [ ] Attempt to access user from another organization (403)
- [ ] Verify rate limiting (60 requests per minute)
