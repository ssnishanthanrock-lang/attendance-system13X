import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, TrendingUp, Briefcase, AlertCircle } from 'lucide-react';

export default function Payroll() {
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [detailedPayroll, setDetailedPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

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

  const handleMonthClick = (month) => {
    fetchDetailedPayroll(month);
  };

  const handleBackToMonths = () => {
    setSelectedMonth(null);
    setDetailedPayroll(null);
  };

  const formatMonthName = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[parseInt(month) - 1];
    return `${monthName} ${year}`;
  };

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

        {/* Month List View */}
        {!selectedMonth && (
          <>
            {months.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {months.map((monthData) => (
                  <Card
                    key={monthData.month}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                    onClick={() => handleMonthClick(monthData.month)}
                  >
                    <CardContent className="p-6">
                      <div className="text-center space-y-3">
                        <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                          {formatMonthName(monthData.month)}
                        </h3>
                        
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-500 mb-1">Total Salary</p>
                          <p className="text-2xl font-bold text-green-600">
                            Rs {monthData.total_salary.toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="text-xs text-gray-400">
                          {monthData.employee_count} employee{monthData.employee_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">No payroll data available</p>
                <p className="text-gray-400 text-sm mt-2">Generate payroll to get started</p>
              </div>
            )}
          </>
        )}

        {/* Detailed Employee View */}
        {selectedMonth && detailedPayroll && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-t-4 border-t-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Gross</p>
                      <p className="text-2xl font-bold text-gray-900">
                        Rs {detailedPayroll.total_gross.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-t-4 border-t-red-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Deductions</p>
                      <p className="text-2xl font-bold text-gray-900">
                        Rs {detailedPayroll.total_deductions.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-t-4 border-t-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Net</p>
                      <p className="text-2xl font-bold text-gray-900">
                        Rs {detailedPayroll.total_net.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Briefcase className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Employee Details */}
            <div className="space-y-4">
              {detailedPayroll.employees.map((emp, index) => (
                <Card key={emp.employee_id} className="overflow-hidden border-l-4 border-l-indigo-500">
                  <CardContent className="p-6">
                    {/* Employee Header */}
                    <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {emp.employee_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                            {emp.employee_name}
                          </h3>
                          <p className="text-xs text-gray-500">Employee #{index + 1}</p>
                        </div>
                      </div>
                      {emp.fixed_salary && (
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                          Fixed Salary
                        </span>
                      )}
                    </div>

                    {/* Main Salary Info - Horizontal Layout */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                        <p className="text-xs text-blue-600 font-medium mb-1">Basic Salary</p>
                        <p className="text-lg font-bold text-blue-700">
                          Rs {emp.basic_salary.toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                        <p className="text-xs text-green-600 font-medium mb-1">Allowances</p>
                        <p className="text-lg font-bold text-green-700">
                          Rs {emp.allowances.toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                        <p className="text-xs text-purple-600 font-medium mb-1">Gross</p>
                        <p className="text-lg font-bold text-purple-700">
                          Rs {emp.gross_salary.toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                        <p className="text-xs text-red-600 font-medium mb-1">Deductions</p>
                        <p className="text-lg font-bold text-red-700">
                          Rs {emp.total_deductions.toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border-2 border-emerald-300">
                        <p className="text-xs text-emerald-600 font-medium mb-1">Net Salary</p>
                        <p className="text-lg font-bold text-emerald-700">
                          Rs {emp.net_salary.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Attendance Metrics */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4 p-4 bg-gray-50 rounded-xl">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Working</p>
                        <p className="text-sm font-bold text-gray-900">{emp.working_days} days</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Present</p>
                        <p className="text-sm font-bold text-green-600">{emp.present_days} days</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Leave</p>
                        <p className="text-sm font-bold text-orange-600">{emp.leave_days} days</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Half Day</p>
                        <p className="text-sm font-bold text-yellow-600">{emp.half_days} days</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Late</p>
                        <p className="text-sm font-bold text-red-600">{emp.late_minutes} mins</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Late Loss</p>
                        <p className="text-sm font-bold text-red-700">Rs {emp.late_deduction.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Additional Breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-white border border-red-200 rounded-lg">
                        <p className="text-xs text-red-600 font-medium mb-1">Advances</p>
                        <p className="text-base font-bold text-red-700">
                          Rs {emp.advances.toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="p-3 bg-white border border-orange-200 rounded-lg">
                        <p className="text-xs text-orange-600 font-medium mb-1">Other Deductions</p>
                        <p className="text-base font-bold text-orange-700">
                          Rs {emp.other_deductions.toLocaleString()}
                        </p>
                      </div>
                      
                      {!emp.fixed_salary && (
                        <div className="p-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-xs text-gray-600 font-medium mb-1">Per Minute Rate</p>
                          <p className="text-base font-bold text-gray-700">
                            Rs {emp.salary_per_minute.toLocaleString()}
                          </p>
                        </div>
                      )}
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
