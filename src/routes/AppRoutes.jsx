import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import LoginPage from "../components/auth/LoginPage";
import ResetPasswordPage from '../components/auth/Resetpasswordpage';

import { LayoutProvider } from '../context/LayoutContext';
import { BrandingProvider } from '../context/BrandingContext';

import DashboardPage from '../pages/DashboardPage';
import Employees from '../pages/Employees';
import AttendancePage from '../pages/AttendancePage';
// import ActivitiesPage from '../pages/ActivitiesPage';
import Payroll from '../components/payroll/PayRoll';
import LeaveManagement from '../components/leave-management/LeaveManagement';
import Inbox from '../pages/Inbox';
import Calendar from '../pages/Calendar';
import Performance from '../pages/Performance';
import Recruitment from '../pages/Recruitment';
import Department from '../pages/Department';
import Settings from '../pages/Settings';
import RequestsApprovals from '../pages/RequestsApprovals';
import Reimbursements from '../pages/Reimbursements';
import WorkFromHome from '../pages/WorkFromHome';

import DashboardLayout from '../components/common/Layout'
import { isPayrollHiddenForUser } from '../utils/payrollVisibility';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector(state => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PasswordProtectedRoute = ({ children }) => {
  const { user } = useSelector(state => state.auth);
  return user?.must_change_password ? <Navigate to="/reset-password" replace /> : children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  if (isAuthenticated && !user?.must_change_password) return <Navigate to="/dashboard" replace />;
  return children;
};

const ManagerRoute = ({children})=>{
  const {user} = useSelector(state => state.auth);
  return ["admin", "hr"].includes(user?.role) ? children : <Navigate to="/dashboard" replace/>;
}

const PayrollRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  return isPayrollHiddenForUser(user) ? <Navigate to="/dashboard" replace /> : children;
};

const RootRedirect = () => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.must_change_password) return <Navigate to="/reset-password" replace />;
  return <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
  return (
    <BrandingProvider>
      <LayoutProvider>
        <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

        <Route element={
          <ProtectedRoute>
            <PasswordProtectedRoute>
              <DashboardLayout />
            </PasswordProtectedRoute>
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/payroll" element={<PayrollRoute><Payroll /></PayrollRoute>} />
          <Route path="/leave-management" element={<LeaveManagement />} />
          <Route path="/requests-approvals" element={<RequestsApprovals />} />
          <Route path="/reimbursements" element={<Reimbursements />} />
          <Route path="/work-from-home" element={<WorkFromHome />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/recruitment" element={<Recruitment />} />
          <Route path="/department" element={
            <ManagerRoute>
              <Department />
            </ManagerRoute>
          }/>
          {/* 
            <Route path="/activities" element={
              <ManagerRoute>
                <ActivitiesPage />
              </ManagerRoute>
            }/>
          */}
          <Route path="/setting"  element={
              <ManagerRoute>
               <Settings />
              </ManagerRoute>
          }/>
        </Route>

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LayoutProvider>
    </BrandingProvider>
  );
};

export default AppRoutes;
