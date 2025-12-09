import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Login from "./pages/Login";
import LoginRoleSelection from "./pages/LoginRoleSelection";
import Dashboard from "./pages/Dashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminCompanyDetail from "./pages/SuperAdminCompanyDetail";
import SuperAdminManagement from "./pages/SuperAdminManagement";
import CompanyOnboarding from "./pages/CompanyOnboarding";
import CompanySettings from "./pages/CompanySettings";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import Leaves from "./pages/Leaves";
import Advances from "./pages/Advances";
import Increments from "./pages/Increments";
import Payroll from "./pages/Payroll";
import ActivityLogs from "./pages/ActivityLogs";
import DeletedAttendance from "./pages/DeletedAttendance";
import DeletedEmployees from "./pages/DeletedEmployees";
import Invoices from "./pages/Invoices";
import Estimates from "./pages/Estimates";
import InvoiceCustomers from "./pages/InvoiceCustomers";
import InvoiceProducts from "./pages/InvoiceProducts";
import LocationReports from "./pages/LocationReports";
import AttendanceDetails from "./pages/AttendanceDetails";
import { Toaster } from "./components/ui/sonner";
import { ProtectedRoute } from "./components/ProtectedRoute";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/login/select-role" element={<LoginRoleSelection />} />
          <Route path="/superadmin" element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/companies/:companyId" element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminCompanyDetail />
            </ProtectedRoute>
          } />
          <Route path="/superadmin/admins" element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminManagement />
            </ProtectedRoute>
          } />
          <Route path="/onboarding" element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <CompanyOnboarding />
            </ProtectedRoute>
          } />
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'employee', 'staff_member']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <CompanySettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Employees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'employee', 'staff_member']}>
                <Attendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance/date/:date"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'employee', 'staff_member']}>
                <Attendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance/employee/:employeeId"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'employee', 'staff_member']}>
                <Attendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance/employee/:employeeId/date/:date"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'employee', 'staff_member']}>
                <Attendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance/employee/:employeeId/from/:fromDate/to/:toDate"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'employee', 'staff_member']}>
                <Attendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance/from/:fromDate/to/:toDate"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'employee', 'staff_member']}>
                <Attendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/location-reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <LocationReports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leaves"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'employee', 'staff_member']}>
                <Leaves />
              </ProtectedRoute>
            }
          />
          <Route
            path="/advances"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'employee', 'staff_member']}>
                <Advances />
              </ProtectedRoute>
            }
          />
          <Route
            path="/increments"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'employee', 'staff_member']}>
                <Increments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payroll"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'employee', 'staff_member']}>
                <Payroll />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payroll/month/:month"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'employee', 'staff_member']}>
                <Payroll />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity-logs"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <ActivityLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deleted-attendance"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <DeletedAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/deleted-employees"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <DeletedEmployees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance-details"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <AttendanceDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Invoices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/estimates"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Estimates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoice-customers"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <InvoiceCustomers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoice-products"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <InvoiceProducts />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster 
        position="top-right" 
        closeButton 
        duration={3000}
        toastOptions={{
          style: { 
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500'
          },
          className: 'custom-toast',
          success: {
            style: {
              background: '#10b981',
              color: 'white',
              border: 'none'
            },
            iconTheme: {
              primary: 'white',
              secondary: '#10b981'
            }
          },
          error: {
            style: {
              background: '#ef4444',
              color: 'white',
              border: 'none'
            },
            iconTheme: {
              primary: 'white',
              secondary: '#ef4444'
            }
          },
          warning: {
            style: {
              background: '#f59e0b',
              color: 'white',
              border: 'none'
            },
            iconTheme: {
              primary: 'white',
              secondary: '#f59e0b'
            }
          },
          info: {
            style: {
              background: '#3b82f6',
              color: 'white',
              border: 'none'
            },
            iconTheme: {
              primary: 'white',
              secondary: '#3b82f6'
            }
          }
        }}
      />
    </div>
  );
}

export default App;
