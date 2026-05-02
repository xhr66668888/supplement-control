const { Router } = require('express');
const { getDashboard, checkDose, undoCheckDose, skipDose, acknowledgeAlert } = require('../controllers/dashboardController');

const router = Router();

router.get('/', getDashboard);
router.post('/check', checkDose);
router.post('/undo', undoCheckDose);
router.post('/skip', skipDose);
router.post('/alerts/:id/ack', acknowledgeAlert);

module.exports = router;
