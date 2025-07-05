const mongoose = require('mongoose');

const signatureSchema = new mongoose.Schema({
    document: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    x: {
        type: Number,
        required: true,
        min: 0,
    },
    y: {
        type: Number,
        required: true,
        min: 0,
    },
    page: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
    },
    status: {
        type: String,
        enum: ['pending', 'signed', 'rejected'],
        default: 'pending',
        required: true,
    },
    signerEmail: {
        type: String,
        trim: true,
        lowercase: true,
    },
    signedAt: {
        type: Date,
    },
    signatureValue: {
        type: String,
        trim: true,
    },
    signatureType: {
        type: String,
        enum: ['text', 'image'],
        trim: true,
    },
    type: { // 'signature' or 'initial'
        type: String,
        enum: ['signature', 'initial'],
        required: true,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Signature', signatureSchema);
