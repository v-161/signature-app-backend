const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../utils/emailService');

// Helper function to generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    try {
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        user = new User({
            name,
            email,
            password,
        });

        await user.save(); // Password will be hashed by pre-save hook in User model

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    try {
        // Check if user exists
        const user = await User.findOne({ email });

        // Check password
        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Request password reset link
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Please provide an email address.' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            // Send a generic success message even if user not found to prevent email enumeration
            return res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
        }

        // Generate reset token using method defined in User model
        const resetToken = user.getResetPasswordToken();
        await user.save(); // Save user with the hashed token and expiry

        // Construct the reset URL for the frontend
        const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

        const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please click on the link below to reset your password:\n\n${resetURL}\n\nThis token will expire in one hour. If you did not request this, please ignore this email and your password will remain unchanged.`;

        const htmlMessage = `<p>You are receiving this email because you (or someone else) has requested the reset of a password.</p><p>Please click on the following link to reset your password:</p><p><a href="${resetURL}">${resetURL}</a></p><p>This token will expire in one hour.</p><p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`;

        // Send the password reset email
        const emailResult = await sendPasswordResetEmail({
            email: user.email,
            subject: 'V-Doc Sign: Password Reset Request',
            text: message,
            html: htmlMessage,
        });

        if (!emailResult.success) {
            // If email fails to send, clear the token from the user (optional, but good practice)
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            return res.status(500).json({ message: `Error sending password reset email: ${emailResult.message}` });
        }

        res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });

    } catch (error) {
        console.error('Error in forgotPassword:', error);
        res.status(500).json({ message: 'Server error during password reset request.' });
    }
};

// @desc    Reset user password using token
// @route   PUT /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ message: 'Please provide a new password.' });
    }

    try {
        // Hash the incoming token to compare with the one stored in the database
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user by hashed token and ensure token is not expired
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired password reset token.' });
        }

        // Set new password (pre-save hook will hash it)
        user.password = password;
        user.resetPasswordToken = undefined; // Clear the token
        user.resetPasswordExpire = undefined; // Clear the expiration
        await user.save();

        res.status(200).json({ message: 'Password has been reset successfully.' });

    } catch (error) {
        console.error('Error in resetPassword:', error);
        res.status(500).json({ message: 'Server error during password reset.' });
    }
};

// Export all controller functions
module.exports = {
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
};
