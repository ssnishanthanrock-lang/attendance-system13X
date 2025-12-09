import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Card, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, TrendingUp, History, Upload, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { capitalizeName } from '../utils/helpers';
import { canEditInImpersonation, isImpersonating } from '../utils/impersonation';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
  const [hasDeletedEmployees, setHasDeletedEmployees] = useState(false);
  const [defaultTimes, setDefaultTimes] = useState({
    start_time: '09:00',
    finish_time: '17:00'
  });
  const [formData, setFormData] = useState({
    employee_id: '',
    mobile: '',
    name: '',
    role: 'employee',
    department: '',
    position: '',
    basic_salary: 0,
    allowances: 0,
    join_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    finish_time: '17:00',
    fixed_salary: false,
    profile_picture: null
  });
  
  // Increment state
  const [incrementDialogOpen, setIncrementDialogOpen] = useState(false);
  const [incrementHistoryOpen, setIncrementHistoryOpen] = useState(false);
  const [selectedEmployeeForIncrement, setSelectedEmployeeForIncrement] = useState(null);
  const [increments, setIncrements] = useState([]);
  const [incrementForm, setIncrementForm] = useState({
    effective_from: new Date().toISOString().slice(0, 7), // YYYY-MM format
    new_salary: 0,
    reason: ''
  });
  const [pendingIncrements, setPendingIncrements] = useState({});

  // Bulk import state
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [parsedEmployees, setParsedEmployees] = useState([]);
  const [parsingLoading, setParsingLoading] = useState(false);
  const [importingLoading, setImportingLoading] = useState(false);
  const [parseCountdown, setParseCountdown] = useState(0);
  const [failedImports, setFailedImports] = useState(() => {
    // Load failed imports from localStorage on mount
    const saved = localStorage.getItem('failedImports');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFailedDialog, setShowFailedDialog] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'card' or 'table' - default to table
  const [sortField, setSortField] = useState('name'); // 'name', 'mobile', 'position', 'salary', 'role'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  // Check if user can edit (not read-only impersonation)
  const canEdit = !isImpersonating() || canEditInImpersonation();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchEmployees();
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data) {
        const defaultStartTime = response.data.office_start_time || '09:00';
        const defaultFinishTime = response.data.office_end_time || '17:00';
        
        setDefaultTimes({
          start_time: defaultStartTime,
          finish_time: defaultFinishTime
        });
        
        setFormData(prev => ({
          ...prev,
          start_time: defaultStartTime,
          finish_time: defaultFinishTime
        }));
      }
    } catch (error) {
      // Use defaults if settings not found
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees?include_pending_increments=true');
      setEmployees(response.data);
      
      // Extract pending increments from employee data
      const pendingIncrementsMap = {};
      response.data.forEach(emp => {
        if (emp.pending_increment) {
          pendingIncrementsMap[emp.id] = emp.pending_increment;
        }
      });
      setPendingIncrements(pendingIncrementsMap);
      
      // Check if there are any deleted employees
      checkDeletedEmployees();
    } catch (error) {
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const checkDeletedEmployees = async () => {
    try {
      const response = await api.get('/employees?include_deleted=true');
      setHasDeletedEmployees(response.data.length > 0);
    } catch (error) {
      console.error('Failed to check deleted employees:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare data without profile picture
      const { profile_picture, ...employeeData } = formData;
      
      // Create or update employee
      let employeeId;
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee.id}`, employeeData);
        employeeId = editingEmployee.id;
        toast.success('Employee updated successfully');
      } else {
        const response = await api.post('/employees', employeeData);
        employeeId = response.data.id;
        toast.success('Employee created successfully');
      }
      
      // Upload profile picture separately if provided
      if (profile_picture) {
        const formData = new FormData();
        formData.append('file', profile_picture);
        formData.append('employee_id', employeeId);
        
        try {
          await api.post('/employees/profile-picture', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (error) {
          toast.error('Employee saved but profile picture upload failed');
        }
      }
      
      setDialogOpen(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save employee');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;

    try {
      await api.delete(`/employees/${id}`);
      toast.success('Employee deleted successfully');
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to delete employee');
    }
  };

  // Increment handlers
  const fetchIncrements = async (employeeId) => {
    try {
      const response = await api.get(`/employees/${employeeId}/increments`);
      setIncrements(response.data);
    } catch (error) {
      toast.error('Failed to fetch increment history');
    }
  };

  const handleOpenIncrementDialog = (employee) => {
    setSelectedEmployeeForIncrement(employee);
    setIncrementForm({
      effective_from: new Date().toISOString().slice(0, 7),
      new_salary: employee.basic_salary,
      reason: ''
    });
    setIncrementDialogOpen(true);
  };

  const handleOpenIncrementHistory = async (employee) => {
    setSelectedEmployeeForIncrement(employee);
    await fetchIncrements(employee.id);
    setIncrementHistoryOpen(true);
  };

  const handleAddIncrement = async (e) => {
    e.preventDefault();
    
    if (incrementForm.new_salary <= selectedEmployeeForIncrement.basic_salary) {
      toast.error('New salary must be greater than current salary');
      return;
    }

    try {
      await api.post(`/employees/${selectedEmployeeForIncrement.id}/increments`, incrementForm);
      toast.success('Increment added successfully');
      setIncrementDialogOpen(false);
      fetchEmployees(); // Refresh to show updated salary
      
      // Show success message with details
      const increase = incrementForm.new_salary - selectedEmployeeForIncrement.basic_salary;
      toast.success(`Salary increased by Rs. ${increase.toLocaleString()}`, {
        duration: 4000
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add increment');
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      employee_id: employee.employee_id || '',
      mobile: employee.mobile,
      name: employee.name,
      role: employee.role,
      department: employee.department || '',
      position: employee.position || '',
      basic_salary: employee.basic_salary,
      allowances: employee.allowances,
      join_date: employee.join_date,
      start_time: employee.start_time || defaultTimes.start_time,
      finish_time: employee.finish_time || defaultTimes.finish_time,
      fixed_salary: employee.fixed_salary || false,
      profile_picture: null
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      employee_id: '',
      mobile: '',
      name: '',
      role: 'employee',
      department: '',
      position: '',
      basic_salary: 0,
      allowances: 0,
      join_date: new Date().toISOString().split('T')[0],
      start_time: defaultTimes.start_time,
      finish_time: defaultTimes.finish_time,
      fixed_salary: false,
      profile_picture: null
    });
  };


  // Bulk import functions
  const handleParseBulk = async () => {
    if (!bulkImportText.trim()) {
      toast.error('Please paste employee data');
      return;
    }

    setParsingLoading(true);
    setParseCountdown(0); // Start from 0 seconds
    
    // Elapsed time timer (counts UP)
    const timerInterval = setInterval(() => {
      setParseCountdown(prev => prev + 1);
    }, 1000);
    
    try {
      const response = await api.post('/employees/parse-bulk', { text: bulkImportText });
      const employees = response.data.employees;
      
      // Clear timer immediately on success
      clearInterval(timerInterval);
      
      // Add default values for missing fields
      const employeesWithDefaults = employees.map(emp => ({
        ...emp,
        basic_salary: emp.basic_salary || 0,
        allowances: emp.allowances || 0,
        start_time: emp.start_time || defaultTimes.start_time,
        finish_time: emp.finish_time || defaultTimes.finish_time,
        fixed_salary: emp.fixed_salary || false,
        employee_id: emp.employee_id || ''
      }));
      
      setParsedEmployees(employeesWithDefaults);
      toast.success(`Parsed ${employees.length} employees successfully!`);
    } catch (error) {
      clearInterval(timerInterval);
      console.error('Parse error:', error);
      toast.error(error.response?.data?.detail || 'Failed to parse employee data');
    } finally {
      clearInterval(timerInterval);
      setParsingLoading(false);
      setParseCountdown(0);
    }
  };

  const handleBulkImport = async () => {
    if (parsedEmployees.length === 0) {
      toast.error('No employees to import');
      return;
    }

    // Validate that all required fields are filled
    const missingRequired = parsedEmployees.some(emp => !emp.name || !emp.mobile);
    if (missingRequired) {
      toast.error('Please fill in all required fields (Name and Mobile) for all employees');
      return;
    }

    setImportingLoading(true);
    try {
      // Keep a copy of parsed employees before clearing
      const employeesToImport = [...parsedEmployees];
      
      const response = await api.post('/employees/bulk-import', { employees: employeesToImport });
      
      toast.success(response.data.message);
      
      // Handle failed imports before closing dialog
      if (response.data.errors && response.data.errors.length > 0) {
        // Store failed imports with employee data
        const failedWithData = response.data.errors.map(err => ({
          ...employeesToImport[err.index],
          error: err.error,
          index: err.index
        }));
        setFailedImports(failedWithData);
        // Save to localStorage
        localStorage.setItem('failedImports', JSON.stringify(failedWithData));
        
        // Show error toast
        toast.error(`${response.data.errors.length} employees failed to import. Opening details...`, {
          duration: 3000
        });
      }
      
      // Close dialog and refresh employees
      setBulkImportDialogOpen(false);
      setBulkImportText('');
      setParsedEmployees([]);
      fetchEmployees();
      
      // Auto-open failed dialog after dialog closes
      if (response.data.errors && response.data.errors.length > 0) {
        setTimeout(() => {
          setShowFailedDialog(true);
        }, 500);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error.response?.data?.detail || 'Failed to import employees');
    } finally {
      setImportingLoading(false);
    }
  };

  const updateParsedEmployee = (index, field, value) => {
    const updated = [...parsedEmployees];
    updated[index] = { ...updated[index], [field]: value };
    setParsedEmployees(updated);
  };

  const removeParsedEmployee = (index) => {
    setParsedEmployees(parsedEmployees.filter((_, i) => i !== index));
  };

  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredEmployees = employees
    .filter(
      (emp) =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.mobile.includes(searchTerm)
    )
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'mobile':
          aValue = a.mobile;
          bValue = b.mobile;
          break;
        case 'position':
          aValue = (a.position || '').toLowerCase();
          bValue = (b.position || '').toLowerCase();
          break;
        case 'salary':
          aValue = a.basic_salary + (a.allowances || 0);
          bValue = b.basic_salary + (b.allowances || 0);
          break;
        case 'role':
          aValue = a.role.toLowerCase();
          bValue = b.role.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }} data-testid="employees-title">
            Employee Management
          </h1>
          <div className="flex items-center gap-2">
            {/* View Toggle Buttons */}
            <div className="flex gap-2 mr-2">
              <Button
                onClick={() => setViewMode('card')}
                variant={viewMode === 'card' ? 'default' : 'outline'}
                size="sm"
                title="Card View"
              >
                Card View
              </Button>
              <Button
                onClick={() => setViewMode('table')}
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                title="Table View"
              >
                Table View
              </Button>
            </div>
            {hasDeletedEmployees && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/deleted-employees'}
                className="text-gray-600 hover:text-gray-800"
                title="View Deleted Employees"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            
            {/* Bulk Import Button */}
            <Button
              variant="outline"
              onClick={() => setBulkImportDialogOpen(true)}
              disabled={!canEdit}
              title={!canEdit ? "Read-only access - Cannot bulk import" : "AI Bulk Import"}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
            </Button>
            
            {/* View Failed Imports Button */}
            {failedImports.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowFailedDialog(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                View Failed ({failedImports.length})
              </Button>
            )}
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  data-testid="add-employee-button"
                  onClick={resetForm}
                  disabled={!canEdit}
                  title={!canEdit ? "Read-only access - Cannot add employees" : ""}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>
                    {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                  </DialogTitle>
                  <DialogDescription>Fill in the employee details below</DialogDescription>
                </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      data-testid="employee-id-input"
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      placeholder="Employee ID (Auto-generated)"
                    />
                  </div>
                  <div>
                    <Input
                      data-testid="mobile-number-input"
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      maxLength={10}
                      placeholder="Mobile Number *"
                      required
                    />
                  </div>
                  <div>
                    <Input
                      data-testid="name-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      onBlur={(e) => setFormData({ ...formData, name: capitalizeName(e.target.value) })}
                      placeholder="Full Name *"
                      required
                    />
                  </div>
                  <div>
                    <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger data-testid="role-select">
                        <SelectValue placeholder="Select Role *" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="staff_member">Staff Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Department and Position in one line with labels */}
                  <div className="sm:col-span-2 grid grid-cols-12 gap-2">
                    <label className="col-span-3 text-sm font-medium flex items-center">Department</label>
                    <div className="col-span-3">
                      <Input
                        data-testid="department-input"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        placeholder="Enter department"
                      />
                    </div>
                    <label className="col-span-3 text-sm font-medium flex items-center">Position</label>
                    <div className="col-span-3">
                      <Input
                        data-testid="position-input"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        placeholder="Enter position"
                      />
                    </div>
                  </div>
                  
                  {/* Basic Salary and Allowances in one line with labels */}
                  <div className="sm:col-span-2 grid grid-cols-12 gap-2">
                    <label className="col-span-3 text-sm font-medium flex items-center">Basic Salary (Rs.)</label>
                    <div className="col-span-3">
                      <Input
                        data-testid="salary-input"
                        type="number"
                        value={formData.basic_salary}
                        onChange={(e) => setFormData({ ...formData, basic_salary: parseFloat(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                    <label className="col-span-3 text-sm font-medium flex items-center">Allowances (Rs.)</label>
                    <div className="col-span-3">
                      <Input
                        data-testid="allowances-input"
                        type="number"
                        value={formData.allowances}
                        onChange={(e) => setFormData({ ...formData, allowances: parseFloat(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  {/* Join Date with label - 3x9 */}
                  <div className="sm:col-span-2 grid grid-cols-12 gap-2">
                    <label className="col-span-3 text-sm font-medium flex items-center">Join Date *</label>
                    <div className="col-span-9">
                      <Input
                        data-testid="join-date-input"
                        type="date"
                        value={formData.join_date}
                        onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Start Time and Finish Time with labels - 3x3 each */}
                  <div className="sm:col-span-2 grid grid-cols-12 gap-2">
                    <label className="col-span-3 text-sm font-medium flex items-center">Start Time</label>
                    <div className="col-span-3">
                      <Input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      />
                    </div>
                    <label className="col-span-3 text-sm font-medium flex items-center">Finish Time</label>
                    <div className="col-span-3">
                      <Input
                        type="time"
                        value={formData.finish_time}
                        onChange={(e) => setFormData({ ...formData, finish_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Fixed Salary</p>
                        <p className="text-xs text-gray-600">Skip late attendance deductions</p>
                      </div>
                      <Switch
                        checked={formData.fixed_salary}
                        onCheckedChange={(checked) => setFormData({ ...formData, fixed_salary: checked })}
                      />
                    </div>
                  </div>
                  {editingEmployee?.profile_pic && (
                    <div className="sm:col-span-2">
                      <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <img 
                          src={editingEmployee.profile_pic} 
                          alt="Current Profile" 
                          className="w-16 h-16 rounded-full object-cover"
                          style={{ borderRadius: '50%' }}
                        />
                        <span className="text-sm text-gray-600">Current Profile Picture</span>
                      </div>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <Input
                      data-testid="profile-picture-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, profile_picture: e.target.files[0] })}
                      placeholder="Upload Profile Picture"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    data-testid="save-employee-button"
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {editingEmployee ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Search - Only show if more than 6 employees */}
        {employees.length > 6 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              data-testid="search-input"
              placeholder="Search by name, employee ID, or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Employees Card View */}
        {viewMode === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="employees-grid">
            {filteredEmployees.map((employee) => (
            <Card key={employee.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  {employee.profile_pic ? (
                    <img 
                      src={employee.profile_pic} 
                      alt={employee.name} 
                      className="w-16 h-16 rounded-full object-cover"
                      style={{ borderRadius: '50%' }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                      {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                      {employee.name}
                    </h3>
                    <p className="text-sm text-gray-600">{employee.employee_id || 'No ID'}</p>
                    <span
                      className={`inline-block text-xs px-2 py-1 rounded-full mt-1 ${
                        employee.role === 'admin'
                          ? 'bg-red-100 text-red-700'
                          : employee.role === 'manager'
                          ? 'bg-blue-100 text-blue-700'
                          : employee.role === 'employee'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {employee.role}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Mobile:</span>
                    <span className="font-medium">{employee.mobile}</span>
                  </div>
                  {employee.department && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium">{employee.department}</span>
                    </div>
                  )}
                  {employee.position && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Position:</span>
                      <span className="font-medium">{employee.position}</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Salary:</span>
                      <span className="font-medium">Rs. {employee.basic_salary.toLocaleString()}</span>
                    </div>
                    {employee.allowances > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Allowances:</span>
                        <span className="font-medium text-green-600">Rs. {employee.allowances.toLocaleString()}</span>
                      </div>
                    )}
                    {pendingIncrements[employee.id] && (
                      <div className="flex justify-end">
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full inline-flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Pending: Rs. {pendingIncrements[employee.id].new_salary.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      data-testid={`edit-employee-${employee.id}`}
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(employee)}
                      disabled={!canEdit}
                      title={!canEdit ? "Read-only access" : ""}
                      className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    {user?.role === 'admin' && (
                      <Button
                        data-testid={`delete-employee-${employee.id}`}
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(employee.id)}
                        disabled={!canEdit}
                        title={!canEdit ? "Read-only access" : ""}
                        className="border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Increment Buttons */}
                  {user?.role === 'admin' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenIncrementDialog(employee)}
                        disabled={!canEdit}
                        title={!canEdit ? "Read-only access" : "Add Salary Increment"}
                        className="flex-1 border-green-200 text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Increment
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenIncrementHistory(employee)}
                        title="View Increment History"
                        className="border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        )}

        {/* Employees Table View */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Employee
                      {sortField === 'name' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('mobile')}
                  >
                    <div className="flex items-center gap-2">
                      Mobile
                      {sortField === 'mobile' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('position')}
                  >
                    <div className="flex items-center gap-2">
                      Position
                      {sortField === 'position' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('salary')}
                  >
                    <div className="flex items-center gap-2">
                      Salary
                      {sortField === 'salary' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center gap-2">
                      Role
                      {sortField === 'role' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-50" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {employee.profile_pic ? (
                          <img 
                            src={employee.profile_pic} 
                            alt={employee.name} 
                            className="w-10 h-10 rounded-full object-cover mr-3"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold mr-3">
                            {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          {employee.email && <div className="text-sm text-gray-500">{employee.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.mobile}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.position || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Rs. {employee.basic_salary.toLocaleString()}</div>
                      {employee.allowances > 0 && (
                        <div className="text-xs text-green-600">+{employee.allowances.toLocaleString()} (allowances)</div>
                      )}
                      {pendingIncrements[employee.id] && (
                        <div className="text-xs text-amber-600 mt-1">
                          Pending: +{pendingIncrements[employee.id].toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-block text-xs px-2 py-1 rounded-full ${
                        employee.role === 'admin'
                          ? 'bg-red-100 text-red-700'
                          : employee.role === 'manager'
                          ? 'bg-blue-100 text-blue-700'
                          : employee.role === 'employee'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingEmployee(employee);
                            setDialogOpen(true);
                          }}
                          disabled={!canEdit}
                          title={!canEdit ? "Read-only access" : "Edit Employee"}
                          className="disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEmployeeToDelete(employee);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={!canEdit}
                          title={!canEdit ? "Read-only access" : "Delete Employee"}
                          className="text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {user?.role === 'admin' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenIncrementDialog(employee)}
                              disabled={!canEdit}
                              title={!canEdit ? "Read-only access" : "Add Salary Increment"}
                              className="border-green-200 text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <TrendingUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenIncrementHistory(employee)}
                              title="View Increment History"
                              className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No employees found</p>
          </div>
        )}
      </div>

      {/* Add Increment Dialog */}
      <Dialog open={incrementDialogOpen} onOpenChange={setIncrementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Add Salary Increment</DialogTitle>
            <DialogDescription>
              Increase salary for {selectedEmployeeForIncrement?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddIncrement} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Salary</label>
              <Input
                value={`Rs. ${selectedEmployeeForIncrement?.basic_salary?.toLocaleString() || 0}`}
                disabled
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Effective From (Month) *</label>
              <Input
                type="month"
                value={incrementForm.effective_from}
                onChange={(e) => setIncrementForm({...incrementForm, effective_from: e.target.value})}
                required
              />
              <p className="text-xs text-gray-500">Salary will be effective from this month onwards</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">New Salary *</label>
              <Input
                type="number"
                value={incrementForm.new_salary}
                onChange={(e) => setIncrementForm({...incrementForm, new_salary: parseFloat(e.target.value) || 0})}
                placeholder="Enter new salary"
                required
                min={selectedEmployeeForIncrement?.basic_salary || 0}
              />
              {incrementForm.new_salary > (selectedEmployeeForIncrement?.basic_salary || 0) && (
                <p className="text-sm text-green-600 font-medium">
                  Increase: Rs. {(incrementForm.new_salary - (selectedEmployeeForIncrement?.basic_salary || 0)).toLocaleString()}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason *</label>
              <Textarea
                value={incrementForm.reason}
                onChange={(e) => setIncrementForm({...incrementForm, reason: e.target.value})}
                placeholder="e.g., Annual performance review, Promotion, Market adjustment"
                required
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIncrementDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-green-600 to-emerald-600">
                <TrendingUp className="w-4 h-4 mr-2" />
                Add Increment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Increment History Dialog */}
      <Dialog open={incrementHistoryOpen} onOpenChange={setIncrementHistoryOpen}>
        <DialogContent className="max-w-7xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Increment History</DialogTitle>
            <DialogDescription>
              Salary increment history for {selectedEmployeeForIncrement?.name}
            </DialogDescription>
          </DialogHeader>
          
          {increments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No increment history found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Old Salary</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">New Salary</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Increase</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Effective From</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Added By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {increments.map((inc) => (
                    <tr key={inc.id} className={`hover:bg-gray-50 ${inc.status === 'pending' ? 'bg-yellow-50' : ''}`}>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(inc.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        Rs. {inc.old_salary.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        Rs. {inc.new_salary.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600 font-semibold">
                        +Rs. {inc.increment_amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {inc.effective_from}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          inc.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {inc.status === 'active' ? '✓ Active' : '⏳ Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                        {inc.reason}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {inc.created_by_name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setIncrementHistoryOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Failed Imports Dialog */}
      <Dialog open={showFailedDialog} onOpenChange={setShowFailedDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-red-600" style={{ fontFamily: 'Work Sans, sans-serif' }}>
              Failed Imports ({failedImports.length})
            </DialogTitle>
            <DialogDescription>
              The following employees could not be imported. Review the errors and try again.
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-red-50">
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">#</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Name</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Mobile</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Email</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Role</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Error Reason</th>
                </tr>
              </thead>
              <tbody>
                {failedImports.map((emp, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2 text-sm">{idx + 1}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{emp.name || '-'}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{emp.mobile || '-'}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{emp.email || '-'}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{emp.role || '-'}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-red-600 font-medium">{emp.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              {failedImports.length} employee(s) failed to import
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowFailedDialog(false);
                  setFailedImports([]);
                  localStorage.removeItem('failedImports');
                }}
              >
                Clear & Close
              </Button>
              <Button
                onClick={() => setShowFailedDialog(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>
              Bulk Import Employees (AI-Powered)
            </DialogTitle>
            <DialogDescription>
              Paste employee data in any format. AI will intelligently parse it and you can review before importing.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {parsedEmployees.length === 0 ? (
              // Step 1: Paste and Parse
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Paste Employee Data
                  </label>
                  <Textarea
                    value={bulkImportText}
                    onChange={(e) => setBulkImportText(e.target.value)}
                    placeholder="Paste employee data here (from Excel, spreadsheet, or any format)
Example:
Director        Prasanthan      info@itsignature.lk     0773966920      2025/11/08
Operation Manager       Anjali  anjali@gmail.com        0760094691      2023/04/24"
                    className="min-h-[300px] font-mono text-sm"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setBulkImportDialogOpen(false);
                      setBulkImportText('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleParseBulk}
                    disabled={parsingLoading || !bulkImportText.trim()}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {parsingLoading ? `Parsing with AI... (${parseCountdown}s)` : 'Parse with AI'}
                  </Button>
                </div>
              </>
            ) : (
              // Step 2: Review and Edit
              <>
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Review and edit the parsed data. Fill in missing required fields (marked with *). Click "Confirm & Import" when ready.
                  </p>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Name *</th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Mobile *</th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Email</th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Role</th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Position</th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Department</th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Join Date</th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Salary</th>
                          <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedEmployees.map((emp, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-2 py-1">
                              <Input
                                value={emp.name || ''}
                                onChange={(e) => updateParsedEmployee(index, 'name', e.target.value)}
                                placeholder="Name *"
                                className={`text-sm ${!emp.name ? 'border-red-300' : ''}`}
                                required
                              />
                            </td>
                            <td className="border border-gray-300 px-2 py-1">
                              <Input
                                value={emp.mobile || ''}
                                onChange={(e) => updateParsedEmployee(index, 'mobile', e.target.value)}
                                placeholder="Mobile *"
                                className={`text-sm ${!emp.mobile ? 'border-red-300' : ''}`}
                                required
                              />
                            </td>
                            <td className="border border-gray-300 px-2 py-1">
                              <Input
                                value={emp.email || ''}
                                onChange={(e) => updateParsedEmployee(index, 'email', e.target.value)}
                                placeholder="Email"
                                className="text-sm"
                              />
                            </td>
                            <td className="border border-gray-300 px-2 py-1">
                              <Select
                                value={emp.role || 'employee'}
                                onValueChange={(value) => updateParsedEmployee(index, 'role', value)}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="employee">Employee</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="staff_member">Staff Member</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="border border-gray-300 px-2 py-1">
                              <Input
                                value={emp.position || ''}
                                onChange={(e) => updateParsedEmployee(index, 'position', e.target.value)}
                                placeholder="Position"
                                className="text-sm"
                              />
                            </td>
                            <td className="border border-gray-300 px-2 py-1">
                              <Input
                                value={emp.department || ''}
                                onChange={(e) => updateParsedEmployee(index, 'department', e.target.value)}
                                placeholder="Department"
                                className="text-sm"
                              />
                            </td>
                            <td className="border border-gray-300 px-2 py-1">
                              <Input
                                type="date"
                                value={emp.join_date || ''}
                                onChange={(e) => updateParsedEmployee(index, 'join_date', e.target.value)}
                                className="text-sm"
                              />
                            </td>
                            <td className="border border-gray-300 px-2 py-1">
                              <Input
                                type="number"
                                value={emp.basic_salary || 0}
                                onChange={(e) => updateParsedEmployee(index, 'basic_salary', parseFloat(e.target.value) || 0)}
                                placeholder="Salary"
                                className="text-sm"
                              />
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeParsedEmployee(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    {parsedEmployees.length} employee(s) ready to import
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setParsedEmployees([]);
                        setBulkImportText('');
                      }}
                    >
                      Back to Paste
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBulkImportDialogOpen(false);
                        setBulkImportText('');
                        setParsedEmployees([]);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkImport}
                      disabled={importingLoading}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      {importingLoading ? 'Importing...' : 'Confirm & Import All'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </Layout>
  );
}
