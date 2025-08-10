const axios = require('axios');

async function testProfessionalsData() {
  try {
    console.log('👨‍⚕️ Testing professionals API data...');
    const response = await axios.get('http://172.20.10.3:3000/api/professionals/home/available', {
      params: { limit: 5 },
      timeout: 10000
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data.professionals) {
      console.log('\n📊 Professionals data:');
      response.data.data.professionals.forEach((professional, index) => {
        console.log(`\n${index + 1}. Professional:`, {
          id: professional.id,
          name: professional.full_name,
          specialty: professional.specialty,
          rating: professional.rating,
          rating_type: typeof professional.rating,
          total_reviews: professional.total_reviews,
          experience_years: professional.experience_years,
          experience_text: professional.experience_text,
          is_available: professional.is_available
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing professionals API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testProfessionalsData(); 