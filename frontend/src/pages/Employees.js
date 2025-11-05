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
import { Plus, Edit, Trash2, Search, TrendingUp, History } from 'lucide-react';
import { capitalizeName } from '../utils/helpers';
import { canEditInImpersonation, isImpersonating } from '../utils/impersonation';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [user, setUser] = useState(null);
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
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
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
      toast.error(error.response?.data?.detail || 'Failed to delete employee');
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

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.mobile.includes(searchTerm)
  );

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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }} data-testid="employees-title">
            Employee Management
          </h1>
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

        {/* Search */}
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

        {/* Employees Grid */}
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
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Salary:</span>
                    <span className="font-medium">Rs. {employee.basic_salary.toLocaleString()}</span>
                  </div>
                </div>

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
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No employees found</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
