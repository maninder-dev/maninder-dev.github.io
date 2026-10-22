const dns = require('dns');
const mongoose = require('mongoose');

async function connectDB() {
  // Optional: some Windows setups make Node use 127.0.0.1 for DNS, which breaks
  // mongodb+srv lookups (querySrv ECONNREFUSED). DNS_SERVERS overrides that.
  if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean));
  }

  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set in node/.env');
  if (uri.includes('<db_username>')) {
    throw new Error('Replace <db_username> in node/.env with your MongoDB Atlas user name');
  }
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = connectDB;
