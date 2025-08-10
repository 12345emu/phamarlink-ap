const axios = require('axios');

async function testNewAPIs() {
  try {
    console.log('🧪 Testing new API endpoints...\n');
    
    // Test medicines API
    console.log('💊 Testing medicines API...');
    const medicinesResponse = await axios.get('http://172.20.10.3:3000/api/medicines/home/available', {
      params: { limit: 5 },
      timeout: 10000
    });
    
    if (medicinesResponse.data.success) {
      console.log('✅ Medicines API working!');
      console.log(`📊 Found ${medicinesResponse.data.data.medicines.length} medicines`);
      medicinesResponse.data.data.medicines.forEach((medicine, index) => {
        console.log(`  ${index + 1}. ${medicine.name} (${medicine.category}) - ${medicine.min_price ? `GHS ${medicine.min_price}` : 'Price N/A'}`);
      });
    } else {
      console.log('❌ Medicines API failed:', medicinesResponse.data.message);
    }
    
    console.log('\n👨‍⚕️ Testing professionals API...');
    const professionalsResponse = await axios.get('http://172.20.10.3:3000/api/professionals/home/available', {
      params: { limit: 5 },
      timeout: 10000
    });
    
    if (professionalsResponse.data.success) {
      console.log('✅ Professionals API working!');
      console.log(`📊 Found ${professionalsResponse.data.data.professionals.length} professionals`);
      professionalsResponse.data.data.professionals.forEach((professional, index) => {
        console.log(`  ${index + 1}. Dr. ${professional.first_name} ${professional.last_name} (${professional.specialty}) - Rating: ${professional.rating}`);
      });
    } else {
      console.log('❌ Professionals API failed:', professionalsResponse.data.message);
    }
    
    console.log('\n🎉 All API tests completed!');
    
  } catch (error) {
    console.error('❌ Error testing APIs:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testNewAPIs(); 