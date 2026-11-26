import React, { useState, useMemo, useEffect } from "react";
import { X, Upload, FileText } from "lucide-react";
import { toast } from "react-hot-toast";
import { updateOrganizationProfile } from "../../api/settings";

const OrganizationProfileModal = ({ isOpen, onClose }) => {
  const [file, setFile] = useState(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    if (file.type?.startsWith("image/")) {
      return URL.createObjectURL(file);
    }
    return null;
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const handleClose = () => {
    setFile(null);
    setAddress("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!file) return toast.error("Please upload a file");
    if (!address.trim()) return toast.error("Address is required");
    const formData = new FormData();
    formData.append("logo", file);
    formData.append("address", address.trim());
    setLoading(true);
    try {
      const res = await updateOrganizationProfile(formData);
      toast.success(res?.message || "Organization profile saved");
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update organization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white w-[420px] rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 pb-2 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-[#1A1A1A]">Add Organization</h2>
            <p className="text-sm text-gray-500">Upload logo or document and address</p>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors border-none bg-transparent cursor-pointer">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Upload File</label>
            {!file && (
              <label className="w-full p-6 border border-dashed border-[#E5E5E5] rounded-2xl bg-[#FAFAFA] flex flex-col items-center gap-2 cursor-pointer text-center">
                <div className="w-10 h-10 rounded-full bg-[#FFF4F0] flex items-center justify-center">
                  <Upload size={18} className="text-[#FF5722]" />
                </div>
                <div className="text-sm text-[#1A1A1A] font-semibold">Click to Upload</div>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            )}
            {file && (
              <div className="relative w-full border border-[#E5E5E5] rounded-2xl bg-[#FAFAFA] p-4">
                <button
                  onClick={() => setFile(null)}
                  className="absolute right-2 top-2 p-1 rounded-full bg-white shadow hover:bg-gray-100"
                  type="button"
                >
                  <X size={14} className="text-gray-600" />
                </button>
                {previewUrl ? (
                  <div className="flex items-center gap-4">
                    <img src={previewUrl} alt="Preview" className="w-20 h-20 object-cover rounded-xl border border-[#E5E5E5]" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{file.name}</div>
                      <div className="text-xs text-gray-500">Image preview</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E5E5] flex items-center justify-center">
                      <FileText size={20} className="text-[#FF5722]" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{file.name}</div>
                      <div className="text-xs text-gray-500">PDF selected</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Address</label>
            <textarea
              rows={4}
              placeholder="Enter full address"
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none resize-none"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 pt-2 flex justify-between items-center bg-white border-t border-gray-50">
          <button onClick={handleClose} className="text-sm font-bold text-[#6B2D0F] border-none bg-transparent cursor-pointer">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 py-3 bg-[#FF5722] text-white text-sm font-bold rounded-xl hover:bg-[#E64A19] transition-colors cursor-pointer border-none disabled:bg-gray-400"
          >
            {loading ? "Processing..." : "Save Item"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationProfileModal;
