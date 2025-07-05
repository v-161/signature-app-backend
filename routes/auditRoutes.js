// server/routes/auditRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAuditLogs } = require('../controllers/auditController');  // ✅ This is correct now

// @route   GET /api/audit
// @desc    Get audit logs for the authenticated user
// @access  Private
router.get('/', protect, getAuditLogs);

module.exports = router;
