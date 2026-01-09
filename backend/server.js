// server.js
// Main Express server for 3Eyes Lootbox Platform backend

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { verifyEnvironment } from './lib/getNetworkConfig.js';

const app = express();
const PORT = process.env.PORT || 3333;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

// API routes
import projectRoutes from './routes/projects.js';
import vaultRoutes from './routes/vault.js';

app.use('/api/projects', projectRoutes);
app.use('/api/vault', vaultRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error',
    });
});

// Start server
async function startServer() {
    try {
        // Verify environment matches network configuration
        await verifyEnvironment();

        app.listen(PORT, () => {
            console.log(`\n🚀 3Eyes Backend API running on port ${PORT}`);
            console.log(`   Health check: http://localhost:${PORT}/health\n`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
