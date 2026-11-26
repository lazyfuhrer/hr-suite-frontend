import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ClipboardCheck, Receipt, House } from 'lucide-react';

// Asset Imports
import Dash from "../../assets/sidebar/dash.svg";
import Emp from "../../assets/sidebar/empl.svg";
import Leave from "../../assets/sidebar/leave.svg";
import Pay from "../../assets/sidebar/pay.svg";
import AttendanceIcon from "../../assets/sidebar/dash.svg"; 
import Gear from "../../assets/sidebar/Vector.svg";

import CompanyLogo from "../../assets/logo/companyLogo.svg";
import { useSelector } from 'react-redux';
import { useBranding } from '../../context/BrandingContext';
import { isPayrollHiddenForUser } from '../../utils/payrollVisibility';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {user} = useSelector(state => state.auth);
  const { branding } = useBranding();

 const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Dash, path: '/dashboard' },
  { id: 'employees', label: 'Employees', icon: Emp, path: '/employees' },
  { id: 'attendance', label: 'Attendance', icon: AttendanceIcon, path: '/attendance' },
  { id: 'requests', label: 'Requests & Approvals', iconComponent: ClipboardCheck, path: '/requests-approvals' },
  { id: 'reimbursements', label: 'Reimbursements', iconComponent: Receipt, path: '/reimbursements' },
  { id: 'wfh', label: 'Work From Home', iconComponent: House, path: '/work-from-home' },
  { id: 'payroll', label: 'Payroll', icon: Pay, path: '/payroll' },
  { id: 'leave', label: 'Leave Management', icon: Leave, path: '/leave-management' },
];

// Add Department for admin + hr
if (['admin', 'hr'].includes(user?.role)) {
  menuItems.push({ id: 'department', label: 'Department', icon: Dash, path: '/department' });
}

// Keep Settings admin-only
if (user?.role === 'admin') {
  menuItems.push(
    // { id: 'activities', label: 'Activities', iconComponent: Activity, path: '/activities' },
    { id: 'setting', label: 'Settings', icon: Gear, path: '/setting' }
  );
}

const shouldHidePayroll = isPayrollHiddenForUser(user);
const visibleMenuItems = shouldHidePayroll
  ? menuItems.filter((item) => item.id !== 'payroll')
  : menuItems;

const isActive = (path) => location.pathname === path;

  return (
    <div className="flex flex-col h-screen w-64 bg-white border-r border-gray-200">
      {/* Logo Section - Now using the SVG Logo */}
      <div className="p-4 flex items-center justify-start gap-3">
        <img 
          src={branding?.logoUrl || CompanyLogo}
          alt={`${branding?.name || "Company"} Logo`}
          className="h-10 w-10 rounded-lg object-contain bg-white border border-gray-100"
        />
        <span className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">
          {branding?.name || "Shloka Solutions"}
        </span>
      </div>

      {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
        {visibleMenuItems.map((item) => (
            <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`
                w-full flex items-center gap-3 px-4 py-2.5 mb-1 rounded-lg
                transition-all duration-200 text-left
                ${
                isActive(item.path)
                    ? 'bg-[#EB4000] text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }
            `}
            >
            {item.iconComponent ? (
              <item.iconComponent className={`w-5 h-5 ${isActive(item.path) ? 'text-white' : 'text-gray-500'}`} />
            ) : (
              <img 
                  src={item.icon} 
                  alt={item.label}
                  className={`w-5 h-5 object-contain ${isActive(item.path) ? 'brightness-0 invert' : ''}`} 
              />
            )}
            <span className="text-sm font-medium">{item.label}</span>
            </button>
        ))}
        </nav>

      {/* Bottom Promotional Section */}
      {/* <div className="p-4">
        <div className="bg-[#FFF4F0] rounded-xl p-4 border border-[#FBD9CC]">
          <h3 className="text-gray-900 font-bold text-sm mb-2">
            Level Up Your HR System
          </h3>
          <p className="text-gray-600 text-[11px] mb-4 leading-relaxed">
            Unlock Pro plan to get full control with advanced modules & extended layouts
          </p>
          <button className="w-full bg-[#EB4000] text-white py-2 rounded-lg text-xs font-semibold hover:bg-[#d43800] transition-colors">
            Get TeamHub Pro
          </button>
        </div>
      </div> */}
    </div>
  );
};

export default Sidebar;
