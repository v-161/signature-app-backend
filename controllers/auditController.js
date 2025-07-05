// server/controllers/auditController.js

const AuditLog = require('../models/AuditLog');

/**
 * Creates a new audit log entry.
 * @param {string} userId - The ID of the user performing the action (can be null for external actions).
 * @param {string} action - The type of action performed (from AuditLogSchema enum).
 * @param {string} [documentId=null] - The ID of the document involved (optional).
 * @param {Object} [details={}] - Additional details relevant to the action (optional).
 */
const createAuditLog = async (userId, action, documentId = null, details = {}) => {
    try {
        const newLog = new AuditLog({
            userId,
            action,
            documentId,
            details,
        });
        await newLog.save();
        // console.log(`Audit Log created: ${action} by ${userId || 'External'} for doc ${documentId || 'N/A'}`);
    } catch (error) {
        console.error('Error creating audit log:', error);
        // Don't rethrow: logging should not break main flow
    }
};

// @desc    Get all audit logs (for admin or user's own logs)
// @route   GET /api/audit
// @access  Private
const getAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find({ userId: req.user.id })
                                   .sort({ timestamp: -1 })
                                   .populate('userId', 'username email')
                                   .populate('documentId', 'fileName');

        res.status(200).json(logs);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ message: 'Server error fetching audit logs' });
    }
};

// ✅ FIX: Export both functions properly
module.exports = {
    createAuditLog,
    getAuditLogs
};
