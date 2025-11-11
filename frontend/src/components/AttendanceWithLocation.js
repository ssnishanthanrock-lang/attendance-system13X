import React, { useState, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import { MapPin, Camera, CheckCircle, Loader } from 'lucide-react';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const AttendanceWithLocation = () => {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [mapSnapshot, setMapSnapshot] = useState(null);
  const mapRef = useRef(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  const getCurrentLocation = () => {
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        setLocation(coords);
        
        // Fetch address using Nominatim (OpenStreetMap reverse geocoding)
        try {
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`
          );
          setAddress(response.data.display_name || 'Address not found');
        } catch (err) {
          console.error('Error fetching address:', err);
          setAddress('Address unavailable');
        }
        
        setLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setError('Unable to retrieve your location. Please enable location access.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const captureMapSnapshot = async () => {
    if (!mapRef.current) return null;

    try {
      // Wait a bit for map to fully render
      await new Promise(resolve => setTimeout(resolve, 500));

      const mapElement = mapRef.current;
      const canvas = await html2canvas(mapElement, {
        useCORS: true,
        allowTaint: true,
        scale: 0.5 // Lower quality to reduce size
      });

      return canvas.toDataURL('image/jpeg', 0.5);
    } catch (err) {
      console.error('Error capturing map:', err);
      return null;
    }
  };

  const markAttendance = async () => {
    if (!location) {
      setError('Please capture your location first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Capture map snapshot
      const snapshot = await captureMapSnapshot();
      setMapSnapshot(snapshot);

      // Mark attendance with location
      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];

      await axios.post(
        `${backendUrl}/api/attendance/mark-with-location`,
        {
          date: today,
          status: 'present',
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          address: address,
          map_snapshot: snapshot
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setLocation(null);
        setAddress('');
        setMapSnapshot(null);
      }, 3000);
    } catch (err) {
      console.error('Error marking attendance:', err);
      setError(err.response?.data?.detail || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-blue-600" />
          Mark Attendance with Location
        </h3>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          Attendance marked successfully!
        </div>
      )}

      {!location ? (
        <div className="text-center">
          <p className="text-gray-600 mb-4">Capture your current location to mark attendance</p>
          <button
            onClick={getCurrentLocation}
            disabled={loading}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 mr-2 animate-spin" />
                Getting Location...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5 mr-2" />
                Capture Location
              </>
            )}
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Your Location:</p>
            <p className="text-xs text-gray-500">
              Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Address: {address || 'Loading...'}
            </p>
            <p className={`text-xs mt-1 ${location.accuracy > 100 ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
              Accuracy: ±{location.accuracy.toFixed(0)}m
              {location.accuracy > 100 && ' (Low accuracy - Please enable GPS/WiFi for better results)'}
            </p>
          </div>

          {/* Map Preview */}
          <div ref={mapRef} className="mb-4 rounded-lg overflow-hidden border border-gray-300" style={{ height: '250px' }}>
            <MapContainer
              center={[location.latitude, location.longitude]}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker position={[location.latitude, location.longitude]} />
            </MapContainer>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => {
                setLocation(null);
                setAddress('');
                setMapSnapshot(null);
                setError('');
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={markAttendance}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Mark Attendance
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>Your attendance will be marked with current date, time, and location</p>
      </div>
    </div>
  );
};

export default AttendanceWithLocation;
