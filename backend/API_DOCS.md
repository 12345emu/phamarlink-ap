# PharmaLink API Documentation

## 🔗 Base URL
```
http://localhost:3000/api
```

## 📋 Authentication

### JWT Token Format
```
Authorization: Bearer <your-jwt-token>
```

### Login Response
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "patient",
      "name": "John Doe"
    }
  }
}
```

## 🔐 Authentication Endpoints

### POST /auth/signup
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "phone": "+1234567890",
  "role": "patient",
  "dateOfBirth": "1990-01-01"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "jwt-token-here",
    "user": { ... }
  }
}
```

### POST /auth/login
Authenticate existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### GET /auth/profile
Get current user profile (requires authentication).

### PUT /auth/profile
Update current user profile (requires authentication).

## 🏥 Healthcare Facilities

### GET /facilities
List all healthcare facilities with optional filters.

**Query Parameters:**
- `type`: facility type (hospital, clinic, pharmacy)
- `specialty`: medical specialty
- `page`: page number (default: 1)
- `limit`: items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "facilities": [
      {
        "id": 1,
        "name": "City General Hospital",
        "type": "hospital",
        "specialty": "general",
        "address": "123 Main St",
        "latitude": 5.5600,
        "longitude": -0.2057,
        "rating": 4.5,
        "reviewCount": 25
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

### GET /facilities/nearby
Find facilities within specified radius.

**Query Parameters:**
- `latitude`: user's latitude
- `longitude`: user's longitude
- `radius`: search radius in kilometers (default: 5)
- `type`: facility type filter

### GET /facilities/:id
Get detailed information about a specific facility.

## 💊 Medicines

### GET /medicines
List medicines with search and filters.

**Query Parameters:**
- `q`: search query
- `category`: medicine category
- `prescription`: prescription required (true/false)
- `minPrice`: minimum price
- `maxPrice`: maximum price
- `inStock`: in stock filter (true/false)

### GET /medicines/:id
Get detailed medicine information including availability at pharmacies.

### GET /medicines/search/by-symptoms
Search medicines by symptoms.

**Query Parameters:**
- `symptoms`: comma-separated symptoms

## 📅 Appointments

### GET /appointments
List user's appointments (filtered by role).

**Query Parameters:**
- `status`: appointment status
- `facilityId`: filter by facility
- `date`: filter by date

### POST /appointments
Book a new appointment.

**Request Body:**
```json
{
  "facilityId": 1,
  "doctorId": 5,
  "appointmentDate": "2024-01-15",
  "appointmentTime": "14:00:00",
  "reason": "General consultation",
  "notes": "Follow-up appointment"
}
```

### PATCH /appointments/:id/status
Update appointment status (requires appropriate role).

**Request Body:**
```json
{
  "status": "confirmed",
  "notes": "Appointment confirmed"
}
```

## 🛒 Orders

### GET /orders
List user's orders (filtered by role).

### POST /orders
Create a new medicine order.

**Request Body:**
```json
{
  "pharmacyId": 1,
  "items": [
    {
      "medicineId": 5,
      "quantity": 2
    }
  ],
  "deliveryAddress": "123 Home St",
  "deliveryInstructions": "Leave at front door"
}
```

### GET /orders/:id/track
Get order tracking information.

## 💬 Chat

### GET /chat/conversations
List user's chat conversations.

### POST /chat/conversations/:id/messages
Send a message in a conversation.

**Request Body:**
```json
{
  "message": "Hello, I have a question about my prescription",
  "type": "text"
}
```

## ⭐ Reviews

### GET /reviews
List reviews with filters.

**Query Parameters:**
- `facilityId`: filter by facility
- `medicineId`: filter by medicine
- `rating`: filter by rating (1-5)
- `page`: page number
- `limit`: items per page

### POST /reviews
Create a new review.

**Request Body:**
```json
{
  "facilityId": 1,
  "rating": 5,
  "comment": "Excellent service and professional staff",
  "category": "service"
}
```

## 🔔 Notifications

### GET /notifications
List user's notifications.

**Query Parameters:**
- `type`: notification type
- `read`: read status (true/false)
- `page`: page number
- `limit`: items per page

### PATCH /notifications/:id/read
Mark notification as read.

### PATCH /notifications/read-all
Mark all notifications as read.

## 🔍 Search

### GET /search/global
Global search across all entities.

**Query Parameters:**
- `q`: search query
- `type`: entity type (medicines, facilities, doctors, pharmacies)
- `latitude`: user's latitude (for location-based results)
- `longitude`: user's longitude
- `radius`: search radius in kilometers

### GET /search/medicines
Advanced medicine search.

**Query Parameters:**
- `q`: search query
- `category`: medicine category
- `manufacturer`: manufacturer name
- `prescription`: prescription requirement
- `minPrice`: minimum price
- `maxPrice`: maximum price
- `inStock`: in stock status

## 🛠️ Utilities

### GET /utils/health
Health check endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "OK",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 3600,
    "database": "connected",
    "version": "1.0.0"
  }
}
```

### GET /utils/db-stats
Database statistics.

### POST /utils/validate
Validate common data types.

**Request Body:**
```json
{
  "type": "email",
  "value": "user@example.com"
}
```

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## 🚨 HTTP Status Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request (validation errors)
- **401** - Unauthorized (missing/invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **409** - Conflict (duplicate resource)
- **422** - Unprocessable Entity
- **429** - Too Many Requests (rate limited)
- **500** - Internal Server Error

## 🔒 Rate Limiting

- **Global**: 100 requests per 15 minutes per IP
- **Authentication**: 5 attempts per 15 minutes per IP
- **File Uploads**: 10 files per hour per user

## 📝 Pagination

Most list endpoints support pagination:

**Query Parameters:**
- `page`: page number (default: 1)
- `limit`: items per page (default: 10, max: 100)

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15
  }
}
```

## 🌍 Location Services

### Distance Calculation
Uses Haversine formula for accurate GPS distance calculations.

### Nearby Search
Find facilities, pharmacies, and doctors within specified radius.

### Coordinates Format
- **Latitude**: Decimal degrees (-90 to 90)
- **Longitude**: Decimal degrees (-180 to 180)

## 📱 Mobile App Integration

### Headers
```http
Content-Type: application/json
Authorization: Bearer <jwt-token>
Accept: application/json
```

### Error Handling
Always check the `success` field in responses before processing data.

### Token Management
- Store JWT token securely
- Refresh token before expiration
- Handle 401 responses by redirecting to login

---

**For more information, see the main README.md file.** 