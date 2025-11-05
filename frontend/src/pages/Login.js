import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Phone } from 'lucide-react';

export default function Login() {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    if (mobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/send-otp', { mobile });
      toast.success('OTP sent to your mobile number');
      setOtpSent(true);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when 10 digits are entered
  useEffect(() => {
    if (mobile.length === 10 && !otpSent && !loading) {
      handleSendOTP();
    }
  }, [mobile]);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && value && newOtp.every(digit => digit !== '')) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setOtp(newOtp);

    if (pastedData.length === 6) {
      handleVerifyOTP(pastedData);
    } else {
      otpRefs[pastedData.length]?.current?.focus();
    }
  };

  const handleVerifyOTP = async (otpString) => {
    const otpCode = otpString || otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', { mobile, otp: otpCode });
      
      // Check if role selection is required
      if (response.data.require_selection) {
        navigate('/login/select-role', { state: { mobile, otp: otpCode, options: response.data.options } });
        return;
      }
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      toast.success('Login successful!');
      
      // Route based on role
      if (response.data.user.role === 'super_admin') {
        navigate('/superadmin');
      } else {
        navigate('/');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-slide-in">
          <div className="inline-flex items-center justify-center mb-6">
            <img 
              src="https://cfms.lk/img/itsignature_logo_white.png" 
              alt="IT Signature Logo" 
              className="h-20 w-auto"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Work Sans, sans-serif' }}>
            IT Signature ERP
          </h1>
          <p className="text-blue-100">Employee Resource Planning System</p>
        </div>

        <Card className="shadow-2xl border-0 animate-slide-in backdrop-blur-lg bg-white/90" data-testid="login-card">
          <CardHeader className="space-y-1 pb-4 pt-6 px-6">
            <CardTitle className="text-2xl font-semibold" style={{ fontFamily: 'Work Sans, sans-serif' }}>
              {otpSent ? 'Enter OTP' : 'Welcome Back'}
            </CardTitle>
            <CardDescription>
              {otpSent
                ? `Enter the 6-digit code sent to ${mobile}`
                : 'Enter your mobile number to receive OTP'}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Mobile Number</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Phone className="w-5 h-5 text-gray-400" />
                    </div>
                    <Input
                      data-testid="mobile-input"
                      type="tel"
                      placeholder="0771234567"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                      className="pl-12 h-14 text-2xl font-semibold tracking-wider border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      required
                      autoFocus
                    />
                    {mobile.length > 0 && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          mobile.length === 10 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {mobile.length}/10
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Enter your 10-digit Sri Lankan mobile number</p>
                </div>
                <Button
                  data-testid="send-otp-button"
                  type="submit"
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={loading || mobile.length !== 10}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Sending OTP...
                    </span>
                  ) : (
                    <>
                      Send OTP
                      <span className="ml-2">→</span>
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 text-center block">Enter 6-Digit OTP</label>
                  <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={otpRefs[index]}
                        data-testid={`otp-input-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white shadow-sm"
                        style={{
                          fontSize: '1.5rem',
                          fontFamily: 'monospace'
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">Code will auto-submit when complete</p>
                </div>
                <Button
                  data-testid="verify-otp-button"
                  type="button"
                  onClick={() => handleVerifyOTP()}
                  className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={loading || otp.some(d => !d)}
                >
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </Button>
                <Button
                  data-testid="resend-otp-button"
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp(['', '', '', '', '', '']);
                  }}
                >
                  Change Mobile Number
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-white/80 mt-6 space-y-1 backdrop-blur-sm bg-white/10 rounded-xl p-4">
          <p className="font-medium text-white">IT Signature (Pvt) Ltd</p>
          <p className="text-blue-100">Support Hotline: 011 4848 988 | 077 3966 920</p>
        </div>
      </div>
    </div>
  );
}
