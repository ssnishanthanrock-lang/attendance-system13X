import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Download, Pencil, Trash2, Radio } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

export default function AttendanceDetails() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState({ present: 0, absent: 0, leave: 0, halfDay: 0, total: 0 });
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [user, setUser] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchAttendanceForDate(selectedDate, false); // Initial load with loading spinner

    const today = new Date().toISOString().split('T')[0];
    let refreshInterval;
    
    if (selectedDate === today) {
      // Silent refresh from backend every 5 seconds to keep base values accurate (no page reload)
      refreshInterval = setInterval(() => {
        fetchAttendanceForDate(selectedDate, true); // Silent update (no loading spinner)
      }, 5000);
    }

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [selectedDate]);

  // Separate effect for live counter - runs every second
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    let liveCounterInterval;
    
    if (selectedDate === today && lastFetchTime) {
      liveCounterInterval = setInterval(() => {
        // Increment earnings from backend's base value by elapsed seconds
        const secondsSinceLastFetch = Math.floor((Date.now() - lastFetchTime) / 1000);
        
        setAttendance(prevAttendance => {
          let newTotal = 0;
          const updatedAttendance = prevAttendance.map(record => {
            if (record.check_in && !record.check_out && record.salary_per_minute) {
              // Get the base earnings from backend (stored when fetched)
              const baseEarnings = record.baseEarnings !== undefined ? record.baseEarnings : record.earnings;
              
              // Calculate additional earnings since last fetch
              const perMinuteRate = record.salary_per_minute || 0;
              const perSecondRate = perMinuteRate / 60;
              const additionalEarnings = secondsSinceLastFetch * perSecondRate;
              
              // New earnings = base + increment
              const newEarnings = baseEarnings + additionalEarnings;
              newTotal += newEarnings;
              
              return { ...record, earnings: newEarnings, baseEarnings: baseEarnings };
            } else {
              // For completed records, use existing earnings
              newTotal += record.earnings || 0;
              return record;
            }
          });
          
          setTotalEarnings(newTotal);
          return updatedAttendance;
        });
      }, 1000); // Update every second - creates visible live running effect
    }

    return () => {
      if (liveCounterInterval) clearInterval(liveCounterInterval);
    };
  }, [selectedDate, lastFetchTime]);

  const fetchAttendanceForDate = async (date, silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const response = await api.get(`/attendance/date/${date}`);
      // Store base earnings for live increment calculation
      const attendanceWithBase = (response.data.attendance || []).map(record => ({
        ...record,
        baseEarnings: record.earnings // Store initial earnings from backend
      }));
      setAttendance(attendanceWithBase);
      setTotalEarnings(response.data.total_earnings || 0);
      setLastFetchTime(Date.now()); // Track when we fetched from backend
      
      // Calculate stats
      const present = response.data.attendance.filter(a => a.status === 'present').length;
      const leave = response.data.attendance.filter(a => a.status === 'leave' || a.status === 'allowed_leave').length;
      const halfDay = response.data.attendance.filter(a => a.status === 'half_day' || a.status === 'allowed_half_day').length;
      const absent = response.data.attendance.filter(a => a.status === 'absent').length;
      
      setStats({
        present,
        absent,
        leave,
        halfDay,
        total: response.data.attendance.length
      });
    } catch (error) {
      if (!silent) {
        toast.error('Failed to fetch attendance details');
      }
      console.error(error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'N/A';
    try {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const diff = (end - start) / (1000 * 60 * 60); // hours
      return diff.toFixed(2);
    } catch {
      return 'N/A';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return '-';
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'present': 'bg-green-100 text-green-700',
      'absent': 'bg-red-100 text-red-700',
      'leave': 'bg-yellow-100 text-yellow-700',
      'allowed_leave': 'bg-blue-100 text-blue-700',
      'half_day': 'bg-orange-100 text-orange-700',
      'allowed_half_day': 'bg-purple-100 text-purple-700'
    };
    
    const labels = {
      'present': 'Present',
      'absent': 'Absent',
      'leave': 'Leave',
      'allowed_leave': 'Allowed Leave',
      'half_day': 'Half Day',
      'allowed_half_day': 'Allowed Half Day'
    };

    return (
      <span className={`inline-block text-xs px-2 py-1 rounded-full ${badges[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) return;
    
    try {
      await api.delete(`/attendance/${recordId}`);
      toast.success('Attendance record deleted');
      fetchAttendanceForDate(selectedDate);
    } catch (error) {
      toast.error('Failed to delete attendance record');
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setEditDialogOpen(true);
  };

  const handleUpdateAttendance = async () => {
    try {
      await api.put(`/attendance/${editingRecord.id}`, {
        status: editingRecord.status,
        check_in: editingRecord.check_in,
        check_out: editingRecord.check_out
      });
      toast.success('Attendance updated');
      setEditDialogOpen(false);
      fetchAttendanceForDate(selectedDate);
    } catch (error) {
      toast.error('Failed to update attendance');
    }
  };

  const exportToCSV = () => {
    const headers = ['Employee', 'Date', 'Status', 'Check In', 'Check Out', 'Hours'];
    const rows = attendance.map(record => [
      record.employee_name,
      record.date,
      record.status,
      formatTime(record.check_in),
      formatTime(record.check_out),
      calculateHours(record.check_in, record.check_out)
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedDate}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                Attendance Details
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-md"
            />
            <Button
              variant="outline"
              onClick={exportToCSV}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Present</p>
              <p className="text-2xl font-bold text-green-600">{stats.present}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Absent</p>
              <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Leave</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.leave}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Half Day</p>
              <p className="text-2xl font-bold text-orange-600">{stats.halfDay}</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs leading-tight">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check In
                    </th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check Out
                    </th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Earnings
                    </th>
                    {canEdit && (
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                        No attendance records found for this date
                      </td>
                    </tr>
                  ) : (
                    attendance.sort((a, b) => a.employee_name.localeCompare(b.employee_name)).map((record) => (
                      <tr key={record.id || record.employee_id} className="hover:bg-gray-50">
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="text-xs font-medium text-gray-900">{record.employee_name}</div>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                          {formatTime(record.check_in)}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                          {formatTime(record.check_out)}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                          {calculateHours(record.check_in, record.check_out) === 'N/A' ? 'N/A' : `${calculateHours(record.check_in, record.check_out)}h`}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-xs font-semibold text-green-600">
                          <div className="flex items-center gap-2">
                            <span>Rs {record.earnings ? record.earnings.toFixed(2) : '0.00'}</span>
                            {record.check_in && !record.check_out && selectedDate === new Date().toISOString().split('T')[0] && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs animate-pulse">
                                <Radio className="w-2 h-2" />
                                LIVE
                              </span>
                            )}
                          </div>
                        </td>
                        {canEdit && (
                          <td className="px-2 py-1 whitespace-nowrap text-xs">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(record)}
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(record.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Total Earnings Footer */}
                <tfoot className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-4 border-green-500">
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} className="px-2 py-1 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-lg font-bold text-gray-700">Total Earnings:</span>
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2 rounded-lg shadow-lg">
                          <span className="text-2xl font-bold">Rs {totalEarnings.toFixed(2)}</span>
                          {selectedDate === new Date().toISOString().split('T')[0] && (
                            <span className="ml-2 text-xs opacity-90 animate-pulse">● LIVE</span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editingRecord.status}
                  onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="leave">Leave</option>
                  <option value="allowed_leave">Allowed Leave</option>
                  <option value="half_day">Half Day</option>
                  <option value="allowed_half_day">Allowed Half Day</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
                <input
                  type="datetime-local"
                  value={editingRecord.check_in ? new Date(editingRecord.check_in).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, check_in: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
                <input
                  type="datetime-local"
                  value={editingRecord.check_out ? new Date(editingRecord.check_out).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, check_out: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateAttendance}>Update</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
