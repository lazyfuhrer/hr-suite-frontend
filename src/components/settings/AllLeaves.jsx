import React, { useEffect, useState } from "react";
import LeaveModal from "./LeaveModal";
import { toast } from "react-hot-toast";
import { createLeave, getLeave, updateLeave } from "../../api/settings";
import { Edit2 } from "lucide-react";

const AllLeaves = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [editingLeave, setEditingLeave] = useState(null);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await getLeave();
      setLeaves(res.items);
    } catch (error) {
      console.error("Failed to fetch leaves:", error);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLeave(null);
  };

  const handleAddNew = () => {
    setEditingLeave(null);
    setIsModalOpen(true);
  };

  const handleEdit = (leave) => {
    setEditingLeave(leave);
    setIsModalOpen(true);
  };

  const handleSubmitLeave = async (formData) => {
    try {
      if (editingLeave) {
        const id = editingLeave.id || editingLeave._id;
        await updateLeave(id, formData);
        toast.success("Leave policy updated");
      } else {
        await createLeave(formData);
        toast.success("Leave policy created");
      }
      fetchLeaves();
      handleCloseModal();
    } catch (error) {
      console.error(error);
      toast.error(
        editingLeave
          ? "Failed to update leave type. Please try again."
          : "Failed to create leave type. Please try again."
      );
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#F0F0F0] flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-[#1A1A1A]">Leave Policies</h3>
        <div className="flex gap-3">
          <button
            onClick={handleAddNew}
            className="bg-[var(--brand-primary)] text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--brand-strong)] transition-colors"
          >
            Add New Leave
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#F0F0F0]">
              <th className="p-3 px-4 text-left text-sm font-semibold text-[#666]">Leave Name</th>
              <th className="p-3 px-4 text-left text-sm font-semibold text-[#666]">Per Year</th>
              <th className="p-3 px-4 text-right text-sm font-semibold text-[#666]">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr><td colSpan="3" className="py-8 text-center text-gray-400">Loading...</td></tr>
            ) : leaves.length > 0 ? (
              leaves.map((leave) => (
                <tr key={leave.id} className="border-b border-[#FAFAFA] hover:bg-[var(--brand-soft-alt)] transition-colors group">
                  <td className="py-4 px-2 font-medium text-[#333]">{leave.name}</td>
                  <td className="py-4 text-[#666]">{leave.annual_quota}</td>
                  <td className="py-4 text-right pr-4">
                    <button
                      type="button"
                      onClick={() => handleEdit(leave)}
                      className="inline-flex items-center justify-end rounded-lg p-1.5 text-[var(--brand-primary)] hover:bg-[var(--brand-soft-alt)]"
                      title="Edit Leave"
                    >
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="3" className="py-8 text-center text-gray-400">No leave policies found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <LeaveModal
          onClose={handleCloseModal}
          onSubmit={handleSubmitLeave}
          editData={editingLeave}
        />
      )}
    </div>
  );
};

export default AllLeaves;
