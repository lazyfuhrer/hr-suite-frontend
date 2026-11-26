/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-hot-toast";
import { createWorkShift, updateWorkShift } from "../../api/settings";

const toTimeWithSeconds = (value) => {
  if (!value) return "";
  return value.length === 5 ? `${value}:00` : value;
};

// Helper to strip seconds from "HH:MM:SS" to "HH:MM" for input type="time"
const toInputTime = (value) => {
  if (!value) return "";
  return value.slice(0, 5);
};

const calculateBreakDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return "";
  const [startHour, startMinute] = String(startTime).split(":").map(Number);
  const [endHour, endMinute] = String(endTime).split(":").map(Number);
  if (
    !Number.isFinite(startHour) ||
    !Number.isFinite(startMinute) ||
    !Number.isFinite(endHour) ||
    !Number.isFinite(endMinute)
  ) {
    return "";
  }

  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  const duration = endTotal >= startTotal ? endTotal - startTotal : endTotal + 1440 - startTotal;
  return String(duration);
};

const CreateWorkShiftModal = ({ isOpen, onClose, onSuccess, editData = null }) => {
  const [loading, setLoading] = useState(false);
  const initialForm = {
    name: "",
    start_time: "",
    end_time: "",
    break_start_time: "",
    break_end_time: "",
    break_duration_mins: ""
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    if (isOpen && editData) {
      setFormData({
        name: editData.name || "",
        start_time: toInputTime(editData.start_time),
        end_time: toInputTime(editData.end_time),
        break_start_time: toInputTime(editData.break_start_time),
        break_end_time: toInputTime(editData.break_end_time),
        break_duration_mins: editData.break_duration_mins || ""
      });
    } else if (isOpen) {
      setFormData(initialForm);
    }
  }, [isOpen, editData]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      break_duration_mins: calculateBreakDuration(prev.break_start_time, prev.break_end_time),
    }));
  }, [formData.break_start_time, formData.break_end_time]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    setFormData(initialForm);
    onClose();
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return toast.error("Shift name is required");
    if (!formData.start_time) return toast.error("Start time is required");
    if (!formData.end_time) return toast.error("End time is required");
    if (!formData.break_start_time) return toast.error("Break start time is required");
    if (!formData.break_end_time) return toast.error("Break end time is required");

    const payload = {
      name: formData.name.trim(),
      start_time: toTimeWithSeconds(formData.start_time),
      end_time: toTimeWithSeconds(formData.end_time),
      break_start_time: toTimeWithSeconds(formData.break_start_time),
      break_end_time: toTimeWithSeconds(formData.break_end_time),
      break_duration_mins: Number(formData.break_duration_mins || 0)
    };

    setLoading(true);
    try {
      if (editData) {
        const id = editData.id || editData._id;
        await updateWorkShift(id, payload);
        toast.success("Work shift updated successfully");
      } else {
        await createWorkShift(payload);
        toast.success("Work shift created successfully");
      }
      onSuccess?.();
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white w-[420px] rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 pb-2 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-[#1A1A1A]">
              {editData ? "Edit Work Shift" : "Configure New Shift"}
            </h2>
            <p className="text-sm text-gray-500">Enter the shift details to proceed</p>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <hr className="mx-6 border-gray-100" />

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Shift Name <span className="text-[var(--brand-primary)] ml-1">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Morning Shift"
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/20 font-medium"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Start Time <span className="text-[var(--brand-primary)] ml-1">*</span>
              </label>
              <input
                type="time"
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/20 font-medium"
                value={formData.start_time}
                onChange={(e) => handleChange("start_time", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                End Time <span className="text-[var(--brand-primary)] ml-1">*</span>
              </label>
              <input
                type="time"
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/20 font-medium"
                value={formData.end_time}
                onChange={(e) => handleChange("end_time", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Break Start Time <span className="text-[var(--brand-primary)] ml-1">*</span>
              </label>
              <input
                type="time"
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/20 font-medium"
                value={formData.break_start_time}
                onChange={(e) => handleChange("break_start_time", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Break End Time <span className="text-[var(--brand-primary)] ml-1">*</span>
              </label>
              <input
                type="time"
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/20 font-medium"
                value={formData.break_end_time}
                onChange={(e) => handleChange("break_end_time", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Break Duration (Minutes) <span className="text-[var(--brand-primary)] ml-1">*</span>
            </label>
            <input
              type="number"
              disabled
              placeholder="Auto-calculated"
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF5722]/20 font-medium"
              value={formData.break_duration_mins}
              readOnly
            />
          </div>
        </div>

        <div className="p-6 pt-2 flex justify-between items-center bg-white border-t border-gray-50">
          <button onClick={handleClose} className="text-sm font-bold text-[#6B2D0F] hover:underline">Cancel</button>
          <button
            disabled={loading}
            onClick={handleSubmit}
            className="px-8 py-3 bg-[#FF5722] text-white text-sm font-bold rounded-xl hover:bg-[#E64A19] transition-colors disabled:opacity-50 shadow-lg shadow-orange-200"
          >
            {loading ? "Processing..." : editData ? "Update Shift" : "Save Shift"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkShiftModal;