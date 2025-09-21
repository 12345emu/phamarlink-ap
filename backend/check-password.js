const { executeQuery } = require('./config/database');
const bcrypt = require('bcrypt');

const checkPassword = async () => {
  try {
    console.log('🔍 Checking password for john.doe@email.com...');
    
    const result = await executeQuery('SELECT password_hash FROM users WHERE email = ?', ['john.doe@email.com']);
    
    if (result.success && result.data.length > 0) {
      const hash = result.data[0].password_hash;
      console.log('✅ Password hash found:', hash);
      
      // Test different passwords
      const passwords = ['TestPassword123!', 'password123', 'Password123', 'test123', 'admin'];
      
      for (const password of passwords) {
        const match = await bcrypt.compare(password, hash);
        console.log(`Password "${password}": ${match ? '✅ MATCH' : '❌ No match'}`);
      }
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

checkPassword();
