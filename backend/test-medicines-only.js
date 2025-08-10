const axios = require('axios');

async function testMedicinesAPI() {
  try {
    console.log('💊 Testing medicines API...');
    const response = await axios.get('http://172.20.10.3:3000/api/medicines/home/available', {
      params: { limit: 5 },
      timeout: 10000
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('✅ Medicines API working!');
      console.log(`📊 Found ${response.data.data.medicines.length} medicines`);
      response.data.data.medicines.forEach((medicine, index) => {
        console.log(`  ${index + 1}. ${medicine.name} (${medicine.category}) - ${medicine.min_price ? `GHS ${medicine.min_price}` : 'Price N/A'}`);
      });
    } else {
      console.log('❌ Medicines API failed:', response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing medicines API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testMedicinesAPI(); 