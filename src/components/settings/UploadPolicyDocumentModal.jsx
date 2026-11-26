import React, { useState, useEffect } from "react";
import { X, Upload } from "lucide-react";
import { toast } from "react-hot-toast";
import { createOrgDocument, updateOrgDocument } from "../../api/settings";

const UploadPolicyDocumentModal = ({ isOpen, onClose, refreshData, editData }) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("COMPLIANCE");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setTitle(editData.doc_type);
      setCategory(editData.doc_category);
    }
  }, [editData]);

  if (!isOpen) return null;

  const handleClose = () => {
    setTitle("");
    setFile(null);
    setCategory("COMPLIANCE");
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error("Document title is required");
    if (!file && !editData) return toast.error("Please upload a file");

    const formData = new FormData();
    formData.append(title.toLowerCase().replace(/\s+/g, '_'), file); 
    formData.append("doc_category", category);

    setLoading(true);
    try {
      if (editData) {
        await updateOrgDocument(editData.id, formData);
        toast.success("Document updated");
      } else {
        await createOrgDocument( formData);
        toast.success("Document uploaded successfully");
      }
      refreshData();
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white w-[420px] rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 pb-2 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-[#1A1A1A]">{editData ? "Update" : "Upload"} Policy Document</h2>
            <p className="text-sm text-gray-500">Document details for your organization</p>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors border-none bg-transparent cursor-pointer">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">
              Document Title <span className="text-[var(--brand-primary)] ml-1">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Anti-Bribery Policy"
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">
              Category <span className="text-[var(--brand-primary)] ml-1">*</span>
            </label>
            <select 
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="LEGAL">LEGAL</option>
              <option value="COMPLIANCE">COMPLIANCE</option>
              <option value="FINANCIAL">FINANCIAL</option>
              <option value="OPERATIONAL">OPERATIONAL</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">
              Upload File <span className="text-[var(--brand-primary)] ml-1">*</span>
            </label>
            <label className="w-full p-6 border border-dashed border-[#E5E5E5] rounded-2xl bg-[#FAFAFA] flex flex-col items-center gap-2 cursor-pointer text-center">
              <div className="w-10 h-10 rounded-full bg-[#FFF4F0] flex items-center justify-center">
                <Upload size={18} className="text-[#FF5722]" />
              </div>
              <div className="text-sm text-[#1A1A1A] font-semibold">{file ? file.name : "Click to Upload"}</div>
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
            </label>
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

export default UploadPolicyDocumentModal;