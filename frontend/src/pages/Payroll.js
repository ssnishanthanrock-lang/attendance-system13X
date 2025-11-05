import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, User } from 'lucide-react';

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
    return { monthName, year };
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
        {!selectedMonth && (
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
            Payroll Management
          </h1>
        )}

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
                          {formatMonthName(monthData.month).monthName} {formatMonthName(monthData.month).year}
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
              </div>
            )}
          </>
        )}

        {/* Detailed Payroll Sheet - Spreadsheet Style */}
        {selectedMonth && detailedPayroll && (
          <div className="space-y-4">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4">
              <Button
                onClick={handleBackToMonths}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                  {formatMonthName(selectedMonth).monthName} Salary Sheet - {formatMonthName(selectedMonth).year}
                </h1>
                <p className="text-sm text-gray-600">
                  Working Days - {detailedPayroll.employees[0]?.working_days || 26}
                </p>
              </div>
            </div>

            {/* Payroll Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max border-collapse">
                    {/* Header */}
                    <thead>
                      <tr className="bg-gray-100">
                        <th colSpan="2" className="border border-gray-300 px-3 py-2 text-center font-bold text-sm bg-blue-100">
                          Employee Details
                        </th>
                        <th colSpan="5" className="border border-gray-300 px-3 py-2 text-center font-bold text-sm bg-yellow-100">
                          Salary & Earnings
                        </th>
                        <th colSpan="1" className="border border-gray-300 px-3 py-2 text-center font-bold text-sm bg-blue-100">
                          Extra
                        </th>
                        <th colSpan="5" className="border border-gray-300 px-3 py-2 text-center font-bold text-sm bg-green-100">
                          Attendance
                        </th>
                        <th colSpan="3" className="border border-gray-300 px-3 py-2 text-center font-bold text-sm bg-red-100">
                          Deductions
                        </th>
                        <th colSpan="1" className="border border-gray-300 px-3 py-2 text-center font-bold text-sm bg-green-200">
                          Net Salary
                        </th>
                      </tr>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-blue-50">No</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-blue-50">Employee Name</th>
                        
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-yellow-50">Basic Salary</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-yellow-50">Day Salary</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-yellow-50">Minute Salary</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-yellow-50">Allowances</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-yellow-50">Earnings</th>
                        
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-green-50">Present</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-green-50">Leave</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-green-50">Allowed Leaves</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-green-50">Allowed Half</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-green-50">Late Salary</th>
                        
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-red-50">Advance</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-red-50">Loan</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-red-50">Extra Payment</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-red-50">Other</th>
                        
                        <th className="border border-gray-300 px-2 py-2 text-xs font-semibold bg-green-100">Net</th>
                      </tr>
                    </thead>

                    {/* Body */}
                    <tbody>
                      {detailedPayroll.employees.map((emp, index) => {
                        const daySalary = emp.working_days > 0 ? (emp.basic_salary / emp.working_days) : 0;
                        const perMinuteSalary = emp.salary_per_minute || 0;
                        
                        // Calculate earnings
                        let earnings;
                        if (emp.fixed_salary) {
                          // For fixed salary: basic salary + allowances (full amount regardless of attendance)
                          earnings = emp.basic_salary + emp.allowances;
                        } else {
                          // For non-fixed salary: total attendance minutes × per minute salary
                          const totalMinutes = emp.total_attendance_minutes || 0;
                          earnings = perMinuteSalary * totalMinutes;
                        }
                        
                        return (
                          <tr key={emp.employee_id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-2 py-3 text-center text-sm">{index + 1}</td>
                            <td className="border border-gray-300 px-3 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full flex-shrink-0">
                                  {emp.profile_picture && emp.profile_picture.trim() !== '' ? (
                                    <img 
                                      src={emp.profile_picture} 
                                      alt={emp.employee_name} 
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
                                <div>
                                  <p className="font-semibold text-sm whitespace-nowrap">{emp.employee_name}</p>
                                  {emp.position && (
                                    <span className="text-xs text-gray-500">{emp.position}</span>
                                  )}
                                  {emp.fixed_salary && (
                                    <span className="text-xs text-blue-600 ml-1">(Fixed)</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            
                            <td className="border border-gray-300 px-2 py-3 text-right text-sm font-semibold bg-yellow-50">
                              {emp.basic_salary.toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-right text-sm bg-yellow-50">
                              {daySalary.toLocaleString(undefined, {maximumFractionDigits: 2})}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-right text-sm bg-yellow-50">
                              {perMinuteSalary.toFixed(2)}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-right text-sm bg-yellow-50">
                              {emp.allowances.toLocaleString()}
                            </td>
                            <td 
                              className="border border-gray-300 px-2 py-3 text-right text-sm font-semibold bg-yellow-50" 
                              title={emp.fixed_salary ? `Fixed Salary: Basic + Allowances` : `Total minutes: ${emp.total_attendance_minutes || 0} | Per minute: Rs ${perMinuteSalary.toFixed(2)}`}
                            >
                              {earnings.toLocaleString(undefined, {maximumFractionDigits: 2})}
                            </td>
                            
                            <td className="border border-gray-300 px-2 py-3 text-center text-sm font-semibold text-green-600 bg-green-50">
                              {emp.present_days}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-center text-sm text-orange-600 bg-green-50">
                              {emp.leave_days}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-center text-sm text-blue-600 bg-green-50">
                              {emp.allowed_leaves || 0}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-center text-sm text-blue-600 bg-green-50">
                              {emp.allowed_half_days || 0}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-right text-sm text-red-600 bg-green-50" title={`Late minutes: ${emp.late_minutes} | Deducted: Rs ${emp.late_deduction.toFixed(2)}`}>
                              {emp.late_deduction.toLocaleString(undefined, {maximumFractionDigits: 2})}
                            </td>
                            
                            <td className="border border-gray-300 px-2 py-3 text-right text-sm text-red-600 bg-red-50">
                              {emp.advances.toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-right text-sm text-red-600 bg-red-50">
                              {(emp.loan_deduction || 0).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-right text-sm text-green-600 bg-red-50">
                              {(emp.extra_payment || 0).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-2 py-3 text-right text-sm text-red-600 bg-red-50">
                              {emp.other_deductions.toLocaleString()}
                            </td>
                            
                            <td className="border border-gray-300 px-2 py-3 text-right text-sm font-bold text-green-700 bg-green-100">
                              {emp.net_salary.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Footer Totals */}
                    <tfoot>
                      <tr className="bg-gray-200 font-bold">
                        <td colSpan="2" className="border border-gray-300 px-3 py-3 text-center text-sm">
                          TOTAL
                        </td>
                        <td className="border border-gray-300 px-2 py-3 text-right text-sm">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + emp.basic_salary, 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-3 text-right text-sm">-</td>
                        <td className="border border-gray-300 px-2 py-3 text-right text-sm">-</td>
                        <td className="border border-gray-300 px-2 py-3 text-right text-sm">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + emp.allowances, 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-3 text-right text-sm">
                          {detailedPayroll.employees.reduce((sum, emp) => {
                            if (emp.fixed_salary) {
                              return sum + emp.basic_salary + emp.allowances;
                            } else {
                              const totalMinutes = emp.total_attendance_minutes || 0;
                              const perMinuteSalary = emp.salary_per_minute || 0;
                              return sum + (perMinuteSalary * totalMinutes);
                            }
                          }, 0).toLocaleString(undefined, {maximumFractionDigits: 2})}
                        </td>
                        <td className="border border-gray-300 px-2 py-3 text-center text-sm">-</td>
                        <td className="border border-gray-300 px-2 py-3 text-center text-sm">-</td>
                        <td className="border border-gray-300 px-2 py-3 text-center text-sm">-</td>
                        <td className="border border-gray-300 px-2 py-3 text-center text-sm">-</td>
                        <td className="border border-gray-300 px-2 py-3 text-right text-sm">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + emp.late_deduction, 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-3 text-right text-sm text-red-600">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + emp.advances, 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-3 text-right text-sm text-red-600">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + (emp.loan_deduction || 0), 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-3 text-right text-sm text-green-600">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + (emp.extra_payment || 0), 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-3 text-right text-sm text-red-600">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + emp.other_deductions, 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-3 text-right text-sm font-bold text-green-700 bg-green-200">
                          {detailedPayroll.total_net.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards at Bottom */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">Total Gross Salary</p>
                  <p className="text-2xl font-bold text-blue-700">Rs {detailedPayroll.total_gross.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">Total Deductions</p>
                  <p className="text-2xl font-bold text-red-700">Rs {detailedPayroll.total_deductions.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">Total Net Salary</p>
                  <p className="text-2xl font-bold text-green-700">Rs {detailedPayroll.total_net.toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
