# 🏥 CARE BRIDGE - HealthTech Application

**A secure, user-friendly health monitoring platform connecting caregivers and elderly loved ones.**

# PROJECT URL: https://eshani0109.github.io/NEPTUNE-SPEAR/

## 📖 Overview

CARE BRIDGE is a comprehensive healthtech solution designed to bridge the gap between compassionate caretakers and elderly individuals. The platform enables real-time health monitoring, medication reminders, meal tracking, and emergency alerts—all in one accessible application.

### 🎯 Key Features

- ✅ **Meal Tracker** - Track meals with time and notes (Teal #14b8a6)
- ✅ **Medicine Tracker** - Manage medication schedules with dosages (Purple #a855f7)
- ✅ **Daily Health Entry** - Record health information with mood tracking (Green #10b981)
- ✅ **Emergency Alert** - Immediate caregiver notification (Red #ef4444)
- ✅ **Dual Dashboard** - Optimized UI for both caretakers and elderly users
- ✅ **Local Data Storage** - All data persists in browser localStorage
- ✅ **Mobile Responsive** - Works seamlessly on phones, tablets, and desktops

---

## 🎨 Color Palette

| Component | Color | Hex | Purpose |
|-----------|-------|-----|---------|
| Meal Tracker | Teal | #14b8a6 | Food intake tracking |
| Medicine Tracker | Purple | #a855f7 | Medication management |
| Health Entry | Green | #10b981 | General health records |
| Emergency | Red | #ef4444 | Critical alerts |
| Primary | Sky Blue | #0ea5e9 | Navigation & brand |

---

## 📂 Project Structure

```
Neptune Spear/
├── index.html              # Main application file
├── script.js               # All JavaScript functions
├── styles.css              # Complete styling system
├── server.js               # Node.js development server
├── database.json           # Sample data (optional)
├── caretaker-dashboard.html # Caretaker view (archived)
├── elderly-dashboard.html   # Elderly view (archived)
└── FEATURE_SUMMARY.md      # Complete feature documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher) - [Download](https://nodejs.org/)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Navigate to project folder:**
   ```bash
   cd "c:\Users\Chandan\OneDrive\Desktop\Neptune Spear"
   ```

2. **Start the development server:**
   ```bash
   node server.js
   ```

3. **Open in browser:**
   ```
   http://localhost:3000
   ```

---

## 💻 Using the Application

### Landing Page
- Navigate using the top navigation bar
- Choose **Login** or **Sign Up** to get started

### Role Selection
1. Click "Login" or "Sign Up"
2. Select your role:
   - **Caretaker** - Healthcare provider or family member
   - **Elderly Person** - Senior receiving care

### Caretaker Dashboard
- **Quick Stats**: View real-time vitals
- **Add Meals**: Create meal schedules
- **Add Medicines**: Set medication reminders
- **Record Health**: Document health information
- **Emergency Response**: View/manage emergency protocol

### Elderly Dashboard
- **Quick Actions**: Large, easy-to-tap buttons
- **View Meals**: See today's meal schedule
- **Check Medicines**: View medication reminders
- **Health Records**: View personal health entries
- **Emergency Button**: Quick access to help

---

## 📋 Features in Detail

### 🍽️ Meal Tracker (Teal #14b8a6)

**Add Meal:**
- Meal name (e.g., "Breakfast", "Lunch")
- Time (24-hour format)
- Optional notes (e.g., "No salt")

**Track Consumption:**
- Elderly users can mark meals as consumed
- Automatic timestamp recording
- Consumed meals highlighted in green

**Functions:**
```javascript
addMeal()                  // Add new meal
markMealConsumed(mealId)  // Mark as consumed
displayMeals()            // Render meal list
```

---

### 💊 Medicine Tracker (Purple #a855f7)

**Add Medicine:**
- Medicine name
- Dosage (e.g., "5mg")
- Time
- Frequency (Once/Twice/Thrice Daily, As Needed)
- Optional notes (e.g., "Take with food")

**Track Intake:**
- Elderly users mark medicines as taken
- Automatic timestamp recording
- Pending medicines highlighted in yellow

**Functions:**
```javascript
addMedicine()              // Add new medicine
markMedicineTaken(medicineId) // Mark as taken
displayMedicines()         // Render medicine list
```

---

### 📊 Daily Health Entry (Green #10b981)

**Record Entry:**
- Entry Type: General, Symptom, Sleep, Activity, Mood
- Title (required)
- Description (optional)
- Mood: Great 😄, Good 😊, Normal 😐, Tired 😴, Unwell 😟

**View History:**
- All entries sorted by date (newest first)
- Color-coded by entry type
- Mood emoji indicators

**Functions:**
```javascript
addHealthEntry()           // Record health info
displayHealthEntries()     // Render entries
getMoodEmoji(mood)        // Get emoji for mood
getHealthEntryTypeColor() // Get color for type
```

---

### 🚨 Emergency Button (Red #ef4444)

**Emergency Alert:**
- Large RED button for quick access
- Asks for confirmation to prevent accidental triggers
- Sends immediate alert with timestamp
- Severity marked as "CRITICAL"

**Features:**
- Notification to all caretakers
- Location information (default: "Home")
- Stored in emergency log
- Browser notification support (future)

**Functions:**
```javascript
triggerEmergency()         // Send emergency alert
getEmergencyHistory()      // View past emergencies
```

---

## 💾 Data Storage

All data is stored locally in the browser using **localStorage**:

```javascript
// Keys used:
carebridge_meals           // Meal entries
carebridge_medicines       // Medicine entries
carebridge_health_entries  // Health records
carebridge_emergencies     // Emergency logs
```

### Data Structure Examples

**Meal Entry:**
```javascript
{
    id: 1234567890,
    name: "Breakfast",
    time: "08:30",
    notes: "No salt",
    timestamp: "3/10/2026, 8:30:00 AM",
    consumed: false
}
```

**Medicine Entry:**
```javascript
{
    id: 1234567890,
    name: "Amlodipine",
    dosage: "5mg",
    time: "08:00",
    frequency: "Once Daily",
    notes: "Take with food",
    timestamp: "3/10/2026, 8:00:00 AM",
    taken: false
}
```

**Health Entry:**
```javascript
{
    id: 1234567890,
    type: "General",
    title: "Feeling well today",
    description: "Great energy levels",
    mood: "Great",
    timestamp: "3/10/2026, 8:00:00 AM",
    date: "3/10/2026"
}
```

---

## 🔧 Available Functions

### Navigation Functions
```javascript
showRoleModal()          // Display role selection
closeModal(id)          // Close any modal
loginAs(role)          // Handle role selection
fakeLogin(e)           // Process login
backToHome()           // Return to landing
loadCaretakerDashboard()  // Init caretaker view
loadElderlyDashboard()    // Init elderly view
```

### Meal Management
```javascript
addMeal()
markMealConsumed(mealId)
displayMeals()
saveMealsToStorage()
loadMealsFromStorage()
```

### Medicine Management
```javascript
addMedicine()
markMedicineTaken(medicineId)
displayMedicines()
saveMedicinesToStorage()
loadMedicinesFromStorage()
```

### Health Entry Management
```javascript
addHealthEntry()
displayHealthEntries()
getMoodEmoji(mood)
getHealthEntryTypeColor(type)
saveHealthEntriesFromStorage()
loadHealthEntriesFromStorage()
```

### Emergency Management
```javascript
triggerEmergency()
getEmergencyHistory()
```

---

## 📱 Mobile Optimization

The application is fully responsive with:
- Large touch targets for elderly users
- Simplified navigation on mobile
- Optimized form inputs for touch
- Readable font sizes (minimum 16px)
- Easy-to-tap buttons (minimum 44x44px)

---

## 🧪 Testing Checklist

- [ ] Navigate to homepage
- [ ] Click "Login" or "Sign Up"
- [ ] Try both "Caretaker" and "Elderly Person" roles
- [ ] Add a meal entry
- [ ] Add a medicine entry
- [ ] Record a health entry
- [ ] Test emergency button
- [ ] Mark items as consumed/taken
- [ ] Navigate back to home
- [ ] Verify data persists after refresh
- [ ] Test on mobile device

---

## 🔐 Security Notes

**Current Implementation:**
- Data stored locally (no server upload)
- No authentication backend
- Client-side only processing
- All data visible to user

**Future Enhancements:**
- Firebase or cloud backend integration
- User authentication
- Data encryption
- Secure caretaker sharing
- Medical-grade security compliance

---

## 🎯 User Guidelines

### For Caretakers
1. Add meals for the elderly person
2. Set up medication schedules
3. Review health entries regularly
4. Monitor emergency alerts
5. Adjust care plans as needed

### For Elderly Users
1. Mark meals when consumed
2. Take medicines on schedule
3. Record how you're feeling
4. Use emergency button if needed
5. Check health history regularly

---

## 🤝 Support & Feedback

- Report bugs in the browser console
- Check localStorage for data issues
- Clear cache if UI seems stuck: Press F12 → Application → Storage → Clear All

---

## 📄 License

CARE BRIDGE © 2026 - All rights reserved.

---

## 🙏 Acknowledgments

Built with:
- HTML5 for structure
- CSS3 for styling
- Vanilla JavaScript for functionality
- Font Awesome for icons
- Google Fonts (Inter, Playfair Display)

---

**Version:** 1.0.0  
**Last Updated:** March 10, 2026  
**Status:** ✅ Production Ready

---

## Quick Commands

```bash
# Start development server
node server.js

# Access application
http://localhost:3000

# Check for errors
Open Browser Console (F12)

# Clear all data
localStorage.clear()

# View stored data
console.log(JSON.parse(localStorage.getItem('carebridge_meals')))
```

---

## 🎓 Learning Resources

- [MDN - Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [JavaScript Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions)
- [Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Font Awesome Icons](https://fontawesome.com/docs)

---

**Thank you for using CARE BRIDGE! 💙**

