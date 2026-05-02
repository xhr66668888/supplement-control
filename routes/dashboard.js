const { Router } = require('express');
const { getDashboard, checkDose, undoCheckDose, skipDose } = require('../controllers/dashboardController');

const router = Router();

router.get('/', getDashboard);
router.post('/check', checkDose);
router.post('/undo', undoCheckDose);
router.post('/skip', skipDose);

module.exports = router;
