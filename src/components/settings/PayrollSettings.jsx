import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { getPayrollSettings, updatePayrollSettings } from "../../api/payroll";

const numberOnly = (value) => String(value || "").replace(/[^\d.]/g, "");
const toNum = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const clampPct = (value) => {
  const n = toNum(value);
  if (n === null) return null;
  return Math.min(100, Math.max(0, n));
};

export default function PayrollSettings() {
  const [basicPct, setBasicPct] = useState("");
  const [hraPctOfBasic, setHraPctOfBasic] = useState("");

  const [employerPfType, setEmployerPfType] = useState("PERCENTAGE"); // PERCENTAGE | FIXED
  const [employerPfValue, setEmployerPfValue] = useState("");

  const [employeePfType, setEmployeePfType] = useState("PERCENTAGE"); // PERCENTAGE | FIXED
  const [employeePfValue, setEmployeePfValue] = useState("");

  const [professionalTax, setProfessionalTax] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await getPayrollSettings();
        const data = res?.data || {};
        if (cancelled) return;

        setBasicPct(data.basic_pct === null || data.basic_pct === undefined ? "" : String(data.basic_pct));
        setHraPctOfBasic(
          data.hra_pct_of_basic === null || data.hra_pct_of_basic === undefined ? "" : String(data.hra_pct_of_basic)
        );

        setEmployerPfType(data.employer_pf?.type === "FIXED" ? "FIXED" : "PERCENTAGE");
        setEmployerPfValue(
          data.employer_pf?.value === null || data.employer_pf?.value === undefined ? "" : String(data.employer_pf.value)
        );

        setEmployeePfType(data.employee_pf?.type === "FIXED" ? "FIXED" : "PERCENTAGE");
        setEmployeePfValue(
          data.employee_pf?.value === null || data.employee_pf?.value === undefined ? "" : String(data.employee_pf.value)
        );

        setProfessionalTax(
          data.professional_tax_annual === null || data.professional_tax_annual === undefined
            ? ""
            : String(data.professional_tax_annual)
        );
      } catch (e) {
        if (!cancelled) toast.error(e?.response?.data?.message || "Failed to load payroll settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const validate = () => {
    const basic = clampPct(basicPct);
    const hra = clampPct(hraPctOfBasic);
    if (basic === null) {
      toast.error("Basic % is required");
      return false;
    }
    if (hra === null) {
      toast.error("HRA % is required");
      return false;
    }

    const employerValue = toNum(employerPfValue);
    if (employerValue === null || employerValue < 0) {
      toast.error("Employer PF value must be a valid number");
      return false;
    }

    const employeeValue = toNum(employeePfValue);
    if (employeeValue === null || employeeValue < 0) {
      toast.error("Employee PF value must be a valid number");
      return false;
    }

    const ptAnnual = toNum(professionalTax);
    if (ptAnnual === null || ptAnnual < 0) {
      toast.error("Professional Tax must be a valid number");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (saving) return;
    if (!validate()) return;

    const payload = {
      basic_pct: clampPct(basicPct) ?? 0,
      hra_pct_of_basic: clampPct(hraPctOfBasic) ?? 0,
      employer_pf: {
        type: employerPfType === "FIXED" ? "FIXED" : "PERCENTAGE",
        value: toNum(employerPfValue) ?? 0,
      },
      employee_pf: {
        type: employeePfType === "FIXED" ? "FIXED" : "PERCENTAGE",
        value: toNum(employeePfValue) ?? 0,
      },
      professional_tax_annual: toNum(professionalTax) ?? 0,
    };

    setSaving(true);
    try {
      await updatePayrollSettings(payload);
      toast.success("Payroll settings saved");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to save payroll settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#F0F0F0] flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[#1A1A1A]">Payroll Settings</h3>
          <p className="text-base text-[#666]">
            Configure default payroll percentages/amounts applied across the organization.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving}
          className="bg-[var(--brand-primary)] text-white px-5 py-2 rounded-xl text-base font-semibold hover:bg-[var(--brand-strong)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-400 text-sm">Loading payroll settings...</div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#FAFAFA] border border-[#F0F0F0] rounded-2xl p-5">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            Earnings defaults
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Basic %
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 50"
                value={basicPct}
                onChange={(e) => setBasicPct(numberOnly(e.target.value))}
                className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.12)] focus:border-[var(--brand-soft-border)]"
              />
              <p className="text-sm text-gray-400 mt-1">Percentage of Annual Basic.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                HRA %
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 40"
                value={hraPctOfBasic}
                onChange={(e) => setHraPctOfBasic(numberOnly(e.target.value))}
                className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.12)] focus:border-[var(--brand-soft-border)]"
              />
              <p className="text-sm text-gray-400 mt-1">Percentage of Basic.</p>
            </div>
          </div>
        </div>

        <div className="bg-[#FAFAFA] border border-[#F0F0F0] rounded-2xl p-5">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            Statutory defaults
          </div>

          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-bold text-gray-700">
                  Employer PF
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                    <input
                      type="radio"
                      name="employer_pf_type"
                      checked={employerPfType === "PERCENTAGE"}
                      onChange={() => setEmployerPfType("PERCENTAGE")}
                    />
                    Percentage
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                    <input
                      type="radio"
                      name="employer_pf_type"
                      checked={employerPfType === "FIXED"}
                      onChange={() => setEmployerPfType("FIXED")}
                    />
                    Fixed
                  </label>
                </div>
              </div>

              <input
                type="text"
                inputMode="decimal"
                placeholder={employerPfType === "PERCENTAGE" ? "e.g. 12" : "e.g. 21,600"}
                value={employerPfValue}
                onChange={(e) => setEmployerPfValue(numberOnly(e.target.value))}
                className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.12)] focus:border-[var(--brand-soft-border)]"
              />
              <p className="text-sm text-gray-400">
                {employerPfType === "PERCENTAGE" ? "Percentage of Annual CTC." : "Fixed annual amount."}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-bold text-gray-700">
                  Employee PF
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                    <input
                      type="radio"
                      name="employee_pf_type"
                      checked={employeePfType === "PERCENTAGE"}
                      onChange={() => setEmployeePfType("PERCENTAGE")}
                    />
                    Percentage
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                    <input
                      type="radio"
                      name="employee_pf_type"
                      checked={employeePfType === "FIXED"}
                      onChange={() => setEmployeePfType("FIXED")}
                    />
                    Fixed
                  </label>
                </div>
              </div>

              <input
                type="text"
                inputMode="decimal"
                placeholder={employeePfType === "PERCENTAGE" ? "e.g. 12" : "e.g. 21,600"}
                value={employeePfValue}
                onChange={(e) => setEmployeePfValue(numberOnly(e.target.value))}
                className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.12)] focus:border-[var(--brand-soft-border)]"
              />
              <p className="text-sm text-gray-400">
                {employeePfType === "PERCENTAGE" ? "Percentage of Annual CTC." : "Fixed annual amount."}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Professional Tax (fixed)
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 28,800"
                value={professionalTax}
                onChange={(e) => setProfessionalTax(numberOnly(e.target.value))}
                className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.12)] focus:border-[var(--brand-soft-border)]"
              />
              <p className="text-sm text-gray-400">Fixed annual amount.</p>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

