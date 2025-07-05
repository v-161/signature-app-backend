const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendShareLinkEmail = async (recipientEmail, senderName, documentName, shareLink) => {
    const mailOptions = {
        from: `"${senderName} (V-Doc Sign)" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `Document "${documentName}" shared with you for signing on V-Doc Sign`,
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #0056b3;">Document Shared for Signing on V-Doc Sign</h2>
                <p>Hello,</p>
                <p><strong>${senderName}</strong> has shared a document titled "<strong>${documentName}</strong>" with you for your signature.</p>
                <p>To view and sign the document, please click on the link below:</p>
                <p style="margin-top: 20px; text-align: center;">
                    <a href="${shareLink}" style="display: inline-block; padding: 12px 25px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        View and Sign Document
                    </a>
                </p>
                <p style="margin-top: 20px;">This link is unique to you. Please do not share it.</p>
                <p>Thank you,<br/>The V-Doc Sign Team</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;">
                <p style="font-size: 0.8em; color: #777;">If you did not expect this email, please ignore it.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${recipientEmail} for document ${documentName}`);
        return { success: true, message: 'Email sent successfully.' };
    } catch (error) {
        console.error(`Error sending email to ${recipientEmail}:`, error);
        return { success: false, message: `Failed to send email: ${error.message}` };
    }
};

const sendPasswordResetEmail = async (options) => {
    const mailOptions = {
        from: `V-Doc Sign <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.html,
        text: options.text,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${options.email}`);
        return { success: true, message: 'Password reset email sent successfully.' };
    } catch (error) {
        console.error(`Error sending password reset email to ${options.email}:`, error);
        return { success: false, message: `Failed to send password reset email: ${error.message}` };
    }
};

// Ensure both functions are exported
module.exports = { sendShareLinkEmail, sendPasswordResetEmail };
