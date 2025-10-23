# AuthForge

A modern, production-ready SaaS authentication and organization management platform built with Next.js, TypeScript, and PostgreSQL. Designed to demonstrate full-stack development best practices, API design, and secure authentication patterns.

**Live Demo:** [authforge.samlangenfeld.com](https://authforge.samlangenfeld.com)

---

## Overview

AuthForge is a complete authentication and multi-tenant SaaS platform that showcases modern web development practices. It provides:

- **User Authentication** - Secure registration, login, email verification, and password reset flows
- **Organization Management** - Create organizations, manage members, and assign roles
- **Team Invitations** - Send team invitations with email verification
- **API-First Architecture** - Built-in SaaS API with OAuth-style token authentication
- **Comprehensive Security** - HTTPS enforcement, secure password hashing, token rotation, rate limiting

This project demonstrates:
- Production-grade code quality and architecture
- TypeScript for type safety across the stack
- RESTful API design with standardized response formats
- Proper error handling and validation
- Secure authentication flows (JWT, refresh token rotation)
- Database indexing and performance optimization
- Email service integration
- Testing-ready architecture

---

## Tech Stack

### Frontend
- **Framework:** Next.js 15 (React 19) with App Router
- **Styling:** Tailwind CSS with @tailwindcss/postcss
- **Type Safety:** TypeScript with strict mode
- **Validation:** Zod for runtime schema validation

### Backend
- **Runtime:** Node.js with Next.js API routes
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT tokens, refresh token rotation
- **Password Hashing:** bcryptjs with salting
- **Rate Limiting:** rate-limiter-flexible

### Infrastructure
- **Email Service:** Mailgun for transactional emails
- **Hosting:** Ready for deployment on Vercel, Docker, or traditional servers
- **Database:** PostgreSQL (local dev with Docker Compose)

### Development Tools
- **Linting:** ESLint with TypeScript support
- **Type Checking:** TypeScript with strict settings
- **Database Management:** Prisma with migrations

---

## Key Features

### 🔐 Authentication System
- **Email-based registration** with verification flow
- **Secure login** with password hashing and timing-attack protection
- **Password reset** via email tokens
- **Refresh token rotation** for enhanced security
- **Session management** with automatic token refresh

### 👥 Organization Management
- **Create and manage organizations** with multi-user support
- **Role-based access control** (extensible role system)
- **Member management** with status tracking
- **Email-based team invitations** with acceptance workflows

### 🔌 SaaS API
A full-featured REST API for programmatic access:
- **OAuth-style authentication** with client credentials
- **Standardized request/response formats** across all endpoints
- **Comprehensive user and organization management endpoints**
- **Documented in SAAS_API_EXAMPLES.md**

### 📧 Email Integration
- **Transactional emails** for verification, password reset, and invitations
- **HTML-formatted templates** with fallback plain text links
- **Mailgun integration** for reliable delivery

---

## Architecture Highlights

### Type-Safe API Communication
The codebase demonstrates careful attention to type safety between frontend and backend:
- Zod schemas for request validation
- TypeScript interfaces for all API responses
- Standardized ApiResponse wrapper
- Automatic camelCase/snake_case conversion where appropriate

### Security Best Practices
- **Password Security:** bcryptjs with salt rounds, timing-attack dummy hashes
- **Token Security:** JWT signatures, short-lived access tokens (1 hour), long-lived refresh tokens (30 days)
- **Database Security:** Parameterized queries via Prisma, proper indexing
- **Email Security:** Tokens expire after 24 hours, single-use passwords resets
- **HTTPS Enforcement:** Strict enforcement in production environments

### Database Design
Properly indexed schema with:
- **Unique constraints** on email addresses and API credentials
- **Foreign key relationships** with cascade deletes
- **Composite indexes** for common query patterns
- **Temporal tracking** with createdAt timestamps

### Error Handling
Standardized error responses across all endpoints:
```typescript
// Consistent error format
{ error: "Descriptive error message" }

// Consistent success format
{ success: true, data: {...} }
```

### API Response Normalization
All API responses follow a consistent pattern with proper type definitions, ensuring predictability for API clients.

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose (optional, for local PostgreSQL)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd authforge
   ```

2. **Set up environment variables**
   ```bash
   cd app
   cp .env.example .env
   ```

   Configure required variables:
   ```env
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/authforge
   JWT_SECRET=<generate-secure-random-string>
   HOST_URL=http://localhost:3000
   MAILGUN_API_KEY=<your-mailgun-api-key>
   MAILGUN_DOMAIN=<your-mailgun-domain>
   FROM_EMAIL=noreply@<your-domain>
   ```

3. **Start PostgreSQL (with Docker)**
   ```bash
   docker-compose up -d
   ```

4. **Install dependencies and set up database**
   ```bash
   npm install
   npm run prisma:migrate
   npm run prisma:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

### Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
npm run prisma:migrate   # Run database migrations
npm run prisma:seed      # Seed database with test data
```

---

## Project Structure

```
authforge/
├── app/                          # Next.js application
│   ├── src/app/
│   │   ├── api/                  # API route handlers
│   │   │   ├── auth/             # Authentication endpoints
│   │   │   └── organizations/    # Organization endpoints
│   │   ├── lib/
│   │   │   ├── db.ts             # Prisma client
│   │   │   ├── jwt.ts            # JWT token generation
│   │   │   ├── email.ts          # Email service
│   │   │   ├── schemas.ts        # Zod validation schemas
│   │   │   ├── saas-client.ts    # TypeScript SaaS API client
│   │   │   └── auth-helpers.ts   # Auth utilities
│   │   ├── (auth)/               # Auth pages (register, login, etc.)
│   │   ├── dashboard/            # Protected dashboard pages
│   │   └── components/           # Reusable React components
│   ├── prisma/
│   │   └── schema.prisma         # Database schema
│   ├── .env.example              # Environment variable template
│   └── package.json              # Dependencies
├── docker-compose.yaml           # Local PostgreSQL setup
└── SAAS_API_EXAMPLES.md         # API documentation with examples
```

---

## Authentication Flow

### User Registration & Login
1. User registers with email and password
2. System generates verification token, sends email
3. User verifies email via token link
4. Login generates secure JWT session token
5. Refresh tokens automatically rotate on each use

### SaaS API Authentication
```
Client Credentials (clientId + clientSecret)
         ↓
POST /api/auth/token
         ↓
Returns { accessToken, refreshToken, expiresIn }
         ↓
Use accessToken for all API requests
         ↓
Token expires → POST /api/auth/refresh
         ↓
New token pair returned (token rotation)
```

---

## API Documentation

The full SaaS API documentation is available in [SAAS_API_EXAMPLES.md](./SAAS_API_EXAMPLES.md), including:

- **Authentication endpoints** - Token exchange and refresh
- **User management** - Create, read, update, delete users
- **Organization management** - Organization and member operations
- **Team invitations** - Send and accept invitations
- **Error responses** - Standardized error handling

### Example: Create a User
```bash
curl -X POST http://localhost:3000/api/organizations/ORG_ID/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "User Name",
    "password": "secure_password"
  }'
```

---

## Code Quality Highlights

### Type Safety
- 100% TypeScript codebase with strict mode enabled
- End-to-end type safety from database to frontend
- Zod runtime validation for all API inputs

### Error Handling
- Standardized error responses across all endpoints
- Type-safe error wrapper for API calls
- Proper HTTP status codes
- Detailed error logging for debugging

### Validation
- Input validation with Zod schemas
- Prisma type-safety at the database layer
- API response type definitions
- Frontend form validation

### Testing-Ready Architecture
- Modular service functions
- Separated concerns (auth, email, validation)
- Dependency injection patterns
- Mockable dependencies

---

## Performance Considerations

- **Database Indexing:** Strategic indexes on frequently queried fields
- **Token Expiration:** Automatic cleanup of expired tokens via database triggers
- **Email Queuing:** Ready for async email processing
- **Connection Pooling:** Prisma connection management
- **Rate Limiting:** Flexible rate limiting on authentication endpoints

---

## Security Considerations

✅ **Password Security**
- bcryptjs with 10 salt rounds
- Timing-attack dummy hashes to prevent user enumeration

✅ **Token Security**
- Short-lived access tokens (1 hour)
- Long-lived refresh tokens (30 days)
- Token rotation on each refresh

✅ **Data Security**
- Parameterized queries via Prisma
- Password fields excluded from API responses
- Email verification for sensitive operations

✅ **Transport Security**
- HTTPS enforcement in production
- Secure cookie flags for sensitive data

✅ **Rate Limiting**
- Applied to authentication endpoints
- Configurable limits per endpoint

---

## Future Enhancements

Potential additions to demonstrate expanding skillset:
- [ ] WebSocket support for real-time notifications
- [ ] GraphQL API alongside REST
- [ ] Advanced role-based access control (RBAC)
- [ ] Audit logging for compliance
- [ ] Two-factor authentication (2FA)
- [ ] Social login integration (OAuth2)
- [ ] API key management dashboard
- [ ] Usage analytics and reporting

---

## Deployment

The application is designed to be deployment-ready:

### Vercel (Recommended)
```bash
vercel deploy
```

### Docker
```bash
docker build -t authforge app/
docker run -p 3000:3000 authforge
```

### Traditional Server
```bash
npm run build
npm start
```

Environment variables should be configured on the deployment platform.

---

## Development Workflow

This project demonstrates a professional development workflow:

1. **Code Organization** - Clear separation of concerns
2. **Type Safety** - TypeScript throughout the stack
3. **Version Control** - Semantic commits with descriptive messages
4. **Documentation** - Comprehensive inline comments and API docs
5. **Configuration Management** - Environment-specific configurations
6. **Error Handling** - Graceful error handling with proper logging

---

## Learning Resources

Key concepts demonstrated in this project:

- **Full-Stack TypeScript** - Type safety from database to browser
- **Next.js App Router** - Modern React framework patterns
- **Database Design** - Relational schema with proper indexing
- **API Design** - RESTful endpoints with standardized responses
- **Security Patterns** - Password hashing, JWT tokens, token rotation
- **Email Integration** - Transactional email workflows
- **Error Handling** - Comprehensive error handling strategies
- **DevOps Ready** - Docker containerization and environment management

---

## Contact & Questions

Built as a demonstration of full-stack development capabilities. Feel free to reach out with questions about the architecture, implementation decisions, or design patterns used.

---

**Note:** This is a hobby/portfolio project demonstrating development practices. For production use, additional considerations around scalability, monitoring, and compliance would be needed.
