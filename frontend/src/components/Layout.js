import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
  Wallet,
  Menu,
  LogOut,
  Phone,
  Settings,
} from 'lucide-react';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    if (userData && userData.role !== 'super_admin') {
      fetchCompanyInfo();
    }
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/company/info`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCompanyInfo(data);
      }
    } catch (error) {
      console.error('Failed to fetch company info:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'employee', 'staff_member'] },
    { path: '/employees', label: 'Employees', icon: Users, roles: ['admin', 'manager'] },
    { path: '/attendance', label: 'Attendance', icon: Calendar, roles: ['admin', 'manager', 'employee', 'staff_member'] },
    { path: '/leaves', label: 'Leaves', icon: FileText, roles: ['admin', 'manager', 'employee'] },
    { path: '/advances', label: 'Advances', icon: Wallet, roles: ['admin', 'manager', 'employee'] },
    { path: '/increments', label: 'Increments', icon: TrendingUp, roles: ['admin', 'manager', 'employee'] },
    { path: '/payroll', label: 'Payroll', icon: DollarSign, roles: ['admin', 'manager', 'employee', 'staff_member'] },
    { path: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'manager'] },
  ];

  const filteredMenuItems = menuItems.filter((item) => item.roles.includes(user?.role));

  const NavLink = ({ item, onClick }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    return (
      <button
        data-testid={`nav-${item.label.toLowerCase()}`}
        onClick={() => {
          navigate(item.path);
          onClick?.();
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
          isActive
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <Icon className="w-5 h-5" />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
          <div className="flex flex-col items-center justify-center px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
            <img 
              src="https://cfms.lk/img/itsignature_logo_blue_only.png" 
              alt="IT Signature Logo" 
              className="h-12 w-auto mb-2 brightness-0 invert"
            />
            <h1 className="text-xl font-bold text-white text-center" style={{ fontFamily: 'Work Sans, sans-serif' }}>
              IT Signature ERP
            </h1>
          </div>

          <div className="flex-1 px-4 py-6 space-y-2">
            {filteredMenuItems.map((item) => (
              <NavLink key={item.path} item={item} />
            ))}
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-600 mt-1 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <Button
              data-testid="logout-button"
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <img 
              src="https://cfms.lk/img/itsignature_logo_blue_only.png" 
              alt="IT Signature Logo" 
              className="h-8 w-auto"
            />
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent" style={{ fontFamily: 'Work Sans, sans-serif' }}>
              IT Signature ERP
            </h1>
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="mobile-menu-button">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <div className="flex flex-col h-full">
                <div className="flex flex-col items-center justify-center px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
                  <img 
                    src="https://cfms.lk/img/itsignature_logo_blue_only.png" 
                    alt="IT Signature Logo" 
                    className="h-10 w-auto mb-2 brightness-0 invert"
                  />
                  <h2 className="text-lg font-bold text-white text-center" style={{ fontFamily: 'Work Sans, sans-serif' }}>IT Signature ERP</h2>
                </div>

                <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                  {filteredMenuItems.map((item) => (
                    <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />
                  ))}
                </div>

                <div className="p-4 border-t border-gray-200">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-600 mt-1 capitalize">{user?.role?.replace('_', ' ')}</p>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 mb-3"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                  <div className="text-xs text-gray-600 text-center pt-3 border-t border-gray-200">
                    <p className="font-medium">IT Signature (Pvt) Ltd</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Phone className="w-3 h-3" />
                      <span>011 4848 988 | 077 3966 920</span>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-72 flex-1 flex flex-col">
        <main className="flex-1 pt-20 lg:pt-0 px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        
        {/* Footer */}
        <footer className="hidden lg:block border-t border-gray-200 bg-white py-4 px-8">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <p className="font-medium">IT Signature (Pvt) Ltd</p>
              <p className="text-xs mt-1">Employee Resource Planning System</p>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>Support: 011 4848 988 | 077 3966 920</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
