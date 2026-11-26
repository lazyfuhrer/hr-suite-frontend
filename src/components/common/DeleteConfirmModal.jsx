export default function DeleteConfirmModal({
  open,
  title = 'Delete item?',
  message,
  itemName,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onClose,
  onConfirm,
  loading = false,
}) {
  if (!open) return null;

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
          <h4 className="text-base font-bold text-gray-900">{title}</h4>
          <p className="text-sm text-gray-500 mt-1">
            {message || (
              <>
                Are you sure you want to delete{' '}
                {itemName ? (
                  <span className="font-semibold text-gray-800">{itemName}</span>
                ) : (
                  'this item'
                )}
                ? This action cannot be undone.
              </>
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
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
