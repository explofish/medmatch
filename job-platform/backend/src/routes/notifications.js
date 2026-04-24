const express = require('express');
const router = express.Router();

/**
 * GET /api/notifications
 * List user notifications with filters and pagination
 *
 * Query params:
 * - userType (required): 'candidate' or 'employer'
 * - userId (required): ID of the user
 * - unreadOnly: if 'true', return only unread notifications
 * - page: page number (default: 1)
 * - limit: items per page (default: 20, max: 100)
 */
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const {
    userType,
    userId,
    unreadOnly,
    page = 1,
    limit = 20
  } = req.query;

  // Validation
  if (!userType || !['candidate', 'employer'].includes(userType)) {
    return res.status(400).json({ error: 'userType must be candidate or employer' });
  }
  if (!userId || isNaN(parseInt(userId, 10))) {
    return res.status(400).json({ error: 'userId is required and must be a number' });
  }

  const userIdNum = parseInt(userId, 10);
  const pageNum = parseInt(page, 10);
  const limitNum = Math.min(parseInt(limit, 10), 100);

  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({ error: 'Invalid page number' });
  }
  if (isNaN(limitNum) || limitNum < 1) {
    return res.status(400).json({ error: 'Invalid limit' });
  }

  // Build WHERE clause
  const conditions = ['userType = ?', 'userId = ?'];
  const params = [userType, userIdNum];

  if (unreadOnly === 'true') {
    conditions.push('read = 0');
  }

  const whereClause = conditions.join(' AND ');
  const offset = (pageNum - 1) * limitNum;

  // Get total count
  const countSql = `SELECT COUNT(*) as total FROM notifications WHERE ${whereClause}`;

  db.get(countSql, params, (err, countRow) => {
    if (err) {
      console.error('Database error (count):', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    const total = countRow.total;
    const totalPages = Math.ceil(total / limitNum);

    // Get paginated results
    const dataSql = `
      SELECT 
        id, userType, userId, type, message, read, createdAt
      FROM notifications 
      WHERE ${whereClause}
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `;

    db.all(dataSql, [...params, limitNum, offset], (err, rows) => {
      if (err) {
        console.error('Database error (data):', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      // Get unread count
      db.get(`
        SELECT COUNT(*) as unreadCount 
        FROM notifications 
        WHERE userType = ? AND userId = ? AND read = 0
      `, [userType, userIdNum], (err, unreadResult) => {
        if (err) {
          console.error('Database error:', err.message);
        }

        res.json({
          data: rows,
          summary: {
            total,
            unreadCount: unreadResult?.unreadCount || 0
          },
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
          }
        });
      });
    });
  });
});

/**
 * GET /api/notifications/:id
 * Get single notification details
 */
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid notification ID' });
  }

  const sql = `
    SELECT id, userType, userId, type, message, read, createdAt
    FROM notifications 
    WHERE id = ?
  `;

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ data: row });
  });
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid notification ID' });
  }

  const sql = 'UPDATE notifications SET read = 1 WHERE id = ?';

  db.run(sql, [id], function (err) {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification marked as read',
      data: { id, read: true }
    });
  });
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for a user
 *
 * Body:
 * - userType (required): 'candidate' or 'employer'
 * - userId (required): ID of the user
 */
router.post('/mark-all-read', (req, res) => {
  const db = req.app.locals.db;
  const { userType, userId } = req.body;

  // Validation
  if (!userType || !['candidate', 'employer'].includes(userType)) {
    return res.status(400).json({ error: 'userType must be candidate or employer' });
  }
  if (!userId || isNaN(parseInt(userId, 10))) {
    return res.status(400).json({ error: 'userId is required and must be a number' });
  }

  const userIdNum = parseInt(userId, 10);

  const sql = 'UPDATE notifications SET read = 1 WHERE userType = ? AND userId = ? AND read = 0';

  db.run(sql, [userType, userIdNum], function (err) {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      message: 'All notifications marked as read',
      data: {
        userType,
        userId: userIdNum,
        markedReadCount: this.changes
      }
    });
  });
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid notification ID' });
  }

  const sql = 'DELETE FROM notifications WHERE id = ?';

  db.run(sql, [id], function (err) {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification deleted successfully',
      data: { id }
    });
  });
});

/**
 * DELETE /api/notifications
 * Delete all read notifications for a user
 *
 * Query params:
 * - userType (required): 'candidate' or 'employer'
 * - userId (required): ID of the user
 */
router.delete('/', (req, res) => {
  const db = req.app.locals.db;
  const { userType, userId } = req.query;

  // Validation
  if (!userType || !['candidate', 'employer'].includes(userType)) {
    return res.status(400).json({ error: 'userType must be candidate or employer' });
  }
  if (!userId || isNaN(parseInt(userId, 10))) {
    return res.status(400).json({ error: 'userId is required and must be a number' });
  }

  const userIdNum = parseInt(userId, 10);

  const sql = 'DELETE FROM notifications WHERE userType = ? AND userId = ? AND read = 1';

  db.run(sql, [userType, userIdNum], function (err) {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      message: 'Read notifications cleaned up',
      data: {
        userType,
        userId: userIdNum,
        deletedCount: this.changes
      }
    });
  });
});

module.exports = router;
