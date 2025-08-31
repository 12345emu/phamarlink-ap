const axios = require('axios');
const FormData = require('form-data');

const API_BASE_URL = 'http://172.20.10.3:3000/api';

async function simulateFrontendError() {
  console.log('🔍 Simulating common frontend data issues...');
  
  const testCases = [
    {
      name: 'Empty required fields',
      data: {
        pharmacyName: '',
        ownerName: 'John Doe',
        email: 'test@example.com',
        phone: '0501234567',
        address: '123 Test Street',
        city: 'Accra',
        licenseNumber: 'TEST-001'
      }
    },
    {
      name: 'Invalid phone format',
      data: {
        pharmacyName: 'Test Pharmacy',
        ownerName: 'John Doe',
        email: 'test@example.com',
        phone: '1234567890', // Invalid format
        address: '123 Test Street',
        city: 'Accra',
        licenseNumber: 'TEST-002'
      }
    },
    {
      name: 'Invalid email format',
      data: {
        pharmacyName: 'Test Pharmacy',
        ownerName: 'John Doe',
        email: 'invalid-email', // Invalid email
        phone: '0501234567',
        address: '123 Test Street',
        city: 'Accra',
        licenseNumber: 'TEST-003'
      }
    },
    {
      name: 'Short pharmacy name',
      data: {
        pharmacyName: 'A', // Too short
        ownerName: 'John Doe',
        email: 'test@example.com',
        phone: '0501234567',
        address: '123 Test Street',
        city: 'Accra',
        licenseNumber: 'TEST-004'
      }
    },
    {
      name: 'Short address',
      data: {
        pharmacyName: 'Test Pharmacy',
        ownerName: 'John Doe',
        email: 'test@example.com',
        phone: '0501234567',
        address: '123', // Too short
        city: 'Accra',
        licenseNumber: 'TEST-005'
      }
    },
    {
      name: 'Missing required field (city)',
      data: {
        pharmacyName: 'Test Pharmacy',
        ownerName: 'John Doe',
        email: 'test@example.com',
        phone: '0501234567',
        address: '123 Test Street',
        // city is missing
        licenseNumber: 'TEST-006'
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n🔍 Testing: ${testCase.name}`);
      console.log('Data:', JSON.stringify(testCase.data, null, 2));

      const formData = new FormData();
      
      Object.keys(testCase.data).forEach(key => {
        if (testCase.data[key] !== undefined && testCase.data[key] !== null) {
          formData.append(key, testCase.data[key]);
        }
      });

      const response = await axios.post(`${API_BASE_URL}/facilities/pharmacy/register`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000,
      });

      console.log(`✅ SUCCESS (unexpected): ${testCase.name}`);

    } catch (error) {
      console.log(`❌ FAILED (expected): ${testCase.name}`);
      
      if (error.response?.data?.errors) {
        console.log('Validation errors:');
        error.response.data.errors.forEach((err, index) => {
          console.log(`  ${index + 1}. Field: "${err.param}"`);
          console.log(`     Value: "${err.value}"`);
          console.log(`     Error: "${err.msg}"`);
        });
      } else {
        console.log('Error:', error.message);
      }
    }
  }
}

simulateFrontendError();
