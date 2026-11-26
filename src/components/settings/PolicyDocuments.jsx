import React, { useMemo, useState, useEffect } from "react";
import { ChevronDown, Search, Trash2, ExternalLink, MoreVertical, Edit2, FileText, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import UploadPolicyDocumentModal from "./UploadPolicyDocumentModal";
import { deleteOrgDocument, getOrgDocuments } from "../../api/settings";
import DeleteConfirmModal from "../common/DeleteConfirmModal";

const PolicyDocuments = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingDoc, setEditingDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updateTrigger, setUpdateTrigger] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Correct useEffect pattern for async data fetching
  useEffect(() => {
    let isMounted = true;
    const fetchDocs = async () => {
      setLoading(true);
      try {
        const data = await getOrgDocuments();
        if (isMounted) {
          // Defensive check: ensure data is an array
          setDocuments(Array.isArray(data) ? data : data?.data || []);
        }
      } catch (error) {
        if (isMounted) {
          toast.error("Could not load organization documents");
          console.error(error);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDocs();
    return () => { isMounted = false; };
  }, [updateTrigger]);

  const filteredDocs = useMemo(() => {
    if (!Array.isArray(documents)) return [];
    const query = searchQuery.toLowerCase();
    return documents.filter((doc) =>
      doc.doc_type?.toLowerCase().includes(query) ||
      doc.doc_category?.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleteLoading(true);
    try {
      await deleteOrgDocument(deleteTarget.id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== deleteTarget.id));
      toast.success("Document deleted");
      setDeleteTarget(null);
    } catch (error) {
      console.error(error);
      toast.error("Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col gap-4 border border-[#F0F0F0]">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-[#1A1A1A] m-0">
          Organization Policy Documents
        </h3>
        <div className="flex gap-3 items-center">
          <div className="relative w-80">
            <Search size={18} color="#999" className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2.5 px-3 pl-10 rounded-lg border border-[#E5E5E5] text-sm outline-none focus:ring-1 focus:ring-[#FF5722]"
            />
          </div>
          <button
            onClick={() => { setEditingDoc(null); setIsModalOpen(true); }}
            className="py-2.5 px-5 rounded-lg border-none bg-[#FF5722] text-white text-sm font-semibold cursor-pointer hover:bg-[#d43800] transition-colors flex items-center gap-2"
          >
            Add New Document
          </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="border-b border-[#F0F0F0]">
              <th className="p-3 px-4 text-left text-sm font-semibold text-[#666]">Document Name</th>
              <th className="p-3 px-4 text-left text-sm font-semibold text-[#666]">Category</th>
              <th className="p-3 px-4 text-left text-sm font-semibold text-[#666]">Status</th>
              <th className="p-3 px-4 text-right text-sm font-semibold text-[#666]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="text-center py-20">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Loader2 className="animate-spin" size={32} />
                    <p>Fetching documents...</p>
                  </div>
                </td>
              </tr>
            ) : filteredDocs.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-20 text-gray-400 text-sm">
                  {searchQuery.trim() ? 'No results found' : 'No documents found'}
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => (
                <tr 
                  key={doc.id} 
                  className="border-b border-[#F0F0F0] hover:bg-gray-50 transition-colors bg-white"
                >
                  <td className="p-4 text-sm text-[#1A1A1A] font-medium">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      {doc.doc_type}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-[#666]">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">{doc.doc_category}</span>
                  </td>
                  <td className="p-4 text-xs font-bold uppercase">
                    <span className={`${
                      doc.verification_status === 'VERIFIED' ? 'text-green-600' : 
                      doc.verification_status === 'REJECTED' ? 'text-red-600' : 'text-[#FF5722]'
                    }`}>
                      {doc.verification_status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1 items-center">
                      <a 
                        href={doc.file_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="p-2 hover:bg-blue-50 rounded-md text-blue-500 transition-colors"
                        title="View Document"
                      >
                        <ExternalLink size={18} />
                      </a>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(activeMenuId === doc.id ? null : doc.id);
                          }}
                          className="bg-transparent border-none cursor-pointer p-1 hover:bg-gray-100 rounded-full transition-colors"
                          title="Actions"
                        >
                          <MoreVertical size={18} color="#666" />
                        </button>

                        {activeMenuId === doc.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)}></div>
                            <div className="absolute right-10 top-0 mt-2 bg-white shadow-xl rounded-xl border border-gray-100 p-1.5 z-20 w-32 flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setEditingDoc(doc);
                                  setIsModalOpen(true);
                                }}
                                className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold text-gray-700 hover:bg-orange-50 rounded-lg transition-all"
                              >
                                <Edit2 size={14} className="text-orange-600" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteTarget({ id: doc.id, name: doc.doc_type });
                                  setActiveMenuId(null);
                                }}
                                className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <UploadPolicyDocumentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDoc(null);
        }}
        refreshData={() => setUpdateTrigger(!updateTrigger)}
        editData={editingDoc}
      />

      <DeleteConfirmModal
        open={!!deleteTarget}
        title="Delete document?"
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

export default PolicyDocuments;