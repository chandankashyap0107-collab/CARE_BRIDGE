// ===========================
// CARE BRIDGE - Server with Express.js
// Version 2.0 - Database Integrated
// ===========================

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// Import database module
const db = require('./database');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'carebridge_secret_key_2024';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(__dirname));

// ===========================
// AUTH MIDDLEWARE
// ===========================

// Verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// ===========================
// API ROUTES - AUTH
// ===========================

// Register new user
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        // Validate required fields
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate role
        if (!['caretaker', 'elderly'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Check if user already exists
        const existingUser = await db.findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await db.registerUser({
            name,
            email,
            phone,
            password: hashedPassword,
            role
        });

        // Generate token
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                linkingCode: user.linkingCode
            },
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user
        const user = await db.findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        // Get linked accounts info
        const linkedAccounts = await db.getLinkedAccounts(user.id);

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                linkingCode: user.linking_code
            },
            linkedAccounts,
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.findUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const linkedAccounts = await db.getLinkedAccounts(user.id);

        res.json({
            user,
            linkedAccounts
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// Regenerate linking code
app.post('/api/regenerate-code', authenticateToken, async (req, res) => {
    try {
        const newCode = await db.regenerateLinkingCode(req.user.id);
        res.json({ linkingCode: newCode });
    } catch (error) {
        console.error('Regenerate code error:', error);
        res.status(500).json({ error: 'Failed to regenerate code' });
    }
});

// ===========================
// API ROUTES - ACCOUNT LINKING
// ===========================

// Link accounts (caretaker enters elderly's code)
app.post('/api/link-account', authenticateToken, async (req, res) => {
    try {
        const { linkingCode } = req.body;

        if (!linkingCode) {
            return res.status(400).json({ error: 'Linking code required' });
        }

        // Find user with this linking code
        const targetUser = await db.findUserByLinkingCode(linkingCode);
        if (!targetUser) {
            return res.status(404).json({ error: 'Invalid linking code' });
        }

        if (targetUser.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot link to yourself' });
        }

        // Determine which way to link based on roles
        const currentUser = await db.findUserById(req.user.id);

        if (currentUser.role === 'caretaker' && targetUser.role === 'elderly') {
            // Caretaker linking to elderly
            await db.linkUsers(req.user.id, targetUser.id, targetUser.name);
            res.json({ message: `Successfully linked to ${targetUser.name}` });
        } else if (currentUser.role === 'elderly' && targetUser.role === 'caretaker') {
            // Elderly linking to caretaker
            await db.linkUsers(targetUser.id, req.user.id, currentUser.name);
            res.json({ message: `Successfully linked with caretaker ${targetUser.name}` });
        } else {
            return res.status(400).json({ error: 'Can only link caretaker with elderly' });
        }
    } catch (error) {
        console.error('Link account error:', error);
        res.status(500).json({ error: 'Failed to link accounts' });
    }
});

// Get linked accounts
app.get('/api/linked-accounts', authenticateToken, async (req, res) => {
    try {
        const linkedAccounts = await db.getLinkedAccounts(req.user.id);
        res.json(linkedAccounts);
    } catch (error) {
        console.error('Get linked accounts error:', error);
        res.status(500).json({ error: 'Failed to get linked accounts' });
    }
});

// Get caretaker for elderly
app.get('/api/my-caretaker', authenticateToken, async (req, res) => {
    try {
        const caretaker = await db.getCaretakerForElderly(req.user.id);
        res.json(caretaker || { message: 'No caretaker linked' });
    } catch (error) {
        console.error('Get caretaker error:', error);
        res.status(500).json({ error: 'Failed to get caretaker' });
    }
});

// Get elderly for caretaker
app.get('/api/my-elderly', authenticateToken, async (req, res) => {
    try {
        const elderlyList = await db.getElderlyForCaretaker(req.user.id);
        res.json(elderlyList);
    } catch (error) {
        console.error('Get elderly error:', error);
        res.status(500).json({ error: 'Failed to get elderly list' });
    }
});

// ===========================
// API ROUTES - MEALS
// ===========================

// Add meal (for caretaker or elderly)
app.post('/api/meals', authenticateToken, async (req, res) => {
    try {
        const { name, time, notes, elderlyId } = req.body;

        if (!name || !time) {
            return res.status(400).json({ error: 'Meal name and time required' });
        }

        // Determine who the meal is for
        let userId = req.user.id;
        let caretakerId = null;

        const currentUser = await db.findUserById(req.user.id);

        if (currentUser.role === 'caretaker' && elderlyId) {
            // Caretaker adding meal for elderly
            userId = elderlyId;
            caretakerId = req.user.id;
        } else if (currentUser.role === 'elderly') {
            // Elderly adding their own meal
            // Find their caretaker
            const caretaker = await db.getCaretakerForElderly(req.user.id);
            caretakerId = caretaker ? caretaker.id : null;
        }

        const meal = await db.addMeal({
            userId,
            caretakerId,
            name,
            time,
            notes
        });

        res.status(201).json({ message: 'Meal added successfully', meal });
    } catch (error) {
        console.error('Add meal error:', error);
        res.status(500).json({ error: 'Failed to add meal' });
    }
});

// Get meals
app.get('/api/meals', authenticateToken, async (req, res) => {
    try {
        const { elderlyId } = req.query;

        let meals;
        const currentUser = await db.findUserById(req.user.id);

        if (currentUser.role === 'caretaker' && elderlyId) {
            // Caretaker viewing specific elderly's meals
            meals = await db.getMealsForCaretaker(req.user.id, elderlyId);
        } else {
            // User's own meals
            meals = await db.getMeals(req.user.id);
        }

        res.json(meals);
    } catch (error) {
        console.error('Get meals error:', error);
        res.status(500).json({ error: 'Failed to get meals' });
    }
});

// Mark meal as consumed
app.put('/api/meals/:id/consume', authenticateToken, async (req, res) => {
    try {
        await db.markMealConsumed(parseInt(req.params.id));
        res.json({ message: 'Meal marked as consumed' });
    } catch (error) {
        console.error('Mark meal consumed error:', error);
        res.status(500).json({ error: 'Failed to update meal' });
    }
});

// ===========================
// API ROUTES - MEDICINES
// ===========================

// Add medicine
app.post('/api/medicines', authenticateToken, async (req, res) => {
    try {
        const { name, dosage, time, frequency, notes, elderlyId } = req.body;

        if (!name || !dosage || !time) {
            return res.status(400).json({ error: 'Medicine name, dosage, and time required' });
        }

        let userId = req.user.id;
        let caretakerId = null;

        const currentUser = await db.findUserById(req.user.id);

        if (currentUser.role === 'caretaker' && elderlyId) {
            userId = elderlyId;
            caretakerId = req.user.id;
        } else if (currentUser.role === 'elderly') {
            const caretaker = await db.getCaretakerForElderly(req.user.id);
            caretakerId = caretaker ? caretaker.id : null;
        }

        const medicine = await db.addMedicine({
            userId,
            caretakerId,
            name,
            dosage,
            time,
            frequency,
            notes
        });

        res.status(201).json({ message: 'Medicine added successfully', medicine });
    } catch (error) {
        console.error('Add medicine error:', error);
        res.status(500).json({ error: 'Failed to add medicine' });
    }
});

// Get medicines
app.get('/api/medicines', authenticateToken, async (req, res) => {
    try {
        const { elderlyId } = req.query;

        let medicines;
        const currentUser = await db.findUserById(req.user.id);

        if (currentUser.role === 'caretaker' && elderlyId) {
            medicines = await db.getMedicines(elderlyId);
        } else {
            medicines = await db.getMedicines(req.user.id);
        }

        res.json(medicines);
    } catch (error) {
        console.error('Get medicines error:', error);
        res.status(500).json({ error: 'Failed to get medicines' });
    }
});

// Mark medicine as taken
app.put('/api/medicines/:id/take', authenticateToken, async (req, res) => {
    try {
        await db.markMedicineTaken(parseInt(req.params.id));
        res.json({ message: 'Medicine marked as taken' });
    } catch (error) {
        console.error('Mark medicine taken error:', error);
        res.status(500).json({ error: 'Failed to update medicine' });
    }
});

// ===========================
// API ROUTES - HEALTH ENTRIES
// ===========================

// Add health entry
app.post('/api/health-entries', authenticateToken, async (req, res) => {
    try {
        const { type, title, description, mood } = req.body;

        if (!type || !title) {
            return res.status(400).json({ error: 'Entry type and title required' });
        }

        let userId = req.user.id;
        let caretakerId = null;

        if (req.user.role === 'elderly') {
            const caretaker = await db.getCaretakerForElderly(req.user.id);
            caretakerId = caretaker ? caretaker.id : null;
        }

        const entry = await db.addHealthEntry({
            userId,
            caretakerId,
            type,
            title,
            description,
            mood
        });

        res.status(201).json({ message: 'Health entry saved', entry });
    } catch (error) {
        console.error('Add health entry error:', error);
        res.status(500).json({ error: 'Failed to save health entry' });
    }
});

// Get health entries
app.get('/api/health-entries', authenticateToken, async (req, res) => {
    try {
        const { elderlyId } = req.query;

        let entries;
        const currentUser = await db.findUserById(req.user.id);

        if (currentUser.role === 'caretaker') {
            // Caretaker sees their linked elderly's entries
            entries = await db.getHealthEntriesForCaretaker(req.user.id);
        } else {
            entries = await db.getHealthEntries(req.user.id);
        }

        res.json(entries);
    } catch (error) {
        console.error('Get health entries error:', error);
        res.status(500).json({ error: 'Failed to get health entries' });
    }
});

// ===========================
// API ROUTES - EMERGENCIES
// ===========================

// Trigger emergency
app.post('/api/emergency', authenticateToken, async (req, res) => {
    try {
        let userId = req.user.id;
        let caretakerId = null;

        if (req.user.role === 'elderly') {
            const caretaker = await db.getCaretakerForElderly(req.user.id);
            caretakerId = caretaker ? caretaker.id : null;
        }

        const emergency = await db.triggerEmergency({
            userId,
            caretakerId
        });

        res.status(201).json({
            message: 'Emergency alert sent!',
            emergency
        });
    } catch (error) {
        console.error('Trigger emergency error:', error);
        res.status(500).json({ error: 'Failed to trigger emergency' });
    }
});

// Get emergencies (for caretaker)
app.get('/api/emergencies', authenticateToken, async (req, res) => {
    try {
        const emergencies = await db.getEmergenciesForCaretaker(req.user.id);
        res.json(emergencies);
    } catch (error) {
        console.error('Get emergencies error:', error);
        res.status(500).json({ error: 'Failed to get emergencies' });
    }
});

// Get active emergencies (for real-time polling)
app.get('/api/emergencies/active', authenticateToken, async (req, res) => {
    try {
        const emergencies = await db.getActiveEmergenciesForCaretaker(req.user.id);
        res.json(emergencies);
    } catch (error) {
        console.error('Get active emergencies error:', error);
        res.status(500).json({ error: 'Failed to get active emergencies' });
    }
});

// Resolve emergency (mark as handled)
app.put('/api/emergencies/:id/resolve', authenticateToken, async (req, res) => {
    try {
        await db.updateEmergencyStatus(parseInt(req.params.id), 'RESOLVED');
        res.json({ message: 'Emergency resolved' });
    } catch (error) {
        console.error('Resolve emergency error:', error);
        res.status(500).json({ error: 'Failed to resolve emergency' });
    }
});

// Get pending meals and medicines (alerts for caretaker)
app.get('/api/alerts', authenticateToken, async (req, res) => {
    try {
        const pendingMeals = await db.getPendingMealsForCaretaker(req.user.id);
        const pendingMedicines = await db.getPendingMedicinesForCaretaker(req.user.id);

        res.json({
            pendingMeals,
            pendingMedicines,
            hasAlerts: pendingMeals.length > 0 || pendingMedicines.length > 0
        });
    } catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({ error: 'Failed to get alerts' });
    }
});

// ===========================
// API ROUTES - HOURLY CHECK-IN
// ===========================

// Enable/disable hourly check-in for elderly (caretaker only)
app.post('/api/hourly-checkin', authenticateToken, async (req, res) => {
    try {
        const { elderlyId, enabled } = req.body;

        if (!elderlyId) {
            return res.status(400).json({ error: 'Elderly ID required' });
        }

        // Verify the caretaker has access to this elderly
        const elderlyList = await db.getElderlyForCaretaker(req.user.id);
        const hasAccess = elderlyList.some(e => e.id === parseInt(elderlyId));

        if (!hasAccess) {
            return res.status(403).json({ error: 'Not authorized for this elderly person' });
        }

        const result = await db.setHourlyCheckin(req.user.id, parseInt(elderlyId), enabled);
        res.json({
            message: enabled ? 'Hourly check-in enabled' : 'Hourly check-in disabled',
            enabled: enabled
        });
    } catch (error) {
        console.error('Hourly check-in error:', error);
        res.status(500).json({ error: 'Failed to update hourly check-in' });
    }
});

// Get hourly check-in settings
app.get('/api/hourly-checkin', authenticateToken, async (req, res) => {
    try {
        const { elderlyId } = req.query;

        if (!elderlyId) {
            return res.status(400).json({ error: 'Elderly ID required' });
        }

        const settings = await db.getHourlyCheckinSettings(req.user.id, parseInt(elderlyId));
        res.json(settings);
    } catch (error) {
        console.error('Get hourly check-in error:', error);
        res.status(500).json({ error: 'Failed to get hourly check-in settings' });
    }
});

// Get all hourly check-in settings for caretaker
app.get('/api/hourly-checkin/all', authenticateToken, async (req, res) => {
    try {
        const settings = await db.getAllHourlyCheckinsForCaretaker(req.user.id);
        res.json(settings);
    } catch (error) {
        console.error('Get all hourly check-ins error:', error);
        res.status(500).json({ error: 'Failed to get hourly check-in settings' });
    }
});

// ===========================
// API ROUTES - ACTIVITY REPORTS
// ===========================

// Submit activity report (elderly)
app.post('/api/activity-reports', authenticateToken, async (req, res) => {
    try {
        const { activity, notes, status } = req.body;

        if (!activity) {
            return res.status(400).json({ error: 'Activity description required' });
        }

        let userId = req.user.id;
        let caretakerId = null;

        // Find caretaker for this elderly
        if (req.user.role === 'elderly') {
            const caretaker = await db.getCaretakerForElderly(req.user.id);
            caretakerId = caretaker ? caretaker.id : null;
        }

        const report = await db.addActivityReport({
            userId,
            caretakerId,
            activity,
            notes: notes || '',
            status: status || 'OK'
        });

        res.status(201).json({ message: 'Activity report submitted', report });
    } catch (error) {
        console.error('Submit activity report error:', error);
        res.status(500).json({ error: 'Failed to submit activity report' });
    }
});

// Get activity reports (elderly views own, caretaker views their elderly's)
app.get('/api/activity-reports', authenticateToken, async (req, res) => {
    try {
        const { elderlyId } = req.query;

        let reports;
        const currentUser = await db.findUserById(req.user.id);

        if (currentUser.role === 'caretaker') {
            if (elderlyId) {
                reports = await db.getActivityReportsForElderly(req.user.id, parseInt(elderlyId));
            } else {
                reports = await db.getActivityReportsForCaretaker(req.user.id);
            }
        } else {
            // Elderly person viewing their own reports
            reports = await db.getActivityReports(req.user.id);
        }

        res.json(reports);
    } catch (error) {
        console.error('Get activity reports error:', error);
        res.status(500).json({ error: 'Failed to get activity reports' });
    }
});

// ===========================
// API ROUTES - LOCATION TRACKING
// ===========================

// Save location (elderly sends their location)
app.post('/api/location', authenticateToken, async (req, res) => {
    try {
        const { latitude, longitude, accuracy } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Latitude and longitude required' });
        }

        // Only elderly users can update their own location
        if (req.user.role !== 'elderly') {
            return res.status(403).json({ error: 'Only elderly users can update their location' });
        }

        const location = await db.saveLocation({
            userId: req.user.id,
            latitude,
            longitude,
            accuracy
        });

        res.json({ message: 'Location updated', location });
    } catch (error) {
        console.error('Save location error:', error);
        res.status(500).json({ error: 'Failed to save location' });
    }
});

// Get location for elderly (caretaker views elderly's location)
app.get('/api/location', authenticateToken, async (req, res) => {
    try {
        const { elderlyId } = req.query;

        if (!elderlyId) {
            return res.status(400).json({ error: 'Elderly ID required' });
        }

        // Verify caretaker has access
        const currentUser = await db.findUserById(req.user.id);

        let location;
        if (currentUser.role === 'caretaker') {
            location = await db.getLocationForCaretaker(req.user.id, parseInt(elderlyId));
        } else {
            // Elderly viewing their own location
            location = await db.getLatestLocation(req.user.id);
        }

        if (!location) {
            return res.json({ message: 'No location data available', location: null });
        }

        res.json({ location });
    } catch (error) {
        console.error('Get location error:', error);
        res.status(500).json({ error: 'Failed to get location' });
    }
});

// Get location history
app.get('/api/location/history', authenticateToken, async (req, res) => {
    try {
        const { elderlyId, limit } = req.query;

        if (!elderlyId) {
            return res.status(400).json({ error: 'Elderly ID required' });
        }

        // Verify access
        const currentUser = await db.findUserById(req.user.id);

        if (currentUser.role !== 'caretaker') {
            return res.status(403).json({ error: 'Only caretakers can view location history' });
        }

        const history = await db.getLocationHistory(parseInt(elderlyId), parseInt(limit) || 10);
        res.json({ history });
    } catch (error) {
        console.error('Get location history error:', error);
        res.status(500).json({ error: 'Failed to get location history' });
    }
});

// ===========================
// SERVE FRONTEND ROUTES
// ===========================

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'CARE BRIDGE API is running' });
});

// ===========================
// START SERVER
// ===========================

app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ CARE BRIDGE Server v2.0 - Database Integrated');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`📡 API available at: http://localhost:${PORT}/api`);
    console.log('═══════════════════════════════════════════════════════');
});

