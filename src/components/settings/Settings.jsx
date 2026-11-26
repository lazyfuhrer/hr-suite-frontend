import React, { useEffect, useState } from "react";
import Header from "../common/Header";
import OfficeLocations from "./OfficeLocations";
import PolicyDocuments from "./PolicyDocuments";
import WorkShifts from "./WorkShifts";
import { useLayout } from "../../context/LayoutContext";
import AllLeaves from "./AllLeaves";
import OrganizationProfile from "./OrganizationProfile";
import Holidays from "./Holidays";
import PayrollSettings from "./PayrollSettings";
import NotificationsSettings from "./NotificationsSettings";

const tabs = [
  { id: "orgProfile", label: "Profile" },
  { id: "notifications", label: "Notifications" },
  { id: "office", label: "Office" },
  { id: "policy", label: "Policy Documents" },
  { id: "workShift", label: "Work Shift" },
  { id: "payroll", label: "Payroll" },
  { id: "leaves", label: "Leave Policies" },
  { id: "holidays", label: "Holidays" }
  // { id: "lorem", label: "Lorem" }
];

const Settings = () => {
  const [activeTab, setActiveTab] = useState("orgProfile");

  const { setHeaderConfig } = useLayout();

  useEffect(() => {
    setHeaderConfig({
      title: "Settings",
      breadcrumb: [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Settings", path: "/setting", active: true }
      ],
      onBack: null
    });
  }, [setHeaderConfig])
  return (
    <div className=" p-6 gap-5 flex flex-col font-['Plus_Jakarta_Sans',_-apple-system,_BlinkMacSystemFont,_sans-serif] bg-[#FAFAFA]">


      <div className="bg-white rounded-2xl p-3 flex gap-3 border border-[#F0F0F0]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === tab.id
              ? "bg-[var(--brand-primary)] text-white"
              : "bg-[#F5F5F5] text-[#666] hover:bg-[var(--brand-soft)]"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "office" && <OfficeLocations />}
      {activeTab === "policy" && <PolicyDocuments />}
      {activeTab === "workShift" && <WorkShifts />}
      {activeTab === "payroll" && <PayrollSettings />}
      {activeTab === "leaves" && <AllLeaves />}
      {activeTab === "holidays" && <Holidays />}
      {activeTab === "orgProfile" && <OrganizationProfile />}
      {activeTab === "notifications" && <NotificationsSettings />}
    </div>
  );
};

export default Settings;
