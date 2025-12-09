import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Building2, Users, TrendingUp, LogOut, Plus, CheckCircle, XCircle, Clock, Settings, Shield, Eye } from 'lucide-react';
import { capitalizeName } from '../utils/helpers';
import { setImpersonationState } from '../utils/impersonation';

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

  const handleViewPortal = async (company) => {
    try {
      const response = await api.post(`/superadmin/impersonate/${company.company_id}`);
      
      // Store the new token
      localStorage.setItem('token', response.data.token);
      
      // Update user object to act as company admin
      const currentUser = JSON.parse(localStorage.getItem('user'));
      const impersonatedUser = {
        ...currentUser,
        company_id: response.data.company_id,
        role: 'admin',
        is_impersonating: true
      };
      localStorage.setItem('user', JSON.stringify(impersonatedUser));
      
      // Store impersonation state
      setImpersonationState(response.data.company_name, response.data.company_id, response.data.can_edit);
      
      // Force navigation to company dashboard
      window.location.href = '/';
    } catch (error) {
      console.error('Impersonation error:', error);
      toast.error(error.response?.data?.detail || 'Failed to access company portal');
    }
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
            <div className="flex gap-2">
              <Button onClick={() => navigate('/superadmin/admins')} variant="outline">
                <Shield className="w-4 h-4 mr-2" />
                Manage Admins
              </Button>
              <Button onClick={handleLogout} variant="outline" className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div onClick={() => setStatusFilter('all')} className="cursor-pointer">
            <StatCard title="Total Companies" value={stats?.total_companies || 0} icon={<Building2 />} color="blue" active={statusFilter === 'all'} />
          </div>
          <div onClick={() => setStatusFilter('active')} className="cursor-pointer">
            <StatCard title="Active Companies" value={stats?.active_companies || 0} icon={<CheckCircle />} color="green" active={statusFilter === 'active'} />
          </div>
          <div onClick={() => setStatusFilter('pending')} className="cursor-pointer">
            <StatCard title="Pending Approval" value={stats?.pending_companies || 0} icon={<Clock />} color="orange" active={statusFilter === 'pending'} />
          </div>
          <div onClick={() => setStatusFilter('suspended')} className="cursor-pointer">
            <StatCard title="Suspended" value={(stats?.total_companies || 0) - (stats?.active_companies || 0) - (stats?.pending_companies || 0)} icon={<XCircle />} color="red" active={statusFilter === 'suspended'} />
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6 flex justify-end items-center">
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
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    onBlur={(e) => setFormData({...formData, name: capitalizeName(e.target.value)})}
                    required 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Admin Name *</label>
                  <Input 
                    value={formData.admin_name} 
                    onChange={(e) => setFormData({...formData, admin_name: e.target.value})} 
                    onBlur={(e) => setFormData({...formData, admin_name: capitalizeName(e.target.value)})}
                    required 
                  />
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
          {stats?.company_stats?.filter((company) => {
            if (statusFilter === 'all') return true;
            return company.status === statusFilter;
          }).map((company) => (
            <Card key={company.company_id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-3">
                      <div>
                        <h3 className="text-lg font-bold" style={{ fontFamily: 'Work Sans, sans-serif' }}>{company.name}</h3>
                        <p className="text-sm text-gray-600">Admin: {company.admin_name} | {company.admin_mobile}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Employees</p>
                        <p className="font-semibold">{company.employee_count}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">SMS</p>
                        <p className="font-semibold">{company.sms_enabled ? 'Enabled' : 'Disabled'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Invoicing</p>
                        <p className="font-semibold">{company.invoicing_enabled ? 'Enabled' : 'Disabled'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Location Tracking</p>
                        <p className="font-semibold">{company.location_tracking_enabled ? 'Enabled' : 'Disabled'}</p>
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
                  <div className="flex flex-col gap-2 lg:min-w-[140px] items-end lg:items-stretch">
                    <Badge className={
                      company.status === 'active' ? 'bg-green-100 text-green-700 w-fit' :
                      company.status === 'suspended' ? 'bg-red-100 text-red-700 w-fit' :
                      'bg-yellow-100 text-yellow-700 w-fit'
                    }>
                      {company.status}
                    </Badge>
                    <Button 
                      size="sm" 
                      onClick={() => handleViewPortal(company)}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white whitespace-nowrap"
                      title="View company portal"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Portal
                    </Button>
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

function StatCard({ title, value, icon, color, active }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${active ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}>
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
