import React, { useState, useEffect } from 'react';
import { 
  X, Save, User, Calendar, Mail, 
  Briefcase, Globe, Hash, Phone, Heart, MapPin
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { updateEmployee } from '../../api/emoloyees/addEmployees';

const pad2 = (value) => String(value).padStart(2, '0');
const toDateInputKey = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const normalizePhoneDigits = (value) => String(value || '').replace(/\D/g, '');
const isValidIndiaMobile = (digits) => digits.length === 10 && /^[6-9]\d{9}$/.test(digits);

/** Parse stored phone into country code + national digits (matches onboarding payload). */
const parseStoredPhone = (raw) => {
  const s = String(raw || '').trim();
  if (!s) return { phoneCountryCode: '+91', phoneNumber: '' };
  const m = s.match(/^(\+\d{1,4})-(.+)$/);
  if (m) {
    return {
      phoneCountryCode: m[1],
      phoneNumber: normalizePhoneDigits(m[2]).slice(0, 10),
    };
  }
  return { phoneCountryCode: '+91', phoneNumber: normalizePhoneDigits(s).slice(0, 10) };
};

const formatPhoneForApi = (phoneCountryCode, phoneNumber) =>
  `${phoneCountryCode}-${normalizePhoneDigits(phoneNumber)}`;

const emptyAddress = () => ({ street: '', city: '', state: '', postal_code: '', country: '' });

const getPermanentAddressFromProfile = (profileData) => {
  const addr = (profileData?.addresses || []).find((a) => a.address_type === 'PERMANENT');
  if (!addr) return emptyAddress();
  return {
    street: addr.street || '',
    city: addr.city || '',
    state: addr.state || '',
    postal_code: addr.postal_code || '',
    country: addr.country || '',
  };
};

const addressesEqual = (a, b) =>
  a.street === b.street &&
  a.city === b.city &&
  a.state === b.state &&
  a.postal_code === b.postal_code &&
  a.country === b.country;

const EditEmployeeModal = ({ isOpen, employeeId, employeeData, onClose, onSaveSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    employee_id: '',
    designation: '',
    department_id: '',
    employment_type: '',
    work_mode: '',
    join_date: '',
    gender: '',
    date_of_birth: '',
    phoneCountryCode: '+91',
    phoneNumber: '',
    personal_email: '',
    official_email: '',
    address: '',
    blood_group: '',
    marital_status: '',
    nationality: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    relation: '',
    permanent_street: '',
    permanent_city: '',
    permanent_state: '',
    permanent_postal_code: '',
    permanent_country: '',
  });
  const [validationErrors, setValidationErrors] = useState({});

  const maxDobKey = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return toDateInputKey(d);
  })();

  useEffect(() => {
    if (employeeData && isOpen) {
      const profileData = employeeData?.employee ? null : employeeData;
      const addresses = profileData?.addresses || [];
      const currentAddress = addresses.find((a) => a.address_type === 'CURRENT') || addresses[0];
      const fallbackAddress = currentAddress
        ? `${currentAddress.street || ''}, ${currentAddress.city || ''}, ${currentAddress.state || ''} ${currentAddress.postal_code || ''}, ${currentAddress.country || ''}`.trim()
        : '';

      const officialEmail =
        employeeData.employee?.official_email ||
        employeeData.personal_info?.official_email ||
        profileData?.official_email ||
        profileData?.user?.official_email ||
        '';

      const personalEmail =
        employeeData.personal_info?.email ||
        profileData?.personal_email ||
        '';

      const rawPhone = employeeData.personal_info?.phone || profileData?.phone_number || '';
      const { phoneCountryCode, phoneNumber } = parseStoredPhone(rawPhone);

      const emergencyContact = profileData?.emergency_contacts?.[0];
      const emergencyPhoneDigits = normalizePhoneDigits(emergencyContact?.phone || emergencyContact?.phone_number || '');
      const permanentAddress = getPermanentAddressFromProfile(profileData);

      setFormData({
        full_name: employeeData.employee?.full_name || `${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim(),
        employee_id:
          employeeData.employee?.employee_id ||
          profileData?.employee_id ||
          profileData?.user?.employee_id ||
          '',
        designation: employeeData.employee?.designation || profileData?.designation || '',
        department_id: employeeData.employee?.department?.id || '',
        employment_type: employeeData.employment_details?.employment_type || profileData?.employment_type || '',
        work_mode: employeeData.employment_details?.work_mode || profileData?.work_mode || '',
        join_date: employeeData.employee?.date_of_joining || profileData?.date_of_joining || '',
        gender: employeeData.personal_info?.gender || profileData?.gender || '',
        date_of_birth: employeeData.personal_info?.date_of_birth || profileData?.date_of_birth || '',
        phoneCountryCode,
        phoneNumber,
        personal_email: personalEmail,
        official_email: officialEmail,
        address: employeeData.personal_info?.address || fallbackAddress || '',
        blood_group: profileData?.blood_group || '',
        marital_status: profileData?.marital_status || '',
        nationality: profileData?.nationality || '',
        emergency_contact_name: emergencyContact?.name || '',
        emergency_contact_phone: emergencyPhoneDigits,
        relation: emergencyContact?.relation || emergencyContact?.relationship || '',
        permanent_street: permanentAddress.street,
        permanent_city: permanentAddress.city,
        permanent_state: permanentAddress.state,
        permanent_postal_code: permanentAddress.postal_code,
        permanent_country: permanentAddress.country,
      });
      setValidationErrors({});
    }
  }, [employeeData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation to prevent invalid payloads
    const errors = {};
    if (!formData.full_name.trim()) errors.full_name = 'Full name is required';
    if (!formData.employee_id.trim()) errors.employee_id = 'Employee ID is required';
    if (!formData.designation.trim()) errors.designation = 'Designation is required';
    if (!formData.join_date) errors.join_date = 'Join date is required';
    if (!formData.work_mode) errors.work_mode = 'Work mode is required';
    if (!formData.employment_type) errors.employment_type = 'Employment type is required';
    if (!formData.gender) errors.gender = 'Gender is required';
    if (!formData.date_of_birth) errors.date_of_birth = 'Date of birth is required';
    if (!formData.phoneNumber || !String(formData.phoneNumber).trim()) {
      errors.phone = 'Phone number is required';
    } else {
      const phoneDigits = normalizePhoneDigits(formData.phoneNumber);
      if (!isValidIndiaMobile(phoneDigits)) {
        errors.phone = 'Enter a valid 10-digit mobile number';
      }
    }
    if (!formData.personal_email.trim()) {
      errors.personal_email = 'Personal email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.personal_email)) {
      errors.personal_email = 'Invalid personal email format';
    }
    if (!formData.official_email.trim()) {
      errors.official_email = 'Official email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.official_email)) {
      errors.official_email = 'Invalid official email format';
    }
    if (formData.emergency_contact_phone) {
      const emergencyDigits = normalizePhoneDigits(formData.emergency_contact_phone);
      if (!isValidIndiaMobile(emergencyDigits)) {
        errors.emergency_contact_phone = 'Enter a valid 10-digit emergency contact number';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }

    const dobKey = String(formData.date_of_birth || '').split('T')[0];
    if (dobKey && dobKey > maxDobKey) {
      toast.error('Employee must be at least 18 years old');
      return;
    }
    setValidationErrors({});

    // 1. Calculate ONLY changed fields (The Diff)
    const updateData = {};
    
    // Map of current form state
    const currentValues = {
      full_name: formData.full_name,
      employee_id: formData.employee_id.trim(),
      designation: formData.designation,
      departmentId: formData.department_id,
      employment_type: formData.employment_type,
      work_mode: formData.work_mode,
      join_date: formData.join_date,
      gender: formData.gender,
      date_of_birth: formData.date_of_birth,
      phone: formatPhoneForApi(formData.phoneCountryCode, formData.phoneNumber),
      personal_email: formData.personal_email,
      official_email: formData.official_email,
      address: formData.address,
      blood_group: formData.blood_group,
      marital_status: formData.marital_status,
      nationality: formData.nationality,
      emergency_contact_name: formData.emergency_contact_name,
      emergency_contact_phone: normalizePhoneDigits(formData.emergency_contact_phone),
      relation: formData.relation,
    };

    // Map of original data
    const profileData = employeeData?.employee ? null : employeeData;
    const addresses = profileData?.addresses || [];
    const currentAddress = addresses.find((a) => a.address_type === 'CURRENT') || addresses[0];
    const fallbackAddress = currentAddress
      ? `${currentAddress.street || ''}, ${currentAddress.city || ''}, ${currentAddress.state || ''} ${currentAddress.postal_code || ''}, ${currentAddress.country || ''}`.trim()
      : '';

    const originalOfficialEmail =
      employeeData.employee?.official_email ||
      employeeData.personal_info?.official_email ||
      profileData?.official_email ||
      profileData?.user?.official_email ||
      '';

    const originalPersonalEmail =
      employeeData.personal_info?.email ||
      profileData?.personal_email ||
      '';

    const originalPhoneRaw = employeeData.personal_info?.phone || profileData?.phone_number || '';
    const originalParsed = parseStoredPhone(originalPhoneRaw);
    const originalPhoneFormatted = formatPhoneForApi(originalParsed.phoneCountryCode, originalParsed.phoneNumber);

    const originalEmergencyContact = profileData?.emergency_contacts?.[0];

    const originalValues = {
      full_name: employeeData.employee?.full_name || `${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim(),
      employee_id:
        employeeData.employee?.employee_id ||
        profileData?.employee_id ||
        profileData?.user?.employee_id ||
        '',
      designation: employeeData.employee?.designation || profileData?.designation || '',
      departmentId: employeeData.employee?.department?.id || '',
      employment_type: employeeData.employment_details?.employment_type || profileData?.employment_type || '',
      work_mode: employeeData.employment_details?.work_mode || profileData?.work_mode || '',
      join_date: employeeData.employee?.date_of_joining || profileData?.date_of_joining || '',
      gender: employeeData.personal_info?.gender || profileData?.gender || '',
      date_of_birth: employeeData.personal_info?.date_of_birth || profileData?.date_of_birth || '',
      phone: originalPhoneFormatted,
      personal_email: originalPersonalEmail,
      official_email: originalOfficialEmail,
      address: employeeData.personal_info?.address || fallbackAddress || '',
      blood_group: profileData?.blood_group || '',
      marital_status: profileData?.marital_status || '',
      nationality: profileData?.nationality || '',
      emergency_contact_name: originalEmergencyContact?.name || '',
      emergency_contact_phone: normalizePhoneDigits(originalEmergencyContact?.phone || originalEmergencyContact?.phone_number || ''),
      relation: originalEmergencyContact?.relation || originalEmergencyContact?.relationship || '',
    };

    // Only pick the keys that changed
    Object.keys(currentValues).forEach(key => {
      if (currentValues[key] !== originalValues[key]) {
        updateData[key] = currentValues[key];
      }
    });

    const currentPermanent = {
      street: formData.permanent_street,
      city: formData.permanent_city,
      state: formData.permanent_state,
      postal_code: formData.permanent_postal_code,
      country: formData.permanent_country,
    };
    const originalPermanent = getPermanentAddressFromProfile(profileData);

    if (!addressesEqual(currentPermanent, originalPermanent)) {
      updateData.permanent_address = currentPermanent;
    }

    if (Object.keys(updateData).length === 0) {
      toast.success("No changes to update");
      return onClose();
    }

    setLoading(true);
    try {
      const id = employeeId || employeeData.employee?.id || employeeData.user_id;
      await updateEmployee(id, updateData);
      toast.success("Employee updated successfully! 🎉");
      
      // 3. Trigger refresh and close
      onSaveSuccess(); 
      onClose();
    } catch (error) {
      const errorData = error.response?.data;
      const existingUser = errorData?.existing_user;
      const isEmployeeIdConflict =
        String(errorData?.message || '').toLowerCase().includes('employeeid already exists') ||
        Boolean(existingUser);

      if (isEmployeeIdConflict) {
        const existingName =
          existingUser?.name ||
          [existingUser?.first_name, existingUser?.last_name].filter(Boolean).join(' ').trim() ||
          'another employee';
        toast.error(`Employee ID already exists. Assigned to ${existingName}`);
      } else {
        toast.error(errorData?.message || 'Failed to update employee');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slideUp border border-gray-100">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EB4000]/10 flex items-center justify-center">
              <User className="text-[#EB4000]" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Employee Profile</h2>
              <p className="text-xs text-gray-500 font-medium">Update specific fields to save changes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar bg-[#FDFDFD]">
          <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-10">
            
            {/* Professional Details */}
            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-[#EB4000] rounded-full"></div>
                <h3 className="font-bold text-gray-900 uppercase tracking-widest text-[11px]">Professional Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputField label="Full Name" name="full_name" value={formData.full_name} onChange={handleChange} icon={<User size={16}/>} />
                <InputField label="Employee ID" name="employee_id" value={formData.employee_id} onChange={handleChange} icon={<Hash size={16}/>} />
                <InputField label="Designation" name="designation" value={formData.designation} onChange={handleChange} icon={<Briefcase size={16}/>} />
                <InputField label="Join Date" name="join_date" type="date" value={formData.join_date} onChange={handleChange} icon={<Calendar size={16}/>} />
                <InputField label="Official Email" name="official_email" value={formData.official_email} onChange={handleChange} icon={<Mail size={16} />} />
                
                <SelectField label="Work Mode" name="work_mode" value={formData.work_mode} onChange={handleChange} icon={<Globe size={16}/>}>
                  <option value="ONSITE">Office</option>
                  <option value="REMOTE">Remote</option>
                  <option value="HYBRID">Hybrid</option>
                </SelectField>

                <SelectField label="Employment Type" name="employment_type" value={formData.employment_type} onChange={handleChange} icon={<Hash size={16}/>}>
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERNSHIP">Internship</option>
                  <option value="FREELANCE">Freelance</option>
                </SelectField>
              </div>
            </section>

            <div className="h-px bg-gray-100"></div>

            {/* Personal Details */}
            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-[#EB4000] rounded-full"></div>
                <h3 className="font-bold text-gray-900 uppercase tracking-widest text-[11px]">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SelectField label="Gender" name="gender" value={formData.gender} onChange={handleChange} icon={<User size={16}/>}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </SelectField>
                <InputField
                  label="Date of Birth"
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  icon={<Calendar size={16} />}
                  max={maxDobKey}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">
                    Phone Number <span className="text-[#EB4000] ml-1">*</span>
                  </label>
                  <div
                    className={`flex items-stretch bg-gray-50 border rounded-2xl overflow-hidden ${
                      validationErrors.phone ? 'border-red-300' : 'border-gray-100'
                    } focus-within:ring-4 focus-within:ring-[#EB4000]/5 focus-within:border-[#EB4000] transition-all`}
                  >
                    <div className="relative flex items-center px-4 border-r border-gray-200">
                      <div className="w-5 h-4 bg-[#EB4000] rounded-[2px] mr-2" />
                      <select
                        value={formData.phoneCountryCode}
                        onChange={(e) => {
                          setFormData((prev) => ({ ...prev, phoneCountryCode: e.target.value }));
                          setValidationErrors((prev) => {
                            const next = { ...prev };
                            delete next.phone;
                            return next;
                          });
                        }}
                        className="appearance-none bg-transparent text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer pr-4 z-10"
                      >
                        <option value="+62">+62</option>
                        <option value="+91">+91</option>
                        <option value="+1">+1</option>
                      </select>
                      <svg
                        className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <input
                      type="tel"
                      placeholder="813 7788 2244"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 10) {
                          setFormData((prev) => ({ ...prev, phoneNumber: val }));
                          setValidationErrors((prev) => {
                            const next = { ...prev };
                            delete next.phone;
                            return next;
                          });
                        }
                      }}
                      className="flex-1 px-4 py-3 bg-transparent text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none"
                    />
                  </div>
                  {validationErrors.phone && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">{validationErrors.phone}</p>
                  )}
                </div>
                <InputField label="Personal Email" name="personal_email" value={formData.personal_email} onChange={handleChange} icon={<Mail size={16}/>} />

                <SelectField label="Blood Group" name="blood_group" value={formData.blood_group} onChange={handleChange} icon={<Heart size={16}/>}>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </SelectField>

                <SelectField label="Marital Status" name="marital_status" value={formData.marital_status} onChange={handleChange} icon={<User size={16}/>}>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorced</option>
                </SelectField>

                <InputField label="Nationality" name="nationality" value={formData.nationality} onChange={handleChange} icon={<Globe size={16}/>} />

                {/* Living Address field temporarily disabled as requested */}
                {/* <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Living Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-3.5 text-gray-400" size={18} />
                    <textarea 
                      name="address"
                      rows="2"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-[#EB4000]/5 focus:border-[#EB4000] outline-none transition-all resize-none"
                      placeholder="Enter street address..."
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </div>
                </div> */}
              </div>
            </section>

            <div className="h-px bg-gray-100"></div>

            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-[#EB4000] rounded-full"></div>
                <h3 className="font-bold text-gray-900 uppercase tracking-widest text-[11px]">Emergency Contact</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputField
                  label="Contact Name"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  icon={<User size={16}/>}
                />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">
                    Phone
                  </label>
                  <div
                    className={`relative group ${
                      validationErrors.emergency_contact_phone ? 'ring-1 ring-red-300 rounded-2xl' : ''
                    }`}
                  >
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#EB4000] transition-colors" size={16} />
                    <input
                      type="tel"
                      name="emergency_contact_phone"
                      placeholder="9998887777"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 10) {
                          setFormData((prev) => ({ ...prev, emergency_contact_phone: val }));
                          setValidationErrors((prev) => {
                            const next = { ...prev };
                            delete next.emergency_contact_phone;
                            return next;
                          });
                        }
                      }}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-[#EB4000]/5 focus:border-[#EB4000] transition-all outline-none text-gray-700"
                    />
                  </div>
                  {validationErrors.emergency_contact_phone && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">{validationErrors.emergency_contact_phone}</p>
                  )}
                </div>
                <InputField
                  label="Relation"
                  name="relation"
                  value={formData.relation}
                  onChange={handleChange}
                  icon={<User size={16}/>}
                  placeholder="e.g. Spouse, Father"
                />
              </div>
            </section>

            <div className="h-px bg-gray-100"></div>

            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-[#EB4000] rounded-full"></div>
                <h3 className="font-bold text-gray-900 uppercase tracking-widest text-[11px]">Permanent Address</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <InputField
                    label="Street"
                    name="permanent_street"
                    value={formData.permanent_street}
                    onChange={handleChange}
                    icon={<MapPin size={16}/>}
                  />
                </div>
                <InputField
                  label="City"
                  name="permanent_city"
                  value={formData.permanent_city}
                  onChange={handleChange}
                  icon={<Globe size={16}/>}
                />
                <InputField
                  label="State"
                  name="permanent_state"
                  value={formData.permanent_state}
                  onChange={handleChange}
                  icon={<Globe size={16}/>}
                />
                <InputField
                  label="Postal Code"
                  name="permanent_postal_code"
                  value={formData.permanent_postal_code}
                  onChange={handleChange}
                  icon={<Hash size={16}/>}
                />
                <InputField
                  label="Country"
                  name="permanent_country"
                  value={formData.permanent_country}
                  onChange={handleChange}
                  icon={<Globe size={16}/>}
                />
              </div>
            </section>
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100 flex justify-end items-center gap-4 bg-white sticky bottom-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button 
            form="edit-employee-form"
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 min-w-[180px] px-10 py-3.5 bg-[#EB4000] text-white rounded-2xl text-sm font-bold hover:bg-[#D63A00] transition-all shadow-xl shadow-orange-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <><Save size={18} /> Update Employee</>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
      `}</style>
    </div>
  );
};

const InputField = ({ label, name, type = "text", value, onChange, icon, min, max, placeholder }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#EB4000] transition-colors">{icon}</div>
      <input 
        type={type}
        name={name}
        min={min}
        max={max}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-[#EB4000]/5 focus:border-[#EB4000] transition-all outline-none text-gray-700"
        value={value}
        onChange={onChange}
      />
    </div>
  </div>
);

const SelectField = ({ label, name, value, onChange, icon, children }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{label}</label>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#EB4000] transition-colors">{icon}</div>
      <select 
        name={name}
        className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm appearance-none focus:bg-white focus:border-[#EB4000] focus:ring-4 focus:ring-[#EB4000]/5 outline-none cursor-pointer transition-all text-gray-700"
        value={value}
        onChange={onChange}
      >
        <option value="">Select {label}</option>
        {children}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
        <Hash size={14} />
      </div>
    </div>
  </div>
);

export default EditEmployeeModal;
