# Token Expiration and Automatic Logout Feature

This document describes the implementation of automatic token expiration handling and logout functionality in the PharmaLink mobile application.

## Overview

The application now automatically handles JWT token expiration by:
1. Detecting when a token has expired during API calls
2. Attempting to refresh the token using a refresh token
3. If refresh fails, automatically logging out the user and redirecting to login
4. Periodically checking token expiration in the background

## How It Works

### 1. API Client Interceptor
- **File**: `services/apiClient.ts`
- **Function**: Automatically intercepts all API requests and responses
- **Token Detection**: Detects 401 Unauthorized responses (token expired)
- **Refresh Attempt**: Automatically attempts to refresh the token
- **Logout Trigger**: If refresh fails, triggers automatic logout

### 2. AuthContext Integration
- **File**: `context/AuthContext.tsx`
- **Callback Setup**: Sets up callback for token expiration events
- **Periodic Checks**: Checks token expiration every 5 minutes
- **State Management**: Manages authentication state and user data

### 3. Backend Support
- **File**: `backend/routes/auth.js`
- **Refresh Endpoint**: `/auth/refresh-token` endpoint for token refresh
- **Token Generation**: Generates both access tokens (15m) and refresh tokens (7d)

## Implementation Details

### Token Expiration Detection

```typescript
// In apiClient.ts
if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
  console.log('🔍 Token expired detected, attempting refresh...');
  // Attempt token refresh
  const newToken = await this.refreshToken();
  if (newToken) {
    // Retry original request with new token
    return this.client(originalRequest);
  } else {
    // Trigger logout if refresh fails
    await this.handleAuthFailure();
  }
}
```

### Automatic Logout Trigger

```typescript
// In AuthContext.tsx
const handleTokenExpired = async () => {
  console.log('🔍 AuthContext - Token expired, performing automatic logout');
  try {
    // Clear local state
    setIsAuthenticated(false);
    setUser(null);
    setFirstTimeUser(true);
    
    // Clear profile image from context and storage
    clearProfileImage();
    
    console.log('🔍 AuthContext - Automatic logout completed');
  } catch (error) {
    console.error('❌ AuthContext - Error during automatic logout:', error);
  }
};
```

### Periodic Token Checking

```typescript
// In AuthContext.tsx
useEffect(() => {
  // Set up periodic token expiration check (every 5 minutes)
  const tokenCheckInterval = setInterval(async () => {
    if (isAuthenticated) {
      await checkTokenExpiration();
    }
  }, 5 * 60 * 1000); // 5 minutes
  
  return () => {
    clearInterval(tokenCheckInterval);
  };
}, [isAuthenticated]);
```

## Testing the Feature

### 1. Backend Token Testing
Run the token expiration test script:

```bash
cd backend
node test-token-expiration.js
```

This script will:
- Create a test user
- Generate tokens with different expiration times
- Test token validation and expiration
- Verify refresh token functionality

### 2. Frontend Testing
Use the test button in the Profile screen:

1. Navigate to the Profile tab
2. Scroll down to find the "Test Token Expiration" button (orange button)
3. Tap the button and confirm
4. The app should automatically logout and redirect to login

### 3. Manual Testing
To test with real expired tokens:

1. Login to the application
2. Wait for the token to expire (default: 15 minutes)
3. Try to perform any API action
4. The app should automatically refresh the token or logout

## Configuration

### Token Expiration Times
- **Access Token**: 15 minutes (configurable via `JWT_EXPIRES_IN` environment variable)
- **Refresh Token**: 7 days (configurable via `JWT_REFRESH_EXPIRES_IN` environment variable)

### Check Intervals
- **Periodic Check**: Every 5 minutes (configurable in AuthContext)
- **API Call Check**: On every API request/response

## Environment Variables

Add these to your `.env` file:

```env
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

## Troubleshooting

### Common Issues

1. **Token not refreshing**
   - Check if refresh token exists in AsyncStorage
   - Verify backend refresh endpoint is working
   - Check network connectivity

2. **Automatic logout not working**
   - Verify AuthContext is properly set up
   - Check if token expiration callback is registered
   - Ensure AsyncStorage is working correctly

3. **Periodic checks not working**
   - Check if the interval is being cleared properly
   - Verify the useEffect dependencies
   - Check console logs for errors

### Debug Logging

The implementation includes extensive debug logging. Check the console for:
- `🔍` - Information messages
- `❌` - Error messages
- `✅` - Success messages

### Manual Token Check

You can manually check token expiration:

```typescript
import { useAuth } from '../context/AuthContext';

const { checkTokenExpiration } = useAuth();

// Check token expiration manually
await checkTokenExpiration();
```

## Security Considerations

1. **Token Storage**: Tokens are stored securely in AsyncStorage
2. **Automatic Cleanup**: All auth data is cleared on logout
3. **Refresh Token Rotation**: New refresh tokens are issued on each refresh
4. **Secure Communication**: All API calls use HTTPS

## Recent Enhancements

### ✅ **Enhanced Automatic Logout (Latest)**
- **User Notification**: Users now receive an alert when automatically logged out
- **Complete Data Cleanup**: All authentication data is properly cleared from storage
- **Error Handling**: Robust error handling ensures logout even if cleanup fails
- **Testing Component**: Added `TokenExpirationTest` component for easy testing
- **Enhanced Test Script**: Comprehensive test script with performance testing

### ✅ **Testing Features**
- **Manual Test Button**: Test token expiration functionality with a single button
- **Token Status Check**: Verify current token validity
- **Confirmation Dialogs**: Safe testing with user confirmation
- **Console Logging**: Detailed logging for debugging

## Future Enhancements

1. **Token Blacklisting**: Implement server-side token blacklisting
2. **Biometric Authentication**: Add biometric re-authentication for sensitive actions
3. **Offline Support**: Handle token expiration when offline
4. **Multiple Device Support**: Handle concurrent sessions across devices
5. **Session Management**: Track and manage multiple active sessions

## Files Modified

- `services/apiClient.ts` - Added token expiration handling
- `context/AuthContext.tsx` - Enhanced automatic logout with user notifications
- `components/TokenExpirationTest.tsx` - New testing component
- `app/(tabs)/profile.tsx` - Added test button
- `backend/routes/auth.js` - Refresh token endpoint (already existed)
- `backend/test-token-expiration.js` - Original test file
- `backend/test-token-expiration-enhanced.js` - Enhanced test file with comprehensive testing
- `TOKEN_EXPIRATION_README.md` - Updated documentation

## API Endpoints

- `POST /auth/refresh-token` - Refresh access token using refresh token
- `POST /auth/logout` - Logout endpoint (clears server-side session)

## Dependencies

- `jsonwebtoken` - JWT token handling
- `@react-native-async-storage/async-storage` - Secure token storage
- `axios` - HTTP client with interceptors
