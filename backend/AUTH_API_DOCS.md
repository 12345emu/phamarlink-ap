# Authentication API Documentation

## Overview
This document describes the authentication endpoints for the PharmaLink backend API.

## Base URL
```
http://localhost:3000/api/auth
```

## Endpoints

### 1. User Registration
**POST** `/signup`

Creates a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "patient",
  "phone": "+233201234567",
  "dateOfBirth": "1990-01-01"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "user_type": "patient",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+233201234567",
      "date_of_birth": "1990-01-01",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Validation Rules:**
- `email`: Must be a valid email address
- `password`: Minimum 6 characters
- `firstName`: Minimum 2 characters
- `lastName`: Minimum 2 characters
- `userType`: Must be one of: `patient`, `doctor`, `pharmacist`
- `phone`: Optional, must be a valid mobile phone number
- `dateOfBirth`: Optional, must be a valid date

---

### 2. User Login
**POST** `/login`

Authenticates a user and returns access tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "user_type": "patient",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+233201234567",
      "date_of_birth": "1990-01-01",
      "is_active": true,
      "email_verified": false,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Validation Rules:**
- `email`: Must be a valid email address
- `password`: Required

---

### 3. Get User Profile
**GET** `/profile`

Retrieves the current user's profile information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "user_type": "patient",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+233201234567",
    "date_of_birth": "1990-01-01",
    "profile_image": null,
    "is_active": true,
    "email_verified": false,
    "created_at": "2024-01-01T00:00:00.000Z",
    "patientProfile": {
      "id": 1,
      "user_id": 1,
      "blood_type": null,
      "allergies": null,
      "medical_conditions": null,
      "emergency_contact": null,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

### 4. Update User Profile
**PUT** `/profile`

Updates the current user's profile information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "firstName": "Johnny",
  "lastName": "Smith",
  "phone": "+233209876543",
  "dateOfBirth": "1990-01-01"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

**Validation Rules:**
- `firstName`: Optional, minimum 2 characters if provided
- `lastName`: Optional, minimum 2 characters if provided
- `phone`: Optional, must be a valid mobile phone number if provided
- `dateOfBirth`: Optional, must be a valid date if provided

---

### 5. Change Password
**PUT** `/change-password`

Changes the current user's password.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "currentPassword": "password123",
  "newPassword": "newpassword456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Validation Rules:**
- `currentPassword`: Required
- `newPassword`: Minimum 6 characters

---

### 6. Refresh Token
**POST** `/refresh-token`

Refreshes the access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "user_type": "patient",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+233201234567",
      "date_of_birth": "1990-01-01",
      "is_active": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 7. Forgot Password
**POST** `/forgot-password`

Initiates the password reset process.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent"
}
```

**Validation Rules:**
- `email`: Must be a valid email address

---

### 8. Reset Password
**POST** `/reset-password`

Resets the user's password using a reset token.

**Request Body:**
```json
{
  "token": "reset_token_here",
  "newPassword": "newpassword456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Validation Rules:**
- `token`: Required (from forgot password email)
- `newPassword`: Minimum 6 characters

---

### 9. Logout
**POST** `/logout`

Logs out the current user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "type": "field",
      "value": "invalid-email",
      "msg": "Invalid value",
      "path": "email",
      "location": "body"
    }
  ]
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### Not Found Error (404)
```json
{
  "success": false,
  "message": "User not found"
}
```

### Conflict Error (409)
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

### Internal Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Token Information

### Access Token
- **Expiration**: 15 minutes (configurable via `JWT_EXPIRES_IN`)
- **Usage**: Required for protected endpoints
- **Header**: `Authorization: Bearer <token>`

### Refresh Token
- **Expiration**: 7 days (configurable via `JWT_REFRESH_EXPIRES_IN`)
- **Usage**: Used to get new access tokens
- **Security**: Should be stored securely (e.g., HTTP-only cookie)

### Reset Token
- **Expiration**: 1 hour
- **Usage**: For password reset process
- **Security**: Sent via email, single-use

---

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt with 12 salt rounds
2. **JWT Tokens**: Secure token-based authentication
3. **Input Validation**: Comprehensive validation using express-validator
4. **Rate Limiting**: Applied at the server level
5. **CORS Protection**: Configured for security
6. **Helmet Security**: Security headers middleware

---

## Testing

Run the authentication tests:
```bash
npm run test:auth
```

This will test all endpoints with sample data and display the results.

---

## Environment Variables

Required environment variables for authentication:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_REFRESH_EXPIRES_IN=7d

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=pharmalink_db
DB_PORT=3306
``` 