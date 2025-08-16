const axios = require('axios');

async function testLoginWithProfileImage() {
  try {
    console.log('Testing login endpoint with profile image...');
    
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'testpatient@example.com',
      password: 'TestPassword123!'
    });
    
    console.log('Login response status:', response.status);
    console.log('Login response data:', {
      success: response.data.success,
      message: response.data.message,
      hasUser: !!response.data.data?.user,
      userFields: response.data.data?.user ? Object.keys(response.data.data.user) : 'No user data',
      hasProfileImage: !!response.data.data?.user?.profile_image,
      profileImage: response.data.data?.user?.profile_image || 'No profile image'
    });
    
    if (response.data.success && response.data.data?.user?.profile_image) {
      console.log('✅ SUCCESS: Profile image is included in login response');
    } else {
      console.log('❌ FAILED: Profile image is not included in login response');
    }
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testLoginWithProfileImage(); 