const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// 1. Create Product (POST /api/products)
router.post('/', async (req, res) => {
  try {
    const product = new Product(req.body);
    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 2. Get All Products with Filtering, Sorting & Pagination (GET /api/products)
router.get('/', async (req, res) => {
  try {
    const { category, search, sortBy, order = 'asc', page = 1, limit = 10 } = req.query;
    let query = {};

    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };

    let queryExec = Product.find(query);

    if (sortBy) {
      const sortOrder = order === 'desc' ? -1 : 1;
      queryExec = queryExec.sort({ [sortBy]: sortOrder });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    queryExec = queryExec.skip(skip).limit(parseInt(limit));

    const products = await queryExec;
    const total = await Product.countDocuments(query);

    res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Low-Stock Alert Report (GET /api/products/low-stock)
router.get('/low-stock', async (req, res) => {
  try {
    const lowStockItems = await Product.find({
      $expr: { $lte: ['$quantity', '$reorderLevel'] }
    });
    res.status(200).json({
      count: lowStockItems.length,
      lowStockItems
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Category-wise Inventory Summary using Aggregation (GET /api/products/summary)
router.get('/summary', async (req, res) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          avgPrice: { $avg: '$price' }
        }
      }
    ]);

    res.status(200).json({
      categoriesCount: summary.length,
      summary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Get Single Product by ID (GET /api/products/:id)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ error: 'Invalid Product ID' });
  }
});

// 6. Update Product Details (PUT /api/products/:id)
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { 
      new: true, 
      runValidators: true 
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 7. Stock Adjustment (PATCH /api/products/:id/stock)
router.patch('/:id/stock', async (req, res) => {
  try {
    const { change } = req.body; // e.g., +10 or -5
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.quantity += Number(change);
    if (product.quantity < 0) product.quantity = 0;

    await product.save();
    res.status(200).json({ message: 'Stock updated successfully', product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 8. Delete Product (DELETE /api/products/:id)
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json({ message: 'Product deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(400).json({ error: 'Invalid Product ID' });
  }
});

module.exports = router;