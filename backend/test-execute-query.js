const { executeQuery } = require('./config/database');

async function testExecuteQuery() {
  try {
    console.log('🔍 Testing executeQuery function...');
    
    // Test a simple SELECT query
    const selectResult = await executeQuery('SELECT * FROM appointments WHERE id = 2');
    console.log('✅ SELECT query result:', selectResult);
    
    // Test the UPDATE query that's used in cancellation
    const updateResult = await executeQuery(
      'UPDATE appointments SET status = "cancelled", updated_at = NOW() WHERE id = 2'
    );
    console.log('✅ UPDATE query result:', updateResult);
    
    // Check if the update worked
    const verifyResult = await executeQuery('SELECT id, status FROM appointments WHERE id = 2');
    console.log('✅ Verification result:', verifyResult);
    
  } catch (error) {
    console.error('❌ Error testing executeQuery:', error);
  }
}

testExecuteQuery(); 