# SOS Alert Feature Implementation Plan

## Task: Add SOS Alert Receiving Feature in Caretaker Dashboard

### Feature 1: SOS Button Alert (Elderly → Caretaker)
- [ ] 1.1 Add alerts section in caretaker dashboard to show active SOS/emergency alerts
- [ ] 1.2 Add real-time polling for emergencies (every 5 seconds)
- [ ] 1.3 Add visual notification (red badge/animation) when new SOS arrives
- [ ] 1.4 Add browser push notification for SOS alerts
- [ ] 1.5 Add sound alert for SOS notifications

### Feature 2: Meal/Medicine Missed Notification
- [ ] 2.1 Add database function to get pending meals (not consumed, past scheduled time)
- [ ] 2.2 Add database function to get pending medicines (not taken, past scheduled time)
- [ ] 2.3 Add server endpoint to fetch pending meals/medicines for caretaker
- [ ] 2.4 Display missed meal/medicine alerts in caretaker dashboard
- [ ] 2.5 Send notification when meal/medicine is missed

### Files to Modify:
1. database.js - Add new functions for pending meals/medicines
2. server.js - Add new API endpoints
3. index.html - Add alerts section in caretaker dashboard
4. script.js - Add notification logic and polling

### Testing:
- Start server and test the full flow
- Verify SOS button triggers notification
- Verify missed meal/medicine triggers notification

