const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

async function testPatientProfileDB() {
  let connection;
  
  try {
    console.log('🔍 Testing patient profile database operations...');
    
    // 1. Connect to database
    console.log('1. Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully!');

    // 2. Check current patient profile
    console.log('\n2. Checking current patient profile for user ID 4...');
    const [profileRows] = await connection.execute(
      'SELECT * FROM patient_profiles WHERE user_id = ?',
      [4]
    );
    
    console.log('✅ Current patient profile:');
    console.log(JSON.stringify(profileRows[0], null, 2));

    // 3. Test the update query that's failing
    console.log('\n3. Testing the update query...');
    const updateQuery = `
      UPDATE patient_profiles 
      SET emergency_contact = COALESCE(?, emergency_contact),
          insurance_provider = COALESCE(?, insurance_provider),
          insurance_number = COALESCE(?, insurance_number),
          blood_type = COALESCE(?, blood_type),
          allergies = COALESCE(?, allergies),
          medical_history = COALESCE(?, medical_history),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `;
    
    const updateParams = [
      '+233 20 123 4567',  // emergency_contact
      null,                // insurance_provider
      null,                // insurance_number
      null,                // blood_type
      null,                // allergies
      null,                // medical_history
      4                    // user_id
    ];

    console.log('Update query:', updateQuery);
    console.log('Update params:', updateParams);

    const [updateResult] = await connection.execute(updateQuery, updateParams);
    console.log('✅ Update result:', updateResult);

    // 4. Check updated patient profile
    console.log('\n4. Checking updated patient profile...');
    const [updatedProfileRows] = await connection.execute(
      'SELECT * FROM patient_profiles WHERE user_id = ?',
      [4]
    );
    
    console.log('✅ Updated patient profile:');
    console.log(JSON.stringify(updatedProfileRows[0], null, 2));

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

testPatientProfileDB(); 