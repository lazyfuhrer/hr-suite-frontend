
const PayrollStep = ({
    step3Data,
    setStep3Data,
    payrollSettings,
    onPfChange,
    onEmployerPfChange,
    onBasicChange,
    showGrossMismatchHint = false,
    disableDeductions = false,
    netSalaryError = ''
}) => {
    const settings = payrollSettings && typeof payrollSettings === 'object' ? payrollSettings : null;
    const basicPct = settings?.basic_pct;
    const hraPct = settings?.hra_pct_of_basic;
    const employerPfType = settings?.employer_pf?.type;
    const employerPfValue = settings?.employer_pf?.value;
    const employeePfType = settings?.employee_pf?.type;
    const employeePfValue = settings?.employee_pf?.value;
    const professionalTaxAnnual = settings?.professional_tax_annual;

    const formatPfHint = (type, value, baseLabel) => {
        if (!type || value === null || value === undefined || value === '') return '';
        if (String(type).toUpperCase() === 'FIXED') return `₹${Number(value || 0).toLocaleString('en-IN')} (annual)`;
        return `${value}% of ${baseLabel}`;
    };

    const preventWheelChange = (e) => {
        e.currentTarget.blur();
    };

    const earningsItems = Array.isArray(step3Data.earningsItems) ? step3Data.earningsItems : [];
    const deductionsItems = Array.isArray(step3Data.deductionsItems) ? step3Data.deductionsItems : [];

    const updateEarningsItem = (index, patch) => {
        setStep3Data((prev) => {
            const next = Array.isArray(prev.earningsItems) ? [...prev.earningsItems] : [];
            next[index] = { ...(next[index] || { name: '', amount: '' }), ...(patch || {}) };
            return { ...prev, earningsItems: next };
        });
    };

    const updateDeductionsItem = (index, patch) => {
        setStep3Data((prev) => {
            const next = Array.isArray(prev.deductionsItems) ? [...prev.deductionsItems] : [];
            next[index] = { ...(next[index] || { name: '', amount: '' }), ...(patch || {}) };
            return { ...prev, deductionsItems: next };
        });
    };

    const addEarningsItem = () => {
        setStep3Data((prev) => ({
            ...prev,
            earningsItems: [...(Array.isArray(prev.earningsItems) ? prev.earningsItems : []), { name: '', amount: '' }],
        }));
    };

    const addDeductionsItem = () => {
        setStep3Data((prev) => ({
            ...prev,
            deductionsItems: [...(Array.isArray(prev.deductionsItems) ? prev.deductionsItems : []), { name: '', amount: '' }],
        }));
    };

    const removeEarningsItem = (index) => {
        setStep3Data((prev) => ({
            ...prev,
            earningsItems: (Array.isArray(prev.earningsItems) ? prev.earningsItems : []).filter((_, i) => i !== index),
        }));
    };

    const removeDeductionsItem = (index) => {
        setStep3Data((prev) => ({
            ...prev,
            deductionsItems: (Array.isArray(prev.deductionsItems) ? prev.deductionsItems : []).filter((_, i) => i !== index),
        }));
    };

    return (
        <div className="space-y-8">
            <style>{`
                input.no-spinner::-webkit-outer-spin-button,
                input.no-spinner::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input.no-spinner[type=number] {
                    -moz-appearance: textfield;
                }
            `}</style>
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Payroll Details</h2>
                <p className="text-sm text-gray-500 font-medium">Enter the employee's compensation and deduction details manually.</p>
            </div>

            {/* Annual CTC */}
            <div className="bg-[var(--brand-soft-alt)] p-6 rounded-2xl">
                <label className="block text-xs font-bold text-gray-700 mb-2">Annual Cost to Company (CTC) <span className="text-[var(--brand-primary)] ml-1">*</span></label>
                <input
                    type="number"
                    placeholder="e.g. 10,00,000"
                    value={step3Data.baseSalary}
                    onChange={(e) => {
                        const v = e.target.value;
                        setStep3Data((prev) => ({ ...prev, baseSalary: v }));
                    }}
                    onWheel={preventWheelChange}
                    className="no-spinner w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all"
                />
            </div>

            {/* Earnings */}
            <div className="bg-[var(--brand-soft-alt)] p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Earnings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">Basic Salary <span className="text-[var(--brand-primary)] ml-1">*</span></label>
                        <input
                            type="number"
                            placeholder="e.g. 50,000"
                            value={step3Data.basicSalary}
                            onChange={(e) => onBasicChange ? onBasicChange(e.target.value) : setStep3Data((prev) => ({ ...prev, basicSalary: e.target.value }))}
                            onWheel={preventWheelChange}
                            className="no-spinner w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all"
                        />
                        {basicPct !== null && basicPct !== undefined && basicPct !== '' && (
                            <p className="text-[11px] text-gray-400 mt-1">{basicPct}% of CTC</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">HRA <span className="text-[var(--brand-primary)] ml-1">*</span></label>
                        <input type="number" placeholder="e.g. 20,000" value={step3Data.hra} onChange={(e) => setStep3Data((prev) => ({ ...prev, hra: e.target.value }))} onWheel={preventWheelChange} className="no-spinner w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all" />
                        {hraPct !== null && hraPct !== undefined && hraPct !== '' && (
                            <p className="text-[11px] text-gray-400 mt-1">{hraPct}% of Basic</p>
                        )}
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 mb-2">Other Allowance</label>
                        <input
                            type="number"
                            placeholder="e.g. 10,000"
                            value={step3Data.otherAllowance}
                            onChange={(e) => setStep3Data((prev) => ({ ...prev, otherAllowance: e.target.value }))}
                            onWheel={preventWheelChange}
                            className="no-spinner w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Calculated to balance CTC.</p>
                    </div>
                </div>

                <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Extra earnings items (annual)
                        </div>
                        <button
                            type="button"
                            onClick={addEarningsItem}
                            className="text-xs font-semibold text-[var(--brand-primary)] hover:opacity-90"
                        >
                            + Add item
                        </button>
                    </div>

                    {earningsItems.length === 0 ? (
                        <div className="text-xs text-gray-400">No extra earnings items</div>
                    ) : (
                        <div className="space-y-2">
                            {earningsItems.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    <div className="md:col-span-7">
                                        <input
                                            type="text"
                                            placeholder="Name"
                                            value={item?.name || ''}
                                            onChange={(e) => updateEarningsItem(idx, { name: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all"
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <input
                                            type="number"
                                            placeholder="Amount (annual)"
                                            value={item?.amount ?? ''}
                                            onChange={(e) => updateEarningsItem(idx, { amount: e.target.value })}
                                            onWheel={preventWheelChange}
                                            className="no-spinner w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all"
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex md:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => removeEarningsItem(idx)}
                                            className="w-full md:w-auto px-3 py-3 rounded-xl border border-gray-100 bg-white text-xs font-bold text-gray-500 hover:bg-gray-50"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-6 pt-2">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">Gross Earnings</label>
                        {showGrossMismatchHint && (
                            <p className="text-xs text-red-600 mb-2">CTC should equal Gross Earnings + Employer Contributions to continue.</p>
                        )}
                        <input type="number" placeholder="e.g. 75,000" readOnly value={step3Data.grossEarnings} onChange={(e) => setStep3Data((prev) => ({ ...prev, grossEarnings: e.target.value }))} onWheel={preventWheelChange} className="no-spinner w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all" />
                    </div>
                </div>
            </div>

            {/* Employer Contributions */}
            <div className="bg-[var(--brand-soft-alt)] p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Employer Contributions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">Employer Provident Fund (PF)</label>
                        <input
                            type="number"
                            placeholder="e.g. 1,800"
                            value={step3Data.employerPf}
                            onChange={(e) =>
                                onEmployerPfChange
                                    ? onEmployerPfChange(e.target.value)
                                    : setStep3Data((prev) => ({ ...prev, employerPf: e.target.value }))
                            }
                            onWheel={preventWheelChange}
                            className="no-spinner w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all"
                        />
                        {settings ? (
                            <p className="text-[11px] text-gray-400 mt-1">{formatPfHint(employerPfType, employerPfValue, 'Basic')} • Part of CTC, not paid to employee</p>
                        ) : (
                            <p className="text-[11px] text-gray-400 mt-1">Annual amount.</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">Total employer contributions</label>
                        <input
                            type="number"
                            placeholder="e.g. 1,800"
                            readOnly
                            value={step3Data.totalEmployerContributions}
                            onChange={(e) => setStep3Data((prev) => ({ ...prev, totalEmployerContributions: e.target.value }))}
                            onWheel={preventWheelChange}
                            className="no-spinner w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Deductions - Corrected per Screenshot */}
            <div className="bg-[var(--brand-soft-alt)] p-6 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Deductions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">Provident Fund (PF)</label>
                        <input type="number" disabled={disableDeductions} placeholder="e.g. 1,800" value={step3Data.pf} onChange={(e) => onPfChange ? onPfChange(e.target.value) : setStep3Data((prev) => ({ ...prev, pf: e.target.value }))} onWheel={preventWheelChange} className="no-spinner w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed" />
                        {settings && (
                            <p className="text-[11px] text-gray-400 mt-1">{formatPfHint(employeePfType, employeePfValue, 'Basic')}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">Professional Tax</label>
                        <input type="number" disabled={disableDeductions} placeholder="e.g. 200" value={step3Data.professionalTax} onChange={(e) => setStep3Data((prev) => ({ ...prev, professionalTax: e.target.value }))} onWheel={preventWheelChange} className="no-spinner w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed" />
                        {professionalTaxAnnual !== null && professionalTaxAnnual !== undefined && professionalTaxAnnual !== '' && (
                            <p className="text-[11px] text-gray-400 mt-1">₹{Number(professionalTaxAnnual || 0).toLocaleString('en-IN')} (annual)</p>
                        )}
                    </div>
                </div>

                <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Extra deductions items (annual)
                        </div>
                        <button
                            type="button"
                            onClick={addDeductionsItem}
                            className="text-xs font-semibold text-[var(--brand-primary)] hover:opacity-90"
                        >
                            + Add item
                        </button>
                    </div>

                    {deductionsItems.length === 0 ? (
                        <div className="text-xs text-gray-400">No extra deductions items</div>
                    ) : (
                        <div className="space-y-2">
                            {deductionsItems.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    <div className="md:col-span-7">
                                        <input
                                            type="text"
                                            placeholder="Name"
                                            value={item?.name || ''}
                                            onChange={(e) => updateDeductionsItem(idx, { name: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all"
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <input
                                            type="number"
                                            placeholder="Amount (annual)"
                                            value={item?.amount ?? ''}
                                            onChange={(e) => updateDeductionsItem(idx, { amount: e.target.value })}
                                            onWheel={preventWheelChange}
                                            className="no-spinner w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all"
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex md:justify-end">
                                        <button
                                            type="button"
                                            onClick={() => removeDeductionsItem(idx)}
                                            className="w-full md:w-auto px-3 py-3 rounded-xl border border-gray-100 bg-white text-xs font-bold text-gray-500 hover:bg-gray-50"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-6 pt-2">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">Total Deductions</label>
                        <input type="number" placeholder="e.g. 7,000" readOnly value={step3Data.totalDeductions} onChange={(e) => setStep3Data({ ...step3Data, totalDeductions: e.target.value })} onWheel={preventWheelChange} className="no-spinner w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all" />
                    </div>
                </div>
            </div>

            {/* Net Salary */}
            <div className="bg-[var(--brand-soft-alt)] p-6 rounded-2xl">
                <label className="block text-xs font-bold text-gray-700 mb-2">Net Salary /month</label>
                {netSalaryError && (
                    <p className="text-xs text-red-600 mb-2">{netSalaryError}</p>
                )}
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                    <input
                        type="number"
                        placeholder="10,000"
                        readOnly
                        value={step3Data.netSalary}
                        onChange={(e) => setStep3Data({ ...step3Data, netSalary: e.target.value })}
                        onWheel={preventWheelChange}
                        className="no-spinner w-full pl-8 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold text-[var(--brand-primary)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.1)] focus:border-[var(--brand-primary)] transition-all"
                    />
                </div>
            </div>
        </div>
    );
};

export default PayrollStep;
