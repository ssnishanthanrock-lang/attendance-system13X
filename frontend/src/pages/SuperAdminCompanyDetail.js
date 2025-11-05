import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Save, Building2, MessageSquare } from 'lucide-react';

export default function SuperAdminCompanyDetail() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
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
          </CardContent>
        </Card>

        {/* SMS Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              SMS Gateway Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium">Enable SMS Features</p>
                <p className="text-sm text-gray-600">Allow this company to send SMS notifications</p>
              </div>
              <Switch
                checked={smsSettings.sms_enabled}
                onCheckedChange={(checked) => setSmsSettings({...smsSettings, sms_enabled: checked})}
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
