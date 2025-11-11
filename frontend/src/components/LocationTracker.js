import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapPin, Radio, Clock, Play, Square } from 'lucide-react';

const LocationTracker = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [locationCount, setLocationCount] = useState(0);
  const [error, setError] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const locationIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    // Check if there's an active session on component mount
    checkActiveSession();
    
    return () => {
      // Cleanup intervals on unmount
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const checkActiveSession = async () => {
    // Check localStorage for active session
    const savedSession = localStorage.getItem('activeLocationSession');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      setSessionId(session.sessionId);
      startTimeRef.current = new Date(session.startTime);
      setIsTracking(true);
      startLocationUpdates(session.sessionId);
      startTimer();
    }
  };

  const requestLocationPermission = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setPermissionDenied(true);
            reject(new Error('Location permission denied. Please enable location access in your browser settings.'));
          } else {
            reject(new Error('Unable to retrieve your location'));
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const startTracking = async () => {
    try {
      setError('');
      
      // Request location permission first
      await requestLocationPermission();

      // Start tracking session
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${backendUrl}/api/location/tracking/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newSessionId = response.data.session_id;
      const startTime = response.data.start_time;

      setSessionId(newSessionId);
      setIsTracking(true);
      startTimeRef.current = new Date(startTime);
      setLocationCount(0);

      // Save to localStorage
      localStorage.setItem('activeLocationSession', JSON.stringify({
        sessionId: newSessionId,
        startTime: startTime
      }));

      // Send first location immediately
      captureAndSendLocation(newSessionId);

      // Start periodic location updates (every 5 minutes)
      startLocationUpdates(newSessionId);
      
      // Start timer display
      startTimer();

    } catch (err) {
      console.error('Error starting tracking:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to start tracking');
    }
  };

  const stopTracking = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${backendUrl}/api/location/tracking/stop`,
        { session_id: sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Clean up
      setIsTracking(false);
      setSessionId(null);
      setElapsedTime(0);
      setLocationCount(0);
      startTimeRef.current = null;

      // Clear intervals
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // Clear localStorage
      localStorage.removeItem('activeLocationSession');

      setError('');
    } catch (err) {
      console.error('Error stopping tracking:', err);
      setError(err.response?.data?.detail || 'Failed to stop tracking');
    }
  };

  const captureAndSendLocation = (currentSessionId) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const token = localStorage.getItem('token');
          await axios.post(
            `${backendUrl}/api/location/tracking/update`,
            {
              session_id: currentSessionId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          setLocationCount(prev => prev + 1);
        } catch (err) {
          console.error('Error sending location:', err);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const startLocationUpdates = (currentSessionId) => {
    // Update location every 10 seconds for TESTING (change to 300000 ms for 5 minutes in production)
    locationIntervalRef.current = setInterval(() => {
      captureAndSendLocation(currentSessionId);
    }, 10000); // 10 seconds for testing
  };

  const startTimer = () => {
    timerIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const now = new Date();
        const diff = now - startTimeRef.current;
        setElapsedTime(Math.floor(diff / 1000)); // in seconds
      }
    }, 1000);
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-blue-600" />
          Location Tracking
        </h3>
        {isTracking && (
          <span className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium animate-pulse">
            <Radio className="w-4 h-4 mr-1" />
            LIVE
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {permissionDenied && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 text-sm">
          <p className="font-medium mb-1">Location Permission Required</p>
          <p>Please enable location access in your browser settings and refresh the page.</p>
        </div>
      )}

      {!isTracking ? (
        <div className="text-center">
          <p className="text-gray-600 mb-4">Start tracking your location to record your movements</p>
          <button
            onClick={startTracking}
            disabled={permissionDenied}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Tracking
          </button>
        </div>
      ) : (
        <div>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1 flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Elapsed Time
                </p>
                <p className="text-2xl font-bold text-gray-800">{formatTime(elapsedTime)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1 flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  Location Updates
                </p>
                <p className="text-2xl font-bold text-gray-800">{locationCount}</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4 text-center">
            Location is updated every 10 seconds (testing mode)
          </p>

          <button
            onClick={stopTracking}
            className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:from-red-700 hover:to-rose-700 transition-all"
          >
            <Square className="w-5 h-5 mr-2" />
            Stop Tracking
          </button>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>Your location data is only visible to administrators</p>
      </div>
    </div>
  );
};

export default LocationTracker;
