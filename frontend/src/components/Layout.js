import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Banknote,
  Wallet,
  Menu,
  LogOut,
  Phone,
  Settings,
  ChevronDown,
  ChevronRight,
  MapPin,
} from 'lucide-react';
import ImpersonationBanner from './ImpersonationBanner';
import { getImpersonationState, clearImpersonationState } from '../utils/impersonation';
import { api } from '../App';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [impersonationState, setImpersonationState] = useState(null);
  const [applyMenuOpen, setApplyMenuOpen] = useState(false);
  const [invoicingMenuOpen, setInvoicingMenuOpen] = useState(false);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    // Check if impersonating
    const impersonation = getImpersonationState();
    setImpersonationState(impersonation);
    
    // Try to get cached company info first
    const cachedCompanyInfo = localStorage.getItem('companyInfo');
    if (cachedCompanyInfo) {
      const data = JSON.parse(cachedCompanyInfo);
      setCompanyInfo(data);
      if (data.name) {
        document.title = `${data.name} - ERP System`;
      }
      if (data.favicon) {
        updateFavicon(data.favicon);
      }
    }
    
    // Fetch fresh company info
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
        
        // Cache company info
        localStorage.setItem('companyInfo', JSON.stringify(data));
        
        // Update page title
        if (data.name) {
          document.title = `${data.name} - IT Signature ERP`;
        }
        
        // Update favicon if company has one
        if (data.favicon) {
          updateFavicon(data.favicon);
        }
      }
    } catch (error) {
      console.error('Failed to fetch company info:', error);
    }
  };

  const updateFavicon = (faviconUrl) => {
    // Remove existing favicon links
    const existingLinks = document.querySelectorAll("link[rel*='icon']");
    existingLinks.forEach(link => link.remove());

    // Add new favicon with border radius styling
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = faviconUrl;
    document.head.appendChild(link);

    // Add styles to favicon container if possible
    const style = document.createElement('style');
    style.textContent = `
      link[rel*='icon'] {
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('companyInfo');
    clearImpersonationState();
    navigate('/login');
  };

  const handleExitImpersonation = async () => {
    try {
      const response = await api.post('/superadmin/exit-impersonation');
      
      // Restore original token
      localStorage.setItem('token', response.data.token);
      
      // Restore original user (fetch from backend or stored backup)
      const currentUser = JSON.parse(localStorage.getItem('user'));
      const restoredUser = {
        ...currentUser,
        company_id: null,
        role: 'super_admin',
        is_impersonating: false
      };
      localStorage.setItem('user', JSON.stringify(restoredUser));
      
      // Clear impersonation state
      clearImpersonationState();
      
      // Navigate to super admin dashboard
      window.location.href = '/superadmin';
    } catch (error) {
      console.error('Failed to exit impersonation:', error);
      // Fallback: clear state and navigate to login
      clearImpersonationState();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'employee', 'staff_member'] },
    { path: '/employees', label: 'Employees', icon: Users, roles: ['admin', 'manager'] },
    { path: '/attendance', label: 'Attendance', icon: Calendar, roles: ['admin', 'manager', 'employee', 'staff_member'] },
    { path: '/location-reports', label: 'Location Reports', icon: MapPin, roles: ['admin', 'manager'], requiresLocationTracking: true },
    { path: '/payroll', label: 'Payroll', icon: Banknote, roles: ['admin', 'manager', 'employee', 'staff_member'] },
    { 
      label: 'Apply', 
      icon: FileText, 
      roles: ['admin', 'manager'],
      isDropdown: true,
      children: [
        { path: '/leaves', label: 'Leaves', icon: FileText },
        { path: '/advances', label: 'Advances', icon: Wallet },
      ]
    },
    { 
      label: 'Invoicing', 
      icon: FileText, 
      roles: ['admin', 'manager'],
      isDropdown: true,
      requiresInvoicing: true,
      children: [
        { path: '/invoices', label: 'Invoices', icon: FileText },
        { path: '/estimates', label: 'Estimates', icon: FileText },
        { path: '/invoice-customers', label: 'Customers', icon: Users },
        { path: '/invoice-products', label: 'Products', icon: Wallet },
      ]
    },
  ];

  // Profile section items (shown at bottom)
  const profileMenuItems = [
    { path: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'manager'], smaller: true },
    { path: '/activity-logs', label: 'Activity Logs', icon: FileText, roles: ['admin', 'manager'], smaller: true },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    const hasRole = item.roles.includes(user?.role);
    if (item.requiresInvoicing) {
      return hasRole && companyInfo?.invoicing_enabled;
    }
    if (item.requiresLocationTracking) {
      return hasRole && companyInfo?.location_tracking_enabled;
    }
    return hasRole;
  });

  const NavLink = ({ item, onClick }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    const isChildActive = item.children?.some(child => location.pathname === child.path);
    const textSize = item.smaller ? 'text-xs' : 'text-sm';

    // Dropdown menu item
    if (item.isDropdown) {
      // Determine which menu state to use based on the menu label
      const isInvoicingMenu = item.label === 'Invoicing';
      const menuOpen = isInvoicingMenu ? invoicingMenuOpen : applyMenuOpen;
      const setMenuOpen = isInvoicingMenu ? setInvoicingMenuOpen : setApplyMenuOpen;
      
      return (
        <div className="w-full">
          <button
            data-testid={`nav-${item.label.toLowerCase()}`}
            onClick={() => setMenuOpen(!menuOpen)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all ${textSize} ${
              isChildActive
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </div>
            {menuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {menuOpen && (
            <div className="ml-6 mt-1 space-y-1">
              {item.children.map((child) => {
                const ChildIcon = child.icon;
                const childActive = location.pathname === child.path;
                return (
                  <button
                    key={child.path}
                    data-testid={`nav-${child.label.toLowerCase()}`}
                    onClick={() => {
                      navigate(child.path);
                      onClick?.();
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                      childActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ChildIcon className="w-3 h-3" />
                    <span className="text-sm">{child.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Regular menu item
    return (
      <button
        data-testid={`nav-${item.label.toLowerCase()}`}
        onClick={() => {
          navigate(item.path);
          onClick?.();
        }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${textSize} ${
          isActive
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <Icon className="w-4 h-4" />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Impersonation Banner */}
      {impersonationState && (
        <ImpersonationBanner
          companyName={impersonationState.companyName}
          canEdit={impersonationState.canEdit}
          onExit={handleExitImpersonation}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:fixed lg:flex lg:w-72 lg:flex-col ${impersonationState ? 'lg:top-[48px] lg:bottom-0' : 'lg:inset-y-0'}`}>
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
          <div className="flex flex-col items-center justify-center px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
            {companyInfo?.logo ? (
              <div className="relative h-12 w-auto mb-2 flex items-center justify-center">
                <img 
                  src={companyInfo.logo} 
                  alt={`${companyInfo.name} Logo`} 
                  className="h-12 w-auto object-contain brightness-0 invert rounded-lg"
                  style={{ borderRadius: '8px' }}
                />
              </div>
            ) : (
              <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl font-bold text-white">
                  {companyInfo?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || 'IT'}
                </span>
              </div>
            )}
            <h1 className="text-xl font-bold text-white text-center" style={{ fontFamily: 'Work Sans, sans-serif' }}>
              {companyInfo?.name || 'IT Signature ERP'}
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {filteredMenuItems.map((item) => (
              <NavLink key={item.path} item={item} />
            ))}
          </div>

          <div className="p-3 border-t border-gray-200">
            {/* Profile Menu Items */}
            {profileMenuItems.filter((item) => item.roles.includes(user?.role)).map((item) => (
              <NavLink key={item.path} item={item} />
            ))}
            
            {/* User Info */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 mb-2 mt-3">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-600 mt-0.5 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            
            {/* Logout Button */}
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
      <div className={`lg:hidden fixed left-0 right-0 z-40 bg-white border-b border-gray-200 ${impersonationState ? 'top-[48px]' : 'top-0'}`}>
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            {companyInfo?.logo ? (
              <img 
                src={companyInfo.logo} 
                alt={`${companyInfo.name} Logo`} 
                className="h-8 w-auto object-contain rounded"
                style={{ borderRadius: '4px' }}
              />
            ) : (
              <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {companyInfo?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || 'IT'}
                </span>
              </div>
            )}
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent" style={{ fontFamily: 'Work Sans, sans-serif' }}>
              {companyInfo?.name || 'IT Signature ERP'}
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
                  {companyInfo?.logo ? (
                    <img 
                      src={companyInfo.logo} 
                      alt={`${companyInfo.name} Logo`} 
                      className="h-10 w-auto mb-2 brightness-0 invert object-contain rounded-lg"
                      style={{ borderRadius: '6px' }}
                    />
                  ) : (
                    <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center mb-2">
                      <span className="text-xl font-bold text-white">
                        {companyInfo?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || 'IT'}
                      </span>
                    </div>
                  )}
                  <h2 className="text-lg font-bold text-white text-center" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                    {companyInfo?.name || 'IT Signature ERP'}
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                  {filteredMenuItems.map((item) => (
                    <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />
                  ))}
                </div>

                <div className="p-3 border-t border-gray-200">
                  {/* Profile Menu Items */}
                  {profileMenuItems.filter((item) => item.roles.includes(user?.role)).map((item) => (
                    <NavLink key={item.path} item={item} onClick={() => setMobileMenuOpen(false)} />
                  ))}
                  
                  {/* User Info */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 mb-2 mt-3">
                    <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5 capitalize">{user?.role?.replace('_', ' ')}</p>
                  </div>
                  
                  {/* Logout Button */}
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
      <div className={`lg:pl-72 flex-1 flex flex-col ${impersonationState ? 'lg:pt-[48px]' : ''}`} style={{ marginTop: '20px' }}>
        <main className={`flex-1 lg:pt-0 px-4 sm:px-6 lg:px-8 py-8 ${impersonationState ? 'pt-[112px]' : 'pt-20'}`}>{children}</main>
        
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
