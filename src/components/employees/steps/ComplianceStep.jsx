import React from 'react';
import UploadIcon from '../../../assets/employees/UploadSimple.svg';

const ComplianceStep = ({ step4Data, setStep4Data, handleFileUpload, handleRemoveFile }) => {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Allowances, Benefits & Documents</h2>
                <p className="text-sm text-gray-500 font-medium">Configure employee perks, attach required documents, and finalize their status within the system</p>
            </div>

            {/* Allowances */}
            <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4">Allowances</h3>
                <div className="space-y-3">
                    {[
                        { key: 'transportation', label: 'Transportation' },
                        { key: 'meal', label: 'Meal' },
                        { key: 'internet', label: 'Internet (Remote & Hybrid only)' }
                    ].map((allowance) => (
                        <label key={allowance.key} className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={step4Data.allowances[allowance.key]}
                                onChange={(e) => setStep4Data({
                                    ...step4Data,
                                    allowances: {
                                        ...step4Data.allowances,
                                        [allowance.key]: e.target.checked
                                    }
                                })}
                                className="w-5 h-5 accent-[var(--brand-primary)] rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">{allowance.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Benefits */}
            <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4">Benefits</h3>
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input
                        type="checkbox"
                        onChange={(e) => {
                            const allChecked = e.target.checked;
                            setStep4Data({
                                ...step4Data,
                                benefits: Object.keys(step4Data.benefits).reduce((acc, key) => ({
                                    ...acc,
                                    [key]: allChecked
                                }), {})
                            });
                        }}
                        className="w-5 h-5 accent-[var(--brand-primary)] rounded"
                    />
                    <span className="text-sm font-semibold text-gray-900">Select All</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Insurance */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">Insurance</h4>
                        <div className="space-y-2">
                            {[
                                { key: 'healthInsurance', label: 'Health Insurance' },
                                { key: 'lifeInsurance', label: 'Life Insurance' }
                            ].map((benefit) => (
                                <label key={benefit.key} className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={step4Data.benefits[benefit.key]}
                                        onChange={(e) => setStep4Data({
                                            ...step4Data,
                                            benefits: {
                                                ...step4Data.benefits,
                                                [benefit.key]: e.target.checked
                                            }
                                        })}
                                        className="w-5 h-5 accent-[var(--brand-primary)] rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">{benefit.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Work-Related Perks */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">Work-Related Perks</h4>
                        <div className="space-y-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={step4Data.benefits.companyDevice}
                                    onChange={(e) => setStep4Data({
                                        ...step4Data,
                                        benefits: {
                                            ...step4Data.benefits,
                                            companyDevice: e.target.checked
                                        }
                                    })}
                                    className="w-5 h-5 accent-[var(--brand-primary)] rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">Company Device</span>
                            </label>
                        </div>
                    </div>

                    {/* Development & Wellness */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">Development & Wellness</h4>
                        <div className="space-y-2">
                            {[
                                { key: 'trainingProgram', label: 'Training Program' },
                                { key: 'tuition', label: 'Tuition' },
                                { key: 'fitnessMembership', label: 'Fitness Membership' },
                                { key: 'mentalHealthSupport', label: 'Mental Health Support' }
                            ].map((benefit) => (
                                <label key={benefit.key} className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={step4Data.benefits[benefit.key]}
                                        onChange={(e) => setStep4Data({
                                            ...step4Data,
                                            benefits: {
                                                ...step4Data.benefits,
                                                [benefit.key]: e.target.checked
                                            }
                                        })}
                                        className="w-5 h-5 accent-[var(--brand-primary)] rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">{benefit.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Documents Section */}
            <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4">Documents</h3>
                <div className="space-y-5">
                    {[
                        { key: 'cvPortfolio', label: 'CV & Portfolio (If Any)' },
                        { key: 'id', label: 'ID Proof (Upload identity proof from this list: Aadhar Front, Aadhar Back, Pan Card, Passport size photo)' },
                        { key: 'contractAgreement', label: 'Contract Agreement' },
                        { key: 'offerLetter', label: 'Offer Letter' }
                    ].map((doc) => {
                        const file = step4Data.documents[doc.key];
                        const isImage = file && file.type && file.type.startsWith('image/');

                        return (
                            <div key={doc.key}>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                                    {doc.label}
                                    {doc.key === 'offerLetter' && <span className="text-[var(--brand-primary)] ml-1">*</span>}
                                </label>

                                {file ? (
                                    // Preview State
                                    <div className="relative w-32 h-32 group">
                                        <button
                                            onClick={() => handleRemoveFile(doc.key)}
                                            className="absolute -top-2 -right-2 z-10 bg-white text-gray-500 hover:text-red-500 rounded-full p-1 shadow-md border border-gray-200 transition-colors"
                                            type="button"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>

                                        {isImage ? (
                                            <div className="w-full h-full rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt="preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full h-full rounded-xl bg-red-50 border border-red-100 flex flex-col items-center justify-center p-3 text-center shadow-sm">
                                                <div className="text-red-500 mb-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                        <polyline points="14 2 14 8 20 8"></polyline>
                                                    </svg>
                                                </div>
                                                <p className="text-xs font-semibold text-gray-700 truncate w-full">
                                                    {file.name}
                                                </p>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                                    {file.name && file.name.split('.').pop()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    // Upload State
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id={doc.key}
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(doc.key, e.target.files[0])}
                                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                        />
                                        <label
                                            htmlFor={doc.key}
                                            className="flex items-center gap-4 w-full p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-100 hover:border-[var(--brand-primary)] transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                                                <img src={UploadIcon} alt="Upload" className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-gray-800 underline decoration-gray-300 underline-offset-2 group-hover:text-[var(--brand-primary)] group-hover:decoration-[var(--brand-primary)] transition-colors">
                                                    Click to Upload <span className="text-gray-500 font-normal no-underline">or drag & drop</span>
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1 font-medium">
                                                    PDF, DOC, PNG, or JPG (max. 2.5 MB)
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
};

export default ComplianceStep;
