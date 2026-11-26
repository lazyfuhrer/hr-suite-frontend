import axios from "axios";
import axiosInstance from "../axiosInstance";


export async function addEmployees(data) {
    const res = await axiosInstance.post("/api/onboarding", data);

    return res.data;
}

export async function inviteEmployee(data) {
    const res = await axiosInstance.post("/api/reverse-onboarding/users", data);
    return res.data;
}

export async function updateOnboardingProfile(userId, data) {
    const res = await axiosInstance.put(`/api/onboarding/${userId}/profile`, data);
    return res.data;
}


export async function getEmployees(ifsc) {
    const res = await axiosInstance.get(`https://ifsc.razorpay.com/${ifsc}`);
    return res.data;
}


// Step 2a: Detect Bank Details (External API)
export async function getBankDetails(ifsc) {
    // Using standard axios/fetch here to avoid base URL conflicts with your backend instance
    const res = await axios.get(`https://ifsc.razorpay.com/${ifsc}`);
    return res.data;
}

// Step 2b: Update Finance Details
export async function addEmployeeFinance(userId, data) {
    const res = await axiosInstance.put(`/api/onboarding/${userId}/finance`, data);
    return res.data;
}

// Step 2c: Update Employment Details
export async function addEmployeeEmployment(userId, data) {
    const res = await axiosInstance.put(`/api/onboarding/${userId}/employment`, data);
    return res.data;
}

export async function createDepartment(data) {
    const res = await axiosInstance.post('/api/departments', data);
    return res.data;
}

export async function updateDepartment(deptId, data) {
    const res = await axiosInstance.put(`/api/departments/${deptId}`, data);
    return res.data;
}
export async function deleteDepartment(deptId) {
    const res = await axiosInstance.delete(`/api/departments/${deptId}`);
    return res.data;
}

export async function getUsers(params = {}) {
    const { role, ...rest } = params;
    const queryParams = { page: 1, limit: 100, ...rest };
    if (role) queryParams.role = role;
    const res = await axiosInstance.get(`/api/users`, { params: queryParams });
    return res.data;
}

export async function getUserById(userId) {
    const res = await axiosInstance.get(`/api/users/${userId}`);
    return res.data;
}

export async function getUpcomingBirthdays(params = { days: 30, limit: 10 }) {
    const res = await axiosInstance.get('/api/users/upcoming-birthdays', { params });
    return res.data;
}

// Employee Profile (Admin View)
export async function getEmployeeProfile(userId) {
    const res = await axiosInstance.get(`/api/onboarding/${userId}/profile`);
    return res.data;
}

// Employee Documents (Admin View)
export async function getEmployeeDocuments(userId, params = {}) {
    const res = await axiosInstance.get(`/api/onboarding/${userId}/documents-summary`, {
        params,
    });
    return res.data;
}

// Employee Bank & Asset (Admin View)
export async function getEmployeeBankAndAsset(userId) {
    const res = await axiosInstance.get(`/api/onboarding/${userId}/bank-and-asset`);
    return res.data;
}

export async function updateEmployeeBankAndAsset(userId, formData) {
    const res = await axiosInstance.patch(`/api/onboarding/${userId}/bank-and-asset`, formData);
    return res.data;
}

export function buildBankAndAssetFormData({
    ifsc_code,
    bank_name,
    account_number,
    account_holder_name,
    asset_device_pref,
    asset_agreement_accepted,
    device_serial_number,
    uan_number,
    pf_number,
    cancelled_cheque,
}) {
    const fd = new FormData();
    fd.append('ifsc_code', ifsc_code);
    fd.append('bank_name', bank_name);
    fd.append('account_number', account_number);
    fd.append('account_holder_name', account_holder_name);
    if (asset_device_pref) fd.append('asset_device_pref', asset_device_pref);
    fd.append('asset_agreement_accepted', String(asset_agreement_accepted));
    fd.append('device_serial_number', device_serial_number);
    if (uan_number) fd.append('uan_number', uan_number);
    if (pf_number) fd.append('pf_number', pf_number);
    if (cancelled_cheque) fd.append('cancelled_cheque', cancelled_cheque);
    return fd;
}

export async function getEmployeeLeavesSummary(userId, params = {}) {
    const res = await axiosInstance.get(`/api/users/${userId}/leaves`, { params });
    return res.data;
}

export async function getEmployeePayrolls(userId, params = { page: 1, limit: 10 }) {
    const res = await axiosInstance.get(`/api/users/${userId}/payrolls`, { params });
    return res.data;
}

export async function getEmployeeRequestsCombined(userId, params = { page: 1, limit: 10 }) {
    const res = await axiosInstance.get(`/api/users/${userId}/requests/combined`, { params });
    return res.data;
}

export async function getEmployeeLeaveRequests(userId, params = { page: 1, limit: 10 }) {
    const res = await axiosInstance.get(`/api/users/${userId}/leaves/requests`, { params });
    return res.data;
}

export async function getEmployeeAttendanceRequests(userId, params = { page: 1, limit: 10 }) {
    const res = await axiosInstance.get(`/api/users/${userId}/attendance/requests`, { params });
    return res.data;
}

export async function getEmployeeWfhRequests(userId, params = { page: 1, limit: 10 }) {
    const res = await axiosInstance.get(`/api/users/${userId}/wfh/requests`, { params });
    return res.data;
}

export async function getEmployeeReimbursementRequests(userId, params = { page: 1, limit: 10 }) {
    const res = await axiosInstance.get(`/api/users/${userId}/reimbursements/requests`, { params });
    return res.data;
};

export async function markEmployeeReimbursementMonthPaid(userId, payload) {
    const res = await axiosInstance.post(
        `/api/users/${userId}/reimbursements/mark-month-paid`,
        payload
    );
    return res.data;
}

// Employee Payroll Finance (Admin View)
export async function getUserPayrollFinance(userId) {
    const res = await axiosInstance.get(`/api/users/${userId}/payroll/finance`);
    return res.data;
}

export async function patchUserPayrollFinance(userId, payload) {
    const res = await axiosInstance.patch(`/api/users/${userId}/payroll/finance`, payload);
    return res.data;
}

// Employee Appraisals (Admin View)
export async function createUserAppraisal(userId, payload) {
    const res = await axiosInstance.post(`/api/users/${userId}/appraisals`, payload);
    return res.data;
}




// 1. Get 4 URLs at once
export async function getBulkPresignedUrls(filesMeta) {
    // filesMeta is an array of objects: { id_ref, file_name, content_type, ... }
    const res = await axiosInstance.post("/api/uploads/presign-bulk", { files: filesMeta });
    return res.data;
}

// 2. Helper to upload binary to S3
export async function uploadToS3(url, file) {
    await axios.put(url, file, {
        headers: { "Content-Type": file.type }
    });
}

// 3. Final Submit (Saves Docs + Benefits + Status)
export async function submitCompliance(userId, data) {
    const res = await axiosInstance.put(`/api/onboarding/${userId}/compliance`, data);
    return res.data;
}


export async function getEmployeeStatistics(extraParams = {}) {
    // API: {{baseUrl}}/api/users?view=statistics&role=employee
    const res = await axiosInstance.get("/api/users", {
        params: { view: 'statistics', ...extraParams }
    });
    return res.data;
}

// 2. Get Employee List with Pagination, Search, Filter & Sort
export async function getEmployeesList(params) {
    // API: {{baseUrl}}/api/users?page=1&limit=10&role=employee...
    // params object should contain: page, limit, role, search, status, sortBy
    const res = await axiosInstance.get("/api/users", { params });
    return res.data;
}
export async function updateEmployee(id, data) {
    const res = await axiosInstance.patch(`/api/users/${id}`, data);
    return res.data;
}

export async function sendTemporaryPassword({ email }) {
    const res = await axiosInstance.post('/api/users/send-temporary-password', { email });
    return res.data;
}

export async function crossOrgSyncUser({ email, role }) {
    const res = await axiosInstance.post('/api/users/cross-org-sync', { email, role });
    return res.data;
}

export async function bulkImportUsers(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axiosInstance.post('/api/users/bulk-import', formData);
    return res.data;
}

export async function downloadBulkImportTemplate() {
    const res = await axiosInstance.get('/api/users/bulk-import/template', {
        responseType: 'blob',
    });
    return res;
}

export async function downloadEmployeesExcel(params) {
    const res = await axiosInstance.get('/api/users/download-excel', {
        params,
        responseType: 'blob',
    });
    return res;
}

export async function initiateEmployeeExit(userId, payload) {
    const res = await axiosInstance.post(`/api/users/${userId}/exit`, payload);
    return res.data;
}

export async function terminateEmployeeImmediately(userId, payload) {
    const res = await axiosInstance.post(`/api/users/${userId}/exit/immediate`, payload);
    return res.data;
}

export async function getEmployeeExit(userId) {
    const res = await axiosInstance.get(`/api/users/${userId}/exit`);
    return res.data;
}

export async function updateEmployeeExit(userId, payload) {
    const res = await axiosInstance.patch(`/api/users/${userId}/exit`, payload);
    return res.data;
}

export async function cancelEmployeeExit(userId) {
    const res = await axiosInstance.post(`/api/users/${userId}/exit/cancel`);
    return res.data;
}
// 3. Get Department Statistics for the Chart
export async function getDepartmentStatistics(extraParams = {}) {
    // API: {{baseUrl}}/api/departments/statistics
    const res = await axiosInstance.get("/api/departments/statistics", { params: extraParams });
    return res.data;
}


export async function uploadUrl(userId, formData) {
    const res = await axiosInstance.post(`/api/onboarding/${userId}/documents`, formData);
    return res;
}

export async function replaceOnboardingDocument(userId, { file, doc_type, doc_category }) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", doc_type);
    if (doc_category) {
        formData.append("doc_category", doc_category);
    }

    const res = await axiosInstance.put(`/api/onboarding/${userId}/documents/replace`, formData);
    return res.data;
}

export async function uploadNewOnboardingDocument(userId, file, { doc_type, doc_category = 'IDENTITY' } = {}) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", doc_type || file.name);
    formData.append("doc_category", doc_category);

    const res = await axiosInstance.post(`/api/onboarding/${userId}/documents/upload-new-doc`, formData);
    return res.data;
}

export async function submitOnboarding(userId, compliancePayload) {
    const res = await axiosInstance.put(`/api/onboarding/${userId}/compliance`, compliancePayload);
    return res;
}

export const getOnboardingStatus = async (userId) => {
    const res = await axiosInstance.get(`/api/onboarding/${userId}`);
    return res.data;
};

export const getOnboardingState = async () => {
    const res = await axiosInstance.get(`/api/onboarding`);
    return res.data;
};

export const getInProgressOnboardingUsers = async (params = {}) => {
    const defaultParams = {
        page: 1,
        limit: 10,
        search: "",
        sort_dir: "DESC",
    };

    const res = await axiosInstance.get(`/api/onboarding/in-progress-users`, {
        params: { ...defaultParams, ...params },
    });
    return res.data;
};

export async function getUserHolidays(userId) {
    const res = await axiosInstance.get(`/api/users/${userId}/holidays`);
    return res.data;
}

export async function updateUserHolidays(userId, items) {
    const res = await axiosInstance.put(`/api/users/${userId}/holidays`, { items });
    return res.data;
}
