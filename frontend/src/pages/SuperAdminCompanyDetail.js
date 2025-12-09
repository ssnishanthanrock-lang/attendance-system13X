import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Save, Building2, MessageSquare, CheckCircle, XCircle, Send } from 'lucide-react';
import { capitalizeName } from '../utils/helpers';

export default function SuperAdminCompanyDetail() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [showAdminSelectDialog, setShowAdminSelectDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [sendingUrl, setSendingUrl] = useState(false);
  const [smsSettings, setSmsSettings] = useState({
    sms_gateway: 'textit',
    sms_enabled: false,
    // Textit
    sms_username: '',
    sms_password: '',
    // Dialog
    dialog_username: '',
    dialog_password: '',
    dialog_mask: '',
    // Hutch
    hutch_client_id: '',
    hutch_client_secret: '',
    hutch_access_token: '',
    hutch_refresh_token: '',
    // Mobitel
    mobitel_app_id: '',
    mobitel_app_key: '',
    mobitel_client_id: ''
  });

  useEffect(() => {
    fetchCompany();
    fetchAdmins();
  }, [companyId]);

  const fetchCompany = async () => {
    try {
      const response = await api.get(`/superadmin/companies/${companyId}`);
      setCompany(response.data);
      setSmsSettings({
        sms_gateway: response.data.sms_gateway || 'textit',
        sms_enabled: response.data.sms_enabled || false,
        sms_username: response.data.sms_username || '',
        sms_password: response.data.sms_password || '',
        dialog_username: response.data.dialog_username || '',
        dialog_password: response.data.dialog_password || '',
        dialog_mask: response.data.dialog_mask || '',
        hutch_client_id: response.data.hutch_client_id || '',
        hutch_client_secret: response.data.hutch_client_secret || '',
        hutch_access_token: response.data.hutch_access_token || '',
        hutch_refresh_token: response.data.hutch_refresh_token || '',
        mobitel_app_id: response.data.mobitel_app_id || '',
        mobitel_app_key: response.data.mobitel_app_key || '',
        mobitel_client_id: response.data.mobitel_client_id || ''
      });
    } catch (error) {
      toast.error('Failed to fetch company details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await api.get(`/superadmin/companies/${companyId}/admins`);
      setAdmins(response.data);
    } catch (error) {
      console.error('Failed to fetch admins:', error);
    }
  };

  const handleResendUrl = () => {
    if (admins.length === 0) {
      toast.error('No admin users found for this company');
      return;
    }
    
    if (admins.length === 1) {
      // Only one admin - show confirmation dialog
      setSelectedAdmin(admins[0]);
      setShowConfirmDialog(true);
    } else {
      // Multiple admins - show selection dialog
      setShowAdminSelectDialog(true);
    }
  };

  const handleSendUrlToAdmin = async (adminId) => {
    setSendingUrl(true);
    try {
      const response = await api.post(`/superadmin/companies/${companyId}/resend-url?admin_id=${adminId}`);
      toast.success(`URL sent successfully to ${response.data.admin_name} (${response.data.admin_mobile})`, {
        style: { background: '#10b981', color: 'white' }
      });
      setShowAdminSelectDialog(false);
      setShowConfirmDialog(false);
      setSelectedAdmin(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send SMS', {
        style: { background: '#ef4444', color: 'white' }
      });
    } finally {
      setSendingUrl(false);
    }
  };

  const handleSaveSmS = async () => {
    try {
      await api.put(`/superadmin/companies/${companyId}/sms`, smsSettings);
      toast.success('SMS settings updated successfully', { 
        style: { background: '#10b981', color: 'white' } 
      });
      fetchCompany();
    } catch (error) {
      toast.error('Failed to update SMS settings', {
        style: { background: '#ef4444', color: 'white' }
      });
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await api.put(`/superadmin/companies/${companyId}/status?status=${status}`);
      toast.success(`Company status updated to ${status}`, {
        style: { background: '#10b981', color: 'white' }
      });
      fetchCompany();
    } catch (error) {
      toast.error('Failed to update company status', {
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/superadmin')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                  Manage Company
                </h1>
                <p className="text-sm text-gray-600">{company?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Company Name</label>
                <p className="font-semibold">{company?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div>
                  <Badge className={
                    company?.status === 'active' ? 'bg-green-100 text-green-700' :
                    company?.status === 'suspended' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }>
                    {company?.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Admin Name</label>
                <p className="font-semibold">{company?.admin_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Admin Mobile</label>
                <p className="font-semibold">{company?.admin_mobile}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="font-semibold">{company?.email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Created</label>
                <p className="font-semibold">{new Date(company?.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            {/* Status Change Actions */}
            <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-3">
              {company?.status === 'pending' && (
                <Button 
                  onClick={() => handleStatusChange('active')} 
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Activate Company
                </Button>
              )}
              {company?.status === 'active' && (
                <Button 
                  onClick={() => handleStatusChange('suspended')} 
                  variant="outline" 
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Suspend Company
                </Button>
              )}
              {company?.status === 'suspended' && (
                <Button 
                  onClick={() => handleStatusChange('active')} 
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Reactivate Company
                </Button>
              )}
              
              {/* Re-send URL Button */}
              <Button 
                onClick={handleResendUrl} 
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                <Send className="w-4 h-4 mr-2" />
                Re-send URL to Admin
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Admin Selection Dialog (Multiple Admins) */}
        <Dialog open={showAdminSelectDialog} onOpenChange={setShowAdminSelectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Admin to Send URL</DialogTitle>
              <DialogDescription>
                Choose which admin should receive the company URL via SMS
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedAdmin(admin);
                    setShowAdminSelectDialog(false);
                    setShowConfirmDialog(true);
                  }}
                >
                  <div>
                    <p className="font-medium">{admin.name}</p>
                    <p className="text-sm text-gray-600">{admin.mobile}</p>
                  </div>
                  <Send className="w-4 h-4 text-blue-600" />
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm SMS Send</DialogTitle>
              <DialogDescription>
                Send company URL to the following admin via SMS?
              </DialogDescription>
            </DialogHeader>
            {selectedAdmin && (
              <div className="py-4 space-y-2">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-medium text-lg">{selectedAdmin.name}</p>
                  <p className="text-gray-600">{selectedAdmin.mobile}</p>
                </div>
                <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded border">
                  <strong>Message Preview:</strong>
                  <p className="mt-1">Your company portal: {company?.name}. Login with mobile {selectedAdmin.mobile} at: https://paystack-app.preview.emergentagent.com</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setSelectedAdmin(null);
                }}
                disabled={sendingUrl}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSendUrlToAdmin(selectedAdmin.id)}
                disabled={sendingUrl}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sendingUrl ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send SMS
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Logo & Branding */}
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Logo */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Company Logo</label>
                {company?.logo && (
                  <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border-2 border-dashed">
                    <img src={company.logo} alt="Company Logo" className="max-h-24 object-contain" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('type', 'logo');
                      formData.append('company_id', companyId);
                      try {
                        await api.post('/superadmin/branding', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        toast.success('Logo uploaded successfully', {
                          style: { background: '#10b981', color: 'white' }
                        });
                        fetchCompany();
                      } catch (error) {
                        toast.error('Failed to upload logo', {
                          style: { background: '#ef4444', color: 'white' }
                        });
                      }
                    }
                  }}
                />
                <p className="text-xs text-gray-500">Recommended: PNG/SVG, transparent background, 200x200px</p>
              </div>

              {/* Favicon */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Favicon</label>
                {company?.favicon && (
                  <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border-2 border-dashed">
                    <img src={company.favicon} alt="Favicon" className="max-h-16 object-contain rounded-lg" style={{ borderRadius: '8px' }} />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('type', 'favicon');
                      formData.append('company_id', companyId);
                      try {
                        await api.post('/superadmin/branding', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        toast.success('Favicon uploaded successfully', {
                          style: { background: '#10b981', color: 'white' }
                        });
                        fetchCompany();
                      } catch (error) {
                        toast.error('Failed to upload favicon', {
                          style: { background: '#ef4444', color: 'white' }
                        });
                      }
                    }
                  }}
                />
                <p className="text-xs text-gray-500">Recommended: ICO/PNG, 32x32px or 64x64px</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Company logo will appear in the sidebar and header for this company&apos;s users. Favicon will be used for browser tabs.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Invoicing Module */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium">Enable Invoicing</p>
                <p className="text-sm text-gray-600">Allow this company to use invoicing features (customers, products, invoices, estimates)</p>
              </div>
              <Switch
                checked={company?.invoicing_enabled || false}
                onCheckedChange={async (checked) => {
                  try {
                    // Optimistically update UI
                    setCompany({ ...company, invoicing_enabled: checked });
                    
                    await api.put(`/superadmin/companies/${companyId}/invoicing`, { enabled: checked });
                    toast.success(`Invoicing ${checked ? 'enabled' : 'disabled'} successfully`, {
                      style: { background: '#10b981', color: 'white' }
                    });
                  } catch (error) {
                    toast.error('Failed to update invoicing status', {
                      style: { background: '#ef4444', color: 'white' }
                    });
                    // Revert on error
                    fetchCompany();
                  }
                }}
              />
            </div>
            {company?.invoicing_enabled && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  ✅ Invoicing module is enabled. The company can now access Customers, Products, Invoices, and Estimates.
                </p>
              </div>
            )}
          </CardContent>
        </Card>


        {/* Location Tracking Module */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div>
                <p className="font-medium">Enable Location Tracking</p>
                <p className="text-sm text-gray-600">Allow this company to use location tracking features (employee tracking, attendance with location, location reports)</p>
              </div>
              <Switch
                checked={company?.location_tracking_enabled || false}
                onCheckedChange={async (checked) => {
                  try {
                    // Optimistically update UI
                    setCompany({ ...company, location_tracking_enabled: checked });
                    
                    await api.put(`/superadmin/companies/${companyId}/location-tracking`, { enabled: checked });
                    toast.success(`Location tracking ${checked ? 'enabled' : 'disabled'} successfully`, {
                      style: { background: '#10b981', color: 'white' }
                    });
                  } catch (error) {
                    toast.error('Failed to update location tracking status', {
                      style: { background: '#ef4444', color: 'white' }
                    });
                    // Revert on error
                    fetchCompany();
                  }
                }}
              />
            </div>
            {company?.location_tracking_enabled && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  ✅ Location tracking module is enabled. Employees can now use location tracking and mark attendance with location. Admins can view location reports.
                </p>
              </div>
            )}
          </CardContent>
        </Card>


        {/* SMS Configuration */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium">Enable SMS Features</p>
                <p className="text-sm text-gray-600">Allow this company to send SMS notifications</p>
              </div>
              <Switch
                checked={smsSettings.sms_enabled}
                onCheckedChange={async (checked) => {
                  try {
                    // Optimistically update UI
                    setSmsSettings({...smsSettings, sms_enabled: checked});
                    
                    await api.put(`/superadmin/companies/${companyId}/sms`, {...smsSettings, sms_enabled: checked});
                    toast.success(`SMS ${checked ? 'enabled' : 'disabled'} successfully`, {
                      style: { background: '#10b981', color: 'white' }
                    });
                  } catch (error) {
                    toast.error('Failed to update SMS status', {
                      style: { background: '#ef4444', color: 'white' }
                    });
                    // Revert on error
                    fetchCompany();
                  }
                }}
              />
            </div>

            {smsSettings.sms_enabled && (
              <>
                <div>
                  <label className="text-sm font-medium">SMS Gateway</label>
                  <Select
                    value={smsSettings.sms_gateway}
                    onValueChange={(value) => setSmsSettings({...smsSettings, sms_gateway: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="textit">Textit.biz</SelectItem>
                      <SelectItem value="dialog">Dialog</SelectItem>
                      <SelectItem value="hutch">Hutch</SelectItem>
                      <SelectItem value="mobitel">Mobitel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Textit.biz Fields */}
                {smsSettings.sms_gateway === 'textit' && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Username</label>
                      <Input
                        value={smsSettings.sms_username}
                        onChange={(e) => setSmsSettings({...smsSettings, sms_username: e.target.value})}
                        placeholder="Textit.biz username"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Password</label>
                      <Input
                        type="password"
                        value={smsSettings.sms_password}
                        onChange={(e) => setSmsSettings({...smsSettings, sms_password: e.target.value})}
                        placeholder="Textit.biz password"
                      />
                    </div>
                  </>
                )}

                {/* Dialog Fields */}
                {smsSettings.sms_gateway === 'dialog' && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Username</label>
                      <Input
                        value={smsSettings.dialog_username}
                        onChange={(e) => setSmsSettings({...smsSettings, dialog_username: e.target.value})}
                        placeholder="Dialog username"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Password</label>
                      <Input
                        type="password"
                        value={smsSettings.dialog_password}
                        onChange={(e) => setSmsSettings({...smsSettings, dialog_password: e.target.value})}
                        placeholder="Dialog password (will be MD5 hashed)"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Mask (Sender ID)</label>
                      <Input
                        value={smsSettings.dialog_mask}
                        onChange={(e) => setSmsSettings({...smsSettings, dialog_mask: e.target.value})}
                        placeholder="Your sender ID from Dialog"
                      />
                      <p className="text-xs text-gray-500 mt-1">The sender ID visible to message recipients</p>
                    </div>
                  </>
                )}

                {/* Hutch Fields */}
                {smsSettings.sms_gateway === 'hutch' && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Client ID</label>
                      <Input
                        value={smsSettings.hutch_client_id}
                        onChange={(e) => setSmsSettings({...smsSettings, hutch_client_id: e.target.value})}
                        placeholder="OAuth 2.0 Client ID"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Client Secret</label>
                      <Input
                        type="password"
                        value={smsSettings.hutch_client_secret}
                        onChange={(e) => setSmsSettings({...smsSettings, hutch_client_secret: e.target.value})}
                        placeholder="OAuth 2.0 Client Secret"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Access Token</label>
                      <Input
                        value={smsSettings.hutch_access_token}
                        onChange={(e) => setSmsSettings({...smsSettings, hutch_access_token: e.target.value})}
                        placeholder="OAuth 2.0 Access Token"
                      />
                      <p className="text-xs text-gray-500 mt-1">Get this from Hutch login API</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Refresh Token</label>
                      <Input
                        value={smsSettings.hutch_refresh_token}
                        onChange={(e) => setSmsSettings({...smsSettings, hutch_refresh_token: e.target.value})}
                        placeholder="OAuth 2.0 Refresh Token"
                      />
                      <p className="text-xs text-gray-500 mt-1">Used to renew access token automatically</p>
                    </div>
                  </>
                )}

                {/* Mobitel Fields */}
                {smsSettings.sms_gateway === 'mobitel' && (
                  <>
                    <div>
                      <label className="text-sm font-medium">App ID</label>
                      <Input
                        value={smsSettings.mobitel_app_id}
                        onChange={(e) => setSmsSettings({...smsSettings, mobitel_app_id: e.target.value})}
                        placeholder="Mobitel Application ID"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">App Key (API Key)</label>
                      <Input
                        type="password"
                        value={smsSettings.mobitel_app_key}
                        onChange={(e) => setSmsSettings({...smsSettings, mobitel_app_key: e.target.value})}
                        placeholder="Mobitel Application Key"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Client ID (IBM)</label>
                      <Input
                        value={smsSettings.mobitel_client_id}
                        onChange={(e) => setSmsSettings({...smsSettings, mobitel_client_id: e.target.value})}
                        placeholder="x-ibm-client-id header value"
                      />
                      <p className="text-xs text-gray-500 mt-1">Provided by Mobitel during provisioning</p>
                    </div>
                  </>
                )}

                <div className="pt-4">
                  <Button onClick={handleSaveSmS} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                    <Save className="w-4 h-4 mr-2" />
                    Save SMS Settings
                  </Button>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> SMS features are disabled by default. Enable this to allow the company to send attendance notifications and other alerts to employees.
                  </p>
                  <p className="text-sm text-yellow-800 mt-2">
                    <strong>Important:</strong> LOGIN OTP SMS is sent using the system-wide gateway configured by super admin, not this company-specific gateway.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
