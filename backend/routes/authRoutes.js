const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/login',  ctrl.login);
router.get('/verify',  authenticateToken, ctrl.verifyToken);

module.exports = router;
