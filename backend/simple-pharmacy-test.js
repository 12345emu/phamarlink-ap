const axios = require('axios');
const FormData = require('form-data');

const API_BASE_URL = 'http://172.20.10.3:3000/api';

async function testPharmacyRegistration() {
  try {
    console.log('🔍 Testing pharmacy registration endpoint...');
    
    // Test data
    const pharmacyData = {
      pharmacyName: 'Test Pharmacy',
      ownerName: 'John Doe',
      email: 'test.pharmacy@example.com',
      phone: '+233501234567',
      address: '123 Test Street, Accra',
      city: 'Accra',
      region: 'Greater Accra',
      postalCode: '00233',
      latitude: '5.5600',
      longitude: '-0.2057',
      licenseNumber: 'PHARM-2024-003',
      registrationNumber: 'REG-2024-003',
      services: ['Prescription Dispensing', 'Over-the-Counter Medications'],
      operatingHours: 'Mon-Fri: 8AM-8PM',
      emergencyContact: '+233501234568',
      description: 'A test pharmacy for registration testing.',
      acceptsInsurance: true
    };

    // Create FormData
    const formData = new FormData();
    
    // Add text fields
    Object.keys(pharmacyData).forEach(key => {
      if (key === 'services') {
        pharmacyData[key].forEach(service => {
          formData.append('services[]', service);
        });
      } else if (typeof pharmacyData[key] === 'boolean') {
        formData.append(key, pharmacyData[key].toString());
      } else {
        formData.append(key, pharmacyData[key]);
      }
    });

    console.log('🔍 Submitting pharmacy registration...');
    
    const response = await axios.post(`${API_BASE_URL}/facilities/pharmacy/register`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000,
    });

    console.log('✅ Pharmacy registration successful!');
    console.log('📊 Response status:', response.status);
    console.log('📝 Response data:', {
      success: response.data.success,
      message: response.data.message,
      hasData: !!response.data.data,
      pharmacyId: response.data.data?.pharmacy?.id
    });

    if (response.data.data?.pharmacy) {
      const pharmacy = response.data.data.pharmacy;
      console.log('🏥 Pharmacy details:');
      console.log(`   ID: ${pharmacy.id}`);
      console.log(`   Name: ${pharmacy.name}`);
      console.log(`   Owner: ${pharmacy.owner_name}`);
      console.log(`   Email: ${pharmacy.email}`);
      console.log(`   License: ${pharmacy.license_number}`);
      console.log(`   Verified: ${pharmacy.is_verified}`);
      console.log(`   Active: ${pharmacy.is_active}`);
    }

  } catch (error) {
    console.error('❌ Pharmacy registration test failed:');
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data?.message);
      console.error('   Errors:', error.response.data?.errors);
    } else if (error.request) {
      console.error('   Network error - no response received');
    } else {
      console.error('   Error:', error.message);
    }
  }
}

testPharmacyRegistration();
