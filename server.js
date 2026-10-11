const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// 1. Import your product routes
const productRoutes = require('./routes/productRoutes');

const app = express();
app.use(express.json());

// 2. Mount the routes
app.use('/api/products', productRoutes);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB & Start Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('Database connection error:', err));