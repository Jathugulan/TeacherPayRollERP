const mongoose = require('mongoose');
const dns = require('dns');

// Configure public DNS servers to ensure MongoDB Atlas SRV resolution works reliably on all environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore in environments where setting DNS servers is restricted
}

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp_teacher_management';
    const conn = await mongoose.connect(mongoUri, {
      dbName: 'erp_teacher_management'
    });
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
