import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  initiateEmployeeExit,
  terminateEmployeeImmediately,
  updateEmployeeExit
} from '../../api/emoloyees/addEmployees';
import { mapExitToNoticeForm, toDateInputValue } from '../../utils/employeeExit';

const NOTICE_EXIT_TYPES = [
  { value: 'RESIGNATION', label: 'Resignation' },
  { value: 'RETIREMENT', label: 'Retirement' },
  { value: 'END_OF_CONTRACT', label: 'End of Contract' }
];

const IMMEDIATE_EXIT_TYPE = 'TERMINATION';

export default function EmployeeExitModal({
  userId,
  employeeName,
  onClose,
  onSuccess,
  modalMode = 'create',
  initialExit = null
}) {
  const isEditMode = modalMode === 'edit';
  const isTerminationEdit = isEditMode && initialExit?.exit_type === IMMEDIATE_EXIT_TYPE;

  const [tabMode, setTabMode] = useState('notice');
  const [noticeForm, setNoticeForm] = useState(() => mapExitToNoticeForm(initialExit));
  const [immediateForm, setImmediateForm] = useState({
    exit_reason: initialExit?.exit_reason || '',
    last_working_day:
      initialExit?.exit_type === IMMEDIATE_EXIT_TYPE
        ? toDateInputValue(initialExit.last_working_day)
        : ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEditMode && initialExit) {
      if (initialExit.exit_type === IMMEDIATE_EXIT_TYPE) {
        setImmediateForm({
          exit_reason: initialExit.exit_reason || '',
          last_working_day: toDateInputValue(initialExit.last_working_day)
        });
      } else {
        setNoticeForm(mapExitToNoticeForm(initialExit));
      }
    }
  }, [isEditMode, initialExit]);

  const handleTabChange = (nextTab) => {
    setTabMode(nextTab);
    setErrors({});
  };

  const handleNoticeChange = (e) => {
    const { name, value } = e.target;
    setNoticeForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleImmediateChange = (e) => {
    const { name, value } = e.target;
    setImmediateForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateNoticeForm = () => {
    const nextErrors = {};
    if (!noticeForm.exit_reason.trim()) nextErrors.exit_reason = 'Exit reason is required';
    if (!noticeForm.notice_start_date) nextErrors.notice_start_date = 'Notice start date is required';
    if (!noticeForm.last_working_day) nextErrors.last_working_day = 'Last working day is required';
    if (
      noticeForm.notice_start_date &&
      noticeForm.last_working_day &&
      noticeForm.last_working_day < noticeForm.notice_start_date
    ) {
      nextErrors.last_working_day = 'Last working day must be on or after notice start date';
    }
    return nextErrors;
  };

  const validateImmediateForm = () => {
    const nextErrors = {};
    if (!immediateForm.exit_reason.trim()) nextErrors.exit_reason = 'Exit reason is required';
    if (!immediateForm.last_working_day) nextErrors.last_working_day = 'Last working day is required';
    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEditMode) {
      if (isTerminationEdit) {
        const termErrors = validateImmediateForm();
        setErrors(termErrors);
        const firstError = Object.values(termErrors)[0];
        if (firstError) {
          toast.error(firstError);
          return;
        }
      } else {
        const noticeErrors = validateNoticeForm();
        setErrors(noticeErrors);
        const firstError = Object.values(noticeErrors)[0];
        if (firstError) {
          toast.error(firstError);
          return;
        }
      }
    } else {
      const nextErrors = tabMode === 'notice' ? validateNoticeForm() : validateImmediateForm();
      setErrors(nextErrors);
      const firstError = Object.values(nextErrors)[0];
      if (firstError) {
        toast.error(firstError);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        let payload;
        if (isTerminationEdit) {
          payload = {
            exit_type: IMMEDIATE_EXIT_TYPE,
            exit_reason: immediateForm.exit_reason.trim(),
            last_working_day: immediateForm.last_working_day
          };
        } else {
          payload = {
            exit_type: noticeForm.exit_type,
            exit_reason: noticeForm.exit_reason.trim(),
            notice_start_date: noticeForm.notice_start_date,
            last_working_day: noticeForm.last_working_day
          };
        }
        const res = await updateEmployeeExit(userId, payload);
        toast.success(res?.message || 'Exit updated successfully');
      } else if (tabMode === 'notice') {
        const res = await initiateEmployeeExit(userId, {
          exit_type: noticeForm.exit_type,
          exit_reason: noticeForm.exit_reason.trim(),
          notice_start_date: noticeForm.notice_start_date,
          last_working_day: noticeForm.last_working_day
        });
        toast.success(res?.message || 'Notice period initiated successfully');
      } else {
        const res = await terminateEmployeeImmediately(userId, {
          exit_type: IMMEDIATE_EXIT_TYPE,
          exit_reason: immediateForm.exit_reason.trim(),
          last_working_day: immediateForm.last_working_day
        });
        toast.success(res?.message || 'Employee terminated successfully');
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to process exit');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (fieldError) =>
    `w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm border ${
      fieldError ? 'border-red-300' : 'border-gray-100'
    } focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)]`;

  const showNoticeForm = isEditMode ? !isTerminationEdit : tabMode === 'notice';
  const showImmediateForm = isEditMode ? isTerminationEdit : tabMode === 'immediate';

  const submitLabel = () => {
    if (submitting) return 'Processing...';
    if (isEditMode) return 'Save Changes';
    if (tabMode === 'immediate') return 'Terminate Immediately';
    return 'Initiate Notice Period';
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl border border-gray-100 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-100">
            <h4 className="text-base font-bold text-gray-900">
              {isEditMode ? 'Edit employee exit' : 'Initiate employee exit'}
            </h4>
            <p className="text-sm text-gray-500 mt-1">
              {employeeName ? (
                <>
                  {isEditMode ? 'Update exit for' : 'Process exit for'}{' '}
                  <span className="font-semibold text-gray-800">{employeeName}</span>
                </>
              ) : (
                isEditMode ? 'Update employee exit' : 'Process employee exit'
              )}
            </p>
            {!isEditMode && (
              <div className="flex gap-2 mt-4 p-1 bg-gray-50 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleTabChange('notice')}
                  disabled={submitting}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    tabMode === 'notice' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Notice Period
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('immediate')}
                  disabled={submitting}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    tabMode === 'immediate' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Immediate Termination
                </button>
              </div>
            )}
          </div>

          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {!isEditMode && tabMode === 'immediate' && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                This action is irreversible. The employee&apos;s access will end immediately. Last working
                day is stored on the exit record (e.g. for leave and payroll boundaries).
              </p>
            )}
            {!isEditMode && tabMode === 'notice' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                The employee will remain active until their last working day.
              </p>
            )}
            {isEditMode && !isTerminationEdit && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Update the scheduled exit details below.
              </p>
            )}

            {showNoticeForm && (
              <>
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">
                    Exit Type <span className="text-[#EB4000] ml-1">*</span>
                  </label>
                  <select
                    name="exit_type"
                    value={noticeForm.exit_type}
                    onChange={handleNoticeChange}
                    className={inputClass(false)}
                  >
                    {NOTICE_EXIT_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">
                    Exit Reason <span className="text-[#EB4000] ml-1">*</span>
                  </label>
                  <textarea
                    name="exit_reason"
                    value={noticeForm.exit_reason}
                    onChange={handleNoticeChange}
                    rows={3}
                    placeholder="Enter reason for exit"
                    className={inputClass(errors.exit_reason)}
                  />
                  {errors.exit_reason && (
                    <p className="text-[11px] text-red-500 mt-1">{errors.exit_reason}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">
                      Notice Start Date <span className="text-[#EB4000] ml-1">*</span>
                    </label>
                    <input
                      type="date"
                      name="notice_start_date"
                      value={noticeForm.notice_start_date}
                      onChange={handleNoticeChange}
                      className={inputClass(errors.notice_start_date)}
                    />
                    {errors.notice_start_date && (
                      <p className="text-[11px] text-red-500 mt-1">{errors.notice_start_date}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">
                      Last Working Day <span className="text-[#EB4000] ml-1">*</span>
                    </label>
                    <input
                      type="date"
                      name="last_working_day"
                      value={noticeForm.last_working_day}
                      onChange={handleNoticeChange}
                      min={noticeForm.notice_start_date || undefined}
                      className={inputClass(errors.last_working_day)}
                    />
                    {errors.last_working_day && (
                      <p className="text-[11px] text-red-500 mt-1">{errors.last_working_day}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {showImmediateForm && (
              <>
                <div className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Exit Type</span>
                  <p className="font-semibold text-gray-900 mt-0.5">Termination</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">
                    Exit Reason <span className="text-[#EB4000] ml-1">*</span>
                  </label>
                  <textarea
                    name="exit_reason"
                    value={immediateForm.exit_reason}
                    onChange={handleImmediateChange}
                    rows={3}
                    placeholder="Enter reason for termination"
                    className={inputClass(errors.exit_reason)}
                  />
                  {errors.exit_reason && (
                    <p className="text-[11px] text-red-500 mt-1">{errors.exit_reason}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">
                    Last Working Day <span className="text-[#EB4000] ml-1">*</span>
                  </label>
                  <input
                    type="date"
                    name="last_working_day"
                    value={immediateForm.last_working_day}
                    onChange={handleImmediateChange}
                    className={inputClass(errors.last_working_day)}
                  />
                  {errors.last_working_day && (
                    <p className="text-[11px] text-red-500 mt-1">{errors.last_working_day}</p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="px-6 py-4 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60 ${
                !isEditMode && tabMode === 'immediate'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-[var(--brand-primary)] hover:bg-[var(--brand-strong)]'
              }`}
            >
              {submitLabel()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
