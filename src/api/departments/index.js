import axiosInstance from "../axiosInstance";



// Add this to your existing API file
export async function getDepartmentDashboard(month, year) {
    let params;

    if (typeof month === "object" && month !== null) {
        params = { ...month, include_unassigned: false };
    } else if (month !== undefined && year !== undefined) {
        params = { month, year, include_unassigned: false };
    } else {
        params = { include_unassigned: false };
    }

    const res = await axiosInstance.get(`/api/departments/dashboard`, { params });
    return res.data;
}

export async function getDepartments(){
    const res = await axiosInstance.get("/api/departments");
    return res;
}

export async function getAllDepartments(params) {
    const res = await axiosInstance.get('/api/departments', { params });
    return res.data;
}

export async function getDepartmentSummary(departmentId) {
    const res = await axiosInstance.get(`/api/departments/${departmentId}/summary`);
    return res.data;
}

export async function getDepartmentEmployees(departmentId, params) {
    const res = await axiosInstance.get(`/api/departments/${departmentId}/users`, { params });
    return res.data;
}

export async function getDepartmentById(departmentId) {
    const res = await axiosInstance.get(`/api/departments/${departmentId}`);
    return res.data;
}

