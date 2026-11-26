import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLayout } from '../../context/LayoutContext';
import { getInProgressOnboardingUsers, getOnboardingStatus } from '../../api/emoloyees/addEmployees';

const DraftEmployeesView = ({ onBack, onContinueDraft }) => {
    const { setHeaderConfig } = useLayout();
    const [loading, setLoading] = useState(true);
    const [drafts, setDrafts] = useState([]);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);
    const [documentsCompleteByUserId, setDocumentsCompleteByUserId] = useState({});

    useEffect(() => {
        setHeaderConfig({
            title: 'Draft Employees',
            breadcrumb: [
                { label: 'Dashboard', path: '/dashboard' },
                { label: 'Employees', path: '/employees' },
                { label: 'Draft Employees', path: '/employees', active: true }
            ],
            onBack
        });
    }, [setHeaderConfig, onBack]);

    useEffect(() => {
        const fetchDrafts = async () => {
            setLoading(true);
            setDocumentsCompleteByUserId({});
            try {
                const response = await getInProgressOnboardingUsers({
                    page,
                    limit,
                    search: '',
                    sort_dir: 'DESC'
                });

                setDrafts(Array.isArray(response?.data) ? response.data : []);
                setPagination({
                    total: Number(response?.total || 0),
                    total_pages: Number(response?.total_pages || 1),
                });
            } catch (error) {
                console.error('Error fetching draft employees:', error);
                toast.error('Failed to load draft employees');
                setDrafts([]);
                setPagination({ total: 0, total_pages: 1 });
            } finally {
                setLoading(false);
            }
        };

        fetchDrafts();
    }, [page, limit]);

    useEffect(() => {
        const fetchDraftCompletionStatus = async () => {
            if (!drafts.length) return;
            setIsCheckingStatus(true);
            try {
                const statusResponses = await Promise.all(
                    drafts.map(async (draft) => {
                        try {
                            const response = await getOnboardingStatus(draft.id);
                            return {
                                id: draft.id,
                                documentsComplete: Boolean(response?.admin_step_completion?.documents_complete),
                            };
                        } catch (error) {
                            console.error(`Error fetching onboarding status for ${draft.id}:`, error);
                            return { id: draft.id, documentsComplete: false };
                        }
                    })
                );

                const completionMap = statusResponses.reduce((acc, item) => {
                    acc[item.id] = item.documentsComplete;
                    return acc;
                }, {});

                setDocumentsCompleteByUserId(completionMap);
            } finally {
                setIsCheckingStatus(false);
            }
        };

        fetchDraftCompletionStatus();
    }, [drafts]);

    const formatDate = (value) => {
        if (!value) return '-';
        return new Date(value).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="space-y-6 p-6 bg-gray-200/4">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="font-bold text-lg text-gray-800">Draft Employee List</h3>
                    <button
                        onClick={onBack}
                        className="bg-[#FFF4F0] border border-[#FBD9CC] text-[#4D190E] px-6 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#FBD9CC] transition-all"
                    >
                        Back to Employees
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-y border-gray-50 text-[10px] text-gray-500 uppercase font-semibold tracking-wide">
                                <th className="px-6 py-4">Employee ID</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Created At</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-10 text-gray-400 text-xs">Loading draft employees...</td>
                                </tr>
                            ) : drafts.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-10 text-gray-400 text-xs">No draft employees found.</td>
                                </tr>
                            ) : (
                                drafts.map((draft) => {
                                    const isDocumentsComplete = Boolean(documentsCompleteByUserId[draft.id]);
                                    const isContinueDisabled = isDocumentsComplete || isCheckingStatus;

                                    return (
                                    <tr key={draft.id} className="hover:bg-orange-50/20 transition-colors">
                                        <td className="px-6 py-5 text-xs text-gray-500 font-semibold">
                                            {draft.employee_id || '-'}
                                        </td>
                                        <td className="px-6 py-5 text-xs font-bold text-gray-900">
                                            {draft.full_name || '-'}
                                        </td>
                                        <td className="px-6 py-5 text-xs text-gray-600">
                                            {draft.official_email || '-'}
                                        </td>
                                        <td className="px-6 py-5 text-xs text-gray-600 uppercase">
                                            {draft.role || '-'}
                                        </td>
                                        <td className="px-6 py-5 text-xs text-gray-600">
                                            {draft?.department?.name || 'Unassigned'}
                                        </td>
                                        <td className="px-6 py-5 text-xs text-gray-600">
                                            {formatDate(draft.created_at)}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button
                                                disabled={isContinueDisabled}
                                                onClick={() => onContinueDraft?.(draft.id)}
                                                className={`px-4 py-2 rounded-lg text-[11px] font-semibold transition-all ${isContinueDisabled
                                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                    : 'bg-[#EB4000] text-white hover:bg-[#d43800]'
                                                    }`}
                                            >
                                                {isDocumentsComplete ? 'Completed' : isCheckingStatus ? 'Checking...' : 'Continue'}
                                            </button>
                                        </td>
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 border-t border-gray-50 flex justify-between items-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    <p>Showing {drafts.length} of {pagination.total} results</p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                            className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-xl text-xs hover:bg-gray-100 transition-all disabled:opacity-50"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-semibold text-gray-700 normal-case">
                            Page {page} of {pagination.total_pages}
                        </span>
                        <button
                            disabled={page >= pagination.total_pages}
                            onClick={() => setPage((prev) => Math.min(prev + 1, pagination.total_pages))}
                            className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-xl text-xs hover:bg-gray-100 transition-all disabled:opacity-50"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DraftEmployeesView;
