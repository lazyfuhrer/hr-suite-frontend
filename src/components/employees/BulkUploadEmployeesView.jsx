import { useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "react-hot-toast";
import { bulkImportUsers, downloadBulkImportTemplate } from "../../api/emoloyees/addEmployees";
import { useLayout } from "../../context/LayoutContext";

const ACCEPTED_TYPES = [
  ".xlsx",
  ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
].join(",");

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function validateBulkUploadFile(file) {
  if (!file) return "Please choose an Excel file to upload";
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "File size must be 5 MB or less";
  }
  return null;
}

function showImportToast(response) {
  const summary = response?.summary || {};
  const message = response?.message || "Bulk import completed";
  const { total_rows = 0, created = 0, failed = 0 } = summary;

  if (response?.dry_run) {
    toast(message, { icon: "ℹ️" });
    return;
  }

  if (created > 0 && failed === 0) {
    toast.success(message);
    return;
  }

  if (created > 0 && failed > 0) {
    toast(`${message}: ${created} created, ${failed} failed`, { icon: "⚠️" });
    return;
  }

  toast.error(`${message}: ${failed} of ${total_rows} row(s) failed`);
}

function getStatusBadgeClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "created" || normalized === "success") {
    return "bg-green-100 text-green-700";
  }
  if (normalized === "failed") {
    return "bg-red-100 text-red-700";
  }
  if (normalized === "skipped") {
    return "bg-gray-100 text-gray-600";
  }
  return "bg-gray-100 text-gray-600";
}

const SUMMARY_LABELS = [
  { key: "total_rows", label: "Total Rows" },
  { key: "valid", label: "Valid" },
  { key: "created", label: "Created" },
  { key: "failed", label: "Failed" },
  { key: "skipped", label: "Skipped" },
];

function getFileNameFromDisposition(disposition) {
  if (!disposition) return null;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const plainMatch = disposition.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] || null;
}

export default function BulkUploadEmployeesView({ onBack, onSuccess }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const { setHeaderConfig } = useLayout();

  const handleBack = () => {
    if (importing) return;
    setFile(null);
    setImportResult(null);
    onBack?.();
  };

  useEffect(() => {
    setHeaderConfig({
      title: "Bulk Upload",
      breadcrumb: [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Employees", path: "/employees" },
        { label: "Bulk Upload", path: "/employees", active: true },
      ],
      onBack: importing ? null : handleBack,
    });
  }, [setHeaderConfig, onBack, importing]);

  const handleUploadAnother = () => {
    setFile(null);
    setImportResult(null);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;
    const validationError = validateBulkUploadFile(selectedFile);

    if (validationError) {
      toast.error(validationError);
      setFile(null);
      e.target.value = "";
      return;
    }

    setFile(selectedFile);
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await downloadBulkImportTemplate();
      const contentDisposition = res?.headers?.["content-disposition"];
      const fileName =
        getFileNameFromDisposition(contentDisposition) || "employee-bulk-import-template.xlsx";

      const blob = new Blob([res.data], {
        type:
          res?.headers?.["content-type"] ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Template downloaded");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to download template");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleSubmit = async () => {
    const validationError = validateBulkUploadFile(file);
    if (validationError) return toast.error(validationError);

    setImporting(true);
    try {
      const response = await bulkImportUsers(file);
      setImportResult(response);
      showImportToast(response);

      if ((response?.summary?.created || 0) > 0) {
        onSuccess?.();
      }

      setFile(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Bulk import failed");
    } finally {
      setImporting(false);
    }
  };

  const results = Array.isArray(importResult?.results) ? importResult.results : [];
  const summary = importResult?.summary || {};

  return (
    <div className="space-y-3 p-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleBack}
          disabled={importing}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-60"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {!importResult && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm max-w-4xl">
          <div className="mb-6">
            <h3 className="font-bold text-lg text-gray-800">Bulk Upload Employees</h3>
            <p className="text-xs text-gray-500 mt-1 font-medium">
              Import multiple employees from an Excel file (.xlsx or .xls). Max file size: 5 MB.
            </p>
            <p className="text-xs text-gray-500 mt-1 font-medium">
              Download the template, fill it in, then upload.
            </p>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={importing || downloadingTemplate}
              className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              <Download size={16} />
              {downloadingTemplate ? "Downloading..." : "Download Template"}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-500 font-semibold mb-1 block">
              Upload File <span className="text-[#EB4000] ml-1">*</span>
            </label>
            <label className="w-full p-6 border border-dashed border-[#E5E5E5] rounded-2xl bg-[#FAFAFA] flex flex-col items-center gap-2 cursor-pointer text-center">
              <div className="w-10 h-10 rounded-full bg-[#FFF4F0] flex items-center justify-center">
                <Upload size={18} className="text-[#FF5722]" />
              </div>
              <div className="text-sm text-[#1A1A1A] font-semibold">
                {file ? file.name : "Click to upload a file"}
              </div>
              <div className="text-xs text-gray-500">
                Upload an Excel file (.xlsx or .xls). Max file size: 5 MB.
              </div>
              <input
                type="file"
                className="hidden"
                accept={ACCEPTED_TYPES}
                disabled={importing}
                onChange={handleFileChange}
              />
            </label>
          </div>

          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={handleBack}
              disabled={importing}
              className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={importing}
              className="px-6 py-2.5 bg-[var(--brand-primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--brand-strong)] transition-colors disabled:opacity-60"
            >
              {importing ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      )}

      {importResult && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm max-w-5xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg text-gray-800">Import Results</h3>
              <p className="text-xs text-gray-500 mt-1 font-medium">
                {importResult.message || "Bulk import completed"}
              </p>
            </div>
            {importResult.dry_run && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                Dry Run
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {SUMMARY_LABELS.map(({ key, label }) => (
              <div
                key={key}
                className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl min-w-[110px]"
              >
                <div className="text-[10px] uppercase font-semibold text-gray-500 tracking-wide">
                  {label}
                </div>
                <div className="text-lg font-bold text-gray-800 mt-0.5">
                  {summary[key] ?? 0}
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="bg-[#F8F9FA] text-[10px] text-gray-500 uppercase font-semibold tracking-wide">
                  <th className="px-4 py-3 rounded-l-xl">Row</th>
                  <th className="px-4 py-3">Employee ID</th>
                  <th className="px-4 py-3">Official Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-xl">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-10 text-center text-gray-400 text-xs">
                      No row-level results returned.
                    </td>
                  </tr>
                ) : (
                  results.map((item, index) => (
                    <tr key={`${item.row}-${item.employee_id}-${index}`} className="text-xs text-gray-700">
                      <td className="px-4 py-3 font-medium">{item.row ?? "-"}</td>
                      <td className="px-4 py-3">{item.employee_id || "-"}</td>
                      <td className="px-4 py-3">{item.official_email || "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${getStatusBadgeClass(item.status)}`}
                        >
                          {item.status || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-red-600">{item.error || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleUploadAnother}
              className="px-6 py-2.5 bg-[var(--brand-primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--brand-strong)] transition-colors"
            >
              Upload Another File
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Back to Employees
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
