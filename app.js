const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const router = require('./routes/router');

//mongodb+srv://admin:<password>@cluster0.zqzqy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
//https://cloud.mongodb.com/v2/682304d7e0461709850fb5f1#/overview
//mongodb+srv://smartdb_user:Mtimande@smartcampus.opezynu.mongodb.net/
// Create Express app
const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '20mb' })); // Body parser with 20mb limit
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Routes
app.use('/api', router);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://smartdb_user:Mtimande@smartcampus.opezynu.mongodb.net/smartcampusdb?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
