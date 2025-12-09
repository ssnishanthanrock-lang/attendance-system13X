import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Calendar, Clock, CheckCircle, XCircle, Plus, Trash2, Archive, Edit, Users, User, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import DeviceImportDialog from '../components/DeviceImportDialog';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { canEditInImpersonation, isImpersonating } from '../utils/impersonation';

export default function Attendance() {
  const navigate = useNavigate();
  const location = useLocation();
  const { date, employeeId, fromDate, toDate } = useParams();
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
  const [companySettings, setCompanySettings] = useState(null);
  const [viewMode, setViewMode] = useState('today'); // 'today' or 'last7days'
  const [todayAttendanceCount, setTodayAttendanceCount] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [activeEmployeesCount, setActiveEmployeesCount] = useState(0);
  const [hasDeletedAttendance, setHasDeletedAttendance] = useState(false);
  
  // Daily bulk attendance state
  const [dailyBulkOpen, setDailyBulkOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkAttendance, setBulkAttendance] = useState({});
  const [savingBulk, setSavingBulk] = useState(false);
  
  // Monthly attendance state
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const [monthlyEmployee, setMonthlyEmployee] = useState('');
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [monthlyAttendance, setMonthlyAttendance] = useState({});
  const [savingMonthly, setSavingMonthly] = useState(false);

  // Check if user can edit (not read-only impersonation)
  const canEdit = !isImpersonating() || canEditInImpersonation();

  // Read URL path parameters and trigger fetch
  useEffect(() => {
    let hasFilters = false;
    let newFilters = { employee_id: '', from_date: '', to_date: '' };
    let newViewMode = 'today';
    
    // Priority 1: Employee + Date (single or range)
    if (employeeId && date) {
      // Employee + single date: /attendance/employee/{id}/date/{date}
      newFilters = {
        employee_id: employeeId,
        from_date: date,
        to_date: date,
      };
      newViewMode = 'filtered';
      hasFilters = true;
    } else if (employeeId && fromDate && toDate) {
      // Employee + date range: /attendance/employee/{id}/from/{from}/to/{to}
      newFilters = {
        employee_id: employeeId,
        from_date: fromDate,
        to_date: toDate,
      };
      newViewMode = 'filtered';
      hasFilters = true;
    } else if (date) {
      // Single date only: /attendance/date/{date}
      newFilters = {
        employee_id: '',
        from_date: date,
        to_date: date,
      };
      newViewMode = 'filtered';
      hasFilters = true;
    } else if (fromDate && toDate) {
      // Date range only: /attendance/from/{from}/to/{to}
      newFilters = {
        employee_id: '',
        from_date: fromDate,
        to_date: toDate,
      };
      newViewMode = 'filtered';
      hasFilters = true;
    } else if (employeeId) {
      // Employee only: /attendance/employee/{id} - default to current month
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      newFilters = {
        employee_id: employeeId,
        from_date: firstDayOfMonth.toISOString().split('T')[0],
        to_date: lastDayOfMonth.toISOString().split('T')[0],
      };
      newViewMode = 'filtered';
      hasFilters = true;
    }
    
    // Set filters and viewMode
    setFilters(newFilters);
    setViewMode(newViewMode);
    
    // Trigger fetch after setting filters
    if (user) {
      setLoading(true);
      // Use timeout to ensure state is updated
      setTimeout(() => {
        fetchAttendanceWithParams(newFilters, newViewMode);
      }, 0);
    }
  }, [date, employeeId, fromDate, toDate, user]);

  // Initialize user and settings once
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    if (userData?.role === 'admin' || userData?.role === 'manager') {
      fetchEmployees();
      checkDeletedAttendance();
    }
    fetchCompanySettings();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      toast.error('Failed to fetch employees');
    }
  };

  const fetchCompanySettings = async () => {
    try {
      const response = await api.get('/company/settings');
      setCompanySettings(response.data);
    } catch (error) {
      // Silently fail - not critical
      console.error('Failed to fetch company settings:', error);
    }
  };


  const checkDeletedAttendance = async () => {
    try {
      const response = await api.get('/attendance/deleted');
      setHasDeletedAttendance(response.data && response.data.length > 0);
    } catch (error) {
      console.error('Failed to check deleted attendance:', error);
    }
  };


  const fetchAttendanceWithParams = async (filterParams, mode) => {
    try {
      const params = new URLSearchParams();
      const today = new Date().toISOString().split('T')[0];
      
      // If filters are set (from URL or manual), use them
      if (filterParams.from_date || filterParams.to_date || filterParams.employee_id) {
        if (filterParams.employee_id) params.append('employee_id', filterParams.employee_id);
        if (filterParams.from_date) params.append('from_date', filterParams.from_date);
        if (filterParams.to_date) params.append('to_date', filterParams.to_date);
      } else if (mode === 'today') {
        // No filters, today view
        params.append('from_date', today);
        params.append('to_date', today);
      } else if (mode === 'last7days') {
        // No filters, last 7 days view
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        params.append('from_date', sevenDaysAgo.toISOString().split('T')[0]);
        params.append('to_date', today);
      }

      const response = await api.get(`/attendance?${params.toString()}`);
      setAttendance(response.data);
      
      // Only auto-switch to last 7 days if no filters and in today mode with no data
      if (mode === 'today' && !filterParams.from_date && !filterParams.to_date && response.data.length === 0) {
        setViewMode('last7days');
        fetchLast7DaysSummary();
      } else if (mode === 'today' && !filterParams.from_date && !filterParams.to_date) {
        setTodayAttendanceCount(response.data.length);
        if (user?.role === 'admin' || user?.role === 'manager') {
          const empResponse = await api.get('/employees');
          setActiveEmployeesCount(empResponse.data.length);
        }
      }
    } catch (error) {
      toast.error('Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    return fetchAttendanceWithParams(filters, viewMode);
  };

  const fetchLast7DaysSummary = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const params = new URLSearchParams();
      params.append('from_date', sevenDaysAgo.toISOString().split('T')[0]);
      params.append('to_date', today);
      
      const response = await api.get(`/attendance?${params.toString()}`);
      setAttendance(response.data);
      
      // Count unique employees in last 7 days
      const uniqueEmployees = new Set(response.data.map(a => a.employee_id));
      setTodayAttendanceCount(uniqueEmployees.size);
      
      // Get total active employees
      if (user?.role === 'admin' || user?.role === 'manager') {
        const empResponse = await api.get('/employees');
        setActiveEmployeesCount(empResponse.data.length);
      }
    } catch (error) {
      console.error('Failed to fetch 7 days summary:', error);
    }
  };

  const handleFilter = () => {
    // Validation: If from_date is set, to_date must also be set
    if (filters.from_date && !filters.to_date) {
      toast.error('Please select "To Date" as well');
      return;
    }
    
    if (!filters.from_date && filters.to_date) {
      toast.error('Please select "From Date" as well');
      return;
    }
    
    // Build URL path with filter parameters
    let path = '/attendance';
    
    if (filters.employee_id && filters.from_date && filters.to_date && filters.from_date === filters.to_date) {
      // Employee + single date
      path = `/attendance/employee/${filters.employee_id}/date/${filters.from_date}`;
    } else if (filters.employee_id && filters.from_date && filters.to_date) {
      // Employee + date range
      path = `/attendance/employee/${filters.employee_id}/from/${filters.from_date}/to/${filters.to_date}`;
    } else if (filters.from_date && filters.to_date && filters.from_date === filters.to_date) {
      // Single date only
      path = `/attendance/date/${filters.from_date}`;
    } else if (filters.from_date && filters.to_date) {
      // Date range
      path = `/attendance/from/${filters.from_date}/to/${filters.to_date}`;
    } else if (filters.employee_id) {
      // Employee only - not allowed, dates are required
      toast.error('Please select date range when filtering by employee');
      return;
    }
    
    navigate(path, { replace: true });
    
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
    
    // Check-out time restriction: Only allow check-out after finish time
    if (manualAttendance.check_out && companySettings) {
      const finishTime = companySettings.finish_time || '17:00';
      const selectedDate = manualAttendance.date;
      const today = new Date().toISOString().split('T')[0];
      
      // Only apply restriction for current day
      if (selectedDate === today) {
        const currentTime = new Date();
        const [finishHour, finishMinute] = finishTime.split(':').map(Number);
        const finishDateTime = new Date();
        finishDateTime.setHours(finishHour, finishMinute, 0, 0);
        
        // Check if current time is before finish time
        if (currentTime < finishDateTime) {
          toast.error(`Check-out time can only be added after finish time (${finishTime})`);
          return;
        }
      }
      
      // Also validate that check-out is not before check-in
      if (manualAttendance.check_in && manualAttendance.check_out) {
        if (manualAttendance.check_out < manualAttendance.check_in) {
          toast.error('Check-out time cannot be before check-in time');
          return;
        }
      }
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


  // Group attendance by date
  const groupAttendanceByDate = () => {
    const grouped = {};
    attendance.forEach(record => {
      const date = record.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(record);
    });
    return grouped;
  };

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return 'Invalid Date';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Invalid Date';
      const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Daily bulk attendance functions
  const handleDailyBulkOpen = () => {
    // Initialize bulk attendance with all employees
    const initialBulk = {};
    employees.forEach(emp => {
      initialBulk[emp.id] = {
        status: 'present',
        check_in: '09:00',
        check_out: '17:00',
        leave_type: ''
      };
    });
    setBulkAttendance(initialBulk);
    setDailyBulkOpen(true);
  };

  const handleBulkDateChange = (direction) => {
    const currentDate = new Date(bulkDate);
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setBulkDate(currentDate.toISOString().split('T')[0]);
  };

  const handleBulkAttendanceChange = (employeeId, field, value) => {
    setBulkAttendance(prev => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || { status: 'present', check_in: '09:00', check_out: '17:00', leave_type: '' }),
        [field]: value
      }
    }));
  };

  const handleSaveBulkAttendance = async () => {
    setSavingBulk(true);
    try {
      const attendanceRecords = Object.entries(bulkAttendance).map(([employeeId, data]) => ({
        employee_id: employeeId,
        date: bulkDate,
        status: data.status,
        check_in: data.check_in || '',
        check_out: data.check_out || '',
        leave_type: data.leave_type || ''
      }));

      // Save all records
      for (const record of attendanceRecords) {
        await api.post('/attendance', record);
      }

      toast.success(`Bulk attendance saved for ${bulkDate}`);
      setDailyBulkOpen(false);
      fetchAttendance();
    } catch (error) {
      toast.error('Failed to save bulk attendance');
    } finally {
      setSavingBulk(false);
    }
  };

  // Monthly attendance functions
  const handleMonthlyOpen = () => {
    setMonthlyOpen(true);
    if (monthlyEmployee) {
      generateMonthlyAttendance();
    }
  };

  const generateMonthlyAttendance = () => {
    const [year, month] = monthlyMonth.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const monthlyData = {};
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${month}-${day.toString().padStart(2, '0')}`;
      monthlyData[date] = {
        status: 'present',
        check_in: '09:00',
        check_out: '17:00',
        leave_type: ''
      };
    }
    
    setMonthlyAttendance(monthlyData);
  };

  const handleMonthlyAttendanceChange = (date, field, value) => {
    setMonthlyAttendance(prev => ({
      ...prev,
      [date]: {
        ...(prev[date] || { status: 'present', check_in: '09:00', check_out: '17:00', leave_type: '' }),
        [field]: value
      }
    }));
  };

  const handleSaveMonthlyAttendance = async () => {
    setSavingMonthly(true);
    try {
      const attendanceRecords = Object.entries(monthlyAttendance).map(([date, data]) => ({
        employee_id: monthlyEmployee,
        date: date,
        status: data.status,
        check_in: data.check_in || '',
        check_out: data.check_out || '',
        leave_type: data.leave_type || ''
      }));

      // Save all records
      for (const record of attendanceRecords) {
        await api.post('/attendance', record);
      }

      toast.success(`Monthly attendance saved for ${monthlyMonth}`);
      setMonthlyOpen(false);
      fetchAttendance();
    } catch (error) {
      toast.error('Failed to save monthly attendance');
    } finally {
      setSavingMonthly(false);
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
            {isAdmin && hasDeletedAttendance && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/deleted-attendance')}
                className="text-gray-600 hover:text-gray-800"
                title="View Deleted Attendance"
              >
                <Archive className="w-4 h-4" />
              </Button>
            )}
            
            {/* Bulk Attendance Buttons */}
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDailyBulkOpen}
                  disabled={!canEdit}
                  title={!canEdit ? "Read-only access" : "Add attendance for all employees on a specific date"}
                  className="text-blue-600 hover:text-blue-700 border-blue-300 hover:bg-blue-50"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Daily Bulk
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMonthlyOpen}
                  disabled={!canEdit}
                  title={!canEdit ? "Read-only access" : "Add monthly attendance for one employee"}
                  className="text-green-600 hover:text-green-700 border-green-300 hover:bg-green-50"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Monthly
                </Button>
              </>
            )}
            
            <Button 
              onClick={() => setImportDialogOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
              disabled={!canEdit}
              title={!canEdit ? "Read-only access - Cannot import attendance" : "AI Attendance Import"}
            >
              <Upload className="w-4 h-4" />
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

        {/* Banner for Last 7 Days View */}
        {viewMode === 'last7days' && (
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    📅 Showing Last 7 Days Attendance (Grouped by Date)
                  </p>
                  <p className="text-xs text-amber-700">
                    No attendance recorded for today. Showing recent activity grouped by date. Click on any date group to view details.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setViewMode('today');
                    fetchAttendance();
                  }}
                  variant="outline"
                  size="sm"
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  Back to Today
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                  ) : viewMode === 'last7days' ? (
                    // Grouped by date view - Table with date headers
                    <>
                      {Object.entries(groupAttendanceByDate())
                        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                        .map(([date, records]) => (
                          <>
                            {/* Date Header Row - Full Width */}
                            <tr key={`header-${date}`} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                              <td colSpan="7" className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <Calendar className="w-5 h-5 text-white" />
                                  <span className="font-bold text-white text-base">
                                    {formatDateForDisplay(date)}
                                  </span>
                                  <span className="text-xs bg-white/20 text-white px-3 py-1 rounded-full">
                                    {records.length} record{records.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </td>
                            </tr>
                            
                            {/* Records for this date */}
                            {records.sort((a, b) => a.employee_name.localeCompare(b.employee_name)).map((record) => (
                              <tr key={record.id} className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${!record.check_out && record.status === 'present' ? 'bg-amber-50' : ''}`}>
                                {/* Employee Column with Profile Picture */}
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex-shrink-0">
                                      {record.profile_pic && record.profile_pic.trim() !== '' ? (
                                        <img 
                                          src={record.profile_pic} 
                                          alt={record.employee_name} 
                                          className="w-8 h-8 rounded-full object-cover"
                                          onError={(e) => {
                                            e.target.outerHTML = '<div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"><svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                          <User className="w-4 h-4 text-white" />
                                        </div>
                                      )}
                                    </div>
                                    <span>{record.employee_name || 'Unknown'}</span>
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
                                
                                {/* Date Column */}
                                <td className="px-4 py-3 text-sm text-gray-600">{record.date}</td>
                                
                                {/* Status Column */}
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
                                    {record.status || 'N/A'}
                                  </span>
                                </td>
                                
                                {/* Check In Column */}
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {record.check_in ? (() => {
                                    try {
                                      return new Date(record.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                                    } catch {
                                      return '-';
                                    }
                                  })() : '-'}
                                </td>
                                
                                {/* Check Out Column */}
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {record.check_out ? (() => {
                                    try {
                                      return new Date(record.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                                    } catch {
                                      return '-';
                                    }
                                  })() : '-'}
                                </td>
                                
                                {/* Hours Column */}
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {calculateHours(record.check_in, record.check_out)}
                                </td>
                                
                                {/* Action Column */}
                                <td className="px-4 py-3 text-sm">
                                  {canEdit && (
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(record)}
                                        title="Edit Attendance"
                                      >
                                        <Edit className="w-4 h-4 text-blue-600" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(record.id)}
                                        title="Delete Attendance"
                                      >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                      </Button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                            
                            {/* Spacing Row Between Date Groups */}
                            <tr className="bg-gray-50">
                              <td colSpan="7" className="h-2"></td>
                            </tr>
                          </>
                        ))}
                    </>
                  ) : (
                    // Today view - normal list
                    attendance.sort((a, b) => a.employee_name.localeCompare(b.employee_name)).map((record) => (
                      <tr key={record.id} className={`hover:bg-gray-50 transition-colors ${!record.check_out && record.status === 'present' ? 'bg-amber-50' : ''}`}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-3">
                            {/* Profile Picture */}
                            <div className="w-8 h-8 rounded-full flex-shrink-0">
                              {record.profile_pic && record.profile_pic.trim() !== '' ? (
                                <img 
                                  src={record.profile_pic} 
                                  alt={record.employee_name} 
                                  className="w-8 h-8 rounded-full object-cover"
                                  onError={(e) => {
                                    e.target.outerHTML = '<div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"><svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                  <User className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>
                            <span>{record.employee_name}</span>
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
                        <p className="font-medium text-gray-900">
                          Changed {history.field_changed} from "<span className="text-red-600">{history.old_value}</span>" to "<span className="text-green-600">{history.new_value}</span>"
                        </p>
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
                      <p className="font-medium text-gray-900 mb-1">
                        Changed <span className="text-blue-600">{history.field_changed}</span> from "<span className="text-red-600">{history.old_value.replace('_', ' ')}</span>" to "<span className="text-green-600">{history.new_value.replace('_', ' ')}</span>"
                      </p>
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

      {/* Daily Bulk Attendance Dialog */}
      <Dialog open={dailyBulkOpen} onOpenChange={setDailyBulkOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Daily Bulk Attendance
              </div>
            </DialogTitle>
            <DialogDescription>
              Set attendance for all employees on a specific date
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Date Navigation */}
            <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkDateChange('prev')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Previous Day
              </Button>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <Input
                  type="date"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-40"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkDateChange('next')}
                disabled={bulkDate >= new Date().toISOString().split('T')[0]}
                className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Next Day →
              </Button>
            </div>

            {/* Employee List */}
            <div className="space-y-1 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-12 gap-2 p-2 bg-gray-100 rounded font-semibold text-xs">
                <div className="col-span-3">Employee</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-7">Details</div>
              </div>
              
              {employees.map((employee) => {
                const empData = bulkAttendance[employee.id] || { status: 'present', check_in: '09:00', check_out: '17:00', leave_type: '' };
                return (
                  <div key={employee.id} className="grid grid-cols-12 gap-2 p-2 border-b hover:bg-gray-50">
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-white" />
                      </div>
                      <span className="font-medium text-xs">{employee.name}</span>
                    </div>
                    <div className="col-span-2">
                      <Select
                        value={empData.status}
                        onValueChange={(value) => handleBulkAttendanceChange(employee.id, 'status', value)}
                      >
                        <SelectTrigger className="h-8">
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
                    <div className="col-span-7">
                      {empData.status === 'present' || empData.status === 'half_day' ? (
                        <div className="flex gap-1">
                          <div className="flex-1">
                            <Input
                              type="time"
                              value={empData.check_in}
                              onChange={(e) => handleBulkAttendanceChange(employee.id, 'check_in', e.target.value)}
                              placeholder="In"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="flex-1">
                            <Input
                              type="time"
                              value={empData.check_out}
                              onChange={(e) => handleBulkAttendanceChange(employee.id, 'check_out', e.target.value)}
                              placeholder="Out"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      ) : empData.status === 'leave' ? (
                        <Select
                          value={empData.leave_type}
                          onValueChange={(value) => handleBulkAttendanceChange(employee.id, 'leave_type', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Leave Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sick">Sick</SelectItem>
                            <SelectItem value="casual">Casual</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-xs text-gray-500 italic flex items-center h-8">
                          No details
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDailyBulkOpen(false)}
                disabled={savingBulk}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveBulkAttendance}
                disabled={savingBulk}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {savingBulk ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Save Bulk Attendance
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Monthly Attendance Dialog */}
      <Dialog open={monthlyOpen} onOpenChange={setMonthlyOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                Monthly Attendance
              </div>
            </DialogTitle>
            <DialogDescription>
              Set attendance for one employee for the entire month
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Employee and Month Selection */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium">Employee *</label>
                <Select
                  value={monthlyEmployee}
                  onValueChange={(value) => {
                    setMonthlyEmployee(value);
                    if (value) {
                      setTimeout(generateMonthlyAttendance, 100);
                    }
                  }}
                >
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
                <label className="text-sm font-medium">Month *</label>
                <Input
                  type="month"
                  value={monthlyMonth}
                  onChange={(e) => {
                    setMonthlyMonth(e.target.value);
                    if (monthlyEmployee) {
                      setTimeout(generateMonthlyAttendance, 100);
                    }
                  }}
                  max={new Date().toISOString().slice(0, 7)}
                />
              </div>
            </div>

            {/* Calendar Grid */}
            {Object.keys(monthlyAttendance).length > 0 && (
              <div className="space-y-2">
                <div className="space-y-1 max-h-[450px] overflow-y-auto">
                  {Object.entries(monthlyAttendance).map(([date, data]) => {
                    const dateObj = new Date(date + 'T00:00:00');
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    
                    return (
                      <div key={date} className="border-b p-2 hover:bg-gray-50">
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-2">
                            <div className="font-semibold text-sm">{dayName}</div>
                            <div className="text-xs text-gray-500">{formattedDate}</div>
                          </div>
                          
                          <div className="col-span-2">
                            <Select
                              value={data.status}
                              onValueChange={(value) => handleMonthlyAttendanceChange(date, 'status', value)}
                            >
                              <SelectTrigger className="h-8">
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
                          
                          <div className="col-span-8">
                            {data.status === 'present' || data.status === 'half_day' ? (
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <Input
                                    type="time"
                                    value={data.check_in}
                                    onChange={(e) => handleMonthlyAttendanceChange(date, 'check_in', e.target.value)}
                                    placeholder="Check In"
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="flex-1">
                                  <Input
                                    type="time"
                                    value={data.check_out}
                                    onChange={(e) => handleMonthlyAttendanceChange(date, 'check_out', e.target.value)}
                                    placeholder="Check Out"
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                            ) : data.status === 'leave' ? (
                              <Select
                                value={data.leave_type}
                                onValueChange={(value) => handleMonthlyAttendanceChange(date, 'leave_type', value)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Leave Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="sick">Sick</SelectItem>
                                  <SelectItem value="casual">Casual</SelectItem>
                                  <SelectItem value="annual">Annual</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="text-xs text-gray-500 italic flex items-center h-8">
                                No details
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMonthlyOpen(false)}
                disabled={savingMonthly}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveMonthlyAttendance}
                disabled={savingMonthly || !monthlyEmployee}
                className="bg-green-600 hover:bg-green-700"
              >
                {savingMonthly ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Save Monthly Attendance
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Device Import Dialog */}
      <DeviceImportDialog 
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        employees={employees}
        onImportComplete={(result) => {
          toast.success(`Import complete! ${result.imported} records imported`, {
            style: { background: '#10b981', color: 'white' }
          });
          fetchAttendance(); // Refresh attendance list
          setImportDialogOpen(false);
        }}
      />
    </Layout>
  );
}
