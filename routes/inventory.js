const { Router } = require('express');
const { getDb } = require('../config/database');

const router = Router();

// GET /api/inventory?user_id=X
router.get('/', (req, res, next) => {
  try {
    const userId = parseInt(req.query.user_id);
    if (!userId) return res.status(400).json({ error: 'user_id required' });

    const items = getDb().prepare(`
      SELECT *,
        CASE WHEN dosage_per_day > 0
          THEN CAST(current_count / dosage_per_day AS INTEGER)
          ELSE NULL
        END as remaining_days
      FROM inventory
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);

    res.json(items.map(item => ({
      ...item,
      nutrients: JSON.parse(item.nutrients_json || '[]'),
    })));
  } catch (err) {
    next(err);
  }
});

// POST /api/inventory/consume — manual consumption (alternative to dashboard check)
router.post('/consume', (req, res, next) => {
  try {
    const { user_id, inventory_id, amount } = req.body;
    if (!user_id || !inventory_id) {
      return res.status(400).json({ error: 'user_id and inventory_id required' });
    }

    const db = getDb();
    const dosage = parseInt(amount) || 1;

    const inv = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(inventory_id, user_id);
    if (!inv) return res.status(404).json({ error: 'Inventory item not found' });
    if (inv.current_count < dosage) return res.status(400).json({ error: 'Not enough units remaining' });

    db.prepare('UPDATE inventory SET current_count = current_count - ? WHERE id = ?').run(dosage, inventory_id);
    db.prepare('INSERT INTO consumption_log (user_id, inventory_id, time_of_day, dosage_taken) VALUES (?, ?, ?, ?)').run(user_id, inventory_id, 'morning', dosage);

    const updated = db.prepare('SELECT current_count FROM inventory WHERE id = ?').get(inventory_id);

    res.json({ success: true, remaining: updated.current_count });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
