const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/queueController');
const { authenticateToken } = require('../middleware/authMiddleware');

// ── Public ── (Patient Waiting Room doesn't need auth)
router.get('/queue',               ctrl.getQueue);
router.get('/current-token',       ctrl.getCurrentToken);
router.get('/patient/wait/:token', ctrl.getPatientWaitInfo);

// ── Protected ── (Receptionist / Admin)
router.get('/stats',         authenticateToken, ctrl.getStats);
router.post('/patient/add',  authenticateToken, ctrl.addPatient);
router.post('/call-next',    authenticateToken, ctrl.callNext);
router.post('/pause',        authenticateToken, ctrl.pauseQueue);
router.post('/resume',       authenticateToken, ctrl.resumeQueue);
router.post('/avg-time',     authenticateToken, ctrl.setAvgTime);
router.put('/patient/:id',   authenticateToken, ctrl.updatePatient);
router.delete('/patient/:id', authenticateToken, ctrl.deletePatient);

module.exports = router;
