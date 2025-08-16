const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testCartAPI() {
  try {
    console.log('🧪 Testing Cart API...\n');

    // Step 1: Login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@pharmalink.com',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Step 2: Get current cart
    console.log('2. Getting current cart...');
    const cartResponse = await axios.get(`${API_BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Cart retrieved:', cartResponse.data);
    console.log('Items in cart:', cartResponse.data.items.length);

    // Step 3: Add item to cart
    console.log('\n3. Adding item to cart...');
    const addToCartData = {
      medicineId: 1,
      pharmacyId: 1,
      pricePerUnit: 15.99,
      quantity: 2
    };

    const addResponse = await axios.post(`${API_BASE_URL}/cart/add`, addToCartData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Item added to cart:', addResponse.data);

    // Step 4: Get updated cart
    console.log('\n4. Getting updated cart...');
    const updatedCartResponse = await axios.get(`${API_BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Updated cart:', updatedCartResponse.data);
    console.log('Items in cart:', updatedCartResponse.data.items.length);

    console.log('\n🎉 Cart API test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing cart API:', error.response?.data || error.message);
  }
}

testCartAPI(); 