import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Building2, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginRoleSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const { mobile, otp, options } = location.state || {};

  console.log('LoginRoleSelection loaded');
  console.log('Location state:', location.state);
  console.log('Mobile:', mobile, 'OTP:', otp);

  if (!mobile || !otp) {
    console.error('Missing mobile or OTP, redirecting to login');
    toast.error('Session expired. Please login again.');
    navigate('/login');
    return null;
  }

  const handleSelection = async (selection) => {
    setLoading(true);
    try {
      console.log('Starting login with selection:', selection);
      console.log('Mobile:', mobile, 'OTP:', otp);
      
      const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
      console.log('API URL:', API);
      
      const response = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp, login_as: selection })
      });

      const data = await response.json();
      console.log('Response:', data);
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        toast.success('Login successful!');
        
        // Add a small delay to ensure state is saved
        setTimeout(() => {
          if (selection === 'super_admin') {
            console.log('Navigating to /superadmin');
            navigate('/superadmin', { replace: true });
          } else {
            console.log('Navigating to /');
            navigate('/', { replace: true });
          }
        }, 500);
      } else {
        toast.error(data.detail || 'Login failed. Please try again.');
        console.error('Login failed:', data);
      }
    } catch (error) {
      console.error('Error during login:', error);
      toast.error('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="https://cfms.lk/img/itsignature_logo_blue_only.png" 
            alt="IT Signature Logo" 
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Work Sans, sans-serif' }}>
            Select Login Type
          </h1>
          <p className="text-gray-600 mt-2">Your account has multiple access levels</p>
        </div>

        <div className="space-y-4">
          {loading && (
            <div className="text-center mb-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="text-sm text-gray-600 mt-2">Logging in...</p>
            </div>
          )}
          
          <Card 
            className={`cursor-pointer hover:shadow-xl transition-all border-2 hover:border-red-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !loading && handleSelection('super_admin')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold" style={{ fontFamily: 'Work Sans, sans-serif' }}>Super Admin</h3>
                  <p className="text-sm text-gray-600">Manage all companies and system settings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer hover:shadow-xl transition-all border-2 hover:border-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !loading && handleSelection('company')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold" style={{ fontFamily: 'Work Sans, sans-serif' }}>Company Portal</h3>
                  <p className="text-sm text-gray-600">Access your company management system</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
