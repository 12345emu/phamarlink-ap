const axios = require('axios');

async function testNearbyAPI() {
  console.log('🧪 Testing nearby API with different parameters...\n');
  
  // Test 1: Without type filter
  console.log('1️⃣ Testing without type filter:');
  try {
    const response1 = await axios.get('http://172.20.10.3:3000/api/facilities/nearby?latitude=5.5600&longitude=-0.2057&radius=50&limit=50');
    console.log('✅ Success - Found', response1.data.data.facilities.length, 'facilities');
    console.log('📊 Facility types:', response1.data.data.facilities.map(f => f.facility_type));
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
  
  console.log('\n2️⃣ Testing with type=pharmacy:');
  try {
    const response2 = await axios.get('http://172.20.10.3:3000/api/facilities/nearby?latitude=5.5600&longitude=-0.2057&type=pharmacy&radius=50&limit=50');
    console.log('✅ Success - Found', response2.data.data.facilities.length, 'facilities');
    if (response2.data.data.facilities.length > 0) {
      console.log('📊 First facility:', response2.data.data.facilities[0].name);
    }
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
  
  console.log('\n3️⃣ Testing with type=hospital:');
  try {
    const response3 = await axios.get('http://172.20.10.3:3000/api/facilities/nearby?latitude=5.5600&longitude=-0.2057&type=hospital&radius=50&limit=50');
    console.log('✅ Success - Found', response3.data.data.facilities.length, 'facilities');
    if (response3.data.data.facilities.length > 0) {
      console.log('📊 First facility:', response3.data.data.facilities[0].name);
    }
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
  
  console.log('\n4️⃣ Testing with type=clinic:');
  try {
    const response4 = await axios.get('http://172.20.10.3:3000/api/facilities/nearby?latitude=5.5600&longitude=-0.2057&type=clinic&radius=50&limit=50');
    console.log('✅ Success - Found', response4.data.data.facilities.length, 'facilities');
    if (response4.data.data.facilities.length > 0) {
      console.log('📊 First facility:', response4.data.data.facilities[0].name);
    }
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

testNearbyAPI(); 