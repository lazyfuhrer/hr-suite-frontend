import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, MoreVertical, Search, Edit2, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { getWorkShifts, deleteWorkShift } from "../../api/settings";
import CreateWorkShiftModal from "./CreateWorkShiftModal";
import DeleteConfirmModal from "../common/DeleteConfirmModal";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const resolveId = (item, fallback) => item.id ?? item._id ?? item.uuid ?? fallback;

const formatTime = (value) => {
  if (!value) return "--";
  const parts = value.split(":");
  if (parts.length < 2) return value;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
};

const WorkShifts = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // States for Actions
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingShift, setEditingShift] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const data = await getWorkShifts();
      setShifts(normalizeList(data));
    } catch {
      toast.error("Failed to load work shifts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleteLoading(true);
    try {
      await deleteWorkShift(deleteTarget.id);
      toast.success("Work shift deleted");
      setDeleteTarget(null);
      fetchShifts();
    } catch {
      toast.error("Failed to delete shift");
    } finally {
      setDeleteLoading(false);
      setActiveMenuId(null);
    }
  };

  const handleEditClick = (shift) => {
    setEditingShift(shift);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleAddNewClick = () => {
    setEditingShift(null);
    setIsModalOpen(true);
  };

  const filteredShifts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return shifts.filter((shift) =>
      `${shift.name || ""}`.toLowerCase().includes(query)
    );
  }, [shifts, searchQuery]);

  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col gap-4 border border-[#F0F0F0]">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-[#1A1A1A] m-0">Shift Configurations</h3>
        <div className="flex gap-3 items-center">
          <div className="relative w-80">
            <Search size={18} color="#999" className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2.5 px-3 pl-10 rounded-lg border border-[#E5E5E5] text-sm outline-none"
            />
          </div>
          <button
            onClick={handleAddNewClick}
            className="py-2.5 px-5 rounded-lg border-none bg-[#FF5722] text-white text-sm font-semibold cursor-pointer hover:bg-[#d43800] transition-colors"
          >
            Add New Shift
          </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="border-b border-[#F0F0F0]">
              <th className="p-3 px-4 text-left text-sm font-semibold text-[#666]">Shift Name</th>
              <th className="p-3 px-4 text-left text-sm font-semibold text-[#666]">Shift Timing</th>
              <th className="p-3 px-4 text-left text-sm font-semibold text-[#666]">Break Duration</th>
              <th className="p-3 px-4 text-right text-sm font-semibold text-[#666] w-10">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="text-center py-10 text-gray-400 text-sm">Loading...</td></tr>
            ) : filteredShifts.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-10 text-gray-400 text-sm">
                  {searchQuery.trim() ? 'No results found' : 'No work shifts found'}
                </td>
              </tr>
            ) : (
              filteredShifts.map((shift, index) => {
                const shiftId = resolveId(shift, `shift-${index}`);
                return (
                  <tr key={shiftId} className="border-b border-[#F0F0F0] transition-colors bg-white">
                    <td className="p-4 text-sm text-[#1A1A1A] font-medium">{shift.name || "-"}</td>
                    <td className="p-4 text-sm text-[#1A1A1A]">{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</td>
                    <td className="p-4 text-sm text-[#1A1A1A]">{shift.break_duration_mins ? `${shift.break_duration_mins} mins` : "-"}</td>
                    <td className="p-4 text-center relative">
                      <button onClick={() => setActiveMenuId(activeMenuId === shiftId ? null : shiftId)} className="bg-transparent border-none cursor-pointer p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <MoreVertical size={18} color="#666" />
                      </button>

                      {activeMenuId === shiftId && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)}></div>
                          <div className="absolute right-10 top-0 mt-2 bg-white shadow-xl rounded-xl border border-gray-100 p-1.5 z-20 w-32 flex flex-col gap-1">
                            <button onClick={() => handleEditClick(shift)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold text-gray-700 hover:bg-orange-50 rounded-lg transition-all">
                              <Edit2 size={14} className="text-orange-600" /> Edit
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({ id: shiftId, name: shift.name });
                                setActiveMenuId(null);
                              }}
                              className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Passing editData to reuse the modal */}
      <CreateWorkShiftModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingShift(null);
        }}
        onSuccess={fetchShifts}
        editData={editingShift}
      />

      <DeleteConfirmModal
        open={!!deleteTarget}
        title="Delete work shift?"
        itemName={deleteTarget?.name}
        onClose={() => {
          if (!deleteLoading) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        loading={deleteLoading}
      />
    </div>
  );
};

export default WorkShifts;