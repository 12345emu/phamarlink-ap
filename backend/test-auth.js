const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe',
  userType: 'patient',
  phone: '+233201234567'
};

let authToken = '';
let refreshToken = '';

async function testAuthEndpoints() {
  console.log('🧪 Testing Authentication Endpoints...\n');

  try {
    // Test 1: Signup
    console.log('1️⃣ Testing Signup...');
    const signupResponse = await axios.post(`${BASE_URL}/auth/signup`, testUser);
    console.log('✅ Signup successful:', signupResponse.data.message);
    
    if (signupResponse.data.data?.token) {
      authToken = signupResponse.data.data.token;
      refreshToken = signupResponse.data.data.refreshToken;
      console.log('🔑 Token received');
    }

    // Test 2: Login
    console.log('\n2️⃣ Testing Login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    console.log('✅ Login successful:', loginResponse.data.message);
    
    if (loginResponse.data.data?.token) {
      authToken = loginResponse.data.data.token;
      refreshToken = loginResponse.data.data.refreshToken;
      console.log('🔑 Token received');
    }

    // Test 3: Get Profile (with auth)
    console.log('\n3️⃣ Testing Get Profile...');
    const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Profile retrieved:', profileResponse.data.data.first_name);

    // Test 4: Refresh Token
    console.log('\n4️⃣ Testing Refresh Token...');
    const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh-token`, {
      refreshToken: refreshToken
    });
    console.log('✅ Token refreshed:', refreshResponse.data.message);
    
    if (refreshResponse.data.data?.token) {
      authToken = refreshResponse.data.data.token;
      refreshToken = refreshResponse.data.data.refreshToken;
      console.log('🔑 New tokens received');
    }

    // Test 5: Forgot Password
    console.log('\n5️⃣ Testing Forgot Password...');
    const forgotPasswordResponse = await axios.post(`${BASE_URL}/auth/forgot-password`, {
      email: testUser.email
    });
    console.log('✅ Forgot password:', forgotPasswordResponse.data.message);

    // Test 6: Logout
    console.log('\n6️⃣ Testing Logout...');
    const logoutResponse = await axios.post(`${BASE_URL}/auth/logout`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Logout successful:', logoutResponse.data.message);

    console.log('\n🎉 All authentication tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('💡 This might be expected if the user already exists');
    }
  }
}

// Run tests
testAuthEndpoints(); 