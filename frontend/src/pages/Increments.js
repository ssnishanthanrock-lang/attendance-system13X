import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, TrendingUp, ArrowUp } from 'lucide-react';

export default function Increments() {
  const [increments, setIncrements] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: 'none',
    new_salary: 0,
    effective_date: new Date().toISOString().split('T')[0],
    reason: '',
  });

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    if (userData?.role === 'admin' || userData?.role === 'manager') {
      fetchEmployees();
    }
    fetchIncrements();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      toast.error('Failed to fetch employees');
    }
  };

  const fetchIncrements = async () => {
    try {
      const response = await api.get('/increments');
      setIncrements(response.data);
    } catch (error) {
      toast.error('Failed to fetch increments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.employee_id === 'none') {
      toast.error('Please select an employee');
      return;
    }
    
    try {
      await api.post('/increments', formData);
      toast.success('Increment added successfully');
      setDialogOpen(false);
      resetForm();
      fetchIncrements();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add increment');
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: 'none',
      new_salary: 0,
      effective_date: new Date().toISOString().split('T')[0],
      reason: '',
    });
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }} data-testid="increments-title">
            Salary Increments
          </h1>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  data-testid="add-increment-button"
                  onClick={resetForm}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Increment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Add Salary Increment</DialogTitle>
                  <DialogDescription>Update employee salary</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Employee *</label>
                    <Select value={formData.employee_id} onValueChange={(value) => setFormData({ ...formData, employee_id: value })}>
                      <SelectTrigger data-testid="employee-select">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" disabled>Select an employee</SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} - Current: Rs. {emp.basic_salary.toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Salary (Rs.) *</label>
                    <Input
                      data-testid="new-salary-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.new_salary}
                      onChange={(e) => setFormData({ ...formData, new_salary: parseFloat(e.target.value) })}
                      placeholder="Enter new salary"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Effective Date *</label>
                    <Input
                      data-testid="effective-date-input"
                      type="date"
                      value={formData.effective_date}
                      onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reason *</label>
                    <Textarea
                      data-testid="reason-textarea"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Performance review, promotion, etc."
                      rows={4}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      data-testid="submit-increment-button"
                      type="submit"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      Add Increment
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Increments List */}
        <div className="space-y-4" data-testid="increments-list">
          {increments.map((increment) => (
            <Card key={increment.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                          {increment.employee_name}
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          Effective from {increment.effective_date}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                        <ArrowUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">
                          +Rs. {increment.increment_amount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Previous Salary</p>
                        <p className="text-lg font-bold text-gray-700">
                          Rs. {increment.previous_salary.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-blue-600 mb-1">New Salary</p>
                        <p className="text-lg font-bold text-blue-700">
                          Rs. {increment.new_salary.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-xs text-green-600 mb-1">Increment %</p>
                        <p className="text-lg font-bold text-green-700">
                          {((increment.increment_amount / increment.previous_salary) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-600 mb-1">Reason</p>
                      <p className="text-sm text-gray-700">{increment.reason}</p>
                    </div>

                    <p className="text-xs text-gray-500">Added by: {increment.created_by}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {increments.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No salary increments found</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
