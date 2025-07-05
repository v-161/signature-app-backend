const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    generateShareLink,
    verifyShareLink,
    uploadSignature,
    getSignatureById,
    getSignaturesByDocumentId,
    saveSignature,           // ✅ Save signature position (authenticated user)
    finalizeDocument,        // ✅ Finalize document after placing signatures
    updateSignatureStatus,   // ✅ Update signature status (optional)
} = require('../controllers/signatureController');

const router = express.Router();

/**
 * ===========================
 * 🔒 Protected Routes (Authenticated Users)
 * ===========================
 */

// ✅ Place Signature on Document (used when user clicks "Place Signature")
router.post('/', protect, saveSignature);

// ✅ Finalize Document (mark document as finalized after signatures)
router.post('/finalize', protect, finalizeDocument);

// ✅ Update Signature Status (optional: e.g., mark as declined/signed)
router.put('/:signatureId/status', protect, updateSignatureStatus);

// ✅ Get All Signatures for a Specific Document
router.get('/document/:documentId', protect, getSignaturesByDocumentId);

// ✅ Get Single Signature by ID (used to check individual signature status)
router.get('/:id', protect, getSignatureById);

// ✅ Generate Share Link for External Recipient
router.post('/share/:documentId', protect, generateShareLink);


/**
 * ===========================
 * 🔓 Public Routes (No Authentication)
 * ===========================
 */

// ✅ Verify Share Link when recipient opens the shared signing page
router.get('/verify/:token', verifyShareLink);

// ✅ Upload Signature via Share Link (public upload after recipient signs)
router.post('/upload-signature/:signatureEntryId', uploadSignature);

module.exports = router;
