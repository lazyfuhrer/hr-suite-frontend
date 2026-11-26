import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { setCredentials, setTempToken } from '../../store/slices/authSlice';
import { loginHandler, selectOrgHandler } from '../../api/auth';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '../../context/BrandingContext';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { branding, defaults } = useBranding();

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // UI State
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Organization Selection State
  const [showOrgSelect, setShowOrgSelect] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');

  // 1. Validation Logic
  const validateForm = () => {
    let newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // 2. Handle Initial Login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await loginHandler(formData);

      // Store Selection Token Temporarily (Required for selectOrg API header)
      // We update Redux/LocalStorage so the axios interceptor can pick it up
      dispatch(setTempToken(res.selection_token));

      // Logic: Check Organization Length
      if (res.organizations.length === 1) {
        // Case A: Only 1 Org - Auto Select
        await handleOrgSelection(res.organizations[0].org_id);
      } else if (res.organizations.length > 1) {
        // Case B: Multiple Orgs - Show Dropdown
        setOrganizations(res.organizations);
        setShowOrgSelect(true);
        toast.success('Please select an organization to continue.');
      } else {
        toast.error('No organizations found for this user.');
      }

    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Organization Selection (Final Step)
  const handleOrgSelection = async (orgId) => {
    setLoading(true);
    try {
      // Call Select Org API
      const res = await selectOrgHandler({ orgId });
      const role = String(res?.user?.role || '').toLowerCase();

      if (role === 'employee') {
        toast.error('Employee accounts are not allowed to access this admin panel.');
        return;
      }

      // Save Final Tenant Token and User to Redux
      dispatch(setCredentials({ 
        user: res.user, 
        token: res.token,
        refreshToken: res.refresh_token,
      }));


      toast.success('Login Successful!');

      // 4. Check for Forced Password Reset
      if (res.user.must_change_password) {
        navigate('/reset-password');
      } else {
        navigate('/dashboard');
      }

    } catch (error) {
      console.error(error);
      toast.error('Failed to select organization.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left Panel - Orange */}
      <div className="w-1/2 flex flex-col items-center justify-center relative" style={{ backgroundColor: 'var(--brand-primary)' }}>
        <div className="text-center">
          <h2 className="text-white text-sm font-medium mb-4 tracking-wider">HR Suite</h2>
          <h1 className="text-white text-5xl font-bold mb-4">Welcome to HR Suite</h1>
          <p className="text-white text-base opacity-90">
            Manage your HR tasks smarter, faster, and easier — all in one place.
          </p>
        </div>
      </div>

      {/* Right Panel - White */}
      <div className="w-1/2 bg-white flex flex-col items-center justify-center px-16">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={branding?.logoUrl || defaults.DEFAULT_COMPANY_LOGO} alt="Company Logo" className="w-16 h-16 object-contain" />
          </div>

          <h2 className="text-center text-2xl font-bold text-gray-800 mb-2">Welcome Back</h2>
          <p className="text-center text-gray-500 text-sm mb-8">
            Log in to your HR Suite dashboard to continue managing your team
          </p>

          {!showOrgSelect ? (
            /* --- STEP 1: LOGIN FORM --- */
            <form onSubmit={handleLogin}>
              {/* Email Input */}
              <div className="mb-5">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="e.g. sarah.johnson@email.com"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                  style={{ "--tw-ring-color": "rgb(var(--brand-primary-rgb) / 0.35)" }}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Password Input */}
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                  style={{ "--tw-ring-color": "rgb(var(--brand-primary-rgb) / 0.35)" }}
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity duration-200 disabled:bg-gray-400"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>
          ) : (
            /* --- STEP 2: ORGANIZATION SELECTION --- */
            <div className="animate-fade-in">
               <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Organization
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 bg-white"
                  style={{ "--tw-ring-color": "rgb(var(--brand-primary-rgb) / 0.35)" }}
                >
                  <option value="" disabled>Choose an organization</option>
                  {organizations.map((org) => (
                    <option key={org.org_id} value={org.org_id}>
                      {org.name} ({org.company_code})
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => handleOrgSelection(selectedOrgId)}
                disabled={loading || !selectedOrgId}
                className="w-full text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity duration-200 disabled:bg-gray-400"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                 {loading ? 'Accessing Workspace...' : 'Continue to Workspace'}
              </button>
              
              <button
                onClick={() => { setShowOrgSelect(false); setOrganizations([]); }}
                className="w-full mt-3 text-gray-600 text-sm hover:underline"
              >
                Back to Login
              </button>
            </div>
          )}

          {/* Register Link (Only show on Step 1) */}
          {!showOrgSelect && (
            <p className="text-center text-sm text-gray-600 mt-6">
              Don't have an account?{' '}
              <button type="button" className="font-semibold hover:underline" style={{ color: 'var(--brand-primary)' }}>
                Register now
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
