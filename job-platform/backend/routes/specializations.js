const express = require('express');

const router = express.Router();

// Get all specializations
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { category, search } = req.query;

    let query = 'SELECT * FROM specializations WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (search) {
      paramCount++;
      query += ` AND name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY category, name';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get specializations error:', error);
    res.status(500).json({ error: 'Failed to get specializations' });
  }
});

// Get specialization by ID
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM specializations WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Specialization not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get specialization error:', error);
    res.status(500).json({ error: 'Failed to get specialization' });
  }
});

// Get specializations by category
router.get('/category/:category', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { category } = req.params;

    const result = await db.query(
      'SELECT * FROM specializations WHERE category = $1 ORDER BY name',
      [category]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get specializations by category error:', error);
    res.status(500).json({ error: 'Failed to get specializations' });
  }
});

module.exports = router;
