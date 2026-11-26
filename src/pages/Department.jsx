import { useState } from "react";
import Departments from "../components/department/Department";
import DepartmentDetails from "../components/department/DepartmentDetails";

export default function Department() {
    const [view, setView] = useState('list');
    const [selectedId, setSelectedId] = useState(null);

    const handleViewDetails = (id) => {
        setSelectedId(id);
        setView('details');
    };

    const handleBack = () => {
        setView('list');
        setSelectedId(null);
    };

    return (
        <>
            {view === 'list' && (
                <Departments onRowClick={handleViewDetails} />
            )}
            {view === 'details' && (
                <DepartmentDetails departmentId={selectedId} onBack={handleBack} />
            )}
        </>
    );
}
