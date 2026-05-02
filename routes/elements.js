const { Router } = require('express');
const { lookupElement } = require('../controllers/elementsController');
const { listAll, listUnknowns } = require('../utils/elementResolver');

const router = Router();

// POST /api/elements/lookup — AI backfill for unknown elements
router.post('/lookup', lookupElement);

// GET /api/elements — list all known elements
router.get('/', (req, res) => {
  const all = listAll();
  res.json(all);
});

// GET /api/elements/unknown — list Tier 3 elements needing backfill
router.get('/unknown', (req, res) => {
  const unknowns = listUnknowns();
  res.json(unknowns);
});

module.exports = router;
