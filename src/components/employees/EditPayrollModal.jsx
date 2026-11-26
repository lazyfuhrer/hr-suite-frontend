import { useEffect, useMemo, useState } from "react";
import { X, Save } from "lucide-react";
import { toast } from "react-hot-toast";
import PayrollStep from "./steps/PayrollStep";
import { getUserPayrollFinance, patchUserPayrollFinance } from "../../api/emoloyees/addEmployees";
import { getPayrollSettings } from "../../api/payroll";

let payrollSettingsCache = null;
async function getPayrollSettingsCached() {
  if (payrollSettingsCache) return payrollSettingsCache;
  try {
    const res = await getPayrollSettings();
    payrollSettingsCache = res;
    return res;
  } catch {
    payrollSettingsCache = null;
    return null;
  }
}

function normalizePayrollSettingsResponse(res) {
  // Expected: { exists: boolean, data: {...} }
  // getPayrollSettings() already returns axios res.data, so treat `res` as the root shape.
  const root = res ?? {};
  if (!root || typeof root !== "object") return null;
  if (!root.exists) return null;
  const data = root.data;
  if (!data || typeof data !== "object") return null;
  return data;
}

const emptyStep3 = {
  baseSalary: "",
  basicSalary: "",
  hra: "",
  otherAllowance: "",
  earningsItems: [],
  grossEarnings: "",
  employerPf: "",
  totalEmployerContributions: "",
  pf: "",
  professionalTax: "",
  incomeTax: "",
  esi: "",
  deductionsItems: [],
  totalDeductions: "",
  netSalary: "",
};

function toNum(value) {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toStrNum(value) {
  if (value === null || value === undefined) return "";
  if (value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : "";
}

function roundNetMonthly(value) {
  const rawNet = Number(value);
  if (!Number.isFinite(rawNet)) return 0;
  const integerPart = Math.floor(rawNet);
  const decimalPart = rawNet - integerPart;
  return decimalPart > 0.5 ? integerPart + 1 : integerPart;
}

function normalizeItemNameKey(value) {
  return String(value || "").trim().toLowerCase();
}

function hasDuplicateItemNames(items) {
  const seen = new Set();
  (Array.isArray(items) ? items : []).forEach((it) => {
    const key = normalizeItemNameKey(it?.name);
    if (!key) return;
    if (seen.has(key)) {
      // Mark duplicate with a special value by setting an impossible entry
      seen.add("__DUP__");
      return;
    }
    seen.add(key);
  });
  return seen.has("__DUP__");
}

function normalizeFinanceResponse(data) {
  const root = data?.data ?? data ?? {};
  const financeRoot = root.finance || root;
  const meta = root.meta || {};

  const payroll_info = financeRoot.payroll_info || financeRoot.payrollInfo || {};
  const earnings = financeRoot.earnings || {};
  const deductions = financeRoot.deductions || {};
  const net_payable = financeRoot.net_payable || financeRoot.netPayable || {};

  const annual_ctc =
    payroll_info.annual_ctc ??
    payroll_info.annualCtc ??
    financeRoot.annual_ctc ??
    financeRoot.annualCtc ??
    financeRoot.employment_details?.annual_ctc ??
    "";

  const basic_salary = earnings.basic_salary ?? earnings.basicSalary ?? financeRoot.basic_salary ?? "";
  const hra = earnings.hra ?? financeRoot.hra ?? "";
  const other_allowance =
    earnings.other_allowance ?? earnings.otherAllowance ?? financeRoot.other_allowance ?? financeRoot.otherAllowance ?? "";
  const pf = deductions.pf ?? financeRoot.pf ?? "";
  const professional_tax =
    deductions.professional_tax ?? deductions.professionalTax ?? financeRoot.professional_tax ?? "";
  const income_tax_tds =
    deductions.income_tax_tds ?? deductions.incomeTaxTds ?? financeRoot.income_tax_tds ?? "";
  const esi = deductions.esi ?? financeRoot.esi ?? "";

  // If backend returns computed values, keep them as baseline; we will recompute as user edits.
  const gross_earnings =
    earnings.gross_earnings ??
    earnings.grossEarnings ??
    financeRoot.gross_earnings ??
    financeRoot.grossEarnings ??
    "";
  const total_deductions =
    deductions.total_deductions ??
    deductions.totalDeductions ??
    financeRoot.total_deductions ??
    financeRoot.totalDeductions ??
    "";
  const salary_per_month =
    net_payable.salary_per_month ??
    net_payable.salaryPerMonth ??
    financeRoot.salary_per_month ??
    financeRoot.salaryPerMonth ??
    "";

  return {
    baseSalary: toStrNum(annual_ctc),
    basicSalary: toStrNum(basic_salary),
    hra: toStrNum(hra),
    otherAllowance: toStrNum(other_allowance),
    earningsItems: Array.isArray(meta.earnings_items)
      ? meta.earnings_items.map((it) => ({
        name: String(it?.name || ""),
        amount: it?.amount === null || it?.amount === undefined ? "" : String(it.amount),
      }))
      : [],
    grossEarnings: toStrNum(gross_earnings),
    employerPf: "",
    totalEmployerContributions: "",
    pf: toStrNum(pf),
    professionalTax: toStrNum(professional_tax),
    incomeTax: toStrNum(income_tax_tds),
    esi: toStrNum(esi),
    deductionsItems: Array.isArray(meta.deductions_items)
      ? meta.deductions_items.map((it) => ({
        name: String(it?.name || ""),
        amount: it?.amount === null || it?.amount === undefined ? "" : String(it.amount),
      }))
      : [],
    totalDeductions: toStrNum(total_deductions),
    netSalary: toStrNum(salary_per_month),
  };
}

export default function EditPayrollModal({ isOpen, userId, onClose, onSaveSuccess }) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [applyFrom, setApplyFrom] = useState("CURRENT_MONTH");
  const [step3Data, setStep3Data] = useState(emptyStep3);
  const [netSalaryError, setNetSalaryError] = useState("");
  const [isPfManuallyEdited, setIsPfManuallyEdited] = useState(false);
  const [isEmployerPfManuallyEdited, setIsEmployerPfManuallyEdited] = useState(false);
  const [isBasicManuallyEdited, setIsBasicManuallyEdited] = useState(false);
  const [debouncedAnnualCtc, setDebouncedAnnualCtc] = useState("");
  const [payrollSettings, setPayrollSettings] = useState(null);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const load = async () => {
      setFetching(true);
      try {
        const settingsRes = await getPayrollSettingsCached();
        const normalizedSettings = normalizePayrollSettingsResponse(settingsRes);
        setPayrollSettings(normalizedSettings);

        const res = await getUserPayrollFinance(userId);
        const normalized = normalizeFinanceResponse(res);
        const root = res?.data ?? res ?? {};
        const nextApplyFrom = root.apply_from ?? root.applyFrom ?? "CURRENT_MONTH";
        setIsPfManuallyEdited(false);
        setIsEmployerPfManuallyEdited(false);
        setIsBasicManuallyEdited(false);
        setNetSalaryError("");
        setApplyFrom(nextApplyFrom === "NEXT_MONTH" ? "NEXT_MONTH" : "CURRENT_MONTH");
        setStep3Data({ ...emptyStep3, ...normalized });
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load payroll finance");
      } finally {
        setFetching(false);
      }
    };

    load();
  }, [isOpen, userId]);

  // PF auto-calc (same intent as onboarding): unless user manually edits PF.
  useEffect(() => {
    if (payrollSettings) return;
    if (isPfManuallyEdited) return;
    const annual = toNum(step3Data.baseSalary);
    const calculatedPf = annual > 0 ? ((annual * 12) / 100).toFixed(2) : "";
    if (step3Data.pf !== calculatedPf) {
      setStep3Data((prev) => ({ ...prev, pf: calculatedPf }));
    }
  }, [step3Data.baseSalary, isPfManuallyEdited, step3Data.pf]);

  // Employer PF auto-calc: unless user manually edits Employer PF.
  useEffect(() => {
    if (payrollSettings) return;
    if (isEmployerPfManuallyEdited) return;
    const annual = toNum(step3Data.baseSalary);
    const calculatedPf = annual > 0 ? ((annual * 12) / 100).toFixed(2) : "";
    if (step3Data.employerPf !== calculatedPf) {
      setStep3Data((prev) => ({ ...prev, employerPf: calculatedPf }));
    }
  }, [step3Data.baseSalary, isEmployerPfManuallyEdited, step3Data.employerPf]);

  // Debounce Annual CTC input so we don't auto-fill while user is typing.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAnnualCtc(step3Data.baseSalary);
    }, 400);
    return () => clearTimeout(timer);
  }, [step3Data.baseSalary]);

  // Default Basic Salary to 50% of Annual CTC unless user edits it (fallback when settings don't exist).
  useEffect(() => {
    if (payrollSettings) return;
    if (isBasicManuallyEdited) return;
    const annual = toNum(debouncedAnnualCtc);
    if (annual <= 0) return;
    const nextBasic = String(Math.round(annual * 0.5));
    const currentBasic = toNum(step3Data.basicSalary);
    if ((step3Data.basicSalary === "" || currentBasic <= 0) && step3Data.basicSalary !== nextBasic) {
      setStep3Data((prev) => ({ ...prev, basicSalary: nextBasic }));
    }
  }, [debouncedAnnualCtc, step3Data.basicSalary, isBasicManuallyEdited]);

  // Auto-prefill based on payroll settings whenever CTC changes (debounced).
  useEffect(() => {
    if (!payrollSettings) return;
    const ctc = toNum(debouncedAnnualCtc);
    if (ctc <= 0) return;

    const extraEarningsAnnual = Array.isArray(step3Data.earningsItems)
      ? step3Data.earningsItems.reduce((sum, it) => sum + toNum(it?.amount), 0)
      : 0;
    const extraDeductionsAnnual = Array.isArray(step3Data.deductionsItems)
      ? step3Data.deductionsItems.reduce((sum, it) => sum + toNum(it?.amount), 0)
      : 0;

    const basic = Math.round((toNum(payrollSettings.basic_pct) / 100) * ctc);
    const hra = Math.round((toNum(payrollSettings.hra_pct_of_basic) / 100) * basic);

    const employerPfCfg = payrollSettings.employer_pf || {};
    const employerPf =
      employerPfCfg.type === "FIXED"
        ? toNum(employerPfCfg.value)
        : Math.round((toNum(employerPfCfg.value) / 100) * basic);

    let otherAllowance = ctc - (basic + hra + employerPf + extraEarningsAnnual);
    if (otherAllowance < 0) otherAllowance = 0;

    const gross = basic + hra + otherAllowance + extraEarningsAnnual;

    const employeePfCfg = payrollSettings.employee_pf || {};
    const employeePf =
      employeePfCfg.type === "FIXED"
        ? toNum(employeePfCfg.value)
        : Math.round((toNum(employeePfCfg.value) / 100) * basic);

    const pt = toNum(payrollSettings.professional_tax_annual);
    const totalDeductions = employeePf + pt + extraDeductionsAnnual;
    const netMonthly = roundNetMonthly((gross - totalDeductions) / 12);

    setIsPfManuallyEdited(false);
    setIsEmployerPfManuallyEdited(false);
    setIsBasicManuallyEdited(false);

    setStep3Data((prev) => ({
      ...prev,
      baseSalary: String(ctc),
      basicSalary: String(basic),
      hra: String(hra),
      employerPf: String(employerPf),
      otherAllowance: String(otherAllowance),
      pf: String(employeePf),
      professionalTax: String(pt),
      totalEmployerContributions: String(employerPf),
      grossEarnings: String(gross),
      totalDeductions: String(totalDeductions),
      netSalary: String(netMonthly),
      incomeTax: prev.incomeTax, // kept for state compatibility; payload sends 0
      esi: prev.esi,
    }));
  }, [payrollSettings, debouncedAnnualCtc, step3Data.earningsItems, step3Data.deductionsItems]);

  // Derived values (same logic as onboarding step 3)
  useEffect(() => {
    const basic = toNum(step3Data.basicSalary);
    const hra = toNum(step3Data.hra);
    const hasEarningsInput = step3Data.basicSalary !== "" && step3Data.hra !== "";

    const pf = toNum(step3Data.pf);
    const pt = toNum(step3Data.professionalTax);
    const otherAllowance = toNum(step3Data.otherAllowance);

    const extraEarningsAnnual = Array.isArray(step3Data.earningsItems)
      ? step3Data.earningsItems.reduce((sum, it) => sum + toNum(it?.amount), 0)
      : 0;
    const extraDeductionsAnnual = Array.isArray(step3Data.deductionsItems)
      ? step3Data.deductionsItems.reduce((sum, it) => sum + toNum(it?.amount), 0)
      : 0;

    const gross = basic + hra + otherAllowance + extraEarningsAnnual;
    if (!hasEarningsInput) {
      setNetSalaryError("");
      setStep3Data((prev) => ({
        ...prev,
        grossEarnings: "",
        totalDeductions: "",
        netSalary: "",
        totalEmployerContributions: "",
      }));
      return;
    }

    const totalDeductions = pf + pt + extraDeductionsAnnual;
    const rawNet = (gross - totalDeductions) / 12;
    const intergerPart = Math.floor(rawNet);
    const decimalPart = rawNet - intergerPart;
    const net = decimalPart > 0.5 ? intergerPart + 1 : intergerPart;

    setNetSalaryError(
      net < 0 ? "Net Salary cannot be negative. Please check earnings and deductions." : ""
    );

    setStep3Data((prev) => ({
      ...prev,
      grossEarnings: String(gross),
      totalDeductions: String(totalDeductions),
      netSalary: String(net),
      totalEmployerContributions: String(toNum(step3Data.employerPf)),
    }));
  }, [
    step3Data.basicSalary,
    step3Data.hra,
    step3Data.otherAllowance,
    step3Data.earningsItems,
    step3Data.pf,
    step3Data.professionalTax,
    step3Data.deductionsItems,
    step3Data.employerPf,
  ]);

  const showGrossMismatchHint = useMemo(() => {
    const annual = toNum(step3Data.baseSalary);
    const gross = toNum(step3Data.grossEarnings);
    const hasRequiredEarningsInputs = step3Data.basicSalary !== "" && step3Data.hra !== "";
    if (!hasRequiredEarningsInputs) return false;
    const employer = toNum(step3Data.employerPf);
    return annual > 0 && Math.abs((gross + employer) - annual) >= 0.01;
  }, [step3Data.baseSalary, step3Data.grossEarnings, step3Data.basicSalary, step3Data.hra, step3Data.employerPf]);

  const onPfChange = (nextPf) => {
    setIsPfManuallyEdited(true);
    setStep3Data((prev) => ({ ...prev, pf: nextPf }));
  };

  const onEmployerPfChange = (nextPf) => {
    setIsEmployerPfManuallyEdited(true);
    setStep3Data((prev) => ({ ...prev, employerPf: nextPf }));
  };

  const onBasicChange = (nextBasic) => {
    setIsBasicManuallyEdited(true);
    setStep3Data((prev) => ({ ...prev, basicSalary: nextBasic }));
  };

  const validate = () => {
    if (!step3Data.baseSalary || toNum(step3Data.baseSalary) <= 0) {
      toast.error("Annual CTC is required");
      return false;
    }
    if (!step3Data.basicSalary || toNum(step3Data.basicSalary) <= 0) {
      toast.error("Basic CTC is required");
      return false;
    }
    if (!step3Data.hra || toNum(step3Data.hra) <= 0) {
      toast.error("HRA CTC is required");
      return false;
    }

    const annual = toNum(step3Data.baseSalary);
    const gross = toNum(step3Data.grossEarnings);
    const employer = toNum(step3Data.employerPf);
    if (annual <= 0 || Math.abs((gross + employer) - annual) >= 0.01) {
      toast.error("CTC must equal Gross Earnings + Employer Contributions");
      return false;
    }
    if (netSalaryError) {
      toast.error(netSalaryError);
      return false;
    }

    if (hasDuplicateItemNames(step3Data.earningsItems)) {
      toast.error("Earnings item names must be unique");
      return false;
    }
    if (hasDuplicateItemNames(step3Data.deductionsItems)) {
      toast.error("Deductions item names must be unique");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!validate()) return;

    const safeApplyFrom = applyFrom === "NEXT_MONTH" ? "NEXT_MONTH" : "CURRENT_MONTH";
    const payload = {
      apply_from: safeApplyFrom,
      finance: {
        payroll_info: {
          annual_ctc: String(step3Data.baseSalary),
        },
        earnings: {
          basic_salary: String(step3Data.basicSalary),
          hra: String(step3Data.hra),
          other_allowance: String(step3Data.otherAllowance || 0),
          gross_earnings: String(step3Data.grossEarnings || 0),
        },
        earnings_items: (Array.isArray(step3Data.earningsItems) ? step3Data.earningsItems : [])
          .filter((it) => String(it?.name || "").trim() && Number(it?.amount) > 0)
          .map((it) => ({ name: String(it.name).trim(), amount: Number(it.amount) })),
        employer_contributions: {
          pf: String(step3Data.employerPf || 0),
          total_contributions: String(step3Data.totalEmployerContributions || step3Data.employerPf || 0),
        },
        deductions: {
          pf: String(step3Data.pf || 0),
          professional_tax: String(step3Data.professionalTax || 0),
          total_deductions: String(step3Data.totalDeductions || 0),
        },
        deductions_items: (Array.isArray(step3Data.deductionsItems) ? step3Data.deductionsItems : [])
          .filter((it) => String(it?.name || "").trim() && Number(it?.amount) > 0)
          .map((it) => ({ name: String(it.name).trim(), amount: Number(it.amount) })),
        net_payable: {
          salary_per_month: String(step3Data.netSalary || 0),
        },
      },
    };

    setLoading(true);
    try {
      await patchUserPayrollFinance(userId, payload);
      toast.success("Payroll updated successfully");
      onSaveSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update payroll");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Payroll</h2>
            <p className="text-xs text-gray-500 font-medium">Update payroll finance details for this employee.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto bg-[#FDFDFD]">
          {fetching ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading payroll finance...</div>
          ) : (
            <div className="space-y-8">
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Apply From
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="apply_from"
                      value="CURRENT_MONTH"
                      checked={applyFrom === "CURRENT_MONTH"}
                      onChange={() => setApplyFrom("CURRENT_MONTH")}
                    />
                    <span className="text-sm font-semibold text-gray-900">Current month</span>
                  </label>
                  <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="apply_from"
                      value="NEXT_MONTH"
                      checked={applyFrom === "NEXT_MONTH"}
                      onChange={() => setApplyFrom("NEXT_MONTH")}
                    />
                    <span className="text-sm font-semibold text-gray-900">Next month</span>
                  </label>
                </div>
              </div>

              <PayrollStep
                step3Data={step3Data}
                setStep3Data={setStep3Data}
                payrollSettings={payrollSettings}
                onBasicChange={onBasicChange}
                onPfChange={onPfChange}
                onEmployerPfChange={onEmployerPfChange}
                showGrossMismatchHint={showGrossMismatchHint}
                netSalaryError={netSalaryError}
              />
            </div>
          )}
        </div>

        <div className="px-8 py-6 border-t border-gray-100 flex justify-end items-center gap-4 bg-white sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || fetching}
            onClick={handleSave}
            className="flex items-center justify-center gap-2 min-w-[180px] px-10 py-3.5 bg-[#EB4000] text-white rounded-2xl text-sm font-bold hover:bg-[#D63A00] transition-all shadow-xl shadow-orange-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Save size={18} /> Save Payroll
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

