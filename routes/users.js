const { Router } = require('express');
const { completeProfile } = require('../controllers/authController');

const router = Router();

// POST /api/users/onboard — backward-compatible alias for authenticated profile completion.
router.post('/onboard', completeProfile);

// GET /api/users — current user profile. Do not enumerate other users.
router.get('/', (req, res, next) => {
  const { getDb } = require('../config/database');
  try {
    const user = getDb().prepare(
      'SELECT id, username, gender, birth_date, height, weight, conditions, goals, created_at FROM users WHERE id = ?'
    ).get(req.user.user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      ...user,
      conditions: JSON.parse(user.conditions || '[]'),
      goals: JSON.parse(user.goals || '[]'),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
