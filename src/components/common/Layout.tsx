import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useLayout } from '../../context/LayoutContext';

const Layout = () => {
  const { headerConfig } = useLayout();

  return (
    <div className="flex bg-[#F9FAFB] min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className=" px-8 py-4 border-b border-gray-100">
          <Header 
            title={headerConfig.title} 
            breadcrumb={headerConfig.breadcrumb} 
            onBack={headerConfig.onBack}
          />
        </div>
        
        <main className="flex-1 overflow-y-auto">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};

export default Layout; 