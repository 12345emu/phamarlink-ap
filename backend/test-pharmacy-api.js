const axios = require('axios');

async function testPharmacyAPI() {
  try {
    console.log('🧪 Testing pharmacy API...');
    const response = await axios.get('http://172.20.10.3:3000/api/facilities/nearby?latitude=5.5600&longitude=-0.2057&type=pharmacy&radius=50&limit=50');
    
    console.log('✅ Pharmacy API working!');
    console.log('📊 Found', response.data.data.facilities.length, 'pharmacies');
    
    response.data.data.facilities.forEach((pharmacy, index) => {
      console.log(`${index + 1}. ${pharmacy.name} - ${pharmacy.distance_km.toFixed(2)}km`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testPharmacyAPI(); 