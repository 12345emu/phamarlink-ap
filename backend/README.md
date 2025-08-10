# PharmaLink Backend API

A comprehensive Node.js/Express.js backend API for the PharmaLink mobile application, providing healthcare and pharmacy management services.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **User Management**: Patient profiles, healthcare provider accounts
- **Healthcare Facilities**: Hospitals, clinics, and pharmacies management
- **Medicine Catalog**: Comprehensive medicine database with inventory tracking
- **Appointments**: Booking and management system
- **Orders**: Medicine ordering and delivery tracking
- **Chat System**: Real-time communication between users and providers
- **Reviews & Ratings**: User feedback system
- **Notifications**: Push and in-app notifications
- **Advanced Search**: Global search with location-based filtering
- **Utility Services**: Health checks, validation, and system monitoring

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL (via XAMPP)
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express-validator, Joi
- **File Upload**: Multer
- **Email**: Nodemailer
- **Password Hashing**: bcryptjs

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js          # Database connection and utilities
├── database/
│   └── schema.sql           # Complete database schema
├── middleware/
│   └── auth.js              # Authentication and authorization middleware
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── users.js             # User management
│   ├── facilities.js        # Healthcare facilities
│   ├── medicines.js         # Medicine catalog
│   ├── appointments.js      # Appointment booking
│   ├── orders.js            # Order management
│   ├── chat.js              # Chat system
│   ├── reviews.js           # Reviews and ratings
│   ├── notifications.js     # Notification system
│   ├── search.js            # Advanced search
│   └── utils.js             # Utility endpoints
├── server.js                # Main server file
├── start.js                 # Development startup script
├── package.json             # Dependencies and scripts
├── env.example              # Environment variables template
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- XAMPP with MySQL
- Git

### Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=pharmalink
   DB_PORT=3306
   PORT=3000
   JWT_SECRET=your-super-secret-jwt-key
   ```

4. **Set up database**
   - Start XAMPP and ensure MySQL is running
   - Create database: `pharmalink`
   - Import schema: `database/schema.sql`

5. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   
   # Development startup (with env check)
   npm run start:dev
   ```

## 📊 API Endpoints

### Authentication (`/api/auth`)
- `POST /signup` - User registration
- `POST /login` - User login
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `POST /change-password` - Change password
- `POST /logout` - User logout
- `POST /refresh-token` - Refresh JWT token

### Users (`/api/users`)
- `GET /` - List all users (admin only)
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user profile
- `DELETE /:id` - Soft delete user
- `GET /:id/stats` - Get user statistics
- `GET /search/nearby` - Search nearby users

### Healthcare Facilities (`/api/facilities`)
- `GET /` - List all facilities with filters
- `GET /:id` - Get facility details
- `GET /nearby` - Find facilities by location
- `POST /:id/reviews` - Add facility review

### Medicines (`/api/medicines`)
- `GET /` - List medicines with search/filters
- `GET /:id` - Get medicine details
- `POST /` - Add new medicine (admin/pharmacist)
- `PUT /:id` - Update medicine
- `DELETE /:id` - Soft delete medicine
- `GET /categories/list` - Get medicine categories
- `GET /search/by-symptoms` - Symptom-based search

### Appointments (`/api/appointments`)
- `GET /` - List appointments (filtered by role)
- `GET /:id` - Get appointment details
- `POST /` - Create new appointment
- `PATCH /:id/status` - Update appointment status
- `DELETE /:id/cancel` - Cancel appointment
- `GET /facility/:facilityId/slots` - Get available slots

### Orders (`/api/orders`)
- `GET /` - List orders (filtered by role)
- `GET /:id` - Get order details with items
- `POST /` - Create new order
- `PATCH /:id/status` - Update order status
- `GET /:id/track` - Get order tracking info

### Chat (`/api/chat`)
- `GET /conversations` - List user conversations
- `GET /conversations/:id` - Get conversation with messages
- `POST /conversations` - Create new conversation
- `POST /conversations/:id/messages` - Send message
- `PATCH /conversations/:id/status` - Update conversation status
- `PATCH /conversations/:id/read` - Mark messages as read
- `GET /unread-count` - Get unread message count

### Reviews (`/api/reviews`)
- `GET /` - List reviews with filters
- `GET /:id` - Get specific review
- `POST /` - Create new review
- `PUT /:id` - Update review
- `DELETE /:id` - Soft delete review
- `GET /stats/summary` - Get review statistics

### Notifications (`/api/notifications`)
- `GET /` - List user notifications
- `GET /:id` - Get specific notification
- `PATCH /:id/read` - Mark notification as read
- `PATCH /read-all` - Mark all as read
- `DELETE /:id` - Delete notification
- `GET /unread/count` - Get unread count
- `GET /preferences` - Get notification preferences
- `PUT /preferences` - Update preferences

### Search (`/api/search`)
- `GET /global` - Global search across all entities
- `GET /medicines` - Advanced medicine search
- `GET /medicines/symptoms` - Symptom-based medicine search

### Utilities (`/api/utils`)
- `GET /health` - Health check
- `GET /system-info` - System information
- `GET /db-stats` - Database statistics
- `POST /validate` - Data validation
- `POST /validate-file` - File validation
- `GET /generate-id` - Generate unique IDs
- `GET /cache-status` - Cache system status
- `GET /rate-limit-status` - Rate limit status

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Login/Signup**: Receive JWT token
2. **Protected Routes**: Include token in `Authorization: Bearer <token>` header
3. **Token Refresh**: Use refresh token endpoint when JWT expires

### Role-Based Access Control

- **Patient**: Access to personal data, appointments, orders
- **Doctor**: Access to patient appointments, medical records
- **Pharmacist**: Access to medicine inventory, orders
- **Admin**: Full system access

## 🗄️ Database Schema

The database includes tables for:
- Users and authentication
- Patient profiles and medical history
- Healthcare facilities and providers
- Medicine catalog and inventory
- Appointments and scheduling
- Orders and delivery tracking
- Chat conversations and messages
- Reviews and ratings
- Notifications and preferences

## 🧪 Testing

```bash
npm test
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | MySQL host | localhost |
| `DB_USER` | MySQL username | root |
| `DB_PASSWORD` | MySQL password | (empty) |
| `DB_NAME` | Database name | pharmalink |
| `DB_PORT` | MySQL port | 3306 |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `JWT_SECRET` | JWT signing secret | (required) |
| `JWT_EXPIRES_IN` | JWT expiration | 24h |
| `EMAIL_HOST` | SMTP host | (optional) |
| `EMAIL_PORT` | SMTP port | (optional) |
| `EMAIL_USER` | SMTP username | (optional) |
| `EMAIL_PASS` | SMTP password | (optional) |

## 🚀 Deployment

### Production Considerations

1. **Environment Variables**: Set all required environment variables
2. **Database**: Use production MySQL server
3. **Security**: Enable HTTPS, set secure JWT secret
4. **Monitoring**: Implement logging and health checks
5. **Rate Limiting**: Adjust rate limits for production traffic

### Docker (Optional)

```bash
# Build image
docker build -t pharmalink-backend .

# Run container
docker run -p 3000:3000 --env-file .env pharmalink-backend
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation

---

**PharmaLink Backend** - Empowering healthcare through technology 🏥💊 