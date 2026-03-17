
// ===========================
// CARE BRIDGE - Database Module
// SQLite Database for persistent storage
// ===========================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const DB_PATH = path.join(__dirname, 'carebridge.db');

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Database connection error:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
    }
});

// Create tables
db.serialize(() => {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('caretaker', 'elderly')),
            linking_code TEXT UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // User relationships (linking caretaker <-> elderly)
    db.run(`
        CREATE TABLE IF NOT EXISTS user_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            caretaker_id INTEGER NOT NULL,
            elderly_id INTEGER NOT NULL,
            elderly_name TEXT,
            relationship TEXT DEFAULT 'family',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (caretaker_id) REFERENCES users(id),
            FOREIGN KEY (elderly_id) REFERENCES users(id),
            UNIQUE(caretaker_id, elderly_id)
        )
    `);

    // Meals table
    db.run(`
        CREATE TABLE IF NOT EXISTS meals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            caretaker_id INTEGER,
            name TEXT NOT NULL,
            time TEXT NOT NULL,
            notes TEXT,
            consumed INTEGER DEFAULT 0,
            consumed_time DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (caretaker_id) REFERENCES users(id)
        )
    `);

    // Medicines table
    db.run(`
        CREATE TABLE IF NOT EXISTS medicines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            caretaker_id INTEGER,
            name TEXT NOT NULL,
            dosage TEXT NOT NULL,
            time TEXT NOT NULL,
            frequency TEXT DEFAULT 'Once Daily',
            notes TEXT,
            taken INTEGER DEFAULT 0,
            taken_time DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (caretaker_id) REFERENCES users(id)
        )
    `);

    // Health entries table
    db.run(`
        CREATE TABLE IF NOT EXISTS health_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            caretaker_id INTEGER,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            mood TEXT DEFAULT 'Normal',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (caretaker_id) REFERENCES users(id)
        )
    `);

    // Emergency alerts table
    db.run(`
        CREATE TABLE IF NOT EXISTS emergencies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            caretaker_id INTEGER,
            type TEXT DEFAULT 'SOS',
            status TEXT DEFAULT 'ACTIVE',
            location TEXT DEFAULT 'Home',
            severity TEXT DEFAULT 'CRITICAL',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (caretaker_id) REFERENCES users(id)
        )
    `);

    // Location tracking table
    db.run(`
        CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            accuracy REAL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Hourly check-in settings table (caretaker enables for elderly)
    db.run(`
        CREATE TABLE IF NOT EXISTS hourly_checkin_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            caretaker_id INTEGER NOT NULL,
            elderly_id INTEGER NOT NULL,
            enabled INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (caretaker_id) REFERENCES users(id),
            FOREIGN KEY (elderly_id) REFERENCES users(id),
            UNIQUE(caretaker_id, elderly_id)
        )
    `);

    // Activity reports table (elderly reports their activity)
    db.run(`
        CREATE TABLE IF NOT EXISTS activity_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            caretaker_id INTEGER,
            activity TEXT NOT NULL,
            notes TEXT,
            status TEXT DEFAULT 'OK',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (caretaker_id) REFERENCES users(id)
        )
    `);

    console.log('✅ Database tables created successfully');
});

// ===========================
// HELPER FUNCTIONS
// ===========================

// Generate unique linking code
function generateLinkingCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ===========================
// USER OPERATIONS
// ===========================

// Register new user
function registerUser(userData) {
    return new Promise((resolve, reject) => {
        const { name, email, phone, password, role } = userData;
        const linkingCode = generateLinkingCode();

        const sql = `INSERT INTO users (name, email, phone, password, role, linking_code) VALUES (?, ?, ?, ?, ?, ?)`;

        db.run(sql, [name, email, phone || '', password, role, linkingCode], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    id: this.lastID,
                    name,
                    email,
                    role,
                    linkingCode
                });
            }
        });
    });
}

// Find user by email
function findUserByEmail(email) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM users WHERE email = ?`;
        db.get(sql, [email], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
}

// Find user by ID
function findUserById(id) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT id, name, email, phone, role, linking_code, created_at FROM users WHERE id = ?`;
        db.get(sql, [id], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
}

// Find user by linking code
function findUserByLinkingCode(code) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT id, name, email, role, linking_code FROM users WHERE linking_code = ?`;
        db.get(sql, [code], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
}

// Update user's linking code
function regenerateLinkingCode(userId) {
    return new Promise((resolve, reject) => {
        const newCode = generateLinkingCode();
        const sql = `UPDATE users SET linking_code = ? WHERE id = ?`;
        db.run(sql, [newCode, userId], function (err) {
            if (err) reject(err);
            resolve(newCode);
        });
    });
}

// ===========================
// USER LINKING OPERATIONS
// ===========================

// Link caretaker to elderly
function linkUsers(caretakerId, elderlyId, elderlyName) {
    return new Promise((resolve, reject) => {
        const sql = `INSERT OR REPLACE INTO user_links (caretaker_id, elderly_id, elderly_name) VALUES (?, ?, ?)`;
        db.run(sql, [caretakerId, elderlyId, elderlyName], function (err) {
            if (err) reject(err);
            resolve({ success: true, linkId: this.lastID });
        });
    });
}

// Get linked accounts for a user
function getLinkedAccounts(userId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT ul.*, u.name as caretaker_name, u.email as caretaker_email
            FROM user_links ul
            JOIN users u ON ul.caretaker_id = u.id
            WHERE ul.elderly_id = ?
        `;

        db.all(sql, [userId], (err, rows) => {
            if (err) reject(err);

            // Also get elderly links for caretaker
            const sql2 = `
                SELECT ul.*, u.name as elderly_name, u.email as elderly_email
                FROM user_links ul
                JOIN users u ON ul.elderly_id = u.id
                WHERE ul.caretaker_id = ?
            `;

            db.all(sql2, [userId], (err2, rows2) => {
                if (err2) reject(err2);
                resolve({ as_elderly: rows, as_caretaker: rows2 });
            });
        });
    });
}

// Get caretaker for elderly user
function getCaretakerForElderly(elderlyId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT u.id, u.name, u.email, u.phone
            FROM user_links ul
            JOIN users u ON ul.caretaker_id = u.id
            WHERE ul.elderly_id = ?
        `;
        db.get(sql, [elderlyId], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
}

// Get elderly users for caretaker
function getElderlyForCaretaker(caretakerId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT u.id, u.name, u.email, u.phone, u.linking_code
            FROM user_links ul
            JOIN users u ON ul.elderly_id = u.id
            WHERE ul.caretaker_id = ?
        `;
        db.all(sql, [caretakerId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

// ===========================
// MEAL OPERATIONS
// ===========================

// Add meal
function addMeal(mealData) {
    return new Promise((resolve, reject) => {
        const { userId, caretakerId, name, time, notes } = mealData;
        const sql = `INSERT INTO meals (user_id, caretaker_id, name, time, notes) VALUES (?, ?, ?, ?, ?)`;

        db.run(sql, [userId, caretakerId || null, name, time, notes || ''], function (err) {
            if (err) reject(err);
            resolve({ id: this.lastID, ...mealData });
        });
    });
}

// Get meals for user
function getMeals(userId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM meals WHERE user_id = ? ORDER BY created_at DESC`;
        db.all(sql, [userId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

// Get meals added by caretaker for elderly
function getMealsForCaretaker(caretakerId, elderlyId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM meals WHERE caretaker_id = ? AND user_id = ? ORDER BY created_at DESC`;
        db.all(sql, [caretakerId, elderlyId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

// Mark meal as consumed
function markMealConsumed(mealId) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE meals SET consumed = 1, consumed_time = CURRENT_TIMESTAMP WHERE id = ?`;
        db.run(sql, [mealId], function (err) {
            if (err) reject(err);
            resolve({ success: true });
        });
    });
}

// ===========================
// MEDICINE OPERATIONS
// ===========================

// Add medicine
function addMedicine(medicineData) {
    return new Promise((resolve, reject) => {
        const { userId, caretakerId, name, dosage, time, frequency, notes } = medicineData;
        const sql = `INSERT INTO medicines (user_id, caretaker_id, name, dosage, time, frequency, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [userId, caretakerId || null, name, dosage, time, frequency || 'Once Daily', notes || ''], function (err) {
            if (err) reject(err);
            resolve({ id: this.lastID, ...medicineData });
        });
    });
}

// Get medicines for user
function getMedicines(userId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM medicines WHERE user_id = ? ORDER BY created_at DESC`;
        db.all(sql, [userId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

// Mark medicine as taken
function markMedicineTaken(medicineId) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE medicines SET taken = 1, taken_time = CURRENT_TIMESTAMP WHERE id = ?`;
        db.run(sql, [medicineId], function (err) {
            if (err) reject(err);
            resolve({ success: true });
        });
    });
}

// ===========================
// HEALTH ENTRY OPERATIONS
// ===========================

// Add health entry
function addHealthEntry(entryData) {
    return new Promise((resolve, reject) => {
        const { userId, caretakerId, type, title, description, mood } = entryData;
        const sql = `INSERT INTO health_entries (user_id, caretaker_id, type, title, description, mood) VALUES (?, ?, ?, ?, ?, ?)`;

        db.run(sql, [userId, caretakerId || null, type, title, description || '', mood || 'Normal'], function (err) {
            if (err) reject(err);
            resolve({ id: this.lastID, ...entryData });
        });
    });
}

// Get health entries for user
function getHealthEntries(userId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM health_entries WHERE user_id = ? ORDER BY created_at DESC`;
        db.all(sql, [userId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

// Get health entries for caretaker (for linked elderly)
function getHealthEntriesForCaretaker(caretakerId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT he.*, u.name as elderly_name 
                    FROM health_entries he
                    JOIN user_links ul ON he.user_id = ul.elderly_id
                    JOIN users u ON he.user_id = u.id
                    WHERE ul.caretaker_id = ?
                    ORDER BY he.created_at DESC`;
        db.all(sql, [caretakerId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

// ===========================
// EMERGENCY OPERATIONS
// ===========================

// Trigger emergency
function triggerEmergency(emergencyData) {
    return new Promise((resolve, reject) => {
        const { userId, caretakerId } = emergencyData;
        const sql = `INSERT INTO emergencies (user_id, caretaker_id) VALUES (?, ?)`;

        db.run(sql, [userId, caretakerId || null], function (err) {
            if (err) reject(err);
            resolve({ id: this.lastID, ...emergencyData, status: 'ACTIVE' });
        });
    });
}

// Get emergencies for caretaker
function getEmergenciesForCaretaker(caretakerId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT e.*, u.name as elderly_name 
                    FROM emergencies e
                    JOIN user_links ul ON e.user_id = ul.elderly_id
                    JOIN users u ON e.user_id = u.id
                    WHERE ul.caretaker_id = ?
                    ORDER BY e.created_at DESC`;
        db.all(sql, [caretakerId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

// Get active emergencies (not resolved) for caretaker
function getActiveEmergenciesForCaretaker(caretakerId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT e.*, u.name as elderly_name 
                    FROM emergencies e
                    JOIN user_links ul ON e.user_id = ul.elderly_id
                    JOIN users u ON e.user_id = u.id
                    WHERE ul.caretaker_id = ? AND e.status = 'ACTIVE'
                    ORDER BY e.created_at DESC`;
        db.all(sql, [caretakerId], (err, rows) => {
            resolve(rows);
        });
    });
}

// Update emergency status
function updateEmergencyStatus(emergencyId, status) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE emergencies SET status = ? WHERE id = ?`;
        db.run(sql, [status, emergencyId], function (err) {
            if (err) reject(err);
            resolve({ success: true });
        });
    });
}

// Get pending meals (not consumed, past scheduled time)
function getPendingMealsForCaretaker(caretakerId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT m.*, u.name as elderly_name, u.id as elderly_id
                    FROM meals m
                    JOIN user_links ul ON m.user_id = ul.elderly_id
                    JOIN users u ON m.user_id = u.id
                    WHERE ul.caretaker_id = ? 
                    AND m.consumed = 0 
                    AND m.time < datetime('now', '+30 minutes')
                    AND date(m.created_at) = date('now')
                    ORDER BY m.time ASC`;
        db.all(sql, [caretakerId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

// Get pending medicines (not taken, past scheduled time)
function getPendingMedicinesForCaretaker(caretakerId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT med.*, u.name as elderly_name, u.id as elderly_id
                    FROM medicines med
                    JOIN user_links ul ON med.user_id = ul.elderly_id
                    JOIN users u ON med.user_id = u.id
                    WHERE ul.caretaker_id = ? 
                    AND med.taken = 0 
                    AND med.time < datetime('now', '+30 minutes')
                    AND date(med.created_at) = date('now')
                    ORDER BY med.time ASC`;
        db.all(sql, [caretakerId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

// ===========================
// HOURLY CHECK-IN OPERATIONS
// ===========================

// Set hourly check-in for elderly (caretaker enables/disables)
function setHourlyCheckin(caretakerId, elderlyId, enabled) {
    return new Promise((resolve, reject) => {
        const sql = `INSERT OR REPLACE INTO hourly_checkin_settings (caretaker_id, elderly_id, enabled, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`;
        db.run(sql, [caretakerId, elderlyId, enabled ? 1 : 0], function (err) {
            if (err) reject(err);
            resolve({ success: true, enabled: enabled });
        });
    });
}

// Get hourly check-in settings for elderly
function getHourlyCheckinSettings(caretakerId, elderlyId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM hourly_checkin_settings WHERE caretaker_id = ? AND elderly_id = ?`;
        db.get(sql, [caretakerId, elderlyId], (err, row) => {
            if (err) reject(err);
            resolve(row || { enabled: 0 });
        });
    });
}

// Get all hourly check-in settings for caretaker's elderly
function getAllHourlyCheckinsForCaretaker(caretakerId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT hcs.*, u.name as elderly_name 
                    FROM hourly_checkin_settings hcs
                    JOIN users u ON hcs.elderly_id = u.id
                    WHERE hcs.caretaker_id = ?`;
        db.all(sql, [caretakerId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

// ===========================
// ACTIVITY REPORT OPERATIONS
// ===========================

// Add activity report
function addActivityReport(reportData) {
    return new Promise((resolve, reject) => {
        const { userId, caretakerId, activity, notes, status } = reportData;
        const sql = `INSERT INTO activity_reports (user_id, caretaker_id, activity, notes, status) VALUES (?, ?, ?, ?, ?)`;

        db.run(sql, [userId, caretakerId || null, activity, notes || '', status || 'OK'], function (err) {
            if (err) reject(err);
            resolve({ id: this.lastID, ...reportData });
        });
    });
}

// Get activity reports for user (elderly)
function getActivityReports(userId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM activity_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`;
        db.all(sql, [userId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

// Get activity reports for caretaker (for their elderly)
function getActivityReportsForCaretaker(caretakerId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT ar.*, u.name as elderly_name 
                    FROM activity_reports ar
                    JOIN user_links ul ON ar.user_id = ul.elderly_id
                    JOIN users u ON ar.user_id = u.id
                    WHERE ul.caretaker_id = ?
                    ORDER BY ar.created_at DESC
                    LIMIT 50`;
        db.all(sql, [caretakerId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

// Get activity reports for specific elderly
function getActivityReportsForElderly(caretakerId, elderlyId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM activity_reports WHERE caretaker_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 50`;
        db.all(sql, [caretakerId, elderlyId], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

// ===========================
// LOCATION OPERATIONS
// ===========================

// Save location for user (elderly)
function saveLocation(locationData) {
    return new Promise((resolve, reject) => {
        const { userId, latitude, longitude, accuracy } = locationData;

        // First check if there's a recent location (within 1 minute)
        const checkSql = `SELECT id, updated_at FROM locations WHERE user_id = ? AND datetime(updated_at) > datetime('now', '-1 minute') ORDER BY updated_at DESC LIMIT 1`;

        db.get(checkSql, [userId], (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            if (row) {
                // Update existing recent location
                const updateSql = `UPDATE locations SET latitude = ?, longitude = ?, accuracy = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
                db.run(updateSql, [latitude, longitude, accuracy, row.id], function (err) {
                    if (err) reject(err);
                    resolve({ id: row.id, ...locationData, updated: true });
                });
            } else {
                // Insert new location
                const insertSql = `INSERT INTO locations (user_id, latitude, longitude, accuracy) VALUES (?, ?, ?, ?)`;
                db.run(insertSql, [userId, latitude, longitude, accuracy || null], function (err) {
                    if (err) reject(err);
                    resolve({ id: this.lastID, ...locationData, inserted: true });
                });
            }
        });
    });
}

// Get latest location for user
function getLatestLocation(userId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM locations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`;
        db.get(sql, [userId], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
}

// Get location for elderly by caretaker
function getLocationForCaretaker(caretakerId, elderlyId) {
    return new Promise((resolve, reject) => {
        // First verify the elderly is linked to this caretaker
        const verifySql = `SELECT id FROM user_links WHERE caretaker_id = ? AND elderly_id = ?`;
        db.get(verifySql, [caretakerId, elderlyId], (err, row) => {
            if (err) reject(err);
            if (!row) {
                resolve(null); // Not authorized
                return;
            }

            // Get the location
            const sql = `SELECT * FROM locations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`;
            db.get(sql, [elderlyId], (err2, location) => {
                if (err2) reject(err2);
                resolve(location);
            });
        });
    });
}

// Get location history for user
function getLocationHistory(userId, limit = 10) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM locations WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?`;
        db.all(sql, [userId, limit], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

// ===========================
// EXPORT MODULE
// ===========================

module.exports = {
    db,
    // User operations
    registerUser,
    findUserByEmail,
    findUserById,
    findUserByLinkingCode,
    regenerateLinkingCode,
    // Linking operations
    linkUsers,
    getLinkedAccounts,
    getCaretakerForElderly,
    getElderlyForCaretaker,
    // Meal operations
    addMeal,
    getMeals,
    getMealsForCaretaker,
    markMealConsumed,
    // Medicine operations
    addMedicine,
    getMedicines,
    markMedicineTaken,
    // Health entry operations
    addHealthEntry,
    getHealthEntries,
    getHealthEntriesForCaretaker,
    // Emergency operations
    triggerEmergency,
    getEmergenciesForCaretaker,
    getActiveEmergenciesForCaretaker,
    updateEmergencyStatus,
    // Pending alerts
    getPendingMealsForCaretaker,
    getPendingMedicinesForCaretaker,
    // Hourly check-in operations
    setHourlyCheckin,
    getHourlyCheckinSettings,
    getAllHourlyCheckinsForCaretaker,
    // Activity report operations
    addActivityReport,
    getActivityReports,
    getActivityReportsForCaretaker,
    getActivityReportsForElderly,
    // Location operations
    saveLocation,
    getLatestLocation,
    getLocationForCaretaker,
    getLocationHistory
};

