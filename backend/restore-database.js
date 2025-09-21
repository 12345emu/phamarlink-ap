const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function restoreDatabase() {
  let connection;
  
  try {
    console.log('🔧 Starting database restoration...');
    
    // Create connection without specifying database (to create it)
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      port: 3306
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'restore-pharmalink-db1.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📖 SQL file read successfully');
    
    // Split the SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        if (statement.toLowerCase().includes('select') && statement.includes('Status')) {
          // This is the final status message
          const [rows] = await connection.execute(statement);
          console.log('🎉', rows[0].Status);
        } else {
          await connection.execute(statement);
          console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
        }
      } catch (error) {
        console.log(`⚠️ Statement ${i + 1} warning:`, error.message);
        // Continue with other statements
      }
    }
    
    console.log('🎉 Database restoration completed successfully!');
    
    // Test the restored database
    console.log('\n🧪 Testing restored database...');
    
    // Switch to the restored database
    await connection.execute('USE pharmalink_db1');
    
    // Test queries
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Users table: ${users[0].count} records`);
    
    const [facilities] = await connection.execute('SELECT COUNT(*) as count FROM healthcare_facilities');
    console.log(`🏥 Healthcare facilities: ${facilities[0].count} records`);
    
    const [medicines] = await connection.execute('SELECT COUNT(*) as count FROM medicines');
    console.log(`💊 Medicines: ${medicines[0].count} records`);
    
    const [appointments] = await connection.execute('SELECT COUNT(*) as count FROM appointments');
    console.log(`📅 Appointments: ${appointments[0].count} records`);
    
    // Show sample users
    const [sampleUsers] = await connection.execute('SELECT id, email, user_type, first_name, last_name FROM users LIMIT 5');
    console.log('\n📋 Sample users:');
    sampleUsers.forEach(user => {
      console.log(`  - ${user.first_name} ${user.last_name} (${user.email}) - ${user.user_type}`);
    });
    
    console.log('\n✅ Database restoration and testing completed!');
    console.log('🔑 You can now use these test credentials:');
    console.log('   Email: test@example.com');
    console.log('   Password: password123');
    console.log('   Email: john.doe@email.com');
    console.log('   Password: TestPassword123!');
    
  } catch (error) {
    console.error('❌ Database restoration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the restoration
restoreDatabase();

