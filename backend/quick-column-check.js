const { executeQuery } = require('./config/database');

async function quickCheck() {
  try {
    console.log('🔍 Quick column check...');
    
    const query = 'DESCRIBE healthcare_facilities';
    const result = await executeQuery(query);
    
    if (result.success) {
      console.log('📋 Columns in order:');
      result.data.forEach((col, index) => {
        console.log(`${index + 1}. ${col.Field}: ${col.Type}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickCheck();
