const mysql = require('mysql2/promise');

async function addDeliveryConsultationColumns() {
  let connection;
  
  try {
    console.log('🔧 Adding has_delivery and has_consultation columns to healthcare_facilities table...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'pharmalink_db1',
      port: 3306
    });
    
    console.log('✅ Connected to pharmalink_db1 database');
    
    // Check existing columns
    const [columns] = await connection.execute("DESCRIBE healthcare_facilities");
    const columnNames = columns.map(col => col.Field);
    
    console.log('📋 Current columns:', columnNames);
    
    // Add has_delivery column if it doesn't exist
    if (!columnNames.includes('has_delivery')) {
      console.log('📝 Adding has_delivery column...');
      try {
        // Check if accepts_insurance exists to determine position
        if (columnNames.includes('accepts_insurance')) {
          await connection.execute(`
            ALTER TABLE healthcare_facilities 
            ADD COLUMN has_delivery BOOLEAN DEFAULT FALSE AFTER accepts_insurance
          `);
        } else if (columnNames.includes('description')) {
          await connection.execute(`
            ALTER TABLE healthcare_facilities 
            ADD COLUMN has_delivery BOOLEAN DEFAULT FALSE AFTER description
          `);
        } else {
          await connection.execute(`
            ALTER TABLE healthcare_facilities 
            ADD COLUMN has_delivery BOOLEAN DEFAULT FALSE
          `);
        }
        console.log('✅ Column has_delivery added successfully');
      } catch (error) {
        console.log(`⚠️ Error adding has_delivery:`, error.message);
        throw error;
      }
    } else {
      console.log('✅ Column has_delivery already exists');
    }
    
    // Add has_consultation column if it doesn't exist
    if (!columnNames.includes('has_consultation')) {
      console.log('📝 Adding has_consultation column...');
      try {
        // Check if has_delivery exists to determine position
        const [updatedColumns] = await connection.execute("DESCRIBE healthcare_facilities");
        const updatedColumnNames = updatedColumns.map(col => col.Field);
        
        if (updatedColumnNames.includes('has_delivery')) {
          await connection.execute(`
            ALTER TABLE healthcare_facilities 
            ADD COLUMN has_consultation BOOLEAN DEFAULT FALSE AFTER has_delivery
          `);
        } else if (updatedColumnNames.includes('accepts_insurance')) {
          await connection.execute(`
            ALTER TABLE healthcare_facilities 
            ADD COLUMN has_consultation BOOLEAN DEFAULT FALSE AFTER accepts_insurance
          `);
        } else if (updatedColumnNames.includes('description')) {
          await connection.execute(`
            ALTER TABLE healthcare_facilities 
            ADD COLUMN has_consultation BOOLEAN DEFAULT FALSE AFTER description
          `);
        } else {
          await connection.execute(`
            ALTER TABLE healthcare_facilities 
            ADD COLUMN has_consultation BOOLEAN DEFAULT FALSE
          `);
        }
        console.log('✅ Column has_consultation added successfully');
      } catch (error) {
        console.log(`⚠️ Error adding has_consultation:`, error.message);
        throw error;
      }
    } else {
      console.log('✅ Column has_consultation already exists');
    }
    
    // Verify the table structure
    console.log('\n🧪 Verifying table structure...');
    const [finalColumns] = await connection.execute("DESCRIBE healthcare_facilities");
    console.log(`📊 Total columns: ${finalColumns.length}`);
    
    // Show the new columns
    const hasDelivery = finalColumns.find(col => col.Field === 'has_delivery');
    const hasConsultation = finalColumns.find(col => col.Field === 'has_consultation');
    
    if (hasDelivery) {
      console.log(`✅ has_delivery: ${hasDelivery.Type} (Default: ${hasDelivery.Default})`);
    }
    if (hasConsultation) {
      console.log(`✅ has_consultation: ${hasConsultation.Type} (Default: ${hasConsultation.Default})`);
    }
    
    console.log('\n🎉 Columns added successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the function
addDeliveryConsultationColumns();

