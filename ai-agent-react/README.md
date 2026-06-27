# Secure Auth + Dashboard API Schema

This project currently uses a mock authentication flow. To connect a real backend, the frontend should call backend endpoints instead of the mock functions in [src/lib/mockApi.ts](src/lib/mockApi.ts).

## Security model

- Use OAuth 2.1 with Authorization Code + PKCE.
- Exchange the authorization code on the backend.
- Return short-lived access tokens and refresh tokens.
- Store tokens in HttpOnly, Secure, SameSite cookies in production.
- Validate access tokens on every protected request.
- Rotate refresh tokens and revoke them on logout.

## Endpoints

### 1) Start Google login

```http
GET /api/auth/google/login
```

Example:

```bash
curl -i http://localhost:3000/api/auth/google/login
```

### 2) Google OAuth callback

```http
GET /api/auth/google/callback?code=...&state=...
```

Example:

```bash
curl -i "http://localhost:3000/api/auth/google/callback?code=test-code&state=test-state"
```

Success response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "google-user-id",
      "name": "Jan Kowalski",
      "email": "jan@example.com",
      "role": "Product Designer",
      "plan": "Pro",
      "avatar": "JK"
    },
    "expiresIn": 900
  }
}
```

### 3) Refresh access token

```http
POST /api/auth/refresh
```

Example:

```bash
curl -i -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"refresh-token-here"}'
```

### 4) Logout

```http
POST /api/auth/logout
```

Example:

```bash
curl -i -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer access-token-here"
```

### 5) Get current user

```http
GET /api/me
```

Example:

```bash
curl -i http://localhost:3000/api/me \
  -H "Authorization: Bearer access-token-here"
```

### 6) Get dashboard data

```http
GET /api/dashboard
```

Example:

```bash
curl -i http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer access-token-here"
```

## OpenAPI / Swagger schema

```yaml
openapi: 3.0.3
info:
  title: Secure Auth + Dashboard API
  version: 1.0.0
paths:
  /api/auth/google/login:
    get:
      summary: Start Google OAuth sign-in
      responses:
        '302':
          description: Redirect to Google OAuth
  /api/auth/google/callback:
    get:
      summary: Finish Google OAuth sign-in
      parameters:
        - in: query
          name: code
          schema:
            type: string
        - in: query
          name: state
          schema:
            type: string
      responses:
        '200':
          description: Authentication completed
  /api/auth/refresh:
    post:
      summary: Refresh access token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                refreshToken:
                  type: string
      responses:
        '200':
          description: New access token issued
  /api/auth/logout:
    post:
      summary: Logout user and revoke session
      responses:
        '204':
          description: Logged out
  /api/me:
    get:
      summary: Get current authenticated user
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Current user profile
  /api/dashboard:
    get:
      summary: Get dashboard stats
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Dashboard data
  /api/dashboard/message:
    post:
      summary: Submit a message from the dashboard
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
      responses:
        '200':
          description: Message accepted
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

## Next steps before production

1. Replace the mock API with real HTTP calls.
2. Use HttpOnly cookies instead of browser storage for tokens.
3. Implement Authorization Code + PKCE.
4. Validate tokens on the backend for every protected route.
5. Add refresh-token rotation and logout revocation.
6. Add CSRF protection for cookie-based auth.
7. Add rate limiting, monitoring, and logging.
8. Use HTTPS in production.

## Copilot instructions for creating the Node.js backend

Use the following instructions when generating the backend with Copilot.

### Goal
Create a Node.js backend that matches the current frontend authentication and dashboard flow.

### Stack recommendation
- Runtime: Node.js + TypeScript
- Framework: Express.js or Fastify
- Auth: Google OAuth 2.1, JWT access tokens, refresh tokens
- Database: PostgreSQL or MongoDB
- Validation: Zod or Joi
- Password hashing: not needed for OAuth-only flow
- Environment config: dotenv

### Required backend behavior

1. Implement the following routes:
   - GET /api/auth/google/login
   - GET /api/auth/google/callback
   - POST /api/auth/refresh
   - POST /api/auth/logout
   - GET /api/me
   - GET /api/dashboard
   - POST /api/dashboard/message

2. Use Google OAuth flow based on Authorization Code + PKCE.
3. On successful Google login:
   - verify the returned user information,
   - create or update the user record,
   - issue an access token,
   - issue a refresh token,
   - return a session result to the frontend.

4. Protect the dashboard route with authentication middleware.
5. Validate access token on every protected request.
6. If the token is expired or invalid, return 401.
7. If the user is not authorized, return 403.
8. Use secure cookie settings in production:
   - httpOnly: true
   - secure: true
   - sameSite: 'lax' or 'strict'

### Suggested project structure

```text
src/
  config/
  controllers/
  middleware/
  routes/
  services/
  utils/
  app.ts
  server.ts
```

### Suggested environment variables

```env
PORT=3000
NODE_ENV=development
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
JWT_ACCESS_SECRET=replace-me
JWT_REFRESH_SECRET=replace-me
FRONTEND_URL=http://localhost:5173
```

### Backend implementation requirements

- Use HTTPS in production.
- Add CORS for the frontend origin.
- Add validation for request bodies and query params.
- Add consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired session"
  }
}
```

- Add logging for auth events.
- Add rate limiting for login and refresh endpoints.
- Add refresh token rotation.
- Add logout revocation logic.

### Frontend mapping

Map the current frontend mock calls to these backend endpoints:

- authenticateUser(...) -> GET /api/auth/google/callback
- refreshAccessToken(...) -> POST /api/auth/refresh
- fetchDashboardData(...) -> GET /api/dashboard
- submitDashboardMessage(...) -> POST /api/dashboard/message

### Acceptance criteria

The backend is complete when:
- the user can sign in with Google,
- the backend issues access and refresh tokens,
- protected routes require authentication,
- dashboard data is returned only for authorized users,
- logout invalidates the session,
- expired tokens return 401.
