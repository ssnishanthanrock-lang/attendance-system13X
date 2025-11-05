import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Calendar, Clock, CheckCircle, XCircle, Plus, Trash2, Archive, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { canEditInImpersonation, isImpersonating } from '../utils/impersonation';

export default function Attendance() {
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    employee_id: '',
    from_date: '',
    to_date: '',
  });
  const [manualAttendance, setManualAttendance] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    check_in: '09:00',
    check_out: '',
    status: 'present',
    leave_type: ''
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [editHistory, setEditHistory] = useState([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [viewingHistoryRecord, setViewingHistoryRecord] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Check if user can edit (not read-only impersonation)
  const canEdit = !isImpersonating() || canEditInImpersonation();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    if (userData?.role === 'admin' || userData?.role === 'manager') {
      fetchEmployees();
    }
    fetchAttendance();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      toast.error('Failed to fetch employees');
    }
  };

  const fetchAttendance = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);

      const response = await api.get(`/attendance?${params.toString()}`);
      setAttendance(response.data);
    } catch (error) {
      toast.error('Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setLoading(true);
    fetchAttendance();
  };

  const handleAddManual = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!manualAttendance.employee_id) {
      toast.error('Please select an employee');
      return;
    }
    
    if (manualAttendance.status === 'present' && !manualAttendance.check_in) {
      toast.error('Please enter check-in time');
      return;
    }
    
    if (manualAttendance.status === 'leave' && !manualAttendance.leave_type) {
      toast.error('Please select leave type');
      return;
    }
    
    // For allowed leave/half day, no check-in time needed
    if (['allowed_leave', 'allowed_half_day'].includes(manualAttendance.status)) {
      // Clear check-in/out times as they're not needed
      manualAttendance.check_in = '';
      manualAttendance.check_out = '';
    }
    
    try {
      await api.post('/attendance', manualAttendance);
      toast.success('Attendance added successfully');
      setDialogOpen(false);
      setManualAttendance({
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        check_in: '09:00',
        check_out: '17:00',
        status: 'present',
        leave_type: ''
      });
      fetchAttendance();
    } catch (error) {
      console.error('Attendance error:', error);
      toast.error(error.response?.data?.detail || 'Failed to add attendance');
    }
  };

  const fetchEditHistory = async (attendanceId) => {
    try {
      const response = await api.get(`/attendance/${attendanceId}/history`);
      setEditHistory(response.data);
    } catch (error) {
      setEditHistory([]);
    }
  };

  const handleViewHistory = async (record) => {
    setViewingHistoryRecord(record);
    await fetchEditHistory(record.id);
    setHistoryDialogOpen(true);
  };

  const handleEdit = async (record) => {
    setEditingAttendance({
      id: record.id,
      employee_name: record.employee_name,
      date: record.date,
      check_in: record.check_in ? formatTime(record.check_in, true) : '',
      check_out: record.check_out ? formatTime(record.check_out, true) : '',
      status: record.status,
      original_status: record.status, // Store original to detect changes
      leave_type: record.leave_type || ''
    });
    await fetchEditHistory(record.id);
    setEditDialogOpen(true);
  };

  const handleUpdateAttendance = async (e) => {
    e.preventDefault();
    
    try {
      // If status changed, update it first (this tracks history)
      if (editingAttendance.original_status !== editingAttendance.status) {
        await api.put(`/attendance/${editingAttendance.id}/status`, {
          status: editingAttendance.status
        });
      }
      
      // Update check-in/out times (if applicable and if status is present)
      if (editingAttendance.status === 'present') {
        await api.put(`/attendance/${editingAttendance.id}`, {
          check_in: editingAttendance.check_in,
          check_out: editingAttendance.check_out
        });
      }
      
      toast.success('Attendance updated successfully');
      setEditDialogOpen(false);
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update attendance');
    }
  };

  const handleDelete = async (attendanceId) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) {
      return;
    }
    
    try {
      await api.delete(`/attendance/${attendanceId}`);
      toast.success('Attendance deleted successfully');
      fetchAttendance();
    } catch (error) {
      toast.error('Failed to delete attendance');
    }
  };

  const formatTime = (isoString, forInput = false) => {
    if (!isoString) return forInput ? '' : 'N/A';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return forInput ? '' : 'N/A';
      
      if (forInput) {
        // Return HH:MM format for input fields
        return date.toTimeString().slice(0, 5);
      }
      
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return forInput ? '' : 'N/A';
    }
  };

  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'N/A';
    try {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'N/A';
      
      const diffMs = end - start;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    } catch (error) {
      return 'N/A';
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }} data-testid="attendance-title">
            Attendance Records
          </h1>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/deleted-attendance')}
                  className="text-gray-600 hover:text-gray-800"
                  title="View Deleted Attendance"
                >
                  <Archive className="w-4 h-4" />
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-gradient-to-r from-blue-600 to-indigo-600"
                      disabled={!canEdit}
                      title={!canEdit ? "Read-only access - Cannot add attendance" : ""}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Manual Attendance
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Add Manual Attendance</DialogTitle>
                      <DialogDescription>Record attendance manually for any employee</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddManual} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Employee *</label>
                        <Select value={manualAttendance.employee_id} onValueChange={(value) => setManualAttendance({...manualAttendance, employee_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <label className="text-sm font-medium col-span-3">Date *</label>
                        <div className="col-span-9">
                          <Input
                            type="date"
                            value={manualAttendance.date}
                            onChange={(e) => setManualAttendance({...manualAttendance, date: e.target.value})}
                            max={new Date().toISOString().split('T')[0]}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <label className="text-sm font-medium col-span-3">Status *</label>
                        <div className="col-span-9">
                          <Select value={manualAttendance.status} onValueChange={(value) => setManualAttendance({...manualAttendance, status: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="leave">Leave</SelectItem>
                              <SelectItem value="half_day">Half Day</SelectItem>
                              <SelectItem value="allowed_leave">Allowed Leave</SelectItem>
                              <SelectItem value="allowed_half_day">Allowed Half Day</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {manualAttendance.status === 'present' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Check In Time *</label>
                              <Input
                                type="time"
                                value={manualAttendance.check_in}
                                onChange={(e) => setManualAttendance({...manualAttendance, check_in: e.target.value})}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Check Out Time (Optional)</label>
                              <Input
                                type="time"
                                value={manualAttendance.check_out}
                                onChange={(e) => setManualAttendance({...manualAttendance, check_out: e.target.value})}
                                placeholder="Leave empty if not yet checked out"
                              />
                              <p className="text-xs text-gray-500">
                                Leave empty if the day hasn't finished. You can update later.
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                      {['allowed_leave', 'allowed_half_day'].includes(manualAttendance.status) && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>{manualAttendance.status === 'allowed_leave' ? 'Allowed Leave' : 'Allowed Half Day'}:</strong> This will count as a working day for salary calculation. No check-in/out time needed.
                          </p>
                        </div>
                      )}
                      {manualAttendance.status === 'leave' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Leave Type *</label>
                          <Select value={manualAttendance.leave_type} onValueChange={(value) => setManualAttendance({...manualAttendance, leave_type: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Leave Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sick">Sick Leave</SelectItem>
                              <SelectItem value="casual">Casual Leave</SelectItem>
                              <SelectItem value="annual">Annual Leave</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button type="submit">Add Attendance</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {isAdmin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Employee</label>
                  <Select value={filters.employee_id || "all"} onValueChange={(value) => setFilters({ ...filters, employee_id: value === "all" ? "" : value })}>
                    <SelectTrigger data-testid="employee-filter">
                      <SelectValue placeholder="All Employees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">From Date</label>
                <Input
                  data-testid="from-date-input"
                  type="date"
                  value={filters.from_date}
                  onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">To Date</label>
                <Input
                  data-testid="to-date-input"
                  type="date"
                  value={filters.to_date}
                  onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button
                  data-testid="filter-button"
                  onClick={handleFilter}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  Apply Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Records Table */}
        <Card>
          <CardHeader>
            <CardTitle>Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="attendance-list">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Check In</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Check Out</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Hours</th>
                    {isAdmin && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                        No attendance records found
                      </td>
                    </tr>
                  ) : (
                    attendance.map((record) => (
                      <tr key={record.id} className={`hover:bg-gray-50 transition-colors ${!record.check_out && record.status === 'present' ? 'bg-amber-50' : ''}`}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {record.employee_name}
                            {record.has_history && (
                              <button
                                onClick={() => handleViewHistory(record)}
                                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors cursor-pointer"
                                title="Click to view edit history"
                              >
                                <Clock className="w-3 h-3" />
                                {record.history_count}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{record.date}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block text-xs px-2 py-1 rounded-full ${
                              record.status === 'present'
                                ? 'bg-green-100 text-green-700'
                                : record.status === 'leave'
                                ? 'bg-yellow-100 text-yellow-700'
                                : record.status === 'allowed_leave'
                                ? 'bg-blue-100 text-blue-700'
                                : record.status === 'allowed_half_day'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatTime(record.check_in)}</td>
                        <td className="px-4 py-3">
                          {record.check_out ? (
                            <span className="text-sm text-gray-600">{formatTime(record.check_out)}</span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(record)}
                              disabled={!canEdit}
                              className="text-xs px-2 py-1 h-7 bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              Add Check-out
                            </Button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-blue-600">{calculateHours(record.check_in, record.check_out)}</td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(record)}
                                disabled={!canEdit}
                                title={!canEdit ? "Read-only access" : "Edit attendance"}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(record.id)}
                                disabled={!canEdit}
                                title={!canEdit ? "Read-only access" : "Delete attendance"}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
              </table>
            </div>
          </CardContent>
        </Card>

        {attendance.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No attendance records found</p>
          </div>
        )}
      </div>

      {/* Edit Attendance Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Update Attendance</DialogTitle>
            <DialogDescription>
              Update check-in/check-out times for {editingAttendance?.employee_name} on {editingAttendance?.date}
            </DialogDescription>
          </DialogHeader>
          {editingAttendance && (
            <form onSubmit={handleUpdateAttendance} className="space-y-4">
              {/* Status Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status *</label>
                <Select 
                  value={editingAttendance.status} 
                  onValueChange={(value) => setEditingAttendance({...editingAttendance, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="leave">Leave</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="allowed_leave">Allowed Leave</SelectItem>
                    <SelectItem value="allowed_half_day">Allowed Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Show check-in/out only for Present status */}
              {editingAttendance.status === 'present' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Check In Time *</label>
                    <Input
                      type="time"
                      value={editingAttendance.check_in}
                      onChange={(e) => setEditingAttendance({...editingAttendance, check_in: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Check Out Time</label>
                    <Input
                      type="time"
                      value={editingAttendance.check_out}
                      onChange={(e) => setEditingAttendance({...editingAttendance, check_out: e.target.value})}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              )}

              {['allowed_leave', 'allowed_half_day'].includes(editingAttendance.status) && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>{editingAttendance.status === 'allowed_leave' ? 'Allowed Leave' : 'Allowed Half Day'}:</strong> This will count as a working day for salary calculation.
                  </p>
                </div>
              )}
              
              {!editingAttendance.check_out && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    ⚠️ No check-out time set. You can add it later when the day finishes.
                  </p>
                </div>
              )}
              
              {/* Edit History */}
              {editHistory.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Edit History ({editHistory.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {editHistory.map((history) => (
                      <div key={history.id} className="bg-gray-50 p-2 rounded text-xs">
                        <p className="font-medium text-gray-900">{history.changes}</p>
                        <p className="text-gray-500 mt-1">
                          By {history.edited_by} • {new Date(history.edited_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  <Edit className="w-4 h-4 mr-2" />
                  Update
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View History Dialog (Read-only) */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Edit History
              </div>
            </DialogTitle>
            <DialogDescription>
              {viewingHistoryRecord && `${viewingHistoryRecord.employee_name} on ${viewingHistoryRecord.date}`}
            </DialogDescription>
          </DialogHeader>
          
          {editHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No edit history found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {editHistory.map((history, index) => (
                <div key={history.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                      {editHistory.length - index}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">{history.changes}</p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>
                          <span className="font-medium">Edited by:</span> {history.edited_by}
                        </p>
                        <p>
                          <span className="font-medium">When:</span> {new Date(history.edited_at).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
