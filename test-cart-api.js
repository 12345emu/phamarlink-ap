const axios = require('axios');

const API_BASE_URL = 'http://172.20.10.3:3000/api';

async function testCartAPI() {
  try {
    console.log('🔍 Testing Cart API endpoints...\n');

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

    // 2. Test GET cart
    console.log('2. Testing GET /cart...');
    try {
      const getCartResponse = await authAxios.get('/cart');
      console.log('✅ GET /cart successful');
      console.log('   Cart items:', getCartResponse.data.data?.length || 0);
    } catch (error) {
      console.log('❌ GET /cart failed:', error.response?.data?.message || error.message);
    }

    // 3. Test POST /cart/add
    console.log('\n3. Testing POST /cart/add...');
    try {
      const addToCartData = {
        medicineId: 1,
        pharmacyId: 1,
        quantity: 2,
        pricePerUnit: 10.50
      };
      
      const addCartResponse = await authAxios.post('/cart/add', addToCartData);
      console.log('✅ POST /cart/add successful');
      console.log('   Response:', addCartResponse.data.message);
    } catch (error) {
      console.log('❌ POST /cart/add failed:', error.response?.data?.message || error.message);
      if (error.response?.data?.errors) {
        console.log('   Validation errors:', error.response.data.errors);
      }
    }

    // 4. Test GET cart again to see the added item
    console.log('\n4. Testing GET /cart again...');
    try {
      const getCartResponse2 = await authAxios.get('/cart');
      console.log('✅ GET /cart successful');
      console.log('   Cart items:', getCartResponse2.data.data?.length || 0);
      if (getCartResponse2.data.data?.length > 0) {
        console.log('   First item:', {
          id: getCartResponse2.data.data[0].id,
          medicine: getCartResponse2.data.data[0].medicine.name,
          quantity: getCartResponse2.data.data[0].quantity,
          price: getCartResponse2.data.data[0].pricePerUnit
        });
      }
    } catch (error) {
      console.log('❌ GET /cart failed:', error.response?.data?.message || error.message);
    }

    console.log('\n✅ Cart API test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testCartAPI(); 