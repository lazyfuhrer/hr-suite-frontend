import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "react-hot-toast";
import { useLayout } from "../context/LayoutContext";
import { getActivities } from "../api/activity";

const getInitials = (fullName) => {
  if (!fullName) return "NA";
  return String(fullName)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
};

const formatCreatedAt = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB");
};

const getMetadataSummary = (metadata) => {
  if (!metadata || typeof metadata !== "object") return "-";

  const source = metadata.source;
  const date = metadata.date;
  const status = metadata.status;

  const parts = [
    source ? String(source) : null,
    date ? `Date: ${String(date)}` : null,
    status ? `Status: ${String(status)}` : null,
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(" • ");

  const json = JSON.stringify(metadata);
  if (!json) return "-";
  return json.length > 120 ? `${json.slice(0, 117)}...` : json;
};

const ActivitiesPage = () => {
  const { setHeaderConfig } = useLayout();

  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    setHeaderConfig({
      title: "Activities",
      breadcrumb: [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Activities", path: "/activities", active: true },
      ],
      onBack: null,
    });
  }, [setHeaderConfig]);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const res = await getActivities({ page, limit });
        setActivities(res?.items || []);
        setPagination({
          total: res?.total ?? 0,
          total_pages: res?.total_pages ?? 1,
        });
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load activities");
        setActivities([]);
        setPagination({ total: 0, total_pages: 1 });
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [page, limit]);

  const totalPages = pagination.total_pages || 1;

  const renderPaginationButtons = () => {
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i += 1) pages.push(i);

      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return pages.map((p, idx) =>
      p === "..." ? (
        <span key={`dots-${idx}`} className="px-2 text-gray-400 text-xs">
          ...
        </span>
      ) : (
        <button
          key={p}
          type="button"
          onClick={() => setPage(p)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
            page === p
              ? "bg-[#EB4000] text-white"
              : "border border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          {p}
        </button>
      )
    );
  };

  const activityRows = useMemo(() => activities || [], [activities]);

  return (
    <div className="bg-[#F8F9FA] min-h-screen p-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Activity List</h2>
            <p className="text-sm text-gray-500 mt-1">Recent organization activity events</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-[#F8F9FA] text-left text-xs text-gray-500 font-medium">
                <th className="py-3 px-4 rounded-l-xl">Type</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Metadata</th>
                <th className="py-3 px-4 rounded-r-xl">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-gray-400 text-xs">
                    Loading activities...
                  </td>
                </tr>
              ) : activityRows.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-gray-400 text-xs">
                    No activities found
                  </td>
                </tr>
              ) : (
                activityRows.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 text-xs font-medium text-gray-700">
                      <div className="font-semibold text-gray-900">{item.activity_type || "-"}</div>
                      <div className="text-[10px] text-gray-500">{item.entity_type || "-"}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#EB4000] flex items-center justify-center text-white text-xs font-bold">
                          {getInitials(item?.actor?.full_name)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900">
                            {item?.actor?.full_name || "-"}
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium">
                            {item?.actor?.employee_id || "-"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#EB4000] flex items-center justify-center text-white text-xs font-bold">
                          {getInitials(item?.target?.full_name)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900">
                            {item?.target?.full_name || "-"}
                          </div>
                          <div className="text-[10px] text-gray-400 font-medium">
                            {item?.target?.employee_id || "-"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-600">
                      {getMetadataSummary(item?.metadata)}
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-600 rounded-r-xl">
                      {formatCreatedAt(item?.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Show</span>
            <select
              value={limit}
              onChange={(e) => {
                const nextLimit = Number(e.target.value || 20);
                setLimit(nextLimit);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#EB4000]/20"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm font-medium text-gray-600">of {pagination.total} results</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            {renderPaginationButtons()}
            <button
              type="button"
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivitiesPage;

