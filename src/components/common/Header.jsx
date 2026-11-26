import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../../store/slices/authSlice";

import SearchIcon from "../../assets/employees/search.svg";
import SettingsIcon from "../../assets/employees/GearSix.svg";
import NotificationIcon from "../../assets/employees/BellRinging.svg";
import UserAvatar from "./UserAvatar";
import OrgSwitcher, { canSwitchOrganizations } from "./OrgSwitcher";
import { getProfileImageUrl } from "../../utils/userAvatar";

const Header = ({ title, breadcrumb = [], onBack }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const showOrgSwitcher = canSwitchOrganizations(user);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <header className="w-full flex items-center justify-between mb-4">
      
      <div className="flex items-center gap-4">
        {onBack && (
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}

        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{title}</h1>

          {breadcrumb?.length > 0 && (
            <nav className="flex items-center gap-2 text-xs font-medium mt-1">
              {breadcrumb.map((item, index) => (
                <div key={index} className="flex items-center">
                  <span className={item.active ? 'text-[#EB4000]' : 'text-gray-400'}>
                    {item.label}
                  </span>
                  {index < breadcrumb.length - 1 && (
                    <span className="mx-2 text-gray-300">/</span>
                  )}
                </div>
              ))}
            </nav>
          )}
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-5">

        {/* USER PROFILE */}
        {isAuthenticated && user && (
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setOpen(!open)}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              <UserAvatar
                size="lg"
                imageUrl={getProfileImageUrl(user)}
                firstName={user.firstName}
                lastName={user.lastName}
                className="shadow-sm"
              />

              <div className="hidden md:block text-left">
                <p className="text-sm font-bold text-gray-900 leading-none mb-1">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[11px] text-gray-400 font-bold leading-none capitalize">
                  {user.role}
                </p>
              </div>
            </div>

            {/* Dropdown */}
            <div
              className={`absolute z-100 right-0 top-full mt-3 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-opacity duration-200 ${
                showOrgSwitcher ? "w-72" : "w-44"
              } ${
                open
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              <OrgSwitcher />
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-[#FFF4F0] transition-colors duration-150 z-100"
              >
                Logout
              </button>
            </div>
          </div>
        )}

      </div>
    </header>
  );
};

export default Header;
