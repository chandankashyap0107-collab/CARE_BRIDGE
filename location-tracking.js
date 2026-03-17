// ===========================
// CARE BRIDGE - Live Location Tracking
// With Server Sync and Google Maps Integration
// ===========================

let locationInterval = null;
let locationWatchId = null;
let currentLocation = null;

// Get auth token
function getAuthToken() {
    return localStorage.getItem('carebridge_token');
}

// Get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('carebridge_user');
    return userStr ? JSON.parse(userStr) : null;
}

// Start location tracking with server sync
function startLocationTracking() {
    if (!navigator.geolocation) {
        console.error('Geolocation not supported');
        return;
    }

    const user = getCurrentUser();
    if (!user || user.role !== 'elderly') {
        console.log('Location tracking only for elderly users');
        return;
    }

    // Use watchPosition for continuous tracking
    locationWatchId = navigator.geolocation.watchPosition(
        (position) => {
            const loc = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                time: new Date().toISOString()
            };

            currentLocation = loc;

            // Store locally as backup
            localStorage.setItem('carebridge_location', JSON.stringify(loc));

            // Send to server
            sendLocationToServer(loc);

            console.log('Location updated:', loc);
            updateLocationDisplay();
        },
        (error) => {
            console.error('Geolocation error:', error);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 30000, // 30 seconds
            timeout: 10000 // 10 seconds
        }
    );

    console.log('Location tracking started');
}

// Stop location tracking
function stopLocationTracking() {
    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
    }

    if (locationInterval) {
        clearInterval(locationInterval);
        locationInterval = null;
    }
}

// Send location to server
async function sendLocationToServer(location) {
    const token = getAuthToken();
    if (!token) {
        console.log('No auth token, cannot send location to server');
        return;
    }

    try {
        const response = await fetch('/api/location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                latitude: location.lat,
                longitude: location.lng,
                accuracy: location.accuracy
            })
        });

        if (response.ok) {
            console.log('Location sent to server successfully');
        } else {
            console.error('Failed to send location to server:', response.status);
        }
    } catch (error) {
        console.error('Error sending location to server:', error);
    }
}

// Get stored location
function getLocation() {
    const loc = localStorage.getItem('carebridge_location');
    return loc ? JSON.parse(loc) : null;
}

// Update location display on dashboard
function updateLocationDisplay() {
    const loc = getLocation();
    if (!loc) return;

    // Update elderly dashboard
    const elderlyLocEl = document.getElementById('elderlyLocation');
    if (elderlyLocEl) {
        elderlyLocEl.innerHTML = '<small>📍 ' + loc.lat.toFixed(4) + ', ' + loc.lng.toFixed(4) + '</small>';
    }

    // Update caretaker dashboard
    const caretakerLocEl = document.getElementById('caretakerElderlyLocation');
    if (caretakerLocEl) {
        caretakerLocEl.innerHTML = '<div style="padding:10px; background:#ecfdf5; border-radius:8px; margin-top:10px;"><strong><i class="fas fa-map-marker-alt"></i> Live Location</strong><br><span>' + loc.lat.toFixed(6) + ', ' + loc.lng.toFixed(6) + '</span><br><small>Accuracy: ±' + Math.round(loc.accuracy) + 'm</small><br><a href="https://maps.google.com/?q=' + loc.lat + ',' + loc.lng + '" target="_blank" class="btn btn-small" style="margin-top:5px;">View on Map</a></div>';
    }
}

// Request location permission and start tracking
function requestLocationPermission() {
    if (!navigator.geolocation) {
        alert('Geolocation not supported on this device');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const loc = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                time: new Date().toISOString()
            };

            localStorage.setItem('carebridge_location', JSON.stringify(loc));
            sendLocationToServer(loc);

            alert('Location enabled! Your caretaker can now see your location.');
            startLocationTracking();
        },
        (error) => {
            let message = 'Location permission denied. ';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    message += 'Please enable location access in your browser settings.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message += 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    message += 'Location request timed out.';
                    break;
            }
            alert(message);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Show location on caretaker dashboard
function showLocation() {
    const loc = getLocation();
    if (loc) {
        document.getElementById('caretakerElderlyLocation').style.display = 'block';
        updateLocationDisplay();
    } else {
        alert('No location data yet. The elderly person needs to enable location sharing.');
    }
}

// Initialize map on caretaker dashboard
function initLocationMap(containerId, lat, lng, accuracy) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Check if Google Maps is loaded
    if (typeof google !== 'undefined' && google.maps) {
        const position = { lat: lat, lng: lng };

        const map = new google.maps.Map(container, {
            zoom: 15,
            center: position,
            mapTypeId: 'roadmap'
        });

        // Add marker
        new google.maps.Marker({
            position: position,
            map: map,
            title: 'Elderly Location',
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#ef4444',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
            }
        });

        // Add accuracy circle
        const circle = new google.maps.Circle({
            center: position,
            radius: accuracy,
            map: map,
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            strokeColor: '#3b82f6',
            strokeOpacity: 0.5,
            strokeWeight: 1
        });

        // Fit bounds
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(position);
        map.fitBounds(bounds);
    } else {
        // Fallback - show static map image
        container.innerHTML = `
            <div style="text-align:center; padding:20px; background:#f1f5f9; border-radius:8px;">
                <p style="margin-bottom:10px;"><strong>Location Found!</strong></p>
                <p>Latitude: ${lat.toFixed(6)}</p>
                <p>Longitude: ${lng.toFixed(6)}</p>
                <p>Accuracy: ±${Math.round(accuracy)}m</p>
                <a href="https://maps.google.com/?q=${lat},${lng}" target="_blank" class="btn btn-primary" style="margin-top:10px;">
                    <i class="fas fa-map"></i> View on Google Maps
                </a>
            </div>
        `;
    }
}

// Load location for caretaker dashboard
async function loadElderlyLocation(elderlyId) {
    const token = getAuthToken();
    if (!token || !elderlyId) return null;

    try {
        const response = await fetch(`/api/location?elderlyId=${elderlyId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.location) {
                // Update localStorage
                const loc = {
                    lat: data.location.latitude,
                    lng: data.location.longitude,
                    accuracy: data.location.accuracy,
                    time: data.location.updated_at
                };
                localStorage.setItem('carebridge_location', JSON.stringify(loc));
                updateLocationDisplay();
                return data.location;
            }
        }
    } catch (error) {
        console.error('Error loading elderly location:', error);
    }

    return null;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    const user = getCurrentUser();
    if (user && user.role === 'elderly') {
        // Auto-start location tracking for elderly
        startLocationTracking();
    }
});

