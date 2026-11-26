import React from 'react';

const ProfileStep = ({ step1Data, setStep1Data, errors, isManager = false }) => {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Personal & Contact Information</h2>
                <p className="text-sm text-gray-500 font-medium">
                    Enter the employee's personal details and primary contact information to initiate their HR record
                </p>
                <hr className="mt-6 border-gray-100" />
            </div>

            {/* Personal Info Section */}
            <div>
                <h3 className="text-sm font-bold text-gray-900 mb-5">Personal Info</h3>

                {/* Row 1: First Name & Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">First Name<span className="text-[#EB4000] ml-1">*</span></label>
                        <input
                            type="text"
                            placeholder="Niko"
                            value={step1Data.firstName}
                            onChange={(e) => setStep1Data({ ...step1Data, firstName: e.target.value })}
                            className={`w-full px-4 py-3 bg-gray-50/50 border ${errors.firstName ? 'border-red-300' : 'border-gray-100'} rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EB4000]/10 focus:border-[#EB4000] transition-all`}
                        />
                        {errors.firstName && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.firstName}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">Last Name <span className="text-[#EB4000] ml-1">*</span></label>
                        <input
                            type="text"
                            placeholder="Pradana"
                            value={step1Data.lastName}
                            onChange={(e) => setStep1Data({ ...step1Data, lastName: e.target.value })}
                            className={`w-full px-4 py-3 bg-gray-50/50 border ${errors.lastName ? 'border-red-300' : 'border-gray-100'} rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EB4000]/10 focus:border-[#EB4000] transition-all`}
                        />
                    </div>
                </div>

                {/* Row 2: Employee Type (Width matches First Name) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">Employee Type <span className="text-[#EB4000] ml-1">*</span></label>
                        <div className="relative">
                            <select
                                value={step1Data.employeeType}
                                onChange={(e) => setStep1Data({ ...step1Data, employeeType: e.target.value })}
                                className="w-full bg-gray-50/50 px-4 py-3 border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-[#EB4000]/10 focus:border-[#EB4000] cursor-pointer"
                            >
                                <option value="Employee">Employee</option>
                                {!isManager && <option value="Manager">Manager</option>}
                                {!isManager && <option value="Hr">HR</option>}
                            </select>
                            <svg className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Info Section */}
            <div>
                <h3 className="text-sm font-bold text-gray-900 mb-5">Contact Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Email Address */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">Email Address <span className="text-[#EB4000] ml-1">*</span></label>
                        <input
                            type="email"
                            placeholder="niko.pradana@company.com"
                            value={step1Data.email}
                            onChange={(e) => setStep1Data({ ...step1Data, email: e.target.value })}
                            className={`w-full px-4 py-3 bg-gray-50/50 border ${errors.email ? 'border-red-300' : 'border-gray-100'} rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EB4000]/10 focus:border-[#EB4000] transition-all`}
                        />
                        {errors.email && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.email}</p>}
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">Phone Number <span className="text-[#EB4000] ml-1">*</span></label>
                        <div className={`flex items-stretch bg-gray-50/50 border rounded-xl overflow-hidden ${errors.phoneNumber ? 'border-red-300' : 'border-gray-100'} focus-within:ring-2 focus-within:ring-[#EB4000]/10 focus-within:border-[#EB4000] transition-all`}>
                            <div className="relative flex items-center px-4 border-r border-gray-200">
                                <div className="w-5 h-4 bg-[#EB4000] rounded-[2px] mr-2"></div>
                                <select
                                    value={step1Data.phoneCountryCode}
                                    onChange={(e) => setStep1Data({ ...step1Data, phoneCountryCode: e.target.value })}
                                    className="appearance-none bg-transparent text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer pr-4 z-10"
                                >
                                    <option value="+62">+62</option>
                                    <option value="+91">+91</option>
                                    <option value="+1">+1</option>
                                </select>
                                <svg className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                            <input
                                type="tel"
                                placeholder="813 7788 2244"
                                value={step1Data.phoneNumber}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if (val.length <= 10) setStep1Data({ ...step1Data, phoneNumber: val });
                                }}
                                className="flex-1 px-4 py-3 bg-transparent text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none"
                            />
                        </div>
                        {errors.phoneNumber && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.phoneNumber}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileStep;
