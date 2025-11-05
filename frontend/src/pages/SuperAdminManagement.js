import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Shield, Trash2, Eye, Edit } from 'lucide-react';
import { capitalizeName } from '../utils/helpers';

export default function SuperAdminManagement() {
  const navigate = useNavigate();
  const [superAdmins, setSuperAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    employee_id: '',
    can_full_access_companies: false
  });

  useEffect(() => {
    fetchSuperAdmins();
  }, []);

  const fetchSuperAdmins = async () => {
    try {
      const response = await api.get('/superadmin/admins');
      setSuperAdmins(response.data);
    } catch (error) {
      toast.error('Failed to fetch super admins');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/admins', formData);
      toast.success('Super admin created successfully!', {
        style: { background: '#10b981', color: 'white' }
      });
      setDialogOpen(false);
      setFormData({ name: '', mobile: '', employee_id: '', can_full_access_companies: false });
      fetchSuperAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create super admin', {
        style: { background: '#ef4444', color: 'white' }
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this super admin?')) return;

    try {
      await api.delete(`/superadmin/admins/${id}`);
      toast.success('Super admin removed successfully', {
        style: { background: '#10b981', color: 'white' }
      });
      fetchSuperAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove super admin', {
        style: { background: '#ef4444', color: 'white' }
      });
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
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/superadmin')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                Super Admin Management
              </h1>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Super Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Super Admin</DialogTitle>
                  <DialogDescription>Add a new super administrator to the system</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Employee ID *</label>
                    <Input
                      value={formData.employee_id}
                      onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                      placeholder="e.g., SA-001"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      onBlur={(e) => setFormData({...formData, name: capitalizeName(e.target.value)})}
                      placeholder="Full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Mobile (10 digits) *</label>
                    <Input
                      value={formData.mobile}
                      onChange={(e) => setFormData({...formData, mobile: e.target.value.replace(/\\D/g, '').slice(0, 10)})}
                      maxLength={10}
                      placeholder="0771234567"
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <label className="text-sm font-semibold text-gray-900">Company View Permission</label>
                      <p className="text-xs text-gray-600 mt-1">
                        {formData.can_full_access_companies 
                          ? '✓ Full Access - Can edit/add/delete when viewing company portals' 
                          : '👁️ Read-only - Can only view company portals'}
                      </p>
                    </div>
                    <Switch
                      checked={formData.can_full_access_companies}
                      onCheckedChange={(checked) => setFormData({...formData, can_full_access_companies: checked})}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {superAdmins.map((admin) => (
            <Card key={admin.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{admin.name}</h3>
                      <p className="text-sm text-gray-600">
                        {admin.employee_id} | {admin.mobile}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-red-100 text-red-700">Super Admin</Badge>
                        <Badge className={admin.can_full_access_companies ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                          {admin.can_full_access_companies ? (
                            <><Edit className="w-3 h-3 mr-1" /> Full Access</>
                          ) : (
                            <><Eye className="w-3 h-3 mr-1" /> Read-only</>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">Company View:</span>
                      <Switch
                        checked={admin.can_full_access_companies}
                        onCheckedChange={async (checked) => {
                          try {
                            await api.put(`/superadmin/admins/${admin.id}`, { can_full_access_companies: checked });
                            toast.success('Permission updated', { style: { background: '#10b981', color: 'white' } });
                            fetchSuperAdmins();
                          } catch (error) {
                            toast.error('Failed to update permission', { style: { background: '#ef4444', color: 'white' } });
                          }
                        }}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(admin.id)}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      disabled={superAdmins.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {superAdmins.length === 1 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> You cannot delete the last super admin. At least one super admin must exist in the system.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
