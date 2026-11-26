import React from 'react';

const EmploymentStep = ({ step2Data, setStep2Data, errors, departments }) => {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Employment & Payroll Details</h2>
                <p className="text-sm text-gray-500 font-medium">Provide essential employment data and payroll setup to configure the employee's role and compensation</p>
            </div>

            {/* Employment Details Section */}
            <div>
                <h3 className="text-sm font-bold text-gray-900 mb-5">Employment Details</h3>

                {/* Row 1: Employee ID & Join Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">Employee ID <span className="text-[var(--brand-primary)] ml-1">*</span></label>
                        <div className="relative">
                            <input
                                type="text"
                                value={step2Data.employeeId}
                                onChange={(e) => setStep2Data({ ...step2Data, employeeId: e.target.value })}
                                placeholder="e.g. SHLOKA-EMP001"
                                className={`w-full bg-gray-50/50 px-4 py-3 border ${errors.employeeId ? 'border-red-300' : 'border-gray-100'} rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all`}
                            />
                        </div>
                        {errors.employeeId && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.employeeId}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">Join Date<span className="text-[var(--brand-primary)] ml-1">*</span></label>
                        <div className="relative">
                            <input
                                type="date"
                                value={step2Data.dateOfJoining}
                                onChange={(e) => setStep2Data({ ...step2Data, dateOfJoining: e.target.value })}
                                className={`w-full bg-gray-50/50 px-4 py-3 border ${errors.dateOfJoining ? 'border-red-300' : 'border-gray-100'} rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all`}
                            />
                            {/* Calendar Icon (absolute positioned if using custom icon, otherwise native picker shows it) */}
                        </div>
                        {errors.dateOfJoining && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.dateOfJoining}</p>}
                    </div>
                </div>

                {/* Row 2: Job Title, Department, Emp Type */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">Job Title<span className="text-[var(--brand-primary)] ml-1">*</span></label>
                        <input
                            type="text"
                            value={step2Data.designation}
                            onChange={(e) => setStep2Data({ ...step2Data, designation: e.target.value })}
                            placeholder="e.g. IT Support Specialist"
                            className={`w-full bg-gray-50/50 px-4 py-3 border ${errors.designation ? 'border-red-300' : 'border-gray-100'} rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all`}
                        />
                        {errors.designation && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.designation}</p>}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">Department</label>
                        <div className="relative">
                            <select
                                value={step2Data.departmentId}
                                onChange={(e) => setStep2Data({ ...step2Data, departmentId: e.target.value })}
                                className="w-full bg-gray-50/50 px-4 py-3 border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] cursor-pointer"
                            >
                                <option value="" disabled>Select Department</option>
                                {Array.isArray(departments) &&
                                    departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))
                                }
                            </select>
                            <svg className="w-3 h-3 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">Employment Type<span className="text-[var(--brand-primary)] ml-1">*</span></label>
                        <div className="relative">
                            <select
                                value={step2Data.employmentType}
                                onChange={(e) => setStep2Data({ ...step2Data, employmentType: e.target.value })}
                                className="w-full bg-gray-50/50 px-4 py-3 border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] cursor-pointer"
                            >
                                <option value="FULL_TIME">Full-Time</option>
                                <option value="PART_TIME">Part-Time</option>
                                <option value="CONTRACT">Contract</option>
                                <option value="INTERNSHIP">Internship</option>
                                <option value="FREELANCE">Freelance</option>
                            </select>
                            <svg className="w-3 h-3 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>

                {/* Work Model (Radio Cards) */}
                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-700 mb-3">Work Mode<span className="text-[var(--brand-primary)] ml-1">*</span></label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { value: 'ONSITE', label: 'On-Site' },
                            { value: 'HYBRID', label: 'Hybrid' },
                            { value: 'REMOTE', label: 'Remote' }
                        ].map((option) => {
                            const isSelected = step2Data.workMode === option.value;
                            return (
                                <label
                                    key={option.value}
                                    className={`relative flex items-center justify-between px-5 py-3.5 rounded-xl cursor-pointer border transition-all duration-200 ${isSelected
                                        ? 'bg-[var(--brand-soft-alt)] border-[var(--brand-primary)]'
                                        : 'bg-gray-50/50 border-transparent hover:bg-gray-100'
                                        }`}
                                >
                                    <span className={`text-sm font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                                        {option.label}
                                    </span>
                                    <input
                                        type="radio"
                                        name="workMode"
                                        value={option.value}
                                        checked={isSelected}
                                        onChange={(e) => setStep2Data({ ...step2Data, workMode: e.target.value })}
                                        className="hidden"
                                    />
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-[var(--brand-primary)]' : 'border-gray-300 bg-white'
                                        }`}>
                                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand-primary)]"></div>}
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Shift Mode (Radio Cards) */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-3">Shift Mode<span className="text-[var(--brand-primary)] ml-1">*</span></label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { value: 'day', label: 'Day' },
                            { value: 'night', label: 'Night' }
                        ].map((option) => {
                            const isSelected = step2Data.shiftMode === option.value;
                            return (
                                <label
                                    key={option.value}
                                    className={`relative flex items-center justify-between px-5 py-3.5 rounded-xl cursor-pointer border transition-all duration-200 ${isSelected
                                        ? 'bg-[var(--brand-soft-alt)] border-[var(--brand-primary)]'
                                        : 'bg-gray-50/50 border-transparent hover:bg-gray-100'
                                        }`}
                                >
                                    <span className={`text-sm font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                                        {option.label}
                                    </span>
                                    <input
                                        type="radio"
                                        name="shiftMode"
                                        value={option.value}
                                        checked={isSelected}
                                        onChange={(e) => setStep2Data({ ...step2Data, shiftMode: e.target.value })}
                                        className="hidden"
                                    />
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-[var(--brand-primary)]' : 'border-gray-300 bg-white'
                                        }`}>
                                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand-primary)]"></div>}
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default EmploymentStep;
