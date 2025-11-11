import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Clock, Calendar, User, Filter, Download, Eye } from 'lucide-react';
import Layout from '../components/Layout';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const LocationReports = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeReport, setEmployeeReport] = useState(null);
  const [allReports, setAllReports] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'employee'
  const [selectedSession, setSelectedSession] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchEmployees();
    fetchAllReports();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${backendUrl}/api/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const response = await axios.get(`${backendUrl}/api/location/reports/all`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      console.log('All Reports Response:', response.data);
      console.log('Employees array:', response.data.employees);
      setAllReports(response.data);
    } catch (error) {
      console.error('Error fetching all reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeReport = async (employeeId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const response = await axios.get(`${backendUrl}/api/location/reports/employee/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setEmployeeReport(response.data);
      setViewMode('employee');
    } catch (error) {
      console.error('Error fetching employee report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (e) => {
    const employeeId = e.target.value;
    setSelectedEmployee(employeeId);
    if (employeeId) {
      fetchEmployeeReport(employeeId);
    } else {
      setViewMode('all');
      setEmployeeReport(null);
    }
  };

  const handleFilter = () => {
    if (viewMode === 'all') {
      fetchAllReports();
    } else if (selectedEmployee) {
      fetchEmployeeReport(selectedEmployee);
    }
  };

  const viewSessionOnMap = (session) => {
    setSelectedSession(session);
    setShowMapModal(true);
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString();
  };

  const formatDuration = (start, end) => {
    if (!end) return 'Ongoing';
    const duration = new Date(end) - new Date(start);
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Location Reports</h1>
        </div>

      {/* Filters Card */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 mr-2 text-gray-600" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select
              value={selectedEmployee || ''}
              onChange={handleEmployeeSelect}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFilter}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      ) : (
        <>
          {/* All Employees View */}
          {viewMode === 'all' && allReports && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Employees with Data</p>
                      <p className="text-2xl font-bold text-blue-700">{allReports.summary.total_employees_with_data}</p>
                    </div>
                    <User className="w-10 h-10 text-blue-500 opacity-50" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Tracking Sessions</p>
                      <p className="text-2xl font-bold text-green-700">{allReports.summary.total_tracking_sessions}</p>
                    </div>
                    <MapPin className="w-10 h-10 text-green-500 opacity-50" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Attendance Records</p>
                      <p className="text-2xl font-bold text-purple-700">{allReports.summary.total_attendance_with_location}</p>
                    </div>
                    <Calendar className="w-10 h-10 text-purple-500 opacity-50" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Location Points</p>
                      <p className="text-2xl font-bold text-orange-700">{allReports.summary.total_location_points}</p>
                    </div>
                    <MapPin className="w-10 h-10 text-orange-500 opacity-50" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking Sessions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location Points</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Activity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allReports.employees && allReports.employees.length > 0 ? (
                      allReports.employees.map((empReport) => (
                        <tr key={empReport.employee.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{empReport.employee.name}</div>
                              <div className="text-sm text-gray-500">{empReport.employee.position}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{empReport.tracking_sessions_count}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{empReport.attendance_with_location_count}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{empReport.total_location_points}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {empReport.latest_tracking ? formatDate(empReport.latest_tracking.start_time) : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => {
                                setSelectedEmployee(empReport.employee.id);
                                fetchEmployeeReport(empReport.employee.id);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p>No location data found for the selected date range</p>
                          <p className="text-sm mt-1">Try adjusting the date filters or ensure employees have started tracking</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Single Employee View */}
          {viewMode === 'employee' && employeeReport && (
            <div>
              <div className="mb-6">
                <button
                  onClick={() => {
                    setViewMode('all');
                    setSelectedEmployee(null);
                    setEmployeeReport(null);
                  }}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  ← Back to All Employees
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">{employeeReport.employee.name}</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Tracking Sessions</p>
                    <p className="text-2xl font-bold text-blue-600">{employeeReport.summary.total_tracking_sessions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Attendance Records</p>
                    <p className="text-2xl font-bold text-green-600">{employeeReport.summary.total_attendance_with_location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Location Points</p>
                    <p className="text-2xl font-bold text-orange-600">{employeeReport.summary.total_location_points}</p>
                  </div>
                </div>
              </div>

              {/* Tracking Sessions */}
              <div className="bg-white rounded-lg shadow mb-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">Tracking Sessions</h3>
                </div>
                <div className="p-6">
                  {employeeReport.tracking_sessions.length > 0 ? (
                    <div className="space-y-4">
                      {employeeReport.tracking_sessions.map((session) => (
                        <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center space-x-2 mb-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium">
                                  {formatDate(session.start_time)}
                                </span>
                                {session.status === 'active' && (
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Active</span>
                                )}
                                {session.status === 'stopped' && (
                                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">Stopped</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                Duration: {formatDuration(session.start_time, session.end_time)}
                              </p>
                              <p className="text-sm text-gray-600">
                                Location Points: {session.locations ? session.locations.length : 0}
                              </p>
                            </div>
                            {session.locations && session.locations.length > 0 && (
                              <button
                                onClick={() => viewSessionOnMap(session)}
                                className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                <span>View on Map</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No tracking sessions found</p>
                  )}
                </div>
              </div>

              {/* Attendance with Location */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">Attendance with Location</h3>
                </div>
                <div className="p-6">
                  {employeeReport.attendance_with_location.length > 0 ? (
                    <div className="space-y-4">
                      {employeeReport.attendance_with_location.map((attendance) => (
                        <div key={attendance.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700">Date: {attendance.date}</p>
                              <p className="text-sm text-gray-600">Status: {attendance.status}</p>
                              <p className="text-sm text-gray-600">
                                Location: {attendance.location?.latitude.toFixed(4)}, {attendance.location?.longitude.toFixed(4)}
                              </p>
                              {attendance.location?.address && (
                                <p className="text-sm text-gray-600">Address: {attendance.location.address}</p>
                              )}
                            </div>
                            {attendance.location?.map_snapshot && (
                              <div>
                                <img
                                  src={attendance.location.map_snapshot}
                                  alt="Location Map"
                                  className="w-full h-32 object-cover rounded border border-gray-300"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No attendance records with location found</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Map Modal */}
      {showMapModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Tracking Session Route</h3>
              <button
                onClick={() => setShowMapModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600">Started: {formatDate(selectedSession.start_time)}</p>
                {selectedSession.end_time && (
                  <p className="text-sm text-gray-600">Ended: {formatDate(selectedSession.end_time)}</p>
                )}
                <p className="text-sm text-gray-600">
                  Location Points: {selectedSession.locations ? selectedSession.locations.length : 0}
                </p>
              </div>
              {selectedSession.locations && selectedSession.locations.length > 0 && (
                <div style={{ height: '500px', width: '100%' }}>
                  <MapContainer
                    center={[selectedSession.locations[0].latitude, selectedSession.locations[0].longitude]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {selectedSession.locations.map((loc, index) => (
                      <Marker key={index} position={[loc.latitude, loc.longitude]}>
                        <Popup>
                          <div>
                            <p className="font-medium">Point {index + 1}</p>
                            <p className="text-sm">{formatDate(loc.timestamp)}</p>
                            <p className="text-sm">Accuracy: {loc.accuracy}m</p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    <Polyline
                      positions={selectedSession.locations.map(loc => [loc.latitude, loc.longitude])}
                      color="blue"
                      weight={3}
                    />
                  </MapContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
};

export default LocationReports;
