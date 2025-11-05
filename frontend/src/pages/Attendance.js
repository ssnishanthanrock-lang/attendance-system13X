import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Calendar, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';

export default function Attendance() {
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
    check_out: '17:00',
    status: 'present',
    leave_type: ''
  });

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
    
    if (manualAttendance.status === 'present' && (!manualAttendance.check_in || !manualAttendance.check_out)) {
      toast.error('Please enter check-in and check-out times');
      return;
    }
    
    if (manualAttendance.status === 'leave' && !manualAttendance.leave_type) {
      toast.error('Please select leave type');
      return;
    }
    
    try {
      const response = await api.post('/attendance', manualAttendance);
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

  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'N/A';
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

  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'N/A';
    const diff = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    return `${hours}h ${minutes}m`;
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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }} data-testid="attendance-title">
            Attendance Records
          </h1>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date *</label>
                    <Input
                      type="date"
                      value={manualAttendance.date}
                      onChange={(e) => setManualAttendance({...manualAttendance, date: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status *</label>
                    <Select value={manualAttendance.status} onValueChange={(value) => setManualAttendance({...manualAttendance, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="leave">Leave</SelectItem>
                        <SelectItem value="half_day">Half Day</SelectItem>
                      </SelectContent>
                    </Select>
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
                          <label className="text-sm font-medium">Check Out Time *</label>
                          <Input
                            type="time"
                            value={manualAttendance.check_out}
                            onChange={(e) => setManualAttendance({...manualAttendance, check_out: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                    </>
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
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Filter Attendance</CardTitle>
          </CardHeader>
          <CardContent>
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

        {/* Attendance Records */}
        <div className="space-y-4" data-testid="attendance-list">
          {attendance.map((record) => (
            <Card key={record.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between sm:justify-start gap-4">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                          {record.employee_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{record.date}</span>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          record.status === 'present'
                            ? 'bg-green-100 text-green-700'
                            : record.status === 'absent'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-gray-600">Check In</span>
                        </div>
                        <p className="font-semibold text-green-700">{formatTime(record.check_in)}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-orange-600" />
                          <span className="text-xs text-gray-600">Check Out</span>
                        </div>
                        <p className="font-semibold text-orange-700">{formatTime(record.check_out)}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-xs text-gray-600">Total Hours</span>
                        </div>
                        <p className="font-semibold text-blue-700">{calculateHours(record.check_in, record.check_out)}</p>
                      </div>
                    </div>

                    {record.notes && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Notes:</span> {record.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {attendance.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No attendance records found</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
