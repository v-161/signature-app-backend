const express = require('express');
const {
    uploadDocument,
    getDocuments,
    getDocumentById,
    generateShareLink,
    getDocumentByShareToken,
    updateSignatureStatusByShareToken
} = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// 🔐 Protected routes (require JWT token)
router.post('/upload', protect, uploadDocument);
router.get('/', protect, getDocuments);
router.get('/:id', protect, getDocumentById);           // Get document by ID for logged-in user
router.post('/share', protect, generateShareLink);      // Generate share link

// 🌐 Public routes (NO JWT required)
router.get('/share/:token', getDocumentByShareToken);   // View shared document
router.put('/share/:token/signature/:signatureId/status', updateSignatureStatusByShareToken); // Update signature via share

module.exports = router;
