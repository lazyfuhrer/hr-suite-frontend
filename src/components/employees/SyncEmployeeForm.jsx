import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { crossOrgSyncUser } from '../../api/emoloyees/addEmployees';
import { useLayout } from '../../context/LayoutContext';

const defaultFormData = {
    email: '',
    role: 'admin'
};

const SyncEmployeeForm = ({ onBack }) => {
    const [formData, setFormData] = useState(defaultFormData);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { setHeaderConfig } = useLayout();

    useEffect(() => {
        setHeaderConfig({
            title: 'Sync Employee',
            breadcrumb: [
                { label: 'Dashboard', path: '/dashboard' },
                { label: 'Employees', path: '/employees' },
                { label: 'Sync Employee', path: '/employees/sync', active: true }
            ],
            onBack: null
        });
    }, [setHeaderConfig]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const nextErrors = {};
        const trimmedEmail = formData.email.trim();

        if (!trimmedEmail) {
            nextErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
            nextErrors.email = 'Enter a valid email address';
        }
        if (!formData.role) nextErrors.role = 'Role is required';

        setErrors(nextErrors);

        const firstError = Object.values(nextErrors)[0];
        if (firstError) {
            toast.error(firstError);
        }

        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const payload = {
            email: formData.email.trim(),
            role: formData.role
        };

        setIsSubmitting(true);
        try {
            const response = await crossOrgSyncUser(payload);
            toast.success(response?.message || 'Employee synced successfully');
            setFormData(defaultFormData);
            onBack();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to sync employee');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-3 p-6">
            <div className="flex items-center gap-2">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm max-w-4xl">
                <div className="mb-6">
                    <h3 className="font-bold text-lg text-gray-800">Sync Employee</h3>
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                        Clone an Admin or HR user from another organization into the current organization.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 font-semibold mb-1 block">
                                Email <span className="text-[#EB4000] ml-1">*</span>
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter email"
                                className={`w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm border ${errors.email ? 'border-red-300' : 'border-gray-100'
                                    } focus:outline-none focus:ring-2 focus:ring-[#EB4000]/20`}
                            />
                            {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 font-semibold mb-1 block">
                                Role <span className="text-[#EB4000] ml-1">*</span>
                            </label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className={`w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm border ${errors.role ? 'border-red-300' : 'border-gray-100'
                                    } focus:outline-none focus:ring-2 focus:ring-[#EB4000]/20`}
                            >
                                <option value="admin">Admin</option>
                                <option value="hr">HR</option>
                            </select>
                            {errors.role && <p className="text-[11px] text-red-500 mt-1">{errors.role}</p>}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onBack}
                            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${isSubmitting
                                ? 'bg-gray-300 text-white cursor-not-allowed'
                                : 'bg-[#EB4000] text-white hover:bg-[#d43800]'
                                }`}
                        >
                            {isSubmitting ? 'Syncing...' : 'Sync Employee'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SyncEmployeeForm;
