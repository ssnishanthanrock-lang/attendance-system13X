import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Building2, Users, TrendingUp, LogOut, Plus, CheckCircle, XCircle, Clock, Settings } from 'lucide-react';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, pending, suspended
  const [formData, setFormData] = useState({
    name: '',
    admin_name: '',
    admin_mobile: '',
    email: ''
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/superadmin/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/companies', formData);
      toast.success('Company created successfully! SMS sent to admin.');
      setDialogOpen(false);
      setFormData({ name: '', admin_name: '', admin_mobile: '', email: '' });
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create company');
    }
  };

  const handleStatusChange = async (companyId, status) => {
    try {
      await api.put(`/superadmin/companies/${companyId}/status?status=${status}`);
      toast.success(`Company status updated to ${status}`);
      fetchStats();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src="https://cfms.lk/img/itsignature_logo_blue_only.png" 
                alt="Logo" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold" style={{ fontFamily: 'Work Sans, sans-serif' }}>Super Admin Portal</h1>
                <p className="text-xs text-gray-500">IT Signature ERP</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Companies" value={stats?.total_companies || 0} icon={<Building2 />} color="blue" />
          <StatCard title="Active Companies" value={stats?.active_companies || 0} icon={<CheckCircle />} color="green" />
          <StatCard title="Pending Approval" value={stats?.pending_companies || 0} icon={<Clock />} color="orange" />
          <StatCard title="Total Employees" value={stats?.total_employees || 0} icon={<Users />} color="purple" />
        </div>

        {/* Actions */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Work Sans, sans-serif' }}>Companies</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Company</DialogTitle>
                <DialogDescription>Add a new company to the system</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Company Name *</label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Admin Name *</label>
                  <Input value={formData.admin_name} onChange={(e) => setFormData({...formData, admin_name: e.target.value})} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Admin Mobile (10 digits) *</label>
                  <Input 
                    value={formData.admin_mobile} 
                    onChange={(e) => setFormData({...formData, admin_mobile: e.target.value.replace(/\D/g, '').slice(0, 10)})} 
                    maxLength={10}
                    required 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Create Company</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Companies List */}
        <div className="space-y-4">
          {stats?.company_stats?.map((company) => (
            <Card key={company.company_id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold" style={{ fontFamily: 'Work Sans, sans-serif' }}>{company.name}</h3>
                        <p className="text-sm text-gray-600">Admin: {company.admin_name} | {company.admin_mobile}</p>
                      </div>
                      <Badge className={
                        company.status === 'active' ? 'bg-green-100 text-green-700' :
                        company.status === 'suspended' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }>
                        {company.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Employees</p>
                        <p className="font-semibold">{company.employee_count}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">SMS</p>
                        <p className="font-semibold">{company.sms_enabled ? 'Enabled' : 'Disabled'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Created</p>
                        <p className="font-semibold">{new Date(company.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Last Login</p>
                        <p className="font-semibold">{company.last_login ? new Date(company.last_login).toLocaleDateString() : 'Never'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex lg:flex-col gap-2">
                    {company.status === 'pending' && (
                      <Button size="sm" onClick={() => handleStatusChange(company.company_id, 'active')} className="bg-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Activate
                      </Button>
                    )}
                    {company.status === 'active' && (
                      <Button size="sm" onClick={() => handleStatusChange(company.company_id, 'suspended')} variant="outline" className="text-red-600">
                        <XCircle className="w-4 h-4 mr-1" />
                        Suspend
                      </Button>
                    )}
                    {company.status === 'suspended' && (
                      <Button size="sm" onClick={() => handleStatusChange(company.company_id, 'active')} className="bg-green-600">
                        Reactivate
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => navigate(`/superadmin/companies/${company.company_id}`)}>
                      <Settings className="w-4 h-4 mr-1" />
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold mt-2" style={{ fontFamily: 'Work Sans, sans-serif' }}>{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
