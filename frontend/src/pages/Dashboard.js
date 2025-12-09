import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../App';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Users, Calendar, FileText, DollarSign, Clock, CheckCircle, XCircle, AlertCircle, Radio } from 'lucide-react';
import LocationTracker from '../components/LocationTracker';
import AttendanceWithLocation from '../components/AttendanceWithLocation';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [livePayroll, setLivePayroll] = useState(null);
  const [displayTodaySalary, setDisplayTodaySalary] = useState(0);
  const [companyInfo, setCompanyInfo] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchStats();
    fetchCompanyInfo();
    
    if (userData?.role === 'admin' || userData?.role === 'manager') {
      // Initial fetch
      fetchLivePayroll();
      
      // Fetch from backend every 5 seconds for accuracy
      const fetchIntervalId = setInterval(() => {
        fetchLivePayroll();
      }, 5000);
      
      // Increment display every second for live feel
      const displayIntervalId = setInterval(() => {
        setDisplayTodaySalary(prev => {
          // Increment by estimated per-second rate
          // Assuming average Rs 0.5 per second across all employees
          return prev + 0.5;
        });
      }, 1000);
      
      // Cleanup on unmount
      return () => {
        clearInterval(fetchIntervalId);
        clearInterval(displayIntervalId);
      };
    }
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const response = await api.get('/company/info');
      setCompanyInfo(response.data);
    } catch (error) {
      console.error('Error fetching company info:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const fetchLivePayroll = async () => {
    try {
      const response = await api.get('/payroll/live-current-month');
      setLivePayroll(response.data);
      // Sync display value with backend data
      if (response.data.today_total_earnings) {
        setDisplayTodaySalary(response.data.today_total_earnings);
      }
    } catch (error) {
      console.error('Failed to fetch live payroll:', error);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      await api.post('/attendance/checkin', {});
      toast.success('Checked in successfully!');
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingIn(true);
    try {
      await api.post('/attendance/checkout', {});
      toast.success('Checked out successfully!');
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to check out');
    } finally {
      setCheckingIn(false);
    }
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

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {!isAdmin && stats?.today_attendance && (
            <div className="flex gap-2">
              {!stats.today_attendance.check_in && (
                <Button
                  data-testid="check-in-button"
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Check In
                </Button>
              )}
              {stats.today_attendance.check_in && !stats.today_attendance.check_out && (
                <Button
                  data-testid="check-out-button"
                  onClick={handleCheckOut}
                  disabled={checkingIn}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Check Out
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {isAdmin ? (
            <>
              <StatCard
                title="Total Employees"
                value={stats?.total_employees || 0}
                icon={<Users className="w-6 h-6" />}
                color="blue"
                testId="stat-employees"
                onClick={() => navigate('/employees')}
                clickable
              />
              <StatCard
                title="Present Today"
                value={stats?.attendance_today || 0}
                icon={<CheckCircle className="w-6 h-6" />}
                color="green"
                testId="stat-attendance"
                onClick={() => navigate(`/attendance-details?date=${new Date().toISOString().split('T')[0]}`)}
                clickable
              />
              <StatCard
                title="Pending Leaves"
                value={stats?.pending_leaves || 0}
                icon={<FileText className="w-6 h-6" />}
                color="orange"
                testId="stat-leaves"
                onClick={() => navigate('/leaves')}
                clickable
              />
              <StatCard
                title="Pending Advances"
                value={stats?.pending_advances || 0}
                icon={<DollarSign className="w-6 h-6" />}
                color="purple"
                testId="stat-advances"
                onClick={() => navigate('/advances')}
                clickable
              />
            </>
          ) : (
            <>
              <StatCard
                title="Attendance Days"
                value={stats?.total_attendance_days || 0}
                icon={<Calendar className="w-6 h-6" />}
                color="blue"
                testId="stat-my-attendance"
                onClick={() => navigate('/attendance')}
                clickable
              />
              <StatCard
                title="Approved Leaves"
                value={stats?.approved_leaves || 0}
                icon={<CheckCircle className="w-6 h-6" />}
                color="green"
                testId="stat-my-leaves"
                onClick={() => navigate('/leaves')}
                clickable
              />
              <StatCard
                title="Total Advances"
                value={`Rs. ${(stats?.approved_advances || 0).toLocaleString()}`}
                icon={<DollarSign className="w-6 h-6" />}
                color="purple"
                testId="stat-my-advances"
                onClick={() => navigate('/advances')}
                clickable
              />
              <StatCard
                title="Net Salary"
                value={stats?.latest_payroll ? `Rs. ${stats.latest_payroll.net_salary.toLocaleString()}` : 'N/A'}
                icon={<DollarSign className="w-6 h-6" />}
                color="indigo"
                testId="stat-my-salary"
                onClick={() => navigate('/payroll')}
                clickable
              />
            </>
          )}
        </div>

        {/* Today's Attendance Status */}
        {!isAdmin && stats?.today_attendance && (
          <Card data-testid="attendance-status-card">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Today's Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Check In</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {stats.today_attendance.check_in
                      ? new Date(stats.today_attendance.check_in).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Not checked in'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Check Out</span>
                  <span className="text-sm font-semibold text-orange-600">
                    {stats.today_attendance.check_out
                      ? new Date(stats.today_attendance.check_out).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Not checked out'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Leaves & Advances for Employee */}
        {!isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="my-leaves-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>My Leaves</CardTitle>
                    <CardDescription>Your leave applications</CardDescription>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => navigate('/leaves')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    Apply Leave
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.my_leaves?.length > 0 ? (
                    stats.my_leaves.slice(0, 5).map((leave) => (
                      <div key={leave.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm capitalize">{leave.leave_type} Leave</p>
                          <p className="text-xs text-gray-500">
                            {leave.from_date} to {leave.to_date}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            leave.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : leave.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {leave.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No leave applications</p>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/leaves')}
                        className="mt-3"
                      >
                        Apply for Leave
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="my-advances-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>My Advances</CardTitle>
                    <CardDescription>Your advance requests</CardDescription>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => navigate('/advances')}
                    className="bg-gradient-to-r from-green-600 to-emerald-600"
                  >
                    Request Advance
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.my_advances?.length > 0 ? (
                    stats.my_advances.slice(0, 5).map((advance) => (
                      <div key={advance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Rs. {advance.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">
                            {advance.reason} • {new Date(advance.request_date).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            advance.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : advance.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {advance.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No advance requests</p>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/advances')}
                        className="mt-3"
                      >
                        Request Advance
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Location Tracking for All Users - Only show if enabled */}
        {companyInfo?.location_tracking_enabled && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LocationTracker />
            <AttendanceWithLocation />
          </div>
        )}

        {/* Recent Activities for Admin/Manager */}
        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Only show if there are recent leaves */}
            {stats?.recent_leaves?.length > 0 && (
              <Card data-testid="recent-leaves-card">
                <CardHeader>
                  <CardTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Recent Leave Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.recent_leaves.map((leave) => (
                      <div key={leave.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{leave.employee_name}</p>
                          <p className="text-xs text-gray-500">
                            {leave.leave_type} • {leave.from_date} to {leave.to_date}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            leave.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : leave.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {leave.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Only show if there are recent advances */}
            {stats?.recent_advances?.length > 0 && (
              <Card data-testid="recent-advances-card">
                <CardHeader>
                  <CardTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Recent Advance Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.recent_advances.map((advance) => (
                      <div key={advance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{advance.employee_name}</p>
                          <p className="text-xs text-gray-500">
                            Rs. {advance.amount.toLocaleString()} • {advance.reason}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            advance.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : advance.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {advance.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Monthly Summary for Admin/Manager */}
        {isAdmin && livePayroll && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Salary Summary */}
            <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate(`/payroll/month/${livePayroll.month}`)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Live Salary Tracker</CardTitle>
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold animate-pulse">
                        <Radio className="w-3 h-3" />
                        LIVE
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Last updated: {livePayroll.timestamp ? new Date(livePayroll.timestamp).toLocaleTimeString() : 'Loading...'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Today Salary Card - Clean design with live counter */}
                  <Card className="bg-white border-2 border-gray-200 shadow-md">
                    <CardContent className="p-5 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <p className="text-xs text-gray-500">Today Salary</p>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 transition-all duration-300">
                        Rs {Math.round(displayTodaySalary).toLocaleString()}
                      </p>
                      <p className="text-xs text-green-600 mt-1">● Live counting</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-gray-600 mb-1">Total Gross (So Far)</p>
                      <p className="text-xl font-bold text-blue-700">Rs {livePayroll.total_gross?.toLocaleString()}</p>
                    </CardContent>
                  </Card>

                  {/* Allowances and Deductions in 2-column grid (50% width each) */}
                  <div className="grid grid-cols-2 gap-3">
                    {livePayroll.total_allowances > 0 && (
                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-gray-600 mb-1">Total Allowances</p>
                          <p className="text-xl font-bold text-purple-700">Rs {livePayroll.total_allowances?.toLocaleString()}</p>
                        </CardContent>
                      </Card>
                    )}
                    <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-gray-600 mb-1">Total Deductions</p>
                        <p className="text-xl font-bold text-red-700">Rs {livePayroll.total_deductions?.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-gray-600 mb-1">Total Net (So Far)</p>
                      <p className="text-xl font-bold text-green-700">Rs {livePayroll.total_net?.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                </CardContent>
            </Card>

            {/* Attendance Chart */}
            <Card data-testid="attendance-chart-card">
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Attendance Summary - Last 7 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.attendance_summary?.map((day, index) => {
                    const date = new Date(day.date);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const dayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const totalEmp = day.total_employees || stats.total_employees || 1;
                    const percentage = (day.count / totalEmp) * 100;
                    
                    return (
                      <div 
                        key={index} 
                        className="cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors"
                        onClick={() => navigate(`/attendance/date/${day.date}`)}
                        title="Click to view attendance details"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-700">{dayName}, {dayDate}</span>
                          <span className="text-gray-600">{day.count} / {totalEmp}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ title, value, icon, color, testId, onClick, clickable }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600',
  };

  return (
    <Card 
      className={`overflow-hidden ${clickable ? 'cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105' : ''}`} 
      data-testid={testId}
      onClick={clickable ? onClick : undefined}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2" style={{ fontFamily: 'Work Sans, sans-serif' }}>
              {value}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white shadow-lg`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
