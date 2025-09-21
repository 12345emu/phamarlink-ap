const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function debugProfileUpload() {
  console.log('🔍 Debugging profile upload issue...');
  
  const baseURL = 'http://172.20.10.3:3000/api';
  
  try {
    // Step 1: Check if server is running
    console.log('\n📋 Step 1: Checking server status...');
    try {
      const healthResponse = await axios.get(`${baseURL}/utils/health`, { timeout: 5000 });
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server is not accessible:', error.message);
      console.log('💡 Please make sure your backend server is running on port 3000');
      return;
    }
    
    // Step 2: Create a test image file
    console.log('\n📋 Step 2: Creating test image...');
    const testImagePath = path.join(__dirname, 'debug-test.jpg');
    
    // Create a minimal JPEG file
    const jpegHeader = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x00, 0xFF, 0xD9
    ]);
    
    fs.writeFileSync(testImagePath, jpegHeader);
    console.log('✅ Test image created');
    
    // Step 3: Test the upload endpoint without authentication first
    console.log('\n📋 Step 3: Testing upload endpoint without auth...');
    
    const formData = new FormData();
    formData.append('profileImage', fs.createReadStream(testImagePath), {
      filename: 'debug-test.jpg',
      contentType: 'image/jpeg'
    });
    
    try {
      const uploadResponse = await axios.post(`${baseURL}/auth/upload-profile-image`, formData, {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 10000
      });
      
      console.log('📋 Upload response:', uploadResponse.data);
    } catch (error) {
      if (error.response) {
        console.log('📋 Upload error response:', {
          status: error.response.status,
          message: error.response.data.message,
          data: error.response.data
        });
        
        if (error.response.status === 401) {
          console.log('✅ Endpoint is accessible (authentication required)');
        } else if (error.response.status === 400 && error.response.data.message === 'No image file provided') {
          console.log('❌ File not being received by server');
          console.log('💡 This suggests a multer configuration issue');
        }
      } else {
        console.log('❌ Network error:', error.message);
      }
    }
    
    // Step 4: Test with a simple text file to see if multer is working
    console.log('\n📋 Step 4: Testing with text file...');
    const textFilePath = path.join(__dirname, 'debug-test.txt');
    fs.writeFileSync(textFilePath, 'This is a test file');
    
    const textFormData = new FormData();
    textFormData.append('profileImage', fs.createReadStream(textFilePath), {
      filename: 'debug-test.txt',
      contentType: 'text/plain'
    });
    
    try {
      const textUploadResponse = await axios.post(`${baseURL}/auth/upload-profile-image`, textFormData, {
        headers: {
          ...textFormData.getHeaders()
        },
        timeout: 10000
      });
      
      console.log('📋 Text upload response:', textUploadResponse.data);
    } catch (error) {
      if (error.response) {
        console.log('📋 Text upload error:', {
          status: error.response.status,
          message: error.response.data.message
        });
        
        if (error.response.data.message === 'Only image files are allowed') {
          console.log('✅ Multer file filter is working correctly');
        } else if (error.response.data.message === 'No image file provided') {
          console.log('❌ Multer is not receiving any files at all');
        }
      }
    }
    
    // Step 5: Clean up
    console.log('\n📋 Step 5: Cleaning up...');
    try {
      fs.unlinkSync(testImagePath);
      fs.unlinkSync(textFilePath);
      console.log('✅ Test files cleaned up');
    } catch (error) {
      console.log('⚠️ Failed to clean up test files');
    }
    
    console.log('\n🎉 Debug test completed!');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  }
}

debugProfileUpload();



