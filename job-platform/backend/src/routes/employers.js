const express = require('express');
const router = express.Router();
const cache = require('../utils/cache');

/**
 * GET /api/employers
 * List employers/hospitals with filters, pagination
 */
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const {
    location,
    type,
    size,
    verified,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Validation
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);

  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({
      error: {
        message: 'Invalid page number',
        code: 'ERR_VALIDATION',
        details: { page: 'Must be a positive integer' }
      }
    });
  }
  if (isNaN(limitNum) || limitNum < 1) {
    return res.status(400).json({
      error: {
        message: 'Invalid limit',
        code: 'ERR_VALIDATION',
        details: { limit: 'Must be a positive integer between 1 and 100' }
      }
    });
  }

  // Generate cache key
  const cacheKey = `employers:list:${JSON.stringify({ location, type, size, verified, page, limit, sortBy, sortOrder })}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    res.set('X-Cache', 'hit');
    return res.json(cached);
  }

  // Whitelist allowed sort columns
  const allowedSortColumns = ['id', 'name', 'location', 'type', 'size', 'createdAt', 'updatedAt'];
  const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Build WHERE clause
  const conditions = ['isDeleted = 0'];
  const params = [];

  if (location) {
    conditions.push('location LIKE ?');
    params.push(`%${location}%`);
  }
  if (type) {
    conditions.push('type = ?');
    params.push(type);
  }
  if (size) {
    conditions.push('size = ?');
    params.push(size);
  }
  if (verified === 'true') {
    conditions.push('isVerified = 1');
  }

  const whereClause = conditions.join(' AND ');
  const offset = (pageNum - 1) * limitNum;

  // Get total count
  const countSql = `SELECT COUNT(*) as total FROM employers WHERE ${whereClause}`;

  db.get(countSql, params, (err, countRow) => {
    if (err) {
      console.error('Database error (count):', err.message);
      return res.status(500).json({
        error: {
          message: 'Database error',
          code: 'ERR_INTERNAL',
          status: 500
        }
      });
    }

    const total = countRow.total;
    const totalPages = Math.ceil(total / limitNum);

    // Get paginated results
    const dataSql = `
      SELECT 
        id, name, type, location, description, website, size,
        contactEmail, contactPhone, isVerified,
        createdAt, updatedAt
      FROM employers 
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT ? OFFSET ?
    `;

    db.all(dataSql, [...params, limitNum, offset], (err, rows) => {
      if (err) {
        console.error('Database error (data):', err.message);
        return res.status(500).json({
          error: {
            message: 'Database error',
            code: 'ERR_INTERNAL',
            status: 500
          }
        });
      }

      const response = {
        data: rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      };

      // Cache the response
      cache.set(cacheKey, response, 30 * 1000);
      res.set('X-Cache', 'miss');

      res.json(response);
    });
  });
});

/**
 * GET /api/employers/:id
 * Get single employer profile
 */
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({
      error: {
        message: 'Invalid employer ID',
        code: 'ERR_VALIDATION',
        details: { id: 'Must be a valid integer' }
      }
    });
  }

  // Check cache
  const cacheKey = `employers:detail:${id}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    res.set('X-Cache', 'hit');
    return res.json(cached);
  }

  const sql = `
    SELECT 
      id, name, type, location, description, website, size,
      contactEmail, contactPhone, isVerified,
      createdAt, updatedAt
    FROM employers 
    WHERE id = ? AND isDeleted = 0
  `;

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({
        error: {
          message: 'Database error',
          code: 'ERR_INTERNAL',
          status: 500
        }
      });
    }

    if (!row) {
      return res.status(404).json({
        error: {
          message: 'Employer not found',
          code: 'ERR_NOT_FOUND',
          status: 404
        }
      });
    }

    const response = { data: row };

    // Cache the response
    cache.set(cacheKey, response, 5 * 60 * 1000);
    res.set('X-Cache', 'miss');

    res.json(response);
  });
});

/**
 * POST /api/employers
 * Create employer profile
 */
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const {
    name,
    type,
    location,
    description,
    website,
    size,
    contactEmail,
    contactPhone
  } = req.body;

  // Validation
  const errors = [];
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('name is required');
  }
  if (!type || typeof type !== 'string' || type.trim().length === 0) {
    errors.push('type is required');
  }
  if (!location || typeof location !== 'string' || location.trim().length === 0) {
    errors.push('location is required');
  }

  if (errors.length > 0) {
    return res.status(422).json({
      error: {
        message: 'Validation failed',
        code: 'ERR_VALIDATION',
        details: errors
      }
    });
  }

  const sql = `
    INSERT INTO employers (name, type, location, description, website, size, contactEmail, contactPhone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [
    name.trim(),
    type.trim(),
    location.trim(),
    description || null,
    website || null,
    size || null,
    contactEmail || null,
    contactPhone || null
  ], function (err) {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({
        error: {
          message: 'Database error',
          code: 'ERR_INTERNAL',
          status: 500
        }
      });
    }

    const newId = this.lastID;

    // Invalidate employer list caches
    cache.invalidateByPattern('employers:list:');

    // Fetch the created employer
    db.get(
      'SELECT id, name, type, location, description, website, size, contactEmail, contactPhone, isVerified, createdAt, updatedAt FROM employers WHERE id = ?',
      [newId],
      (err, row) => {
        if (err || !row) {
          return res.status(201).json({
            message: 'Employer created successfully',
            data: { id: newId }
          });
        }

        res.status(201).json({
          message: 'Employer created successfully',
          data: row
        });
      }
    );
  });
});

/**
 * PATCH /api/employers/:id
 * Update employer profile (partial update)
 */
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({
      error: {
        message: 'Invalid employer ID',
        code: 'ERR_VALIDATION',
        details: { id: 'Must be a valid integer' }
      }
    });
  }

  const {
    name,
    type,
    location,
    description,
    website,
    size,
    contactEmail,
    contactPhone,
    isVerified
  } = req.body;

  // Build dynamic update
  const updates = [];
  const params = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(422).json({
        error: {
          message: 'Validation failed',
          code: 'ERR_VALIDATION',
          details: { name: 'Name cannot be empty' }
        }
      });
    }
    updates.push('name = ?');
    params.push(name.trim());
  }

  if (type !== undefined) {
    updates.push('type = ?');
    params.push(type);
  }

  if (location !== undefined) {
    updates.push('location = ?');
    params.push(location);
  }

  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description || null);
  }

  if (website !== undefined) {
    updates.push('website = ?');
    params.push(website || null);
  }

  if (size !== undefined) {
    updates.push('size = ?');
    params.push(size || null);
  }

  if (contactEmail !== undefined) {
    updates.push('contactEmail = ?');
    params.push(contactEmail || null);
  }

  if (contactPhone !== undefined) {
    updates.push('contactPhone = ?');
    params.push(contactPhone || null);
  }

  if (isVerified !== undefined) {
    updates.push('isVerified = ?');
    params.push(isVerified ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(422).json({
      error: {
        message: 'Validation failed',
        code: 'ERR_VALIDATION',
        details: { fields: 'No fields to update' }
      }
    });
  }

  updates.push('updatedAt = CURRENT_TIMESTAMP');
  params.push(id);

  const sql = `UPDATE employers SET ${updates.join(', ')} WHERE id = ? AND isDeleted = 0`;

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({
        error: {
          message: 'Database error',
          code: 'ERR_INTERNAL',
          status: 500
        }
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        error: {
          message: 'Employer not found',
          code: 'ERR_NOT_FOUND',
          status: 404
        }
      });
    }

    // Invalidate caches
    cache.delete(`employers:detail:${id}`);
    cache.invalidateByPattern('employers:list:');

    // Fetch the updated employer
    db.get(
      'SELECT id, name, type, location, description, website, size, contactEmail, contactPhone, isVerified, createdAt, updatedAt FROM employers WHERE id = ?',
      [id],
      (err, row) => {
        if (err || !row) {
          return res.json({
            message: 'Employer updated successfully',
            data: { id }
          });
        }

        res.json({
          message: 'Employer updated successfully',
          data: row
        });
      }
    );
  });
});

/**
 * DELETE /api/employers/:id
 * Soft delete employer
 */
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({
      error: {
        message: 'Invalid employer ID',
        code: 'ERR_VALIDATION',
        details: { id: 'Must be a valid integer' }
      }
    });
  }

  const sql = 'UPDATE employers SET isDeleted = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND isDeleted = 0';

  db.run(sql, [id], function (err) {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({
        error: {
          message: 'Database error',
          code: 'ERR_INTERNAL',
          status: 500
        }
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        error: {
          message: 'Employer not found',
          code: 'ERR_NOT_FOUND',
          status: 404
        }
      });
    }

    // Invalidate caches
    cache.delete(`employers:detail:${id}`);
    cache.invalidateByPattern('employers:list:');

    res.json({
      message: 'Employer deleted successfully',
      data: { id }
    });
  });
});

module.exports = router;
