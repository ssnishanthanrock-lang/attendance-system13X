import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, User, Radio, Calendar, FileText } from 'lucide-react';
import EmployeeSalarySlip from '../components/EmployeeSalarySlip';

export default function Payroll() {
  const { month } = useParams();
  const navigate = useNavigate();
  const [months, setMonths] = useState([]);
  const [detailedPayroll, setDetailedPayroll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [livePayroll, setLivePayroll] = useState(null);
  const liveIntervalRef = useRef(null);
  const [viewingSalarySlip, setViewingSalarySlip] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // Default to table

  // Determine view mode based on URL
  const isLiveView = !month; // If no month param, show live view
  const isMonthView = !!month; // If month param exists, show month detail

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchMonths();
  }, []);

  // Handle month parameter changes
  useEffect(() => {
    if (month) {
      // Initial load with loading state
      fetchDetailedPayroll(month, false);
      
      // Check if this is the current month
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      if (month === currentMonth) {
        // Fetch from backend every 1 second (same as Dashboard) for perfect sync
        const refreshIntervalId = setInterval(() => {
          fetchDetailedPayroll(month, true); // true = silent update, no page refresh
        }, 1000); // Changed from 5000 to 1000 to match Dashboard
        
        // Clean up interval when month changes or component unmounts
        return () => clearInterval(refreshIntervalId);
      }
    }
  }, [month]);

  // Live payroll update effect
  useEffect(() => {
    if (isLiveView) {
      // Fetch immediately
      fetchLivePayroll();
      
      // Set up interval to fetch every second
      liveIntervalRef.current = setInterval(() => {
        fetchLivePayroll();
      }, 1000);
    } else {
      // Clear interval when exiting live view
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
      }
    };
  }, [isLiveView]);

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

  const fetchDetailedPayroll = async (monthStr, silentUpdate = false) => {
    try {
      if (!silentUpdate) {
        setLoading(true);
      }
      const response = await api.get(`/payroll/detailed/${monthStr}`);
      setDetailedPayroll(response.data); // Use data directly from backend (no frontend increment)
    } catch (error) {
      if (!silentUpdate) {
        toast.error('Failed to fetch detailed payroll');
      }
    } finally {
      if (!silentUpdate) {
        setLoading(false);
      }
    }
  };

  const fetchLivePayroll = async () => {
    try {
      const response = await api.get('/payroll/live-current-month');
      setLivePayroll(response.data);
      if (loading) setLoading(false);
    } catch (error) {
      if (loading) {
        toast.error('Failed to fetch live payroll');
        setLoading(false);
      }
      // Don't show toast on every update failure to avoid spam
    }
  };

  const handleMonthClick = (monthStr) => {
    navigate(`/payroll/month/${monthStr}`);
  };

  const handleBackToLive = () => {
    navigate('/payroll');
  };

  const handleViewMonthlyHistory = () => {
    navigate('/payroll/months');
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

        {/* Live Current Month View */}
        {isLiveView && livePayroll && (
          <div className="space-y-4">
            {/* Header with View Toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                    Live Salary Tracker - {formatMonthName(livePayroll.month).monthName} {formatMonthName(livePayroll.month).year}
                  </h1>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold animate-pulse">
                    <Radio className="w-3 h-3" />
                    LIVE
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Updates every second • Last updated: {new Date(livePayroll.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className={`grid grid-cols-1 ${livePayroll.total_allowances > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-gray-600 mb-1">Total Gross (So Far)</p>
                  <p className="text-2xl font-bold text-blue-700">Rs {livePayroll.total_gross.toLocaleString()}</p>
                </CardContent>
              </Card>
              {livePayroll.total_allowances > 0 && (
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-gray-600 mb-1">Total Allowances</p>
                    <p className="text-2xl font-bold text-purple-700">Rs {livePayroll.total_allowances.toLocaleString()}</p>
                  </CardContent>
                </Card>
              )}
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-gray-600 mb-1">Total Deductions</p>
                  <p className="text-2xl font-bold text-red-700">Rs {livePayroll.total_deductions.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-gray-600 mb-1">Total Net (So Far)</p>
                  <p className="text-2xl font-bold text-green-700">Rs {livePayroll.total_net.toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>


            {/* Monthly History Section - Below Live Tracker */}
            {months.length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                  Monthly Salary History
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {months.map((monthData) => (
                    <Card
                      key={monthData.month}
                      className={`cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 ${monthData.month === livePayroll.month ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => handleMonthClick(monthData.month)}
                    >
                      <CardContent className="p-6">
                        <div className="text-center space-y-3">
                          <div className="flex items-center justify-center gap-2">
                            <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                              {formatMonthName(monthData.month).monthName} {formatMonthName(monthData.month).year}
                            </h3>
                            {monthData.month === livePayroll.month && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full font-semibold">
                                CURRENT
                              </span>
                            )}
                          </div>
                          
                          <div className="pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">Total Salary</p>
                            <p className="text-2xl font-bold text-green-600">
                              Rs {(monthData.month === livePayroll.month && livePayroll.total_net ? livePayroll.total_net : monthData.total_salary).toLocaleString()}
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
              </div>
            )}
          </div>
        )}

        {/* Detailed Payroll Sheet - Spreadsheet Style */}
        {month && detailedPayroll && (
          <div className="space-y-4">
            {/* Header with Back Button and View Toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleBackToLive}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                      {formatMonthName(month).monthName} Salary Sheet - {formatMonthName(month).year}
                    </h1>
                    {month === new Date().toISOString().slice(0, 7) && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold animate-pulse">
                        <Radio className="w-3 h-3" />
                        LIVE
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">
                    Working Days - {detailedPayroll.employees[0]?.working_days || 26}
                    {month === new Date().toISOString().slice(0, 7) && detailedPayroll.timestamp && (
                      <> • Last updated: {new Date(detailedPayroll.timestamp).toLocaleTimeString()}</>
                    )}
                  </p>
                </div>
              </div>
              
              {/* View Toggle Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setViewMode('card')}
                  variant={viewMode === 'card' ? 'default' : 'outline'}
                  size="sm"
                >
                  Card View
                </Button>
                <Button
                  onClick={() => setViewMode('table')}
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                >
                  Table View
                </Button>
              </div>
            </div>

            {/* Card View - Shows employee cards */}
            {viewMode === 'card' && (
              <>
                {/* Employee Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {detailedPayroll.employees.sort((a, b) => a.employee_name.localeCompare(b.employee_name)).map((emp) => (
                    <Card key={emp.employee_id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Employee Header */}
                          <div className="flex items-center gap-3">
                            {emp.profile_picture && emp.profile_picture.trim() !== '' ? (
                              <img 
                                src={emp.profile_picture} 
                                alt={emp.employee_name} 
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <User className="w-6 h-6 text-white" />
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900">{emp.employee_name}</h3>
                              <p className="text-xs text-gray-600">{emp.position}</p>
                              {emp.fixed_salary && (
                                <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Fixed Salary</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Earnings Section */}
                          <div className="space-y-2 border-t pt-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase">Earnings</p>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Basic Salary:</span>
                                <span className="font-semibold">Rs {emp.basic_salary.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Allowances:</span>
                                <span className="font-semibold">Rs {emp.allowances.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Earned:</span>
                                <span className="font-semibold text-green-600">Rs {emp.earnings.toLocaleString()}</span>
                              </div>
                              {emp.extra_payment > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Extra Payment:</span>
                                  <span className="font-semibold text-green-600">Rs {emp.extra_payment.toLocaleString()}</span>
                                </div>
                              )}
                              <div className="flex justify-between pt-2 border-t">
                                <span className="text-gray-700 font-medium">Gross Salary:</span>
                                <span className="font-bold text-blue-600">Rs {emp.gross_salary.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Deductions Section */}
                          <div className="space-y-2 border rounded-lg p-3 bg-red-50">
                            <p className="text-xs font-semibold text-gray-500 uppercase">Deductions</p>
                            <div className="space-y-1 text-xs">
                              {emp.late_deduction > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Late:</span>
                                  <span className="text-red-600">Rs {emp.late_deduction.toLocaleString()}</span>
                                </div>
                              )}
                              {emp.advances > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Advances:</span>
                                  <span className="text-red-600">Rs {emp.advances.toLocaleString()}</span>
                                </div>
                              )}
                              {emp.loan_deduction > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Loan:</span>
                                  <span className="text-red-600">Rs {emp.loan_deduction.toLocaleString()}</span>
                                </div>
                              )}
                              {emp.other_deductions > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Other:</span>
                                  <span className="text-red-600">Rs {emp.other_deductions.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Net Salary */}
                          <div className="bg-green-100 rounded-lg p-3">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-700">Net Salary:</span>
                              <span className="text-xl font-bold text-green-700">Rs {emp.net_salary.toLocaleString()}</span>
                            </div>
                          </div>
                          
                          {/* Attendance Info */}
                          <div className="text-xs text-gray-500 pt-2 border-t space-y-1">
                            <div className="flex justify-between">
                              <span>Present: {emp.present_days} | Leave: {emp.leave_days}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Minutes Worked: {emp.total_attendance_minutes}</span>
                              <span>Late: {emp.late_minutes} min</span>
                            </div>
                          </div>
                          
                          {/* View Salary Slip Button */}
                          <Button
                            onClick={() => setViewingSalarySlip(emp)}
                            variant="outline"
                            size="sm"
                            className="w-full flex items-center justify-center gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            View Salary Slip
                          </Button>
                        </div>
                      </CardContent>
                      </Card>
                    ))}
                </div>
                
                {/* Summary Cards - Only shown in card view */}
                <div className={`grid grid-cols-1 ${detailedPayroll.total_allowances > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 mt-6`}>
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-gray-600 mb-1">Total Gross Salary</p>
                      <p className="text-2xl font-bold text-blue-700">
                        Rs {detailedPayroll.total_gross?.toFixed(2)}
                        {month === new Date().toISOString().slice(0, 7) && (
                          <span className="ml-2 text-xs opacity-90 animate-pulse">● LIVE</span>
                        )}
                      </p>
                    </CardContent>
                  </Card>
                  
                  {detailedPayroll.total_allowances > 0 && (
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-gray-600 mb-1">Total Allowances</p>
                        <p className="text-2xl font-bold text-purple-700">Rs {detailedPayroll.total_allowances?.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-gray-600 mb-1">Total Deductions</p>
                      <p className="text-2xl font-bold text-red-700">Rs {detailedPayroll.total_deductions?.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-gray-600 mb-1">Total Net Salary</p>
                      <p className="text-2xl font-bold text-green-700">
                        Rs {detailedPayroll.total_net?.toFixed(2)}
                        {month === new Date().toISOString().slice(0, 7) && (
                          <span className="ml-2 text-xs opacity-90 animate-pulse">● LIVE</span>
                        )}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-max border-collapse text-xs leading-tight">
                    {/* Header */}
                    <thead>
                      <tr className="bg-gray-100">
                        <th colSpan="2" className="border border-gray-300 px-2 py-1 text-center font-bold text-xs bg-blue-100">
                          Employee Details
                        </th>
                        <th colSpan="4" className="border border-gray-300 px-2 py-1 text-center font-bold text-xs bg-yellow-100">
                          Salary
                        </th>
                        <th colSpan="5" className="border border-gray-300 px-2 py-1 text-center font-bold text-xs bg-green-100">
                          Attendance
                        </th>
                        <th colSpan="2" className="border border-gray-300 px-2 py-1 text-center font-bold text-xs bg-blue-100">
                          Extra
                        </th>
                        <th colSpan="3" className="border border-gray-300 px-2 py-1 text-center font-bold text-xs bg-red-100">
                          Deductions
                        </th>
                        <th colSpan="1" className="border border-gray-300 px-2 py-1 text-center font-bold text-xs bg-green-200">
                          Net Salary
                        </th>
                      </tr>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-blue-50">No</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-blue-50">Employee Name</th>
                        
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-yellow-50">Basic Salary</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-yellow-50">Day Salary</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-yellow-50">Minute Salary</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-yellow-50">Gross</th>
                        
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-green-50">Present</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-green-50">Leave</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-green-50">Allowed Leaves</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-green-50">Allowed Half</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-green-50">Late Salary</th>
                        
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-blue-50">Allowances</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-blue-50">Extra Payment</th>
                        
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-red-50">Advance</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-red-50">Loan</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-red-50">Other</th>
                        
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-green-100">Net</th>
                        <th className="border border-gray-300 px-2 py-1 text-xs font-semibold bg-gray-100">Action</th>
                      </tr>
                    </thead>

                    {/* Body */}
                    <tbody>
                      {detailedPayroll.employees.sort((a, b) => a.employee_name.localeCompare(b.employee_name)).map((emp, index) => {
                        const daySalary = emp.working_days > 0 ? (emp.basic_salary / emp.working_days) : 0;
                        const perMinuteSalary = emp.salary_per_minute || 0;
                        const earnings = emp.earnings || 0; // Use backend calculated earnings
                        
                        return (
                          <tr key={emp.employee_id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-2 py-1 text-center text-xs">{index + 1}</td>
                            <td className="border border-gray-300 px-2 py-1">
                              <p className="font-semibold text-xs whitespace-nowrap">
                                {emp.employee_name}
                                {emp.fixed_salary && (
                                  <span className="text-xs text-blue-600 ml-1">(Fixed)</span>
                                )}
                              </p>
                            </td>
                            
                            <td className="border border-gray-300 px-2 py-1 text-right text-xs font-semibold bg-yellow-50">
                              {emp.basic_salary.toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right text-xs bg-yellow-50">
                              {daySalary.toLocaleString(undefined, {maximumFractionDigits: 2})}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right text-xs bg-yellow-50">
                              {perMinuteSalary.toFixed(2)}
                            </td>
                            <td 
                              className="border border-gray-300 px-2 py-1 text-right text-xs font-semibold bg-yellow-50" 
                              title={emp.fixed_salary ? `Fixed Salary: Basic + Allowances` : `Total minutes: ${emp.total_attendance_minutes || 0} | Per minute: Rs ${perMinuteSalary.toFixed(2)}`}
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>{earnings.toFixed(2)}</span>
                                {!emp.fixed_salary && month === new Date().toISOString().slice(0, 7) && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs animate-pulse">
                                    <Radio className="w-2 h-2 mr-0.5" />
                                    LIVE
                                  </span>
                                )}
                              </div>
                            </td>
                            
                            <td className="border border-gray-300 px-2 py-1 text-center text-xs font-semibold text-green-600 bg-green-50">
                              {emp.present_days}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center text-xs text-orange-600 bg-green-50">
                              {emp.leave_days}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center text-xs text-blue-600 bg-green-50">
                              {emp.allowed_leaves || 0}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-center text-xs text-blue-600 bg-green-50">
                              {emp.allowed_half_days || 0}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right text-xs text-red-600 bg-green-50" title={`Late minutes: ${emp.late_minutes} | Deducted: Rs ${emp.late_deduction.toFixed(2)}`}>
                              {emp.late_deduction.toLocaleString(undefined, {maximumFractionDigits: 2})}
                            </td>
                            
                            <td className="border border-gray-300 px-2 py-1 text-right text-xs bg-blue-50">
                              {emp.allowances.toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right text-xs text-green-600 bg-blue-50">
                              {(emp.extra_payment || 0).toLocaleString()}
                            </td>
                            
                            <td className="border border-gray-300 px-2 py-1 text-right text-xs text-red-600 bg-red-50">
                              {emp.advances.toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right text-xs text-red-600 bg-red-50">
                              {(emp.loan_deduction || 0).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-2 py-1 text-right text-xs text-red-600 bg-red-50">
                              {emp.other_deductions.toLocaleString()}
                            </td>
                            
                            <td className="border border-gray-300 px-2 py-1 text-right text-xs font-bold text-green-700 bg-green-100">
                              <div className="flex items-center justify-end gap-1">
                                <span>{emp.net_salary.toFixed(2)}</span>
                                {!emp.fixed_salary && month === new Date().toISOString().slice(0, 7) && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 bg-green-100 text-green-600 rounded text-xs animate-pulse">
                                    <Radio className="w-2 h-2 mr-0.5" />
                                    LIVE
                                  </span>
                                )}
                              </div>
                            </td>
                            
                            <td className="border border-gray-300 px-2 py-1 text-center">
                              <Button
                                onClick={() => setViewingSalarySlip(emp)}
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                title="View Salary Slip"
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                Slip
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Footer Totals */}
                    <tfoot>
                      <tr className="bg-gray-200 font-bold">
                        <td colSpan="2" className="border border-gray-300 px-3 py-3 text-center text-xs">
                          TOTAL
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right text-xs">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + emp.basic_salary, 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right text-xs">-</td>
                        <td className="border border-gray-300 px-2 py-1 text-right text-xs">-</td>
                        <td className="border border-gray-300 px-2 py-1 text-right text-xs">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + (emp.earnings || 0), 0).toLocaleString(undefined, {maximumFractionDigits: 2})}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center text-xs">-</td>
                        <td className="border border-gray-300 px-2 py-1 text-center text-xs">-</td>
                        <td className="border border-gray-300 px-2 py-1 text-center text-xs">-</td>
                        <td className="border border-gray-300 px-2 py-1 text-center text-xs">-</td>
                        <td className="border border-gray-300 px-2 py-1 text-right text-xs">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + emp.late_deduction, 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right text-xs">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + emp.allowances, 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right text-xs text-green-600">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + (emp.extra_payment || 0), 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right text-xs text-red-600">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + emp.advances, 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right text-xs text-red-600">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + (emp.loan_deduction || 0), 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right text-xs text-red-600">
                          {detailedPayroll.employees.reduce((sum, emp) => sum + emp.other_deductions, 0).toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-right text-xs font-bold text-green-700 bg-green-200">
                          {detailedPayroll.total_net.toLocaleString()}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center text-xs">-</td>
                      </tr>
                    </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards at Bottom - Only for Table View */}
              <div className={`grid grid-cols-1 ${detailedPayroll.total_allowances > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-gray-600 mb-1">Total Gross Salary</p>
                    <p className="text-2xl font-bold text-blue-700">Rs {detailedPayroll.total_gross.toLocaleString()}</p>
                  </CardContent>
                </Card>
                {detailedPayroll.total_allowances > 0 && (
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-gray-600 mb-1">Total Allowances</p>
                      <p className="text-2xl font-bold text-purple-700">Rs {detailedPayroll.total_allowances.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                )}
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-gray-600 mb-1">Total Deductions</p>
                    <p className="text-2xl font-bold text-red-700">Rs {detailedPayroll.total_deductions.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-gray-600 mb-1">Total Net Salary</p>
                    <p className="text-2xl font-bold text-green-700">Rs {detailedPayroll.total_net.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Salary Slip Dialog */}
      {viewingSalarySlip && (
        <EmployeeSalarySlip
          employee={viewingSalarySlip}
          month={month}
          onClose={() => setViewingSalarySlip(null)}
        />
      )}
    </Layout>
  );
}
