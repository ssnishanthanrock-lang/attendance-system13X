import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import { capitalizeName } from '../utils/helpers';

export default function CompanyOnboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_number: '',
    email: ''
  });

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const response = await api.get('/company/info');
      if (response.data.company_info_completed) {
        navigate('/');
      } else {
        setFormData({
          name: response.data.name || '',
          address: response.data.address || '',
          contact_number: response.data.contact_number || '',
          email: response.data.email || ''
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/company/info', formData);
      toast.success('Company information saved successfully!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Work Sans, sans-serif' }}>Complete Company Information</h1>
          <p className="text-gray-600 mt-2">Please provide your company details to continue</p>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Company Details</CardTitle>
            <CardDescription>This information will be used across the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Company Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onBlur={(e) => setFormData({ ...formData, name: capitalizeName(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Address *</label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contact Number *</label>
                <Input
                  type="tel"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email Address *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Continue to Dashboard'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
