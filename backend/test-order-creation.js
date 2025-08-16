const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function testOrderCreation() {
  try {
    console.log('🧪 Testing Order Creation...\n');

    // Step 1: Login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@pharmalink.com',
      password: 'password123'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful\n');

    // Step 2: Create a test order
    console.log('2. Creating test order...');
    const orderData = {
      pharmacyId: 1,
      items: [
        {
          medicineId: 1,
          quantity: 2,
          unitPrice: 15.99,
          totalPrice: 31.98
        },
        {
          medicineId: 2,
          quantity: 1,
          unitPrice: 12.50,
          totalPrice: 12.50
        }
      ],
      deliveryAddress: '123 Test Street, Accra, Ghana',
      deliveryInstructions: 'Please deliver in the morning',
      paymentMethod: 'mobile_money',
      totalAmount: 44.48,
      taxAmount: 2.22,
      discountAmount: 0,
      finalAmount: 46.70
    };

    const orderResponse = await axios.post(`${API_BASE_URL}/orders`, orderData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Order created successfully!');
    console.log('Order details:', orderResponse.data);

    // Step 3: Get orders to verify
    console.log('\n3. Fetching orders...');
    const ordersResponse = await axios.get(`${API_BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Orders fetched successfully!');
    console.log('Orders count:', ordersResponse.data.data.orders.length);
    console.log('Latest order:', ordersResponse.data.data.orders[0]);

    console.log('\n🎉 Order creation test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing order creation:', error.response?.data || error.message);
  }
}

testOrderCreation(); 