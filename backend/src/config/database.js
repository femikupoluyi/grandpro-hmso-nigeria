const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

// Create database connection
const sql = neon(process.env.DATABASE_URL);

// Test database connection
const testConnection = async () => {
  try {
    const result = await sql`SELECT NOW()`;
    console.log('✅ Database connected successfully at:', result[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

module.exports = {
  sql,
  testConnection
};
