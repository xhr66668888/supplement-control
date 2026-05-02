const { Router } = require('express');
const { onboard } = require('../controllers/onboardController');

const router = Router();

// POST /api/onboard — AI-structured onboarding
router.post('/onboard', onboard);

// GET /api/users — list all users (for frontend dropdown)
router.get('/', (req, res, next) => {
  const { getDb } = require('../config/database');
  try {
    const users = getDb().prepare(
      'SELECT id, username, gender, birth_date, created_at FROM users ORDER BY id'
    ).all();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
