const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pharmalink_db1',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully!');
    console.log(`📊 Connected to: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Execute query with error handling
const executeQuery = async (query, params = []) => {
  try {

    const [rows, fields] = await pool.execute(query, params);
    
    // For INSERT, UPDATE, DELETE operations, return the full result
    if (query.trim().toUpperCase().startsWith('INSERT') || 
        query.trim().toUpperCase().startsWith('UPDATE') || 
        query.trim().toUpperCase().startsWith('DELETE')) {
      return { success: true, data: rows, insertId: rows.insertId, affectedRows: rows.affectedRows };
    }
    
    // For SELECT operations, return just the rows
    return { success: true, data: rows };
  } catch (error) {
    console.error('❌ Query execution failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Execute transaction
const executeTransaction = async (queries) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const query of queries) {
      const [rows] = await connection.execute(query.sql, query.params || []);
      results.push(rows);
    }
    
    await connection.commit();
    connection.release();
    return { success: true, data: results };
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('❌ Transaction failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeTransaction,
  dbConfig
}; 