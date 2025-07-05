const mongoose = require('mongoose');

const shareableLinkSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    signerEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    expiresAt: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['pending', 'viewed', 'signed', 'declined'],
        default: 'pending',
    },
    signedBy: {
        type: String,
        trim: true,
    },
    signedAt: {
        type: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });  // Disable automatic _id for subdocuments

const documentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    originalName: {
        type: String,
        required: true,
        trim: true,
    },
    fileName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    filePath: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    mimeType: {
        type: String,
        required: true,
    },
    size: {
        type: Number,
        required: true,
        min: 1,
    },
    shareableLinks: [shareableLinkSchema],
}, {
    timestamps: true,
});

module.exports = mongoose.model('Document', documentSchema);
