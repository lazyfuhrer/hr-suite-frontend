import Header from '../components/common/Header';
import Attendance from '../components/attendance/Attendance';
import { useLayout } from '../context/LayoutContext';
import { useEffect } from 'react';

function AttendancePage() {
  const { setHeaderConfig } = useLayout();

  useEffect(() => {
    setHeaderConfig({
      title: "Attendance",
      breadcrumb: [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Attendance', path: '/attendance', active: true }
      ],
      onBack: null
    });
  }, [setHeaderConfig])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto p-6">
        

        <Attendance />
      </div>
    </div>
  );
}

export default AttendancePage;