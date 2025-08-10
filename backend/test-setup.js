#!/usr/bin/env node

const { testConnection, executeQuery } = require('./config/database');

async function testBackendSetup() {
  console.log('🧪 Testing PharmaLink Backend Setup...\n');

  try {
    // Test 1: Database Connection
    console.log('1️⃣ Testing Database Connection...');
    const dbConnected = await testConnection();
    
    if (dbConnected) {
      console.log('✅ Database connection successful');
    } else {
      console.log('❌ Database connection failed');
      return;
    }

    // Test 2: Check if database exists and has tables
    console.log('\n2️⃣ Checking Database Schema...');
    const tablesResult = await executeQuery(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'pharmalink'
      ORDER BY TABLE_NAME
    `);

    if (tablesResult.success) {
      const tables = tablesResult.data.map(row => row.TABLE_NAME);
      console.log(`✅ Found ${tables.length} tables in database:`);
      tables.forEach(table => console.log(`   - ${table}`));
      
      if (tables.length === 0) {
        console.log('⚠️  No tables found. Please import the schema.sql file.');
      }
    } else {
      console.log('❌ Failed to check database schema:', tablesResult.error);
    }

    // Test 3: Check sample data
    if (tablesResult.success && tablesResult.data.length > 0) {
      console.log('\n3️⃣ Checking Sample Data...');
      
      // Check users table
      const usersResult = await executeQuery('SELECT COUNT(*) as count FROM users');
      if (usersResult.success) {
        console.log(`✅ Users table: ${usersResult.data[0].count} records`);
      }

      // Check medicines table
      const medicinesResult = await executeQuery('SELECT COUNT(*) as count FROM medicines');
      if (medicinesResult.success) {
        console.log(`✅ Medicines table: ${medicinesResult.data[0].count} records`);
      }

      // Check facilities table
      const facilitiesResult = await executeQuery('SELECT COUNT(*) as count FROM healthcare_facilities');
      if (facilitiesResult.success) {
        console.log(`✅ Healthcare facilities table: ${facilitiesResult.data[0].count} records`);
      }
    }

    // Test 4: Environment Variables
    console.log('\n4️⃣ Checking Environment Variables...');
    const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      console.log('✅ All required environment variables are set');
    } else {
      console.log('⚠️  Missing environment variables:', missingVars.join(', '));
      console.log('   Please check your .env file');
    }

    console.log('\n🎉 Backend setup test completed!');
    
    if (missingVars.length === 0 && tablesResult.success && tablesResult.data.length > 0) {
      console.log('✅ Your backend is ready to use!');
      console.log('🚀 Start the server with: npm run dev');
    } else {
      console.log('⚠️  Please fix the issues above before starting the server');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testBackendSetup(); 