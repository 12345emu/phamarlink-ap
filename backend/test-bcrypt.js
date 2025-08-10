const bcrypt = require('bcryptjs');

async function testBcrypt() {
  try {
    console.log('🧪 Testing bcrypt password comparison...');
    
    const storedHash = '$2a$12$jn/tlibY7uhqhPdFCl9i3O4NY/Qp0b/YFymncJsSToOo4hw6/hpyq';
    const testPassword = 'password123';
    
    console.log('🔑 Stored hash:', storedHash);
    console.log('🔐 Test password:', testPassword);
    
    // Test password comparison
    const isMatch = await bcrypt.compare(testPassword, storedHash);
    console.log('✅ Password match:', isMatch);
    
    // Test with wrong password
    const isWrongMatch = await bcrypt.compare('wrongpassword', storedHash);
    console.log('❌ Wrong password match:', isWrongMatch);
    
    // Generate new hash for comparison
    const newHash = await bcrypt.hash(testPassword, 12);
    console.log('🆕 New hash:', newHash);
    
    // Test new hash
    const isNewMatch = await bcrypt.compare(testPassword, newHash);
    console.log('✅ New hash match:', isNewMatch);
    
  } catch (error) {
    console.error('💥 Bcrypt error:', error);
  }
}

testBcrypt(); 