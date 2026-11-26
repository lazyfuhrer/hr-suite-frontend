export default function CancelExitConfirmModal({
  employeeName,
  onClose,
  onConfirm,
  loading = false
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl border border-gray-100 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h4 className="text-base font-bold text-gray-900">Cancel scheduled exit?</h4>
          <p className="text-sm text-gray-500 mt-1">
            {employeeName ? (
              <>
                This will cancel the scheduled exit for{' '}
                <span className="font-semibold text-gray-800">{employeeName}</span>. The employee will
                return to active employment.
              </>
            ) : (
              'This will cancel the scheduled exit. The employee will return to active employment.'
            )}
          </p>
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Keep Exit
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? 'Cancelling...' : 'Cancel Exit'}
          </button>
        </div>
      </div>
    </div>
  );
}
