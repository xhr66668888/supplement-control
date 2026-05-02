const { Router } = require('express');
const { register, login, completeProfile } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/onboard — complete profile (requires JWT)
router.post('/onboard', requireAuth, completeProfile);

// GET /api/auth/me — verify token + get user profile
router.get('/me', requireAuth, (req, res, next) => {
  try {
    const { getDb } = require('../config/database');
    const user = getDb().prepare(
      'SELECT id, username, birth_date, gender, height, weight, conditions, goals, created_at FROM users WHERE id = ?'
    ).get(req.user.user_id);

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      ...user,
      conditions: JSON.parse(user.conditions || '[]'),
      goals: JSON.parse(user.goals || '[]'),
      profile_complete: !!(user.birth_date && user.gender),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
