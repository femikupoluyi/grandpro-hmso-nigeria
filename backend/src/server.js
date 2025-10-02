const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { initDatabase } = require('./config/initDatabase');
const onboardingRoutes = require('./routes/onboarding');
const integrationRoutes = require('./routes/integrationRoutes');
// const insuranceRoutes = require('./routes/insuranceRoutes');
// const pharmacyRoutes = require('./routes/pharmacyRoutes');
// const telemedicineRoutes = require('./routes/telemedicineRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/integrations', integrationRoutes);
// app.use('/api/insurance', insuranceRoutes);
// app.use('/api/pharmacy', pharmacyRoutes);
// app.use('/api/telemedicine', telemedicineRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    timezone: process.env.DEFAULT_TIMEZONE,
    currency: process.env.DEFAULT_CURRENCY
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const startServer = async () => {
  // Test database connection
  const isConnected = await testConnection();
  
  if (!isConnected) {
    console.error('Failed to connect to database. Please check your configuration.');
    process.exit(1);
  }

  // Initialize database schema
  const isInitialized = await initDatabase();
  if (!isInitialized) {
    console.error('Failed to initialize database schema.');
    process.exit(1);
  }

  // Initialize WebSocket server for video calls
  // const SignalingServer = require('./websocket/signaling');
  // new SignalingServer(server);
  
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📍 Timezone: ${process.env.DEFAULT_TIMEZONE}`);
    console.log(`💰 Currency: ${process.env.DEFAULT_CURRENCY}`);
    console.log(`🎥 WebSocket signaling server ready at ws://localhost:${PORT}/ws/signaling`);
  });
};

startServer();
