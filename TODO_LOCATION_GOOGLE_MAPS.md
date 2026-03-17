# TODO: Google Maps API Integration for Live Location Tracking

## Task: Integrate Google Maps API with live location tracking for elderly person on caretaker dashboard

## Steps to Complete:

### Step 1: Update server.js with Location API Endpoints
- [x] Add API endpoint to save elderly location (POST /api/location)
- [x] Add API endpoint to get elderly location (GET /api/location/:elderlyId)
- [x] Add database function to save location in database.js

### Step 2: Update location-tracking.js
- [x] Modify to send location to server instead of just localStorage
- [x] Add server sync for location updates
- [x] Improve accuracy and error handling

### Step 3: Update caretaker-dashboard.html (in index.html)
- [x] Add Google Maps script inclusion
- [x] Add map container div for location display
- [x] Add location card with map

### Step 4: Update elderly-dashboard.html (in index.html)  
- [x] Add location tracking controls
- [x] Add "Enable Location" button
- [x] Add location status display

### Step 5: Update script.js
- [x] Add functions to fetch elderly location for caretaker
- [x] Add live location polling for caretaker
- [x] Integrate map display

### Step 6: Test and Verify
- [ ] Test location tracking on elderly side
- [ ] Test location display on caretaker side
- [ ] Verify map displays correctly

## Notes:
- Need Google Maps API key (will use placeholder) - Replace YOUR_API_KEY with actual key
- Use free tier/geocoding for basic functionality
- Implement polling for live updates (every 10-30 seconds)

