const Document = require('../models/Document');
const Signature = require('../models/Signature');
const User = require('../models/User');
const crypto = require('crypto');
const { sendShareLinkEmail } = require('../utils/emailService');

// ✅ Generate Share Link
const generateShareLink = async (req, res) => {
    const { documentId } = req.params;
    const { recipientEmail } = req.body;
    const userId = req.user.id;

    if (!recipientEmail) {
        return res.status(400).json({ message: 'Recipient email is required.' });
    }

    try {
        const document = await Document.findOne({ _id: documentId, user: userId });
        if (!document) {
            return res.status(404).json({ message: 'Document not found or unauthorized.' });
        }

        const sender = await User.findById(userId);
        if (!sender) {
            return res.status(404).json({ message: 'Sender not found.' });
        }

        const shareToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const signatureEntry = new Signature({
            document: documentId,
            signerEmail: recipientEmail,
            shareToken,
            expiresAt,
            status: 'pending',
            user: userId,
        });

        await signatureEntry.save();

        const shareLink = `${process.env.CLIENT_URL}/sign/${shareToken}`;

        const emailResult = await sendShareLinkEmail(
            recipientEmail,
            sender.name,
            document.originalName,
            shareLink
        );

        if (!emailResult.success) {
            console.error("Email failed:", emailResult.message);
            return res.status(500).json({ message: emailResult.message || 'Failed to send email.' });
        }

        res.status(200).json({
            message: 'Share link generated and email sent.',
            shareLink
        });

    } catch (error) {
        console.error('Error generating share link:', error);
        res.status(500).json({ message: 'Server error generating share link.' });
    }
};

// ✅ Verify Share Link
const verifyShareLink = async (req, res) => {
    const { token } = req.params;

    try {
        const signatureEntry = await Signature.findOne({
            shareToken: token,
            expiresAt: { $gt: Date.now() },
            status: 'pending'
        }).populate('document');

        if (!signatureEntry) {
            return res.status(404).json({ message: 'Invalid, expired, or used share link.' });
        }

        res.status(200).json({
            document: signatureEntry.document,
            signatureEntryId: signatureEntry._id,
            signerEmail: signatureEntry.signerEmail
        });

    } catch (error) {
        console.error('Error verifying share link:', error);
        res.status(500).json({ message: 'Server error verifying share link.' });
    }
};

// ✅ Upload Signature via Share Link
const uploadSignature = async (req, res) => {
    const { signatureEntryId } = req.params;
    const { signatureDataUrl } = req.body;

    if (!signatureDataUrl) {
        return res.status(400).json({ message: 'Signature image data is required.' });
    }

    try {
        const signatureEntry = await Signature.findById(signatureEntryId);
        if (!signatureEntry) {
            return res.status(404).json({ message: 'Signature entry not found.' });
        }

        signatureEntry.signatureValue = signatureDataUrl;
        signatureEntry.signedAt = new Date();
        signatureEntry.status = 'signed';
        await signatureEntry.save();

        res.status(200).json({ message: 'Signature uploaded successfully.' });

    } catch (error) {
        console.error('Error uploading signature:', error);
        res.status(500).json({ message: 'Server error uploading signature.' });
    }
};

// ✅ Get Signature by ID
const getSignatureById = async (req, res) => {
    try {
        const signatureEntry = await Signature.findById(req.params.id)
            .populate('document')
            .populate('user', 'name email');

        if (!signatureEntry) {
            return res.status(404).json({ message: 'Signature entry not found.' });
        }

        if (signatureEntry.user._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized.' });
        }

        res.status(200).json(signatureEntry);

    } catch (error) {
        console.error('Error fetching signature:', error);
        res.status(500).json({ message: 'Server error fetching signature.' });
    }
};

// ✅ Get All Signatures for Document
const getSignaturesByDocumentId = async (req, res) => {
    try {
        const { documentId } = req.params;

        const document = await Document.findOne({ _id: documentId, user: req.user._id });
        if (!document) {
            return res.status(404).json({ message: 'Document not found or unauthorized.' });
        }

        const signatures = await Signature.find({ document: documentId });

        res.status(200).json(signatures);

    } catch (error) {
        console.error('Error fetching document signatures:', error);
        res.status(500).json({ message: 'Server error fetching signatures.' });
    }
};

// ✅ FIXED Save Signature Position (Required Fields Handled Properly)
const saveSignature = async (req, res) => {
    const { documentId, x, y, page, type, signatureValue, signatureType } = req.body;

    if (!documentId || x === undefined || y === undefined || !type || !signatureValue) {
        return res.status(400).json({ message: 'Missing required fields: documentId, x, y, type, or signatureValue.' });
    }

    try {
        const document = await Document.findOne({ _id: documentId, user: req.user._id });
        if (!document) {
            return res.status(404).json({ message: 'Document not found or unauthorized.' });
        }

        const newSignature = new Signature({
            document: documentId,
            user: req.user._id,
            x,
            y,
            page: page || 1,
            type,
            signatureValue,
            signatureType: signatureType || 'image',
            status: 'pending',
            signedAt: new Date(),
        });

        await newSignature.save();

        res.status(200).json({
            message: 'Signature saved successfully.',
            signature: newSignature
        });

    } catch (error) {
        console.error('Error saving signature:', error);
        res.status(500).json({ message: 'Server error saving signature.' });
    }
};

// ✅ Finalize Document
const finalizeDocument = async (req, res) => {
    const { documentId } = req.body;

    if (!documentId) {
        return res.status(400).json({ message: 'Missing documentId.' });
    }

    try {
        const document = await Document.findOne({ _id: documentId, user: req.user._id });
        if (!document) {
            return res.status(404).json({ message: 'Document not found or unauthorized.' });
        }

        document.isFinalized = true;
        await document.save();

        res.status(200).json({ message: 'Document finalized successfully.', signedDocument: document });

    } catch (error) {
        console.error('Error finalizing document:', error);
        res.status(500).json({ message: 'Server error finalizing document.' });
    }
};

// ✅ Update Signature Status
const updateSignatureStatus = async (req, res) => {
    const { signatureId } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ message: 'Missing status field.' });
    }

    try {
        const signature = await Signature.findById(signatureId);
        if (!signature) {
            return res.status(404).json({ message: 'Signature entry not found.' });
        }

        signature.status = status;
        signature.signedAt = new Date();
        await signature.save();

        res.status(200).json({ message: 'Signature status updated successfully.', signature });

    } catch (error) {
        console.error('Error updating signature status:', error);
        res.status(500).json({ message: 'Server error updating signature status.' });
    }
};

// ✅ Export All Controllers
module.exports = {
    generateShareLink,
    verifyShareLink,
    uploadSignature,
    getSignatureById,
    getSignaturesByDocumentId,
    saveSignature,
    finalizeDocument,
    updateSignatureStatus,
};
