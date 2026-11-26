import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, MoreVertical, Search, Edit2, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { getOfficeLocations, deleteOfficeLocation } from "../../api/settings";
import CreateOfficeLocationModal from "./CreateOfficeLocationModal";
import DeleteConfirmModal from "../common/DeleteConfirmModal";

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const resolveId = (item, fallback) => item.id ?? item._id ?? item.uuid ?? fallback;

const OfficeLocations = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // NEW: State for Edit/Delete
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const data = await getOfficeLocations();
      setLocations(normalizeList(data));
    } catch {
      toast.error("Failed to load office locations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleteLoading(true);
    try {
      await deleteOfficeLocation(deleteTarget.id);
      toast.success("Location deleted successfully");
      setDeleteTarget(null);
      fetchLocations();
    } catch {
      toast.error("Failed to delete location");
    } finally {
      setDeleteLoading(false);
      setActiveMenuId(null);
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleAddNew = () => {
    setEditingLocation(null);
    setIsModalOpen(true);
  };

  const filteredLocations = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return locations.filter((loc) =>
      `${loc.name || ""} ${loc.address || ""}`.toLowerCase().includes(query)
    );
  }, [locations, searchQuery]);

  const formatLatLng = (lat, lng) => {
    if (lat === undefined || lat === null) return "--";
    if (lng === undefined || lng === null) return "--";
    return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
  };

  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col gap-4 border border-[#F0F0F0]">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-[#1A1A1A] m-0">Office Location</h3>
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
            onClick={handleAddNew}
            className="py-2.5 px-5 rounded-lg border-none bg-[#FF5722] text-white text-sm font-semibold cursor-pointer hover:bg-[#d43800] transition-colors"
          >
            Add New Location
          </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="border-b border-[#F0F0F0]">
              <th className="p-3 px-4 text-left text-sm font-semibold text-[#666]">Office Name</th>
              <th className="p-3 px-4 text-left text-sm font-semibold text-[#666]">Location</th>
              <th className="p-3 px-4 text-left text-sm font-semibold text-[#666]">Latitude & Longitude</th>
              <th className="p-3 px-4 text-left text-sm font-semibold text-[#666]">Radius</th>
              <th className="p-3 px-4 text-right text-sm font-semibold text-[#666] w-10">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center py-10 text-gray-400 text-sm">Loading...</td></tr>
            ) : filteredLocations.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-10 text-gray-400 text-sm">
                  {searchQuery.trim() ? 'No results found' : 'No office locations found'}
                </td>
              </tr>
            ) : (
              filteredLocations.map((location, index) => {
                const locationId = resolveId(location, `loc-${index}`);
                return (
                  <tr key={locationId} className="border-b border-[#F0F0F0] bg-white">
                    <td className="p-4 text-sm text-[#1A1A1A] font-medium">{location.name || "-"}</td>
                    <td className="p-4 text-sm text-[#1A1A1A]">{location?.address || "-"}</td>
                    <td className="p-4 text-sm text-[#1A1A1A]">{formatLatLng(location.latitude, location.longitude)}</td>
                    <td className="p-4 text-sm text-[#1A1A1A]">{location.radius_meters ? `${location.radius_meters} Met` : "-"}</td>
                    <td className="p-4 text-center relative">
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === locationId ? null : locationId)}
                        className="bg-transparent border-none cursor-pointer p-1 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <MoreVertical size={18} color="#666" />
                      </button>

                      {activeMenuId === locationId && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)}></div>
                          <div className="absolute right-10 top-0 mt-2 bg-white shadow-xl rounded-xl border border-gray-100 p-1.5 z-20 w-32 flex flex-col gap-1">
                            <button onClick={() => handleEdit(location)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold text-gray-700 hover:bg-orange-50 rounded-lg transition-all">
                              <Edit2 size={14} className="text-orange-500" /> Edit
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({ id: locationId, name: location.name });
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

      <CreateOfficeLocationModal
        isOpen={isModalOpen}
        onClose={() => {
            setIsModalOpen(false);
            setEditingLocation(null);
        }}
        onSuccess={fetchLocations}
        editData={editingLocation}
      />

      <DeleteConfirmModal
        open={!!deleteTarget}
        title="Delete office location?"
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

export default OfficeLocations;