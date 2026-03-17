// ===========================
// CARE BRIDGE - Main Script v2.0
// Database Integrated with API
// ===========================

console.log('✓ CARE BRIDGE v2.0 loaded');

// ===========================
// GLOBAL STATE
// ===========================

let currentUser = null;
let currentToken = null;
let selectedElderlyId = null;
let syncInterval = null;

// Data arrays
let mealsData = [];
let medicinesData = [];
let healthEntriesData = [];

// API Base URL
const API_URL = '/api';


// ===========================
// API HELPER FUNCTIONS
// ===========================

// Make authenticated API request
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (currentToken) {
        options.headers['Authorization'] = `Bearer ${currentToken}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);

        // Try to parse JSON response
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // If not JSON, get text and create error
            const text = await response.text();
            throw new Error(text || `HTTP ${response.status}`);
        }

        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Show sync indicator
function showSyncIndicator() {
    const syncEl = document.getElementById('syncStatus');
    if (syncEl) {
        syncEl.classList.remove('hidden');
    }
}

// Hide sync indicator
function hideSyncIndicator() {
    const syncEl = document.getElementById('syncStatus');
    if (syncEl) {
        syncEl.classList.add('hidden');
    }
}


// ===========================
// AUTH FUNCTIONS
// ===========================

// Show login modal
function showLoginModal() {
    closeModal('roleModal');
    closeModal('registerModal');
    document.getElementById('loginModal').style.display = 'flex';
}

// Show register modal
function showRegisterModal() {
    closeModal('roleModal');
    closeModal('loginModal');
    document.getElementById('registerModal').style.display = 'flex';
}

// Show role modal (legacy)
function showRoleModal() {
    document.getElementById('roleModal').style.display = 'flex';
}

// Select role and go to register
function selectRole(role) {
    closeModal('roleModal');
    document.getElementById('registerRole').value = role;
    showRegisterModal();
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;

    if (!name || !email || !password || !role) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        showSyncIndicator();
        const data = await apiCall('/register', 'POST', { name, email, phone, password, role });

        // Save token and user
        currentToken = data.token;
        currentUser = data.user;

        localStorage.setItem('carebridge_token', currentToken);
        localStorage.setItem('carebridge_user', JSON.stringify(currentUser));

        closeModal('registerModal');
        alert(`Welcome ${name}! Account created successfully!`);

        // Redirect to appropriate dashboard
        if (role === 'caretaker') {
            loadCaretakerDashboard();
        } else {
            loadElderlyDashboard();
        }

    } catch (error) {
        alert(error.message);
    } finally {
        hideSyncIndicator();
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        showSyncIndicator();
        const data = await apiCall('/login', 'POST', { email, password });

        // Save token and user
        currentToken = data.token;
        currentUser = data.user;

        localStorage.setItem('carebridge_token', currentToken);
        localStorage.setItem('carebridge_user', JSON.stringify(currentUser));

        closeModal('loginModal');
        alert(`Welcome back, ${data.user.name}!`);

        // Redirect to appropriate dashboard
        if (data.user.role === 'caretaker') {
            loadCaretakerDashboard();
        } else {
            loadElderlyDashboard();
        }

    } catch (error) {
        alert(error.message);
    } finally {
        hideSyncIndicator();
    }
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        currentToken = null;
        currentUser = null;
        selectedElderlyId = null;

        localStorage.removeItem('carebridge_token');
        localStorage.removeItem('carebridge_user');

        // Stop sync
        if (syncInterval) {
            clearInterval(syncInterval);
        }

        // Show landing page
        document.getElementById('caretaker-dashboard-view').classList.add('hidden');
        document.getElementById('elderly-dashboard-view').classList.add('hidden');
        document.getElementById('landing-view').classList.remove('hidden');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Check existing session
async function checkSession() {
    const token = localStorage.getItem('carebridge_token');
    const user = localStorage.getItem('carebridge_user');

    if (token && user) {
        currentToken = token;
        currentUser = JSON.parse(user);

        try {
            // Verify token is still valid
            await apiCall('/me');

            // Resume session
            if (currentUser.role === 'caretaker') {
                loadCaretakerDashboard();
            } else {
                loadElderlyDashboard();
            }
        } catch (error) {
            // Token expired, clear session
            console.log('Session expired');
            logout();
        }
    }
}


// ===========================
// ACCOUNT LINKING FUNCTIONS
// ===========================

// Show link modal
function showLinkModal() {
    const codeEl = document.getElementById('myLinkingCode');
    if (codeEl && currentUser) {
        codeEl.textContent = currentUser.linkingCode || '------';
    }
    document.getElementById('linkModal').style.display = 'flex';
}

// Regenerate linking code
async function regenerateCode() {
    try {
        showSyncIndicator();
        const data = await apiCall('/regenerate-code', 'POST');
        currentUser.linkingCode = data.linkingCode;
        localStorage.setItem('carebridge_user', JSON.stringify(currentUser));

        document.getElementById('myLinkingCode').textContent = data.linkingCode;
        alert('New linking code generated!');
    } catch (error) {
        alert(error.message);
    } finally {
        hideSyncIndicator();
    }
}

// Link account with code
async function linkAccount() {
    const code = document.getElementById('linkCodeInput').value.trim().toUpperCase();

    if (!code) {
        alert('Please enter a linking code');
        return;
    }

    try {
        showSyncIndicator();
        await apiCall('/link-account', 'POST', { linkingCode: code });

        alert('Account linked successfully!');
        closeModal('linkModal');
        document.getElementById('linkCodeInput').value = '';

        // Refresh data
        if (currentUser.role === 'caretaker') {
            loadCaretakerDashboard();
        } else {
            loadElderlyDashboard();
        }

    } catch (error) {
        alert(error.message);
    } finally {
        hideSyncIndicator();
    }
}


// ===========================
// MODAL & NAVIGATION FUNCTIONS
// ===========================

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
    }
}

function backToHome() {
    document.getElementById('caretaker-dashboard-view').classList.add('hidden');
    document.getElementById('elderly-dashboard-view').classList.add('hidden');
    document.getElementById('landing-view').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// ===========================
// CARETAKER DASHBOARD FUNCTIONS
// ===========================

async function loadCaretakerDashboard() {
    // Hide landing, show dashboard
    document.getElementById('landing-view').classList.add('hidden');
    document.getElementById('caretaker-dashboard-view').classList.remove('hidden');
    document.getElementById('elderly-dashboard-view').classList.add('hidden');

    // Update user info
    document.getElementById('caretakerName').textContent = `Hello, ${currentUser.name}`;

    // Load linked elderly list
    await loadElderlyList();

    // Start real-time sync
    startSync();

    window.scrollTo({ top: 0, behavior: 'smooth' });
    console.log('Caretaker dashboard loaded');
}

// Load elderly list for caretaker
async function loadElderlyList() {
    try {
        const elderlyList = await apiCall('/my-elderly');

        const select = document.getElementById('elderlySelect');
        select.innerHTML = '<option value="">Select Person</option>';

        if (elderlyList && elderlyList.length > 0) {
            elderlyList.forEach(elderly => {
                const option = document.createElement('option');
                option.value = elderly.id;
                option.textContent = elderly.name;
                select.appendChild(option);
            });

            // Auto-select first if available
            if (elderlyList.length > 0) {
                select.value = elderlyList[0].id;
                selectedElderlyId = elderlyList[0].id;
                await loadElderlyData();

                // Update banner
                document.getElementById('linkedBanner').classList.remove('hidden');
                document.getElementById('linkedStatus').textContent = `Connected with: ${elderlyList[0].name}`;
                document.getElementById('caretakerElderlyName').textContent = `Monitoring → ${elderlyList[0].name}`;
            }
        } else {
            document.getElementById('linkedBanner').classList.add('hidden');
            document.getElementById('caretakerElderlyName').textContent = 'No one linked yet. Use Link Account to connect.';
        }
    } catch (error) {
        console.error('Error loading elderly list:', error);
    }
}

// Load data for selected elderly
async function loadElderlyData() {
    const select = document.getElementById('elderlySelect');
    selectedElderlyId = select.value;

    if (!selectedElderlyId) {
        // Clear displays
        document.getElementById('mealsListContainer').innerHTML = '<p style="text-align:center;color:#64748b;">Select an elderly person to view their data</p>';
        document.getElementById('medicinesListContainer').innerHTML = '<p style="text-align:center;color:#64748b;">Select an elderly person to view their data</p>';
        document.getElementById('healthEntriesListContainer').innerHTML = '<p style="text-align:center;color:#64748b;">Select an elderly person to view their data</p>';
        return;
    }

    // Update header
    const selectedOption = select.options[select.selectedIndex];
    document.getElementById('caretakerElderlyName').textContent = `Monitoring → ${selectedOption.text}`;

    await loadMeals();
    await loadMedicines();
    await loadHealthEntries();
    await loadActivityReports();
    await loadHourlyCheckinSettings();
    updateAnalytics();
}


// ===========================
// ELDERLY DASHBOARD FUNCTIONS
// ===========================

async function loadElderlyDashboard() {
    // Hide landing, show dashboard
    document.getElementById('landing-view').classList.add('hidden');
    document.getElementById('caretaker-dashboard-view').classList.add('hidden');
    document.getElementById('elderly-dashboard-view').classList.remove('hidden');

    // Update user info
    document.getElementById('elderlyName').textContent = currentUser.name;

    // Set greeting based on time
    const hour = new Date().getHours();
    let greeting = 'Good Day';
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 17) greeting = 'Good Afternoon';
    else greeting = 'Good Evening';
    document.getElementById('greetingTime').textContent = greeting;

    // Check if caretaker is linked
    await checkCaretakerLink();

    // Load own data
    await loadMyData();

    // Start real-time sync
    startSync();

    window.scrollTo({ top: 0, behavior: 'smooth' });
    console.log('Elderly dashboard loaded');
}

// Check caretaker link status
async function checkCaretakerLink() {
    try {
        const caretaker = await apiCall('/my-caretaker');

        const banner = document.getElementById('linkedBannerElderly');
        const status = document.getElementById('linkedStatusElderly');

        if (caretaker && caretaker.id) {
            banner.classList.remove('hidden');
            status.textContent = `Connected with caretaker: ${caretaker.name}`;
        } else {
            banner.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error checking caretaker link:', error);
    }
}

// Load elderly's own data
async function loadMyData() {
    await loadMeals();
    await loadMedicines();
    await loadHealthEntries();
    await loadActivityReports();
}


// ===========================
// REAL-TIME SYNC
// ===========================

function startSync() {
    // Sync every 10 seconds for real-time updates
    if (syncInterval) {
        clearInterval(syncInterval);
    }

    syncInterval = setInterval(async () => {
        try {
            await loadMeals();
            await loadMedicines();
            await loadHealthEntries();

            if (currentUser.role === 'caretaker') {
                updateAnalytics();
                // Load SOS emergencies and alerts
                await loadEmergencies();
                await loadAlerts();
            }
        } catch (error) {
            console.error('Sync error:', error);
        }
    }, 10000); // 10 seconds

    console.log('Real-time sync started');
}


// ===========================
// MEAL TRACKER FUNCTIONS
// ===========================

async function loadMeals() {
    try {
        let endpoint = '/meals';
        if (currentUser.role === 'caretaker' && selectedElderlyId) {
            endpoint = `/meals?elderlyId=${selectedElderlyId}`;
        }

        mealsData = await apiCall(endpoint);
        displayMeals();
    } catch (error) {
        console.error('Error loading meals:', error);
    }
}

function addMeal() {
    const mealName = document.getElementById('mealNameInput')?.value || '';
    const mealTime = document.getElementById('mealTimeInput')?.value || '';
    const mealNotes = document.getElementById('mealNotesInput')?.value || '';

    if (!mealName || !mealTime) {
        alert('Please fill in meal name and time');
        return;
    }

    saveMealToAPI({ name: mealName, time: mealTime, notes: mealNotes });
}

async function saveMealToAPI(meal) {
    try {
        showSyncIndicator();

        let body = { name: meal.name, time: meal.time, notes: meal.notes };

        if (currentUser.role === 'caretaker' && selectedElderlyId) {
            body.elderlyId = selectedElderlyId;
        }

        await apiCall('/meals', 'POST', body);

        // Clear inputs
        document.getElementById('mealNameInput').value = '';
        document.getElementById('mealTimeInput').value = '';
        document.getElementById('mealNotesInput').value = '';

        alert('Meal added successfully! ✓');

        // Reload meals
        await loadMeals();

    } catch (error) {
        alert(error.message);
    } finally {
        hideSyncIndicator();
    }
}

async function markMealConsumed(mealId) {
    try {
        showSyncIndicator();
        await apiCall(`/meals/${mealId}/consume`, 'PUT');
        await loadMeals();
    } catch (error) {
        alert(error.message);
    } finally {
        hideSyncIndicator();
    }
}

function displayMeals() {
    const mealsContainer = document.getElementById('mealsListContainer');
    const mealsContainerElderly = document.getElementById('mealsListContainerElderly');

    if (!mealsContainer && !mealsContainerElderly) return;

    if (mealsData.length === 0) {
        const emptyMsg = '<p style="text-align: center; color: #64748b;">No meals recorded yet</p>';
        if (mealsContainer) mealsContainer.innerHTML = emptyMsg;
        if (mealsContainerElderly) mealsContainerElderly.innerHTML = emptyMsg;
        return;
    }

    let html = '';
    mealsData.forEach(meal => {
        const consumed = meal.consumed ? 'consumed-meal' : '';
        const consumedTime = meal.consumed_time ? new Date(meal.consumed_time).toLocaleTimeString() : '';

        html += `
            <div class="meal-item ${consumed}">
                <div class="meal-left">
                    <div class="meal-icon"><i class="fas fa-utensils"></i></div>
                    <div class="meal-info">
                        <div class="meal-name">${meal.name}</div>
                        <div class="meal-time"><i class="fas fa-clock"></i> ${meal.time}</div>
                        ${meal.notes ? `<div class="meal-notes">Note: ${meal.notes}</div>` : ''}
                        <div class="meal-timestamp">Added: ${new Date(meal.created_at).toLocaleString()}</div>
                    </div>
                </div>
                <div class="meal-action">
                    ${currentUser.role === 'elderly' ? (
                !meal.consumed ?
                    `<button class="btn-small meal-consumed-btn" onclick="markMealConsumed(${meal.id})">Mark Consumed</button>` :
                    `<span class="badge badge-success">Consumed</span>`
            ) : ''}
                </div>
            </div>
        `;
    });

    if (mealsContainer) mealsContainer.innerHTML = html;
    if (mealsContainerElderly) mealsContainerElderly.innerHTML = html;
}


// ===========================
// MEDICINE TRACKER FUNCTIONS
// ===========================

async function loadMedicines() {
    try {
        let endpoint = '/medicines';
        if (currentUser.role === 'caretaker' && selectedElderlyId) {
            endpoint = `/medicines?elderlyId=${selectedElderlyId}`;
        }

        medicinesData = await apiCall(endpoint);
        displayMedicines();
    } catch (error) {
        console.error('Error loading medicines:', error);
    }
}

function addMedicine() {
    const medName = document.getElementById('medicineNameInput')?.value || '';
    const medDosage = document.getElementById('medicineDosageInput')?.value || '';
    const medTime = document.getElementById('medicineTimeInput')?.value || '';
    const medFrequency = document.getElementById('medicineFrequencyInput')?.value || 'Once Daily';
    const medNotes = document.getElementById('medicineNotesInput')?.value || '';

    if (!medName || !medDosage || !medTime) {
        alert('Please fill in medicine name, dosage, and time');
        return;
    }

    saveMedicineToAPI({
        name: medName,
        dosage: medDosage,
        time: medTime,
        frequency: medFrequency,
        notes: medNotes
    });
}

async function saveMedicineToAPI(medicine) {
    try {
        showSyncIndicator();

        let body = {
            name: medicine.name,
            dosage: medicine.dosage,
            time: medicine.time,
            frequency: medicine.frequency,
            notes: medicine.notes
        };

        if (currentUser.role === 'caretaker' && selectedElderlyId) {
            body.elderlyId = selectedElderlyId;
        }

        await apiCall('/medicines', 'POST', body);

        // Clear inputs
        document.getElementById('medicineNameInput').value = '';
        document.getElementById('medicineDosageInput').value = '';
        document.getElementById('medicineTimeInput').value = '';
        document.getElementById('medicineFrequencyInput').value = 'Once Daily';
        document.getElementById('medicineNotesInput').value = '';

        alert('Medicine added to schedule! ✓');

        await loadMedicines();

    } catch (error) {
        alert(error.message);
    } finally {
        hideSyncIndicator();
    }
}

async function markMedicineTaken(medicineId) {
    try {
        showSyncIndicator();
        await apiCall(`/medicines/${medicineId}/take`, 'PUT');
        await loadMedicines();
    } catch (error) {
        alert(error.message);
    } finally {
        hideSyncIndicator();
    }
}

function displayMedicines() {
    const medicinesContainer = document.getElementById('medicinesListContainer');
    const medicinesContainerElderly = document.getElementById('medicinesListContainerElderly');

    if (!medicinesContainer && !medicinesContainerElderly) return;

    if (medicinesData.length === 0) {
        const emptyMsg = '<p style="text-align: center; color: #64748b;">No medicines scheduled yet</p>';
        if (medicinesContainer) medicinesContainer.innerHTML = emptyMsg;
        if (medicinesContainerElderly) medicinesContainerElderly.innerHTML = emptyMsg;
        return;
    }

    let html = '';
    medicinesData.forEach(medicine => {
        const takenClass = medicine.taken ? 'medicine-taken' : 'medicine-pending';

        html += `
            <div class="medicine-item ${takenClass}">
                <div class="medicine-left">
                    <div class="medicine-icon"><i class="fas fa-pills"></i></div>
                    <div class="medicine-info">
                        <div class="medicine-name">${medicine.name}</div>
                        <div class="medicine-dosage">${medicine.dosage}</div>
                        <div class="medicine-schedule"><i class="fas fa-clock"></i> ${medicine.time} • ${medicine.frequency}</div>
                        ${medicine.notes ? `<div class="medicine-notes">Note: ${medicine.notes}</div>` : ''}
                        <div class="medicine-timestamp">Added: ${new Date(medicine.created_at).toLocaleString()}</div>
                    </div>
                </div>
                <div class="medicine-action">
                    ${currentUser.role === 'elderly' ? (
                !medicine.taken ?
                    `<button class="btn-small medicine-taken-btn" onclick="markMedicineTaken(${medicine.id})">Mark Taken</button>` :
                    `<span class="badge badge-success">Taken</span>`
            ) : ''}
                </div>
            </div>
        `;
    });

    if (medicinesContainer) medicinesContainer.innerHTML = html;
    if (medicinesContainerElderly) medicinesContainerElderly.innerHTML = html;
}


// ===========================
// HEALTH ENTRY FUNCTIONS
// ===========================

async function loadHealthEntries() {
    try {
        let endpoint = '/health-entries';
        if (currentUser.role === 'caretaker' && selectedElderlyId) {
            endpoint = `/health-entries?elderlyId=${selectedElderlyId}`;
        }

        healthEntriesData = await apiCall(endpoint);
        displayHealthEntries();
    } catch (error) {
        console.error('Error loading health entries:', error);
    }
}

function addHealthEntry() {
    const entryType = document.getElementById('healthEntryTypeInput')?.value || 'General';
    const entryTitle = document.getElementById('healthEntryTitleInput')?.value || '';
    const entryDescription = document.getElementById('healthEntryDescriptionInput')?.value || '';
    const entryMood = document.getElementById('healthEntryMoodInput')?.value || 'Normal';

    if (!entryTitle) {
        alert('Please add a title for your health entry');
        return;
    }

    saveHealthEntryToAPI({
        type: entryType,
        title: entryTitle,
        description: entryDescription,
        mood: entryMood
    });
}

async function saveHealthEntryToAPI(entry) {
    try {
        showSyncIndicator();

        await apiCall('/health-entries', 'POST', {
            type: entry.type,
            title: entry.title,
            description: entry.description,
            mood: entry.mood
        });

        // Clear inputs
        document.getElementById('healthEntryTypeInput').value = 'General';
        document.getElementById('healthEntryTitleInput').value = '';
        document.getElementById('healthEntryDescriptionInput').value = '';
        document.getElementById('healthEntryMoodInput').value = 'Normal';

        alert('Health entry saved! ✓');

        await loadHealthEntries();

    } catch (error) {
        alert(error.message);
    } finally {
        hideSyncIndicator();
    }
}

function displayHealthEntries() {
    const entriesContainer = document.getElementById('healthEntriesListContainer');
    const entriesContainerElderly = document.getElementById('healthEntriesListContainerElderly');

    if (!entriesContainer && !entriesContainerElderly) return;

    if (healthEntriesData.length === 0) {
        const emptyMsg = '<p style="text-align: center; color: #64748b;">No health entries yet</p>';
        if (entriesContainer) entriesContainer.innerHTML = emptyMsg;
        if (entriesContainerElderly) entriesContainerElderly.innerHTML = emptyMsg;
        return;
    }

    let html = '';
    healthEntriesData.forEach(entry => {
        const moodEmoji = getMoodEmoji(entry.mood);
        const typeColor = getHealthEntryTypeColor(entry.type);

        html += `
            <div class="health-entry-item">
                <div class="health-entry-header">
                    <div class="health-entry-type" style="background-color: ${typeColor}; color: white;">
                        ${entry.type}
                    </div>
                    <div class="health-entry-mood">${moodEmoji} ${entry.mood}</div>
                    <div class="health-entry-date">${new Date(entry.created_at).toLocaleDateString()}</div>
                </div>
                <div class="health-entry-title">${entry.title}</div>
                ${entry.description ? `<div class="health-entry-description">${entry.description}</div>` : ''}
                <div class="health-entry-time">Recorded: ${new Date(entry.created_at).toLocaleString()}</div>
            </div>
        `;
    });

    if (entriesContainer) entriesContainer.innerHTML = html;
    if (entriesContainerElderly) entriesContainerElderly.innerHTML = html;
}

function getMoodEmoji(mood) {
    const moods = {
        'Great': '😄',
        'Good': '😊',
        'Normal': '😐',
        'Tired': '😴',
        'Unwell': '😟'
    };
    return moods[mood] || '😐';
}

function getHealthEntryTypeColor(type) {
    const colors = {
        'General': '#10b981',
        'Symptom': '#ef4444',
        'Sleep': '#3b82f6',
        'Activity': '#f59e0b',
        'Mood': '#8b5cf6'
    };
    return colors[type] || '#10b981';
}


// ===========================
// EMERGENCY BUTTON
// ===========================

async function triggerEmergency() {
    const emergency = confirm('⚠️ EMERGENCY ALERT\n\nThis will immediately notify your caretaker!\n\nContinue?');

    if (emergency) {
        try {
            showSyncIndicator();
            const result = await apiCall('/emergency', 'POST');

            alert('🚨 Emergency alert sent to caretakers!\n\nHelp is on the way.');
            console.log('EMERGENCY TRIGGERED:', result.emergency);

        } catch (error) {
            alert('Failed to send emergency alert. Please try again or call directly.');
        } finally {
            hideSyncIndicator();
        }
    }
}


// ===========================
// ANALYTICS FUNCTIONS
// ===========================

function updateAnalytics() {
    // Medicine adherence
    const totalMeds = medicinesData.length;
    const takenMeds = medicinesData.filter(m => m.taken).length;
    const adherence = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 0;

    document.getElementById('adherencePercentage').textContent = `${adherence}%`;
    document.getElementById('adherenceBar').style.width = `${adherence}%`;

    // Meals count
    const totalMeals = mealsData.length;
    const consumedMeals = mealsData.filter(m => m.consumed).length;
    document.getElementById('mealsTodayCount').textContent = consumedMeals;
    document.getElementById('mealsStatus').textContent = `${consumedMeals}/${totalMeals} consumed`;

    // Next medicine
    const pendingMeds = medicinesData.filter(m => !m.taken);
    if (pendingMeds.length > 0) {
        const nextMed = pendingMeds.sort((a, b) => a.time.localeCompare(b.time))[0];
        document.getElementById('nextMedicineName').textContent = nextMed.name;
        document.getElementById('nextMedicineTime').textContent = nextMed.time;
    } else {
        document.getElementById('nextMedicineName').textContent = '—';
        document.getElementById('nextMedicineTime').textContent = 'All taken!';
    }

    // Health trend
    if (healthEntriesData.length > 0) {
        const recentMood = healthEntriesData[0]?.mood || 'Normal';
        document.getElementById('healthTrend').textContent = recentMood;
        document.getElementById('healthTrendDescription').textContent = 'Latest entry';
    }

    // Display next items
    displayNextMedicine();
    displayNextMeal();
}

function displayNextMedicine() {
    const nextMedDisplay = document.getElementById('nextMedicineDisplay');
    if (!nextMedDisplay) return;

    const pendingMeds = medicinesData.filter(m => !m.taken);
    if (pendingMeds.length > 0) {
        const nextMed = pendingMeds.sort((a, b) => a.time.localeCompare(b.time))[0];
        nextMedDisplay.innerHTML = `
            <div style="padding: 1rem; background: #f3e8ff; border-radius: 8px; text-align: center;">
                <p style="color: #7e22ce; font-weight: 600; margin: 0.5rem 0;">Next Medicine</p>
                <p style="font-size: 1.2rem; font-weight: 700; color: #7e22ce; margin: 0;">
                    ${nextMed.name} (${nextMed.dosage})
                </p>
                <p style="color: #6b21a8; margin: 0.5rem 0;">🕐 ${nextMed.time}</p>
            </div>
        `;
    } else {
        nextMedDisplay.innerHTML = '<p style="text-align: center; color: #64748b;">All medicines taken!</p>';
    }
}

function displayNextMeal() {
    const nextMealDisplay = document.getElementById('nextMealDisplay');
    if (!nextMealDisplay) return;

    const pendingMeals = mealsData.filter(m => !m.consumed);
    if (pendingMeals.length > 0) {
        const nextMeal = pendingMeals.sort((a, b) => a.time.localeCompare(b.time))[0];
        nextMealDisplay.innerHTML = `
            <div style="padding: 1rem; background: #ccfbf1; border-radius: 8px; text-align: center; margin-top:1rem;">
                <p style="color: #0d9488; font-weight: 600; margin: 0.5rem 0;">Next Meal</p>
                <p style="font-size: 1.2rem; font-weight: 700; color: #0d9488; margin: 0;">
                    ${nextMeal.name}
                </p>
                <p style="color: #047857; margin: 0.5rem 0;">🕐 ${nextMeal.time}</p>
            </div>
        `;
    } else {
        nextMealDisplay.innerHTML = '<p style="text-align: center; color: #64748b;">All meals consumed!</p>';
    }
}


// ===========================
// INITIALIZATION
// ===========================

document.addEventListener('DOMContentLoaded', function () {
    console.log('✓ CARE BRIDGE v2.0 initialized');

    // Check for existing session
    checkSession();

    // Mobile hamburger menu
    const hamburger = document.getElementById('hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', function () {
            const navMenu = document.querySelector('.nav-menu');
            if (navMenu) {
                navMenu.classList.toggle('active');
            }
        });
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});

// ==============================================================
// SOS ALERT FUNCTIONS - Added for Emergency Notifications
// ==============================================================

// Handle SOS response from caretaker
async function handleSOS() {
    if (confirm('Call your loved one now?')) {
        openVideoCall();
    }
}

// Resolve an emergency alert
async function resolveEmergency(emergencyId) {
    try {
        showSyncIndicator();
        await apiCall('/emergencies/' + emergencyId + '/resolve', 'PUT');
        await loadEmergencies();
    } catch (error) {
        alert(error.message);
    } finally {
        hideSyncIndicator();
    }
}

// Real-time SOS and Alerts variables
var activeEmergencies = [];
var previousEmergencyCount = 0;

// Load emergencies for caretaker
async function loadEmergencies() {
    if (!currentUser || currentUser.role !== 'caretaker') return;

    try {
        var emergencies = await apiCall('/emergencies/active');
        activeEmergencies = emergencies;

        // Update SOS banner
        updateSOSBanner(emergencies);

        // Show browser notification for new SOS
        if (emergencies.length > previousEmergencyCount && previousEmergencyCount > 0) {
            showBrowserNotification('SOS Alert!', 'Your loved one needs help immediately!');
            playAlertSound();
        }
        previousEmergencyCount = emergencies.length;
    } catch (error) {
        console.error('Error loading emergencies:', error);
    }
}

// Update SOS banner display
function updateSOSBanner(emergencies) {
    var banner = document.getElementById('sosAlertBanner');
    var message = document.getElementById('sosAlertMessage');

    if (!banner) return;

    if (emergencies && emergencies.length > 0) {
        banner.classList.remove('hidden');
        var latestEmergency = emergencies[0];
        message.textContent = latestEmergency.elderly_name + ' has triggered an SOS alert!';
    } else {
        banner.classList.add('hidden');
    }
}

// Load alerts (pending meals/medicines)
async function loadAlerts() {
    if (!currentUser || currentUser.role !== 'caretaker') return;

    try {
        var alerts = await apiCall('/alerts');
        displayAlerts(alerts);
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

// Display alerts in the UI
function displayAlerts(alerts) {
    var alertsSection = document.getElementById('alertsSection');
    var alertsContainer = document.getElementById('alertsContainer');

    if (!alertsSection || !alertsContainer) return;

    var pendingMeals = alerts.pendingMeals || [];
    var pendingMedicines = alerts.pendingMedicines || [];
    var hasAlerts = pendingMeals.length > 0 || pendingMedicines.length > 0;

    if (!hasAlerts) {
        alertsSection.classList.add('hidden');
        return;
    }

    alertsSection.classList.remove('hidden');

    var html = '';

    // Pending meals alerts
    pendingMeals.forEach(function (meal) {
        html += '<div class="alert-card alert-meal">' +
            '<div class="alert-icon"><i class="fas fa-utensils"></i></div>' +
            '<div class="alert-content">' +
            '<div class="alert-title">' + meal.elderly_name + ' missed a meal</div>' +
            '<div class="alert-description">' + meal.name + ' - Scheduled at ' + meal.time + '</div>' +
            '<div class="alert-time">Overdue</div>' +
            '</div>' +
            '<div class="alert-action">' +
            '<button class="btn-alert-action call" onclick="openVideoCall()">' +
            '<i class="fas fa-phone"></i> Call' +
            '</button>' +
            '</div></div>';
    });

    // Pending medicines alerts
    pendingMedicines.forEach(function (medicine) {
        html += '<div class="alert-card alert-medicine">' +
            '<div class="alert-icon"><i class="fas fa-pills"></i></div>' +
            '<div class="alert-content">' +
            '<div class="alert-title">' + medicine.elderly_name + ' missed medicine</div>' +
            '<div class="alert-description">' + medicine.name + ' (' + medicine.dosage + ') - Scheduled at ' + medicine.time + '</div>' +
            '<div class="alert-time">Overdue</div>' +
            '</div>' +
            '<div class="alert-action">' +
            '<button class="btn-alert-action call" onclick="openVideoCall()">' +
            '<i class="fas fa-phone"></i> Call' +
            '</button>' +
            '</div></div>';
    });

    alertsContainer.innerHTML = html;
}

// Browser notification helper
function showBrowserNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            tag: 'sos-alert',
            requireInteraction: true
        });
    }
}

// Play alert sound
function playAlertSound() {
    try {
        var audioContext = new (window.AudioContext || window.webkitAudioContext)();
        var oscillator = audioContext.createOscillator();
        var gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        // Beep pattern
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// ===========================
// HOURLY CHECK-IN FUNCTIONS
// ===========================

// Activity reports data
let activityReportsData = [];

// Load activity reports
async function loadActivityReports() {
    try {
        let endpoint = '/activity-reports';
        if (currentUser.role === 'caretaker' && selectedElderlyId) {
            endpoint = `/activity-reports?elderlyId=${selectedElderlyId}`;
        }

        activityReportsData = await apiCall(endpoint);
        displayActivityReports();
    } catch (error) {
        console.error('Error loading activity reports:', error);
    }
}

// Submit activity report (elderly)
async function submitActivityReport() {
    const activity = document.getElementById('activityReportInput')?.value || '';
    const notes = document.getElementById('activityNotesInput')?.value || '';

    if (!activity) {
        alert('Please select an activity');
        return;
    }

    try {
        showSyncIndicator();
        await apiCall('/activity-reports', 'POST', { activity, notes });

        // Clear inputs
        document.getElementById('activityReportInput').value = 'Watching TV';
        document.getElementById('activityNotesInput').value = '';

        alert('Activity reported! ✓');

        // Reload activity reports
        await loadActivityReports();

    } catch (error) {
        alert(error.message);
    } finally {
        hideSyncIndicator();
    }
}

// Display activity reports
function displayActivityReports() {
    const container = document.getElementById('activityReportsListContainer');
    const containerElderly = document.getElementById('activityReportsListContainerElderly');

    if (!container && !containerElderly) return;

    if (activityReportsData.length === 0) {
        const emptyMsg = '<p style="text-align: center; color: #64748b;">No activity reports yet</p>';
        if (container) container.innerHTML = emptyMsg;
        if (containerElderly) containerElderly.innerHTML = emptyMsg;
        return;
    }

    let html = '';
    activityReportsData.forEach(report => {
        const statusClass = report.status === 'OK' ? 'badge-success' : 'badge-warning';

        html += `
            <div class="health-entry-item">
                <div class="health-entry-header">
                    <div class="health-entry-type" style="background-color: #8b5cf6; color: white;">
                        Activity
                    </div>
                    <div class="health-entry-mood"><span class="badge ${statusClass}">${report.status}</span></div>
                    <div class="health-entry-date">${new Date(report.created_at).toLocaleDateString()}</div>
                </div>
                <div class="health-entry-title">${report.activity}</div>
                ${report.notes ? `<div class="health-entry-description">${report.notes}</div>` : ''}
                <div class="health-entry-time">Reported: ${new Date(report.created_at).toLocaleString()}</div>
            </div>
        `;
    });

    if (container) container.innerHTML = html;
    if (containerElderly) containerElderly.innerHTML = html;
}

// Toggle hourly check-in (caretaker)
async function toggleHourlyCheckin() {
    const toggle = document.getElementById('hourlyCheckinToggle');
    const enabled = toggle.checked;

    if (!selectedElderlyId) {
        alert('Please select an elderly person first');
        toggle.checked = !enabled;
        return;
    }

    try {
        showSyncIndicator();
        await apiCall('/hourly-checkin', 'POST', { elderlyId: selectedElderlyId, enabled });

        const statusEl = document.getElementById('hourlyCheckinStatus');
        statusEl.textContent = enabled ? 'Currently: Enabled' : 'Currently: Disabled';

        alert(enabled ? 'Hourly check-in enabled!' : 'Hourly check-in disabled');

    } catch (error) {
        alert(error.message);
        toggle.checked = !enabled;
    } finally {
        hideSyncIndicator();
    }
}

// Load hourly check-in settings
async function loadHourlyCheckinSettings() {
    if (!selectedElderlyId || currentUser.role !== 'caretaker') return;

    try {
        const settings = await apiCall(`/hourly-checkin?elderlyId=${selectedElderlyId}`);

        const toggle = document.getElementById('hourlyCheckinToggle');
        const statusEl = document.getElementById('hourlyCheckinStatus');

        if (toggle && settings) {
            toggle.checked = settings.enabled === 1;
            statusEl.textContent = settings.enabled ? 'Currently: Enabled' : 'Currently: Disabled';
        }
    } catch (error) {
        console.error('Error loading hourly check-in settings:', error);
    }
}

// ===========================
// LOCATION TRACKING FUNCTIONS
// ===========================

// Toggle location sharing (elderly user)
function toggleLocationSharing() {
    const toggle = document.getElementById('locationSharingToggle');
    const enabled = toggle.checked;

    if (enabled) {
        requestLocationPermission();
    } else {
        stopLocationTracking();
        const statusEl = document.getElementById('locationSharingStatus');
        statusEl.textContent = 'Currently: Disabled';
    }
}

// Refresh location on caretaker dashboard
async function refreshLocation() {
    if (!selectedElderlyId) {
        alert('Please select an elderly person first');
        return;
    }

    try {
        showSyncIndicator();

        // Load location from server
        const location = await loadElderlyLocation(selectedElderlyId);

        if (location) {
            // Update the display
            updateLocationDisplay();

            // Update map
            const container = document.getElementById('locationMapContainer');
            if (container) {
                const lat = location.latitude || location.lat;
                const lng = location.longitude || location.lng;
                const accuracy = location.accuracy || 50;

                initLocationMap('locationMapContainer', lat, lng, accuracy);
            }

            // Update status
            const statusEl = document.getElementById('locationStatus');
            if (statusEl) {
                const time = new Date(location.updated_at).toLocaleTimeString();
                statusEl.innerHTML = '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Location updated: ' + time + '</span>';
            }
        } else {
            alert('No location data available. The elderly person needs to enable location sharing.');
            const statusEl = document.getElementById('locationStatus');
            if (statusEl) {
                statusEl.innerHTML = '<span class="badge badge-warning">No location data</span>';
            }
        }
    } catch (error) {
        console.error('Error refreshing location:', error);
        alert('Failed to load location. Please try again.');
    } finally {
        hideSyncIndicator();
    }
}

// Update elderly location display on their own dashboard
function updateElderlyLocationDisplay() {
    const loc = getLocation();
    const displayEl = document.getElementById('elderlyLocationDisplay');

    if (!displayEl) return;

    if (loc) {
        displayEl.innerHTML = `
            <div style="text-align:center; padding:20px;">
                <i class="fas fa-map-marker-alt" style="font-size:2rem; color:#10b981;"></i>
                <p style="margin-top:10px;"><strong>Your current location</strong></p>
                <p>Lat: ${loc.lat.toFixed(6)}</p>
                <p>Lng: ${loc.lng.toFixed(6)}</p>
                <p style="color:#64748b; font-size:0.9rem;">Last updated: ${new Date(loc.time).toLocaleTimeString()}</p>
                <a href="https://maps.google.com/?q=${loc.lat},${loc.lng}" target="_blank" class="btn btn-outline" style="margin-top:10px;">
                    <i class="fas fa-map"></i> View on Map
                </a>
            </div>
        `;
    }
}

