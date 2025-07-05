const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const signatureRoutes = require('./routes/signatureRoutes');
const auditRoutes = require('./routes/auditRoutes');

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: 'http://localhost:5173', // Adjust for production if needed
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/', (req, res) => {
    res.send('Document Signature App API is running!');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/docs', documentRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/auditlogs', auditRoutes);

// Static Files for Uploaded PDFs
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Optional: Global Error Handler (Recommended for production)
// app.use((err, req, res, next) => {
//     console.error('Unhandled Error:', err);
//     res.status(500).json({ message: 'An unexpected server error occurred.' });
// });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
