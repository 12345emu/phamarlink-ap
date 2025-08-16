const axios = require('axios');

const API_BASE_URL = 'http://172.20.10.3:3000/api';

async function testCartValidation() {
  try {
    console.log('🔍 Testing cart validation...\n');

    // 1. Test login to get token
    console.log('1. Logging in to get authentication token...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'john.doe@example.com',
      password: 'password123'
    });

    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token\n');

    // Set up axios with auth header
    const authAxios = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // 2. Test with correct data
    console.log('2. Testing with correct data...');
    try {
      const correctData = {
        medicineId: 1,
        pharmacyId: 1,
        quantity: 2,
        pricePerUnit: 10.50
      };
      
      const response = await authAxios.post('/cart/add', correctData);
      console.log('✅ Success with correct data:', response.data.message);
    } catch (error) {
      console.log('❌ Failed with correct data:', error.response?.data?.message);
      if (error.response?.data?.errors) {
        console.log('   Validation errors:', error.response.data.errors);
      }
    }

    // 3. Test with missing medicineId
    console.log('\n3. Testing with missing medicineId...');
    try {
      const invalidData = {
        pharmacyId: 1,
        quantity: 2,
        pricePerUnit: 10.50
      };
      
      const response = await authAxios.post('/cart/add', invalidData);
      console.log('❌ Should have failed but succeeded');
    } catch (error) {
      console.log('✅ Correctly failed with missing medicineId:', error.response?.data?.message);
      if (error.response?.data?.errors) {
        console.log('   Validation errors:', error.response.data.errors);
      }
    }

    // 4. Test with invalid data types
    console.log('\n4. Testing with invalid data types...');
    try {
      const invalidData = {
        medicineId: 'not_a_number',
        pharmacyId: 'also_not_a_number',
        quantity: 'invalid',
        pricePerUnit: 'wrong'
      };
      
      const response = await authAxios.post('/cart/add', invalidData);
      console.log('❌ Should have failed but succeeded');
    } catch (error) {
      console.log('✅ Correctly failed with invalid data types:', error.response?.data?.message);
      if (error.response?.data?.errors) {
        console.log('   Validation errors:', error.response.data.errors);
      }
    }

    console.log('\n✅ Cart validation test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testCartValidation(); 