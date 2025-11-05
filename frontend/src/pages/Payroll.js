import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { DollarSign, Download, Plus } from 'lucide-react';

export default function Payroll() {
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
  });
  const [filters, setFilters] = useState({
    employee_id: '',
    month: '',
    year: '',
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    if (userData?.role === 'admin' || userData?.role === 'manager') {
      fetchEmployees();
    }
    fetchPayrolls();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      toast.error('Failed to fetch employees');
    }
  };

  const fetchPayrolls = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);

      const response = await api.get(`/payroll?${params.toString()}`);
      setPayrolls(response.data);
    } catch (error) {
      toast.error('Failed to fetch payrolls');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      await api.post('/payroll/generate', null, {
        params: generateForm,
      });
      toast.success('Payroll generated successfully');
      setDialogOpen(false);
      fetchPayrolls();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  const handleFilter = () => {
    setLoading(true);
    fetchPayrolls();
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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }} data-testid="payroll-title">
            Payroll Management
          </h1>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  data-testid="generate-payroll-button"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Payroll
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Generate Monthly Payroll</DialogTitle>
                  <DialogDescription>Generate payroll for all active employees</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleGeneratePayroll} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Month *</label>
                    <Select value={generateForm.month} onValueChange={(value) => setGenerateForm({ ...generateForm, month: value })}>
                      <SelectTrigger data-testid="month-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month} value={month}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Year *</label>
                    <Input
                      data-testid="year-input"
                      type="number"
                      value={generateForm.year}
                      onChange={(e) => setGenerateForm({ ...generateForm, year: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      data-testid="submit-generate-button"
                      type="submit"
                      disabled={generating}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      {generating ? 'Generating...' : 'Generate'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Filter Payroll</CardTitle>
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
                <label className="text-sm font-medium">Month</label>
                <Select value={filters.month} onValueChange={(value) => setFilters({ ...filters, month: value })}>
                  <SelectTrigger data-testid="month-filter">
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Months</SelectItem>
                    {months.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Input
                  data-testid="year-filter"
                  type="number"
                  placeholder="All Years"
                  value={filters.year}
                  onChange={(e) => setFilters({ ...filters, year: e.target.value })}
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

        {/* Payroll List */}
        <div className="space-y-4" data-testid="payroll-list">
          {payrolls.map((payroll) => (
            <Card key={payroll.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                          {payroll.employee_name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {payroll.month} {payroll.year}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-blue-600 mb-1">Basic Salary</p>
                        <p className="text-base font-bold text-blue-700">
                          Rs. {payroll.basic_salary.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-xs text-green-600 mb-1">Allowances</p>
                        <p className="text-base font-bold text-green-700">
                          Rs. {payroll.allowances.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <p className="text-xs text-orange-600 mb-1">Deductions</p>
                        <p className="text-base font-bold text-orange-700">
                          Rs. {payroll.deductions.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-xs text-red-600 mb-1">Advances</p>
                        <p className="text-base font-bold text-red-700">
                          Rs. {payroll.advances.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t-2 border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-gray-900">Net Salary</span>
                        <span className="text-2xl font-bold text-green-600">
                          Rs. {payroll.net_salary.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500">
                      Generated on {new Date(payroll.generated_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex lg:flex-col gap-2">
                    <Button
                      data-testid={`download-payslip-${payroll.id}`}
                      size="sm"
                      variant="outline"
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {payrolls.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No payroll records found</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
