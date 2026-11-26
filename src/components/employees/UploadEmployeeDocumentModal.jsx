import { useEffect, useMemo, useState } from "react";
import { X, Upload } from "lucide-react";
import { toast } from "react-hot-toast";
import { uploadNewOnboardingDocument } from "../../api/emoloyees/addEmployees";

const DOC_TYPE_LABELS = {
  AADHAR_FRONT: "Aadhar Front",
  AADHAR_BACK: "Aadhar Back",
  PASSPORT_SIZE_PHOTO: "Passport Size Photo",
  PAN_CARD: "PAN Card",
  SIGNED_JOINING_LETTER: "Signed Joining Letter",
};

export default function UploadEmployeeDocumentModal({
  open,
  employeeId,
  docType = null,
  docCategory = "IDENTITY",
  onClose,
  onSuccess,
}) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const docTypeLabel = useMemo(() => {
    if (!docType) return null;
    return DOC_TYPE_LABELS[docType] || docType;
  }, [docType]);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setSaving(false);
      return;
    }
    setFile(null);
  }, [open, docType]);

  if (!open) return null;

  const handleClose = () => {
    if (saving) return;
    setFile(null);
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!employeeId) return toast.error("Employee ID missing");
    if (!file) return toast.error("Please choose a file to upload");

    setSaving(true);
    try {
      await uploadNewOnboardingDocument(employeeId, file, {
        ...(docType ? { doc_type: docType, doc_category: docCategory } : {}),
      });
      toast.success("Document uploaded successfully");
      onSuccess?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to upload document");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden flex flex-col">
        <div className="p-6 pb-3 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-[#1A1A1A]">
              {docTypeLabel ? `Upload ${docTypeLabel}` : "Upload Document"}
            </h2>
            <p className="text-sm text-gray-500">
              {docType
                ? "Upload the required document for this employee."
                : "Upload a new document for this employee."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 pb-2">
          {docType ? (
            <div className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">Type:</span> {docType}
              <span className="mx-2 text-gray-300">•</span>
              <span className="font-semibold text-gray-700">Category:</span> {docCategory}
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">Category:</span> IDENTITY
            </div>
          )}
        </div>

        <div className="p-6 pt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Upload File <span className="text-[var(--brand-primary)] ml-1">*</span>
            </label>
            <label className="w-full p-6 border border-dashed border-[#E5E5E5] rounded-2xl bg-[#FAFAFA] flex flex-col items-center gap-2 cursor-pointer text-center">
              <div className="w-10 h-10 rounded-full bg-[#FFF4F0] flex items-center justify-center">
                <Upload size={18} className="text-[#FF5722]" />
              </div>
              <div className="text-sm text-[#1A1A1A] font-semibold">
                {file ? file.name : "Click to upload a file"}
              </div>
              <div className="text-xs text-gray-500">
                {docType
                  ? "Image or PDF accepted."
                  : "The file name will be used as the document type."}
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        <div className="p-6 pt-3 flex justify-between items-center bg-white border-t border-gray-50">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="text-sm font-bold text-[#6B2D0F] hover:underline disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-8 py-3 bg-[#FF5722] text-white text-sm font-bold rounded-xl hover:bg-[#E64A19] transition-colors disabled:opacity-60 shadow-lg shadow-orange-200"
          >
            {saving ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </div>
    </div>
  );
}
