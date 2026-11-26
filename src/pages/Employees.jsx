import { useState } from 'react';
import AllEmployeesDetails from '../components/employees/AllEmployeesDetails';
import AddEmployeeForm from '../components/employees/AddEmployeeForm';
import EmployeeByID from '../components/employees/EmployeeByID';
import InviteEmployeeForm from '../components/employees/InviteEmployeeForm';
import DraftEmployeesView from '../components/employees/DraftEmployeesView';
import BulkUploadEmployeesView from '../components/employees/BulkUploadEmployeesView';
import SyncEmployeeForm from '../components/employees/SyncEmployeeForm';

const Employees = () => {
    // States: 'list', 'add', 'details', 'invite', 'drafts', 'bulk-upload', 'sync'
    const [view, setView] = useState('list');
    const [selectedId, setSelectedId] = useState(null);
    const [selectedEmployeeStatus, setSelectedEmployeeStatus] = useState(null);
    const [listRefreshKey, setListRefreshKey] = useState(0);

    const handleViewDetails = (id, status) => {
        setSelectedId(id);
        setSelectedEmployeeStatus(status ?? null);
        setView('details');
    };

    const handleBack = () => {
        setView('list');
        setSelectedId(null);
        setSelectedEmployeeStatus(null);
    };

    const handleContinueDraft = (id) => {
        setSelectedId(id);
        setView('add');
    };

    return (
        <div className="p-1">
            {view === 'list' && (
                <AllEmployeesDetails
                    onAddNew={() => {
                        setSelectedId(null);
                        setView('add');
                    }}
                    onInvite={() => setView('invite')}
                    onDraft={() => setView('drafts')}
                    onBulkUpload={() => setView('bulk-upload')}
                    onSync={() => setView('sync')}
                    listRefreshKey={listRefreshKey}
                    onRowClick={handleViewDetails}
                />
            )}

            {view === 'add' && (
                <AddEmployeeForm
                    onBack={handleBack}
                    userId={selectedId} // Pass userId for potential resuming
                />
            )}

            {view === 'details' && (
                <EmployeeByID
                    employeeId={selectedId}
                    employeeStatus={selectedEmployeeStatus}
                    onBack={handleBack}
                    onResume={() => setView('add')} // Allow resuming directly
                />
            )}

            {view === 'invite' && (
                <InviteEmployeeForm onBack={handleBack} />
            )}

            {view === 'drafts' && (
                <DraftEmployeesView
                    onBack={handleBack}
                    onContinueDraft={handleContinueDraft}
                />
            )}

            {view === 'bulk-upload' && (
                <BulkUploadEmployeesView
                    onBack={handleBack}
                    onSuccess={() => setListRefreshKey((k) => k + 1)}
                />
            )}

            {view === 'sync' && (
                <SyncEmployeeForm onBack={handleBack} />
            )}
        </div>
    );
};

export default Employees;