import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { sendTemporaryPassword } from '../../api/emoloyees/addEmployees';

export default function SendTemporaryPasswordModal({
  email,
  employeeName,
  onClose,
  onSuccess
}) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email?.trim()) return;
    setSending(true);
    try {
      const res = await sendTemporaryPassword({ email: email.trim() });
      toast.success(res?.message || 'Temporary password sent');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to send temporary password');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => {
        if (!sending) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl border border-gray-100 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h4 className="text-base font-bold text-gray-900">Send temporary password?</h4>
          <p className="text-sm text-gray-500 mt-1">
            A temporary password will be emailed to{' '}
            <span className="font-semibold text-gray-800">{email}</span>
            {employeeName ? (
              <>
                {' '}for <span className="font-semibold text-gray-800">{employeeName}</span>
              </>
            ) : null}
            .
          </p>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
            The employee will be prompted to change their password on next login.
          </p>
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold hover:bg-[var(--brand-strong)] disabled:opacity-60"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
