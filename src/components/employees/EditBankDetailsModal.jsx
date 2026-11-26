import { useEffect, useRef, useState } from 'react';
import { X, Save, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getBankDetails, updateEmployeeBankAndAsset, buildBankAndAssetFormData } from '../../api/emoloyees/addEmployees';

const ALLOWED_ASSET_DEVICE_PREFS = ['MACBOOK', 'WINDOWS'];

/** Normalize API value to MACBOOK/WINDOWS only; legacy LINUX etc. → '' */
function normalizeAllowedAssetDevicePref(value) {
  const v = String(value ?? '').trim().toUpperCase();
  return ALLOWED_ASSET_DEVICE_PREFS.includes(v) ? v : '';
}

/** India EPFO UAN: exactly 12 digits (empty allowed). */
const UAN_DIGITS = 12;
const UAN_PATTERN = new RegExp(`^\\d{${UAN_DIGITS}}$`);

/** PF account / member id: alphanumeric with common separators; 5–40 chars when provided. */
const PF_MIN = 5;
const PF_MAX = 40;
const PF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9./\s-]*[A-Za-z0-9]$/;

function validateUan(value) {
  const t = String(value ?? '').trim();
  if (!t) return '';
  if (!UAN_PATTERN.test(t)) return `UAN must be exactly ${UAN_DIGITS} digits`;
  return '';
}

function validatePf(value) {
  const t = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  if (t.length < PF_MIN || t.length > PF_MAX) {
    return `PF number must be between ${PF_MIN} and ${PF_MAX} characters`;
  }
  if (!PF_PATTERN.test(t)) return 'PF number can only contain letters, numbers, /, ., and -';
  return '';
}

/** IFSC: 11 chars. ex: HDFC0001234 */
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const DEVICE_SERIAL_PATTERN = /^[A-Za-z0-9]+$/;

function sanitizeDeviceSerial(value) {
  return String(value ?? '').replace(/[^A-Za-z0-9]/g, '');
}

function validateDeviceSerial(value) {
  const t = sanitizeDeviceSerial(value).trim();
  if (!t) return 'Device serial number is required';
  if (!DEVICE_SERIAL_PATTERN.test(t)) {
    return 'Device serial number can only contain letters and numbers';
  }
  return '';
}

function getExistingCancelledCheque(initialBankAsset) {
  return initialBankAsset?.bank_details?.bank_proof_url || '';
}

function getCancelledChequeLabel(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) {
    try {
      const pathname = new URL(s).pathname;
      const name = pathname.split('/').filter(Boolean).pop();
      return name || 'View cancelled cheque';
    } catch {
      return 'View cancelled cheque';
    }
  }
  return s;
}

export default function EditBankDetailsModal({
  isOpen,
  userId,
  initialBankAsset,
  onClose,
  onSaveSuccess
}) {
  const [saving, setSaving] = useState(false);
  const [bankLookupLoading, setBankLookupLoading] = useState(false);
  const [cancelledChequeFile, setCancelledChequeFile] = useState(null);
  const [existingCancelledCheque, setExistingCancelledCheque] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    uan_number: '',
    pf_number: '',
    device_serial_number: ''
  });
  const [form, setForm] = useState({
    ifsc_code: '',
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    asset_device_pref: '',
    asset_agreement_accepted: false,
    device_serial_number: '',
    uan_number: '',
    pf_number: ''
  });
  const lastIfscLookupRef = useRef('');

  useEffect(() => {
    if (!isOpen) return;
    const bd = initialBankAsset?.bank_details || {};
    const ad = initialBankAsset?.asset_details || {};
    const pd = initialBankAsset?.payroll_details || {};
    setForm({
      ifsc_code: bd.ifsc_code ?? '',
      bank_name: bd.bank_name ?? '',
      account_number: bd.account_number ?? '',
      account_holder_name: bd.account_holder_name ?? '',
      asset_device_pref: normalizeAllowedAssetDevicePref(ad.asset_device_pref),
      asset_agreement_accepted: Boolean(ad.asset_agreement_accepted),
      device_serial_number:
        ad.device_serial_number != null ? sanitizeDeviceSerial(ad.device_serial_number) : '',
      uan_number: pd.uan_number != null ? String(pd.uan_number).replace(/\D/g, '').slice(0, UAN_DIGITS) : '',
      pf_number:
        pd.pf_number != null
          ? String(pd.pf_number).replace(/[^A-Za-z0-9./\s-]/g, '').slice(0, PF_MAX)
          : ''
    });
    lastIfscLookupRef.current = '';
    setFieldErrors({ uan_number: '', pf_number: '', device_serial_number: '' });
    setCancelledChequeFile(null);
    setExistingCancelledCheque(getExistingCancelledCheque(initialBankAsset));
  }, [isOpen, initialBankAsset]);

  const onInput = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const onIfscChange = (e) => {
    const next = String(e.target.value ?? '').toUpperCase();
    setForm((prev) => ({ ...prev, ifsc_code: next }));
  };

  const onUanChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, UAN_DIGITS);
    setForm((prev) => ({ ...prev, uan_number: v }));
    setFieldErrors((errs) => ({ ...errs, uan_number: '' }));
  };

  const onPfChange = (e) => {
    const v = e.target.value.replace(/[^A-Za-z0-9./\s-]/g, '').slice(0, PF_MAX);
    setForm((prev) => ({ ...prev, pf_number: v }));
    setFieldErrors((errs) => ({ ...errs, pf_number: '' }));
  };

  const onDeviceSerialChange = (e) => {
    const v = sanitizeDeviceSerial(e.target.value);
    setForm((prev) => ({ ...prev, device_serial_number: v }));
    setFieldErrors((errs) => ({ ...errs, device_serial_number: '' }));
  };

  const onCheck = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.checked }));

  useEffect(() => {
    if (!isOpen) return;
    const ifsc = String(form.ifsc_code ?? '').trim().toUpperCase();
    if (!IFSC_PATTERN.test(ifsc)) {
      setBankLookupLoading(false);
      return;
    }
    if (lastIfscLookupRef.current === ifsc) return;

    let cancelled = false;
    lastIfscLookupRef.current = ifsc;
    setBankLookupLoading(true);

    (async () => {
      try {
        const res = await getBankDetails(ifsc);
        const bankName = res?.BANK || res?.bank || res?.bank_name || '';
        if (!cancelled) {
          setForm((prev) => ({ ...prev, bank_name: String(bankName || '').trim() }));
        }
      } catch {
        // Keep any existing bank_name if lookup fails.
        if (!cancelled) toast.error('Could not fetch bank name for this IFSC');
      } finally {
        if (!cancelled) setBankLookupLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, form.ifsc_code]);

  const handleSave = async () => {
    if (!userId) return;

    const uanErr = validateUan(form.uan_number);
    const pfRaw = form.pf_number.trim().replace(/\s+/g, ' ');
    const pfErr = validatePf(pfRaw);
    const deviceSerial = sanitizeDeviceSerial(form.device_serial_number).trim();
    const deviceSerialErr = validateDeviceSerial(form.device_serial_number);
    if (uanErr || pfErr || deviceSerialErr) {
      setFieldErrors({
        uan_number: uanErr,
        pf_number: pfErr,
        device_serial_number: deviceSerialErr
      });
      const firstErr = uanErr || pfErr || deviceSerialErr;
      toast.error(firstErr);
      return;
    }

    setSaving(true);
    try {
      const prefNorm = normalizeAllowedAssetDevicePref(form.asset_device_pref);
      const formData = buildBankAndAssetFormData({
        ifsc_code: form.ifsc_code.trim(),
        bank_name: form.bank_name.trim(),
        account_number: form.account_number.trim(),
        account_holder_name: form.account_holder_name.trim(),
        asset_device_pref: prefNorm,
        asset_agreement_accepted: form.asset_agreement_accepted,
        device_serial_number: deviceSerial,
        uan_number: form.uan_number.trim() || '',
        pf_number: pfRaw || '',
        cancelled_cheque: cancelledChequeFile,
      });
      const res = await updateEmployeeBankAndAsset(userId, formData);
      toast.success(res?.message || 'Bank and asset details updated');
      onSaveSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update bank details');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={() => {
        if (!saving) onClose?.();
      }}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Bank Details</h2>
            <p className="text-xs text-gray-500 font-medium">Update bank, asset, and statutory details for this employee.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-600 disabled:opacity-60"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto bg-[#FDFDFD]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Bank</div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">IFSC code</label>
                <input
                  type="text"
                  value={form.ifsc_code}
                  onChange={onIfscChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)]"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Bank name</label>
                <input
                  type="text"
                  value={form.bank_name}
                  readOnly
                  aria-readonly="true"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-gray-50 cursor-not-allowed focus:outline-none"
                />
                {bankLookupLoading ? (
                  <p className="text-[11px] text-gray-400 mt-1">Fetching bank name from IFSC…</p>
                ) : null}
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Account number</label>
                <input
                  type="text"
                  value={form.account_number}
                  onChange={onInput('account_number')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)]"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Account holder</label>
                <input
                  type="text"
                  value={form.account_holder_name}
                  onChange={onInput('account_holder_name')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)]"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                  Cancelled Cheque
                </label>
                {existingCancelledCheque && !cancelledChequeFile ? (
                  <div className="mb-2 text-xs text-gray-600">
                    Current:{' '}
                    {/^https?:\/\//i.test(existingCancelledCheque) ? (
                      <a
                        href={existingCancelledCheque}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--brand-primary)] font-semibold hover:underline"
                      >
                        {getCancelledChequeLabel(existingCancelledCheque)}
                      </a>
                    ) : (
                      <span className="font-semibold text-gray-800">
                        {getCancelledChequeLabel(existingCancelledCheque)}
                      </span>
                    )}
                  </div>
                ) : null}
                <label className="w-full p-4 border border-dashed border-gray-200 rounded-xl bg-[#FAFAFA] flex flex-col items-center gap-2 cursor-pointer text-center">
                  <div className="w-9 h-9 rounded-full bg-[#FFF4F0] flex items-center justify-center">
                    <Upload size={16} className="text-[#FF5722]" />
                  </div>
                  <div className="text-sm text-gray-900 font-semibold">
                    {cancelledChequeFile
                      ? cancelledChequeFile.name
                      : 'Click to upload cancelled cheque'}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Optional on edit. Image or PDF. Only sent when a new file is chosen.
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) => setCancelledChequeFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Asset</div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                  Device preference
                </label>
                <select
                  value={form.asset_device_pref}
                  onChange={(e) => setForm((prev) => ({ ...prev, asset_device_pref: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)]"
                >
                  <option value="">Select device preference</option>
                  <option value="MACBOOK">MacBook</option>
                  <option value="WINDOWS">Windows</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Only MacBook or Windows. Leave unselected if the saved preference should stay unchanged on save.
                </p>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                  Device serial number
                  <span className="text-[#EB4000] ml-1">*</span>
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  aria-invalid={Boolean(fieldErrors.device_serial_number)}
                  value={form.device_serial_number}
                  onChange={onDeviceSerialChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)] ${
                    fieldErrors.device_serial_number ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                {fieldErrors.device_serial_number ? (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.device_serial_number}</p>
                ) : null}
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={form.asset_agreement_accepted}
                  onChange={onCheck('asset_agreement_accepted')}
                  className="rounded border-gray-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                />
                <span className="text-sm text-gray-900">Asset agreement accepted</span>
              </label>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Payroll (PF / UAN)</div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                  UAN number
                  <span className="text-gray-400 font-normal normal-case tracking-normal">&nbsp;(12 digits)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={UAN_DIGITS}
                  placeholder="e.g. 123456789012"
                  aria-invalid={Boolean(fieldErrors.uan_number)}
                  value={form.uan_number}
                  onChange={onUanChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)] ${
                    fieldErrors.uan_number ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                {fieldErrors.uan_number ? (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.uan_number}</p>
                ) : null}
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                  PF number
                  <span className="text-gray-400 font-normal normal-case tracking-normal">
                    &nbsp;({PF_MIN}–{PF_MAX} chars, letters / numbers / / . - )
                  </span>
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  maxLength={PF_MAX}
                  placeholder="e.g. TN/5012345/1234567 or PF123456"
                  aria-invalid={Boolean(fieldErrors.pf_number)}
                  value={form.pf_number}
                  onChange={onPfChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)] ${
                    fieldErrors.pf_number ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                {fieldErrors.pf_number ? (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.pf_number}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 border-t border-gray-100 flex justify-end items-center gap-4 bg-white sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-all active:scale-95 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex items-center justify-center gap-2 min-w-[180px] px-10 py-3.5 bg-[#EB4000] text-white rounded-2xl text-sm font-bold hover:bg-[#D63A00] transition-all shadow-xl shadow-orange-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Save size={18} /> Save Bank Details
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

