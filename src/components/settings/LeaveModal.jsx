import React, { useEffect, useState } from "react";

const LeaveModal = ({ onClose, onSubmit, editData = null }) => {
  const [formData, setFormData] = useState({ name: "", annual_quota: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editData) {
      setFormData({
        name: editData.name || "",
        annual_quota: editData.annual_quota ?? "",
      });
    } else {
      setFormData({ name: "", annual_quota: "" });
    }
  }, [editData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      name: formData.name,
      annual_quota: Number(formData.annual_quota),
    };
    await onSubmit(payload);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-white bg-[#EB4000] rounded-full w-6 h-6 flex items-center justify-center text-xs"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
          {editData ? "Edit Leave Type" : "Configure Leave Type"}
        </h2>
        <p className="text-sm text-[#666] mb-8">
          {editData
            ? "Update the leave type details"
            : "Enter the leave details to initiate"}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#1A1A1A]">
              Leave Name <span className="text-[var(--brand-primary)] ml-1">*</span>
            </label>
            <input
              required
              placeholder="e.g. Sick Leave"
              className="bg-[#F8F8F8] border border-[#F0F0F0] rounded-xl p-3 text-sm focus:outline-none focus:border-[#EB4000]"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[#1A1A1A]">
              Annual Quota <span className="text-[var(--brand-primary)] ml-1">*</span>
            </label>
            <input
              required
              type="number"
              placeholder="12"
              className="bg-[#F8F8F8] border border-[#F0F0F0] rounded-xl p-3 text-sm focus:outline-none focus:border-[#EB4000]"
              value={formData.annual_quota}
              onChange={(e) => setFormData({ ...formData, annual_quota: e.target.value })}
            />
          </div>

          <div className="flex justify-between items-center mt-4">
            <button type="button" onClick={onClose} className="text-sm font-bold text-[#333] hover:underline">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`${isSubmitting ? "bg-gray-400" : "bg-[#EB4000]"} text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all`}
            >
              {isSubmitting ? "Saving..." : "Save Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveModal;
