const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const Document = require('../models/Document');
const Signature = require('../models/Signature'); // ✅ You missed this earlier
const { sendShareLinkEmail } = require('../utils/emailService');

// Multer storage configuration
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        const filetypes = /pdf/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            cb(null, true);
        } else {
            cb('Error: PDFs Only!');
        }
    },
}).single('document');

// Upload Document
const uploadDocument = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message || err });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        try {
            const newDocument = new Document({
                user: req.user._id,
                originalName: req.file.originalname,
                fileName: req.file.filename,
                filePath: `/uploads/${req.file.filename}`,
                mimeType: req.file.mimetype,
                size: req.file.size,
            });

            const savedDocument = await newDocument.save();
            res.status(201).json(savedDocument);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error during document upload.' });
        }
    });
};

// Get All Documents for Authenticated User
const getDocuments = async (req, res) => {
    try {
        const documents = await Document.find({ user: req.user._id });
        res.json(documents);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching documents.' });
    }
};

// Get Document By ID
const getDocumentById = async (req, res) => {
    try {
        const document = await Document.findOne({ _id: req.params.id, user: req.user._id });
        if (!document) {
            return res.status(404).json({ message: 'Document not found or not authorized.' });
        }

        if (req.query.metadata === 'true') {
            return res.json(document);
        } else {
            const filePath = path.join(__dirname, '..', document.filePath);
            res.sendFile(filePath);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching document.' });
    }
};

// Generate Share Link and Send Email
const generateShareLink = async (req, res) => {
    const { documentId, signerEmail, expiresAt } = req.body;

    if (!documentId || !signerEmail) {
        return res.status(400).json({ message: 'Document ID and signer email are required.' });
    }

    try {
        const document = await Document.findOne({ _id: documentId, user: req.user._id });
        if (!document) {
            return res.status(404).json({ message: 'Document not found or not authorized.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const shareLink = `${process.env.CLIENT_URL}/share/${token}`;

        document.shareableLinks.push({
            token,
            signerEmail,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            status: 'pending',
        });

        await document.save();

        const emailResult = await sendShareLinkEmail(signerEmail, req.user.name, document.originalName, shareLink);
        if (!emailResult.success) {
            return res.status(500).json({ message: `Failed to send share email: ${emailResult.message}` });
        }

        res.status(200).json({
            message: 'Share link generated and email sent successfully!',
            shareLink,
            token,
        });

    } catch (error) {
        console.error('Error generating share link:', error);
        res.status(500).json({ message: 'Server error generating share link.' });
    }
};

// Get Document By Share Token
const getDocumentByShareToken = async (req, res) => {
    const { token } = req.params;

    try {
        const document = await Document.findOne({ 'shareableLinks.token': token });
        if (!document) {
            return res.status(404).json({ message: 'Invalid or expired share link.' });
        }

        const shareLinkRecord = document.shareableLinks.find(link => link.token === token);
        if (!shareLinkRecord) {
            return res.status(404).json({ message: 'Share link not found.' });
        }

        if (shareLinkRecord.expiresAt && new Date() > shareLinkRecord.expiresAt) {
            shareLinkRecord.status = 'declined';
            await document.save();
            return res.status(403).json({ message: 'Share link has expired.' });
        }

        if (shareLinkRecord.status === 'pending') {
            shareLinkRecord.status = 'viewed';
            await document.save();
        }

        res.json({
            document: {
                _id: document._id,
                originalName: document.originalName,
                fileName: document.fileName,
                filePath: document.filePath,
                mimeType: document.mimeType,
                size: document.size,
            },
            shareLinkRecord: {
                token: shareLinkRecord.token,
                signerEmail: shareLinkRecord.signerEmail,
                status: shareLinkRecord.status,
            }
        });

    } catch (error) {
        console.error('Error getting document by share token:', error);
        res.status(500).json({ message: 'Server error fetching document by share token.' });
    }
};

// Update Signature Status by Share Token
const updateSignatureStatusByShareToken = async (req, res) => {
    const { token, signatureId } = req.params;
    const { status, signedBy } = req.body;

    if (!['signed', 'declined'].includes(status) || !signatureId || !signedBy) {
        return res.status(400).json({ message: 'Invalid status, signature ID, or signer.' });
    }

    try {
        const document = await Document.findOne({ 'shareableLinks.token': token });
        if (!document) {
            return res.status(404).json({ message: 'Invalid or expired share link.' });
        }

        const shareLinkRecord = document.shareableLinks.find(link => link.token === token);
        if (!shareLinkRecord || (shareLinkRecord.expiresAt && new Date() > shareLinkRecord.expiresAt)) {
            return res.status(403).json({ message: 'Share link has expired or is invalid.' });
        }

        const signature = await Signature.findById(signatureId);
        if (!signature || signature.document.toString() !== document._id.toString()) {
            return res.status(404).json({ message: 'Signature not found or mismatched document.' });
        }

        signature.status = status;
        signature.signedAt = new Date();
        await signature.save();

        shareLinkRecord.status = status;
        shareLinkRecord.signedBy = signedBy;
        shareLinkRecord.signedAt = new Date();
        await document.save();

        res.json({ message: `Signature status updated to ${status}.` });

    } catch (error) {
        console.error('Error updating signature:', error);
        res.status(500).json({ message: 'Server error updating signature status.' });
    }
};

module.exports = {
    uploadDocument,
    getDocuments,
    getDocumentById,
    generateShareLink,
    getDocumentByShareToken,
    updateSignatureStatusByShareToken,
};
