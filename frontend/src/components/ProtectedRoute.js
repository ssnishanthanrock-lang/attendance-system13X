import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Check if user is logged in
  if (!token || !user.role) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has allowed role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'super_admin') {
      return <Navigate to="/superadmin" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};
