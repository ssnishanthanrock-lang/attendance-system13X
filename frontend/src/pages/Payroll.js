import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Calendar, Download, Plus, ArrowLeft, Users, IndianRupee } from 'lucide-react';

export default function Payroll() {
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [detailedPayroll, setDetailedPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchMonths();
  }, []);

  const fetchMonths = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payroll/months');
      setMonths(response.data);
    } catch (error) {
      toast.error('Failed to fetch payroll months');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedPayroll = async (month) => {
    try {
      setLoading(true);
      const response = await api.get(`/payroll/detailed/${month}`);
      setDetailedPayroll(response.data);
      setSelectedMonth(month);
    } catch (error) {
      toast.error('Failed to fetch detailed payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      // Convert month name to number and format as YYYY-MM
      const monthIndex = monthNames.indexOf(generateForm.month) + 1;
      const monthStr = monthIndex.toString().padStart(2, '0');
      const yearMonth = `${generateForm.year}-${monthStr}`;
      
      const response = await api.post('/payroll/generate', { month: yearMonth });
      toast.success(response.data.message || 'Payroll generated successfully');
      setDialogOpen(false);
      fetchMonths();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  const handleMonthClick = (month) => {
    fetchDetailedPayroll(month);
  };

  const handleBackToMonths = () => {
    setSelectedMonth(null);
    setDetailedPayroll(null);
  };

  const formatMonthName = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const monthName = monthNames[parseInt(month) - 1];
    return `${monthName} ${year}`;
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {selectedMonth && (
              <Button
                onClick={handleBackToMonths}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
              {selectedMonth ? formatMonthName(selectedMonth) : 'Payroll Management'}
            </h1>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthNames.map((month) => (
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

        {/* Month List View */}
        {!selectedMonth && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {months.map((monthData) => (
              <Card
                key={monthData.month}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                onClick={() => handleMonthClick(monthData.month)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                    {formatMonthName(monthData.month)}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Employees
                      </span>
                      <span className="font-semibold text-gray-900">{monthData.employee_count}</span>
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Salary</span>
                        <span className="text-lg font-bold text-green-600 flex items-center gap-1">
                          <IndianRupee className="w-4 h-4" />
                          {monthData.total_salary.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {months.length === 0 && !selectedMonth && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No payroll data available</p>
          </div>
        )}

        {/* Detailed Employee View */}
        {selectedMonth && detailedPayroll && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Gross Salary</p>
                  <p className="text-2xl font-bold text-blue-600 flex items-center gap-1">
                    <IndianRupee className="w-5 h-5" />
                    {detailedPayroll.total_gross.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Deductions</p>
                  <p className="text-2xl font-bold text-red-600 flex items-center gap-1">
                    <IndianRupee className="w-5 h-5" />
                    {detailedPayroll.total_deductions.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Net Salary</p>
                  <p className="text-2xl font-bold text-green-600 flex items-center gap-1">
                    <IndianRupee className="w-5 h-5" />
                    {detailedPayroll.total_net.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Employee Details */}
            <div className="space-y-4">
              {detailedPayroll.employees.map((emp) => (
                <Card key={emp.employee_id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Employee Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                          {emp.employee_name}
                        </h3>
                        {emp.fixed_salary && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            Fixed Salary
                          </span>
                        )}
                      </div>

                      {/* Salary Breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs text-blue-600 mb-1">Basic Salary</p>
                          <p className="text-sm font-bold text-blue-700 flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" />
                            {emp.basic_salary.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-xs text-green-600 mb-1">Allowances</p>
                          <p className="text-sm font-bold text-green-700 flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" />
                            {emp.allowances.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <p className="text-xs text-purple-600 mb-1">Gross Salary</p>
                          <p className="text-sm font-bold text-purple-700 flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" />
                            {emp.gross_salary.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg">
                          <p className="text-xs text-red-600 mb-1">Total Deductions</p>
                          <p className="text-sm font-bold text-red-700 flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" />
                            {emp.total_deductions.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border-2 border-green-200">
                          <p className="text-xs text-green-600 mb-1">Net Salary</p>
                          <p className="text-sm font-bold text-green-700 flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" />
                            {emp.net_salary.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Attendance & Deductions Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-gray-200">
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-600 mb-1">Working Days</p>
                          <p className="text-sm font-semibold text-gray-900">{emp.working_days}</p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-600 mb-1">Present</p>
                          <p className="text-sm font-semibold text-gray-900">{emp.present_days}</p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-600 mb-1">Leave</p>
                          <p className="text-sm font-semibold text-gray-900">{emp.leave_days}</p>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xs text-gray-600 mb-1">Half Days</p>
                          <p className="text-sm font-semibold text-gray-900">{emp.half_days}</p>
                        </div>
                        <div className="text-center p-2 bg-orange-50 rounded">
                          <p className="text-xs text-orange-600 mb-1">Late (mins)</p>
                          <p className="text-sm font-semibold text-orange-700">{emp.late_minutes}</p>
                        </div>
                        <div className="text-center p-2 bg-orange-50 rounded">
                          <p className="text-xs text-orange-600 mb-1">Late Deduction</p>
                          <p className="text-sm font-semibold text-orange-700 flex items-center justify-center gap-1">
                            <IndianRupee className="w-3 h-3" />
                            {emp.late_deduction.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-200">
                        <div className="bg-red-50 p-3 rounded-lg">
                          <p className="text-xs text-red-600 mb-1">Advances</p>
                          <p className="text-sm font-bold text-red-700 flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" />
                            {emp.advances.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <p className="text-xs text-orange-600 mb-1">Other Deductions</p>
                          <p className="text-sm font-bold text-orange-700 flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" />
                            {emp.other_deductions.toLocaleString()}
                          </p>
                        </div>
                        {!emp.fixed_salary && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Salary/Minute</p>
                            <p className="text-sm font-bold text-gray-700 flex items-center gap-1">
                              <IndianRupee className="w-3 h-3" />
                              {emp.salary_per_minute.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
