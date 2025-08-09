# PharmaLink Authentication System

This document describes the authentication system implemented for the PharmaLink mobile app.

## Overview

The authentication system provides a complete user flow from welcome screen to login/signup, with proper state management and navigation.

## Features

### 1. Welcome Screen (`/welcome`)
- Beautiful landing page with app branding
- Feature highlights of the app
- Two main action buttons:
  - **Get Started**: Navigates to signup page
  - **I already have an account**: Navigates to login page
- Terms of Service and Privacy Policy links

### 2. Login Screen (`/login`)
- Email and password input fields
- Show/hide password functionality
- Forgot password link
- Social login options (Google, Facebook)
- Link to signup page
- Form validation and error handling

### 3. Signup Screen (`/signup`)
- User type selection (Patient, Pharmacist, Doctor, Hospital)
- Personal information form (Name, Email, Phone, Password)
- Password confirmation
- Terms and conditions acceptance
- Link to login page
- Comprehensive form validation

### 4. Authentication Context
- Manages user authentication state
- Provides login, signup, and logout functions
- Persists authentication data using AsyncStorage
- Handles loading states

## File Structure

```
app/
├── index.tsx              # Main entry point with auth routing
├── welcome.tsx            # Welcome/landing page
├── login.tsx              # Login screen
├── signup.tsx             # Signup screen
├── _layout.tsx            # Root layout with auth provider
└── (tabs)/                # Main app tabs (protected routes)

context/
├── AuthContext.tsx        # Authentication context provider

components/
└── LoadingScreen.tsx      # Loading screen component
```

## How It Works

### 1. App Launch
- App starts and shows loading screen
- Checks for existing authentication token
- If authenticated: redirects to main app
- If not authenticated: redirects to welcome page

### 2. User Registration
- User selects account type
- Fills in personal information
- Account is created and user is logged in
- Redirected to main app

### 3. User Login
- User enters credentials
- Credentials are validated
- If valid: user is logged in and redirected to main app
- If invalid: error message is shown

### 4. User Logout
- User can logout from profile page
- Authentication data is cleared
- User is redirected to welcome page

## Authentication Flow

```
App Launch → Check Auth Status → Loading Screen
     ↓
[Authenticated] → Main App
     ↓
[Not Authenticated] → Welcome Page
     ↓
[Get Started] → Signup Page → Main App
     ↓
[Login] → Login Page → Main App
```

## Technical Implementation

### Dependencies
- `@react-native-async-storage/async-storage`: For persisting authentication data
- `expo-linear-gradient`: For beautiful gradient backgrounds
- `@expo/vector-icons/FontAwesome`: For icons

### State Management
- Uses React Context API for global authentication state
- AsyncStorage for persistent storage
- Loading states for better UX

### Navigation
- Uses Expo Router for navigation
- Protected routes for authenticated users
- Proper back navigation between auth screens

## Customization

### Styling
- All screens use consistent color scheme
- Gradient backgrounds for modern look
- Responsive design for different screen sizes

### Validation
- Email format validation
- Password strength requirements
- Required field validation
- Custom error messages

### User Types
- Patient: For regular users seeking medical services
- Pharmacist: For pharmacy service providers
- Doctor: For medical professionals
- Hospital: For hospital representatives

## Security Notes

⚠️ **Important**: This is a demo implementation. In production:

1. Implement proper API endpoints for authentication
2. Use secure token storage
3. Add biometric authentication options
4. Implement proper password hashing
5. Add rate limiting for login attempts
6. Use HTTPS for all API calls
7. Implement proper session management

## Testing

To test the authentication system:

1. **Fresh Install**: App should show welcome page
2. **Signup**: Create new account and verify redirect to main app
3. **Login**: Use existing credentials to login
4. **Logout**: Verify logout returns to welcome page
5. **Persistence**: Restart app to verify login state persists

## Future Enhancements

- [ ] Biometric authentication (fingerprint/face ID)
- [ ] Two-factor authentication
- [ ] Password reset functionality
- [ ] Email verification
- [ ] Social login integration
- [ ] Remember me functionality
- [ ] Session timeout handling 