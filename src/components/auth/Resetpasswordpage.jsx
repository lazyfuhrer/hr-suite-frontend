import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { resetPasswordHandler } from '../../api/auth';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Shield, AlertCircle, ArrowLeft } from 'lucide-react';
import { useBranding } from '../../context/BrandingContext';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { branding, defaults } = useBranding();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [validations, setValidations] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    passwordsMatch: false
  });

  /* ----------------------------------
     Handlers
  ---------------------------------- */
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'newPassword') {
      validatePassword(value, formData.confirmPassword);
    }

    if (name === 'confirmPassword') {
      validatePassword(formData.newPassword, value);
    }
  };

  const validatePassword = (newPass, confirmPass) => {
    setValidations({
      minLength: newPass.length >= 8,
      hasUpperCase: /[A-Z]/.test(newPass),
      hasLowerCase: /[a-z]/.test(newPass),
      hasNumber: /\d/.test(newPass),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPass),
      passwordsMatch:
        newPass !== '' && confirmPass !== '' && newPass === confirmPass
    });
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const isFormValid = () => {
    return (
      formData.currentPassword &&
      validations.minLength &&
      validations.hasUpperCase &&
      validations.hasLowerCase &&
      validations.hasNumber &&
      validations.hasSpecialChar &&
      validations.passwordsMatch
    );
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!isFormValid()) {
      toast.error('Please meet all password requirements.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordHandler({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      toast.success('Password reset successfully!');

      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  // Get missing password requirements
  const getMissingRequirements = () => {
    const requirements = [];
    if (!validations.minLength) requirements.push('8+ characters');
    if (!validations.hasUpperCase) requirements.push('uppercase');
    if (!validations.hasLowerCase) requirements.push('lowercase');
    if (!validations.hasNumber) requirements.push('number');
    if (!validations.hasSpecialChar) requirements.push('special character');
    return requirements;
  };

  const missingRequirements = getMissingRequirements();
  const hasPasswordValue = formData.newPassword.length > 0;

  /* ----------------------------------
     UI
  ---------------------------------- */
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Panel */}
      <div className="w-1/2 bg-white flex items-center justify-center px-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={branding?.logoUrl || defaults.DEFAULT_COMPANY_LOGO} alt="Company Logo" className="w-14 h-14 object-contain" />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Reset Password
            </h2>
            <p className="text-gray-500 text-sm">
              Create a strong password to keep your account secure
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-5">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 transition-all outline-none bg-gray-50 focus:bg-white"
                  style={{ "--tw-ring-color": "rgb(var(--brand-primary-rgb) / 0.3)", "--tw-ring-opacity": "1" }}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 transition-all outline-none bg-gray-50 focus:bg-white"
                  style={{ "--tw-ring-color": "rgb(var(--brand-primary-rgb) / 0.3)", "--tw-ring-opacity": "1" }}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Missing Requirements - Only shown when there are missing items */}
              {hasPasswordValue && missingRequirements.length > 0 && (
                <div className="mt-2 flex items-start gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Missing: {missingRequirements.join(', ')}
                  </span>
                </div>
              )}

              {/* All requirements met */}
              {hasPasswordValue && missingRequirements.length === 0 && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <Shield size={16} />
                  <span className="font-medium">Strong password</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-4 pr-12 py-3 border rounded-xl focus:ring-2 transition-all outline-none bg-gray-50 focus:bg-white ${
                    formData.confirmPassword && !validations.passwordsMatch 
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-200' 
                      : formData.confirmPassword && validations.passwordsMatch
                      ? 'border-green-300 focus:border-green-400 focus:ring-green-200'
                      : 'border-gray-200'
                  }`}
                  style={!formData.confirmPassword || validations.passwordsMatch
                    ? { "--tw-ring-color": "rgb(var(--brand-primary-rgb) / 0.3)", "--tw-ring-opacity": "1" }
                    : undefined}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password mismatch warning */}
              {formData.confirmPassword && !validations.passwordsMatch && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>Passwords do not match</span>
                </div>
              )}

              {/* Passwords match */}
              {formData.confirmPassword && validations.passwordsMatch && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <Shield size={16} />
                  <span className="font-medium">Passwords match</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid() || loading}
              className="w-full text-white font-semibold py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-200 disabled:hover:shadow-none flex items-center justify-center gap-2 mt-6"
              style={{ backgroundColor: 'var(--brand-primary)', boxShadow: '0 10px 22px rgb(var(--brand-primary-rgb) / 0.3)' }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Updating...
                </>
              ) : (
                <>
                  <Lock size={18} />
                  Reset Password
                </>
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition-colors group"
              style={{ color: 'var(--brand-primary)' }}
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Back to Login
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-1/2 flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: 'var(--brand-primary)' }}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="text-center text-white px-10 relative z-10 max-w-md">
          {/* Company Logo */}
          <div className="flex items-center justify-center w-20 h-20 mb-8 mx-auto">
            <img
              src={branding?.logoUrl || defaults.DEFAULT_COMPANY_LOGO}
              alt="Company Logo"
              className="w-16 h-16 object-contain"
            />
          </div>

          {/* Text Content */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold tracking-[0.2em] mb-3 opacity-90">
                HR SUITE
              </p>
              <h1 className="text-5xl font-bold mb-4 leading-tight">
                Secure Your<br />Account
              </h1>
            </div>
            
            <p className="text-lg opacity-90 leading-relaxed">
              Use a strong password to keep your account safe and protected
            </p>

            {/* Security Features */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/20">
              <div className="text-left">
                <div className="text-2xl font-bold mb-1">256-bit</div>
                <div className="text-sm opacity-75">Encryption</div>
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold mb-1">24/7</div>
                <div className="text-sm opacity-75">Security</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
