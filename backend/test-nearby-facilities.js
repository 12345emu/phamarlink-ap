const axios = require('axios');

async function testNearbyFacilities() {
  try {
    console.log('🧪 Testing nearby facilities API...');
    
    const response = await axios.get('http://172.20.10.3:3000/api/facilities/nearby', {
      params: {
        latitude: 5.5600,
        longitude: -0.2057,
        radius: 10,
        limit: 5
      },
      timeout: 10000
    });

    console.log('✅ Nearby facilities API working!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Found facilities:', response.data.data.facilities.length);
    
    console.log('\n📍 Facilities found:');
    response.data.data.facilities.forEach((facility, index) => {
      console.log(`${index + 1}. ${facility.name}`);
      console.log(`   Type: ${facility.facility_type}`);
      console.log(`   Distance: ${facility.distance_km}km`);
      console.log(`   City: ${facility.city}`);
      console.log(`   Rating: ${facility.rating}/5 (${facility.total_reviews} reviews)`);
      console.log('');
    });

    console.log('🎉 Nearby facilities search is working perfectly!');
    console.log('🚀 Your mobile app should now be able to fetch nearby facilities.');

  } catch (error) {
    console.error('❌ API test failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your backend server is running on port 3000');
      console.log('   Run: node server.js');
    }
  }
}

testNearbyFacilities(); 