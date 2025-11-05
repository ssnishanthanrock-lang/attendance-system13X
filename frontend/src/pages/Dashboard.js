import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../App';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Users, Calendar, FileText, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchStats();
  }, []);

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
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }} data-testid="dashboard-title">
              Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.name}</p>
            <p className="text-xs text-gray-500 mt-1">IT Signature ERP</p>
          </div>
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
              />
              <StatCard
                title="Present Today"
                value={stats?.attendance_today || 0}
                icon={<CheckCircle className="w-6 h-6" />}
                color="green"
                testId="stat-attendance"
              />
              <StatCard
                title="Pending Leaves"
                value={stats?.pending_leaves || 0}
                icon={<FileText className="w-6 h-6" />}
                color="orange"
                testId="stat-leaves"
              />
              <StatCard
                title="Pending Advances"
                value={stats?.pending_advances || 0}
                icon={<DollarSign className="w-6 h-6" />}
                color="purple"
                testId="stat-advances"
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
              />
              <StatCard
                title="Approved Leaves"
                value={stats?.approved_leaves || 0}
                icon={<CheckCircle className="w-6 h-6" />}
                color="green"
                testId="stat-my-leaves"
              />
              <StatCard
                title="Total Advances"
                value={`Rs. ${(stats?.approved_advances || 0).toLocaleString()}`}
                icon={<DollarSign className="w-6 h-6" />}
                color="purple"
                testId="stat-my-advances"
              />
              <StatCard
                title="Net Salary"
                value={stats?.latest_payroll ? `Rs. ${stats.latest_payroll.net_salary.toLocaleString()}` : 'N/A'}
                icon={<DollarSign className="w-6 h-6" />}
                color="indigo"
                testId="stat-my-salary"
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

        {/* Recent Activities for Admin/Manager */}
        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="recent-leaves-card">
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Recent Leave Requests</CardTitle>
                <CardDescription>Latest leave applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.recent_leaves?.length > 0 ? (
                    stats.recent_leaves.map((leave) => (
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
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No recent leaves</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="recent-advances-card">
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Recent Advance Requests</CardTitle>
                <CardDescription>Latest advance applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.recent_advances?.length > 0 ? (
                    stats.recent_advances.map((advance) => (
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
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No recent advances</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ title, value, icon, color, testId }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600',
  };

  return (
    <Card className="overflow-hidden" data-testid={testId}>
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
