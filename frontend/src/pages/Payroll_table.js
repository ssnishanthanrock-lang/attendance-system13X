import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

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

        {/* Detailed Employee Report - Table Format */}
        {selectedMonth && detailedPayroll && (
          <div className="space-y-6">
            {/* Summary Totals */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Gross Salary</p>
                    <p className="text-2xl font-bold text-gray-900">Rs {detailedPayroll.total_gross.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Deductions</p>
                    <p className="text-2xl font-bold text-red-600">Rs {detailedPayroll.total_deductions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Net Salary</p>
                    <p className="text-2xl font-bold text-green-600">Rs {detailedPayroll.total_net.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employee Payroll Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap sticky left-0 bg-gray-50 z-10">Employee</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap">Basic Salary</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap">Allowances</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap">Work Days</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap">Present</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap">Leave</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap">Late (m)</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap">Late Loss</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap">Advances</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap">Other Ded.</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap">Loan Ded.</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap">Gross</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap">Total Ded.</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 whitespace-nowrap bg-green-50 sticky right-0 z-10">Net Salary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {detailedPayroll.employees.map((emp) => (
                        <tr key={emp.employee_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 sticky left-0 bg-white whitespace-nowrap">
                            <div>
                              <p className="font-semibold text-sm text-gray-900">{emp.employee_name}</p>
                              {emp.fixed_salary && (
                                <span className="text-xs text-blue-600">Fixed</span>
                              )}
                              {!emp.fixed_salary && (
                                <span className="text-xs text-gray-500">{emp.salary_per_minute.toFixed(2)}/m</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-sm text-gray-900 whitespace-nowrap">
                            {emp.basic_salary.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-gray-700 whitespace-nowrap">
                            {emp.allowances.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-center text-sm text-gray-700 whitespace-nowrap">{emp.working_days}</td>
                          <td className="px-3 py-2 text-center text-sm text-green-600 font-semibold whitespace-nowrap">{emp.present_days}</td>
                          <td className="px-3 py-2 text-center text-sm text-orange-600 whitespace-nowrap">{emp.leave_days}</td>
                          <td className="px-3 py-2 text-right text-sm text-red-600 whitespace-nowrap">{emp.late_minutes}</td>
                          <td className="px-3 py-2 text-right text-sm text-red-600 whitespace-nowrap">
                            {emp.late_deduction.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-red-600 whitespace-nowrap">
                            {emp.advances.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-red-600 whitespace-nowrap">
                            {emp.other_deductions.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-red-600 whitespace-nowrap">
                            {(emp.loan_deduction || 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {emp.gross_salary.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-red-600 font-semibold whitespace-nowrap">
                            {emp.total_deductions.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-green-600 font-bold bg-green-50 sticky right-0 whitespace-nowrap">
                            {emp.net_salary.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                      <tr className="font-bold">
                        <td className="px-3 py-3 text-sm text-gray-900 sticky left-0 bg-gray-100 whitespace-nowrap">TOTAL</td>
                        <td className="px-3 py-3 text-right text-sm text-gray-900 whitespace-nowrap">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + emp.basic_salary, 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-gray-900 whitespace-nowrap">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + emp.allowances, 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3"></td>
                        <td className="px-3 py-3"></td>
                        <td className="px-3 py-3"></td>
                        <td className="px-3 py-3"></td>
                        <td className="px-3 py-3 text-right text-sm text-red-600 whitespace-nowrap">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + emp.late_deduction, 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-red-600 whitespace-nowrap">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + emp.advances, 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-red-600 whitespace-nowrap">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + emp.other_deductions, 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-red-600 whitespace-nowrap">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + (emp.loan_deduction || 0), 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-gray-900 whitespace-nowrap">
                          {detailedPayroll.total_gross.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-red-600 whitespace-nowrap">
                          {detailedPayroll.total_deductions.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-green-600 bg-green-100 sticky right-0 whitespace-nowrap">
                          {detailedPayroll.total_net.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
