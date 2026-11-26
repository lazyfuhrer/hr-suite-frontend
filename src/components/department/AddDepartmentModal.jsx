/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Check, Building2, Users, Calendar, Clock, MapPin, UserCircle } from 'lucide-react';
import { createDepartment, getUsers, updateDepartment } from '../../api/emoloyees/addEmployees';
import { getDepartmentById } from '../../api/departments';
import { getOfficeLocations, getWorkShifts } from '../../api/settings';
import { toast } from 'react-hot-toast';
import UserAvatar from '../common/UserAvatar';
import { getProfileImageUrl } from '../../utils/userAvatar';

const AddDepartmentModal = ({ isOpen, onClose, onSuccess, editData = null }) => {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [officeLocations, setOfficeLocations] = useState([]);
  const [workShifts, setWorkShifts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [managerSearchTerm, setManagerSearchTerm] = useState('');
  const [locationSearchTerm, setLocationSearchTerm] = useState('');
  const [isDaysOpen, setIsDaysOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const daysRef = useRef(null);
  
  const initialForm = {
    name: '',
    location_ids: [],
    manager_ids: [],
    default_shift_id: '',
    working_days: [],
    employee_ids: [],
    location_tracking_enabled: false
  };

  const [formData, setFormData] = useState(initialForm);

  const unwrapList = (res) => res?.data ?? res?.items ?? res ?? [];

  const normalizeUser = (user = {}) => {
    const fullName = user.full_name
      || `${user.first_name || ''} ${user.last_name || ''}`.trim()
      || user.official_email
      || 'User';
    return { ...user, full_name: fullName };
  };

  const uniqById = (items = []) => {
    const map = new Map();
    items.forEach((item) => {
      if (item?.id) map.set(item.id, item);
    });
    return Array.from(map.values());
  };

  const hydrateEditData = async (departmentId) => {
    setDataLoading(true);
    try {
      const data = await getDepartmentById(departmentId);

      const selectedManagers = (data?.managers?.selected_managers || []).map(normalizeUser);
      const unselectedManagers = (data?.managers?.unselected_managers || []).map(normalizeUser);
      const selectedEmployees = (data?.employees?.selected_users || []).map(normalizeUser);
      const unselectedEmployees = (data?.employees?.unselected_users || []).map(normalizeUser);
      const selectedLocations = data?.locations?.selected_locations || [];
      const unselectedLocations = data?.locations?.unselected_locations || [];
      const selectedShifts = data?.shifts?.selected_shifts || [];
      const unselectedShifts = data?.shifts?.unselected_shifts || [];

      setManagers(uniqById([...selectedManagers, ...unselectedManagers]));
      setEmployees(uniqById([...selectedEmployees, ...unselectedEmployees]));
      setOfficeLocations(uniqById([...selectedLocations, ...unselectedLocations]));
      setWorkShifts(uniqById([...selectedShifts, ...unselectedShifts]));

      const managerIds = data?.manager_ids?.length
        ? data.manager_ids
        : selectedManagers.map((mgr) => mgr.id).filter(Boolean);
      const employeeIds = selectedEmployees.map((emp) => emp.id).filter(Boolean);
      const locationIds = data?.location_ids?.length
        ? data.location_ids
        : selectedLocations.map((loc) => loc.id).filter(Boolean);
      const shiftId = data?.default_shift_id || selectedShifts?.[0]?.id || '';
      const selectedWorkingDays = data?.working_days?.length
        ? data.working_days
        : (data?.workings_days?.selected_working_days || []);

      setFormData({
        name: data?.name || '',
        location_ids: locationIds,
        manager_ids: managerIds,
        default_shift_id: shiftId,
        working_days: selectedWorkingDays,
        employee_ids: employeeIds,
        location_tracking_enabled: Boolean(data?.location_tracking_enabled)
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load department details");
    } finally {
      setDataLoading(false);
    }
  };

  const fetchCreateModeData = async () => {
    setDataLoading(true);
    try {
      const [usersRes, locationsRes, shiftsRes] = await Promise.all([
        getUsers({ page: 1, limit: 100 }),
        getOfficeLocations(),
        getWorkShifts()
      ]);
      const allUsers = unwrapList(usersRes).map(normalizeUser);
      const managersList = allUsers.filter((u) => (u.role || '').toLowerCase() === 'manager');
      const employeesList = allUsers.filter((u) => {
        const role = (u.role || '').toLowerCase();
        if (role !== 'employee' && role !== 'hr') return false;
        const dept = u.department;
        if (dept == null || dept === undefined) return true;
        if (Array.isArray(dept) && dept.length === 0) return true;
        return false;
      });
      setManagers(managersList);
      setEmployees(employeesList);
      setOfficeLocations(unwrapList(locationsRes));
      setWorkShifts(unwrapList(shiftsRes));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load data");
    } finally {
      setDataLoading(false);
    }
  };

  // Fetch data on open
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        hydrateEditData(editData.id);
      } else {
        setFormData(initialForm);
        fetchCreateModeData();
      }
      setSearchTerm('');
      setManagerSearchTerm('');
      setLocationSearchTerm('');
    }
  }, [isOpen, editData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (daysRef.current && !daysRef.current.contains(event.target)) {
        setIsDaysOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleEmployee = (id) => {
    setFormData(prev => ({
      ...prev,
      employee_ids: prev.employee_ids.includes(id)
        ? prev.employee_ids.filter(eid => eid !== id)
        : [...prev.employee_ids, id]
    }));
  };

  const handleToggleManager = (id) => {
    setFormData((prev) => ({
      ...prev,
      manager_ids: prev.manager_ids.includes(id)
        ? prev.manager_ids.filter((mid) => mid !== id)
        : [...prev.manager_ids, id]
    }));
  };

  const handleToggleLocation = (id) => {
    setFormData((prev) => ({
      ...prev,
      location_ids: prev.location_ids.includes(id)
        ? prev.location_ids.filter((lid) => lid !== id)
        : [...prev.location_ids, id]
    }));
  };

  const dayOptions = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const dayLabels = { MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday', THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday' };

  const formatWorkingDays = (days) => {
    if (!days || days.length === 0) return 'Select Working Days';
    const labels = days.map(d => dayLabels[d] || d);
    if (labels.length === 7) return 'All days';
    if (labels.length === 1) return labels[0];
    return `${labels.slice(0, -1).join(', ')} & ${labels[labels.length - 1]}`;
  };

  const handleToggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name) return toast.error("Department name is required");
    if (!formData.location_ids.length) return toast.error("Office location is required");
    if (!formData.default_shift_id) return toast.error("Shift type is required");
    if (!formData.working_days.length) return toast.error("Working days are required");
    // if (!formData.manager_ids.length) return toast.error("At least one manager is required");
    // if (!formData.employee_ids.length) return toast.error("At least one employee is required");

    setLoading(true);
    try {
      const submissionData = {
        name: formData.name,
        location_id: formData.location_ids[0] || null,
        default_shift_id: formData.default_shift_id,
        location_ids: formData.location_ids,
        work_shift_ids: formData.default_shift_id ? [formData.default_shift_id] : [],
        working_days: formData.working_days,
        manager_ids: formData.manager_ids,
        employee_ids: formData.employee_ids,
        location_tracking_enabled: formData.location_tracking_enabled
      };

      if (editData) {
        await updateDepartment(editData.id, submissionData);
        toast.success("Department updated successfully 🎉");
      } else {
        await createDepartment(submissionData);
        toast.success("Department created successfully 🎉");
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${editData ? 'update' : 'create'} department`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredEmployees = employees.filter(emp =>
    emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredManagers = managers.filter((mgr) =>
    mgr.full_name?.toLowerCase().includes(managerSearchTerm.toLowerCase())
  );
  const filteredLocations = officeLocations.filter((loc) =>
    `${loc.address || ''} ${loc.name || ''}`.toLowerCase().includes(locationSearchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-[540px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-slideUp">
        
        {/* Header */}
        <div className="relative p-6 pb-5 bg-gradient-to-br from-[#FF5722]/5 to-transparent">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/80 rounded-full transition-all duration-200 hover:rotate-90 group">
            <X size={20} className="text-gray-400 group-hover:text-gray-600" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#FF5722] flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editData ? "Edit Department" : "Create Department"}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {editData ? "Modify existing department configurations" : "Configure department settings and team structure"}
              </p>
            </div>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

        <div className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
          {dataLoading && (
            <div className="text-xs text-gray-500 bg-[#FFF5F2] border border-[#FF5722]/20 rounded-lg px-3 py-2">
              Loading department details...
            </div>
          )}
          {/* Dept Name */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <Building2 size={14} className="text-[#FF5722]" /> Department Name *
            </label>
            <input 
              type="text"
              placeholder="e.g. Creative Design"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/30 focus:border-[#FF5722]/30 focus:bg-white transition-all"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          {/* Office Locations */}
          <div className="space-y-3">
            <label className="flex items-center justify-between text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <span className="flex items-center gap-2">
                <MapPin size={14} className="text-[#FF5722]" /> Location *
              </span>
              {formData.location_ids.length > 0 && <span className="px-2 py-0.5 bg-[#FF5722] text-white text-[10px] rounded-full">{formData.location_ids.length} selected</span>}
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search office locations..."
                className="w-full py-2.5 pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/30 transition-all"
                value={locationSearchTerm}
                onChange={(e) => setLocationSearchTerm(e.target.value)}
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
              {filteredLocations.map((loc) => (
                <div
                  key={loc.id}
                  onClick={() => handleToggleLocation(loc.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${formData.location_ids.includes(loc.id) ? 'bg-[#FFF5F2] border-[#FF5722]/10' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${formData.location_ids.includes(loc.id) ? 'bg-[#FF5722]' : 'bg-gray-300'}`}>
                      <MapPin size={12} />
                    </div>
                    <span className="text-sm text-gray-700 truncate">{loc.address || 'Office Location'}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${formData.location_ids.includes(loc.id) ? 'bg-[#FF5722] border-[#FF5722]' : 'border-gray-200'}`}>
                    {formData.location_ids.includes(loc.id) && <Check size={12} className="text-white" strokeWidth={4} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shift Type */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <Clock size={14} className="text-[#FF5722]" /> Shift Type *
            </label>
            <div className="relative">
              <select 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm appearance-none outline-none cursor-pointer focus:ring-2 focus:ring-[#FF5722]/30 focus:bg-white transition-all"
                value={formData.default_shift_id}
                onChange={(e) => setFormData({...formData, default_shift_id: e.target.value})}
              >
                <option value="">Select Shift</option>
                {workShifts.map(shift => <option key={shift.id} value={shift.id}>{shift.name || shift.shift_name || 'Shift'}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Working Days */}
          <div className="space-y-2" ref={daysRef}>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <Calendar size={14} className="text-[#FF5722]" /> Working Days *
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDaysOpen(!isDaysOpen)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-left flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-[#FF5722]/30 transition-all outline-none"
              >
                <span className={formData.working_days.length ? 'text-gray-700 font-medium' : 'text-gray-400'}>
                  {formatWorkingDays(formData.working_days)}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isDaysOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDaysOpen && (
                <div className="absolute z-20 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-slideDown p-1">
                  {dayOptions.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleToggleDay(day)}
                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between rounded-lg mb-1 last:mb-0 transition-colors ${formData.working_days.includes(day) ? 'bg-[#FFF5F2] text-[#FF5722]' : 'hover:bg-gray-50 text-gray-600'}`}
                    >
                      <span className="font-medium">{dayLabels[day]}</span>
                      {formData.working_days.includes(day) && <Check size={16} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Location Tracking */}
          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <MapPin size={14} className="text-[#FF5722]" /> Location tracking
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(formData.location_tracking_enabled)}
              aria-label="Location tracking"
              onClick={() => setFormData({
                ...formData,
                location_tracking_enabled: !formData.location_tracking_enabled
              })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors flex-shrink-0 ${
                formData.location_tracking_enabled
                  ? 'bg-[#FF5722] border-[#FF5722]'
                  : 'bg-gray-200 border-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  formData.location_tracking_enabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="h-px bg-gray-100 my-2" />

          {/* Manager Name */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <span className="flex items-center gap-2">
                <UserCircle size={14} /> Assign Managers 
              </span>
              {formData.manager_ids.length > 0 && <span className="px-2 py-0.5 bg-[#FF5722] text-white text-[10px] rounded-full">{formData.manager_ids.length} selected</span>}
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search managers..."
                className="w-full py-2.5 pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/30 transition-all"
                value={managerSearchTerm}
                onChange={(e) => setManagerSearchTerm(e.target.value)}
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
              {filteredManagers.map((mgr) => (
                <div
                  key={mgr.id}
                  onClick={() => handleToggleManager(mgr.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${formData.manager_ids.includes(mgr.id) ? 'bg-[#FFF5F2] border-[#FF5722]/10' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      size="md"
                      imageUrl={getProfileImageUrl(mgr)}
                      fullName={mgr.full_name}
                      firstName={mgr.first_name}
                      lastName={mgr.last_name}
                      fallbackClassName={`text-white text-xs font-bold flex items-center justify-center flex-shrink-0 ${formData.manager_ids.includes(mgr.id) ? 'bg-[#FF5722]' : 'bg-gray-300'}`}
                    />
                    <span className="text-sm text-gray-700">{mgr.full_name}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${formData.manager_ids.includes(mgr.id) ? 'bg-[#FF5722] border-[#FF5722]' : 'border-gray-200'}`}>
                    {formData.manager_ids.includes(mgr.id) && <Check size={12} className="text-white" strokeWidth={4} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Select Employees */}
          <div className="space-y-3">
            <label className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <span className="flex items-center gap-2"><Users size={14} /> Assign Employees </span>
              {formData.employee_ids.length > 0 && <span className="px-2 py-0.5 bg-[#FF5722] text-white text-[10px] rounded-full">{formData.employee_ids.length} selected</span>}
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Search team members..."
                className="w-full py-2.5 pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/30 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
              {filteredEmployees.map(emp => (
                <div 
                  key={emp.id}
                  onClick={() => handleToggleEmployee(emp.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${formData.employee_ids.includes(emp.id) ? 'bg-[#FFF5F2] border-[#FF5722]/10' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      size="md"
                      imageUrl={getProfileImageUrl(emp)}
                      fullName={emp.full_name}
                      firstName={emp.first_name}
                      lastName={emp.last_name}
                      fallbackClassName={`text-white text-xs font-bold flex items-center justify-center flex-shrink-0 ${formData.employee_ids.includes(emp.id) ? 'bg-[#FF5722]' : 'bg-gray-300'}`}
                    />
                    <span className="text-sm text-gray-700">{emp.full_name}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${formData.employee_ids.includes(emp.id) ? 'bg-[#FF5722] border-[#FF5722]' : 'border-gray-200'}`}>
                    {formData.employee_ids.includes(emp.id) && <Check size={12} className="text-white" strokeWidth={4} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 flex gap-3 bg-gray-50 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-100 transition-all">
            Cancel
          </button>
          <button 
            disabled={loading || dataLoading}
            onClick={handleSubmit}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-[#FF5722] to-[#F4511E] text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-[#FF5722]/30 transition-all disabled:opacity-50"
          >
            {loading ? "Processing..." : editData ? "Update Department" : "Create Department"}
          </button>
        </div>
      </div>

    
    </div>
  );
};

const ChevronDown = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

export default AddDepartmentModal;
