const axios = require('axios');

async function testFrontendAPI() {
  try {
    console.log('🧪 Testing frontend API call simulation...');
    
    // Simulate the frontend API call with user's actual coordinates
    const response = await axios.get('http://172.20.10.3:3000/api/facilities/nearby', {
      params: {
        latitude: 5.724236955871541,
        longitude: -0.004141498357061428,
        radius: 10,
        limit: 5
      },
      timeout: 10000
    });

    console.log('✅ API call successful!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Response data structure:', JSON.stringify(response.data, null, 2));
    
    // Check if the response has the expected structure
    if (response.data.success && response.data.data && response.data.data.facilities) {
      console.log('✅ Response has correct structure');
      console.log('📊 Number of facilities:', response.data.data.facilities.length);
      
      // Check the first facility structure
      if (response.data.data.facilities.length > 0) {
        const firstFacility = response.data.data.facilities[0];
        console.log('📊 First facility structure:', JSON.stringify(firstFacility, null, 2));
        
        // Check if it has the required fields
        const requiredFields = ['id', 'name', 'facility_type', 'latitude', 'longitude'];
        const missingFields = requiredFields.filter(field => !firstFacility[field]);
        
        if (missingFields.length === 0) {
          console.log('✅ First facility has all required fields');
        } else {
          console.log('❌ Missing fields in first facility:', missingFields);
        }
      }
    } else {
      console.log('❌ Response does not have expected structure');
      console.log('📊 Actual structure:', Object.keys(response.data));
    }
    
  } catch (error) {
    console.error('❌ API test failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testFrontendAPI(); 