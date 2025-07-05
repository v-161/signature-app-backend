// server/models/AuditLog.js

const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Can be null for external actions (e.g., external signer access)
    },
    action: {
        type: String,
        required: true,
        enum: [
            'USER_REGISTERED',
            'USER_LOGGED_IN',
            'PASSWORD_RESET_REQUESTED',
            'PASSWORD_RESET_COMPLETED',
            'DOCUMENT_UPLOAD',
            'DOCUMENT_VIEWED',
            'DOCUMENT_SHARED',
            'DOCUMENT_ACCESSED_VIA_SHARE_LINK', // For external signers
            'SIGNATURE_PLACED',
            'DOCUMENT_FINALIZED',
            'DOCUMENTS_LISTED',
        ],
    },
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: false, // Not all actions are tied to a specific document
    },
    details: {
        type: mongoose.Schema.Types.Mixed, // Store additional context (e.g., filename, sharedWith email)
        required: false,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
