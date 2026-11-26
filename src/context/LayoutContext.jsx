/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from "react";

export const LayoutContext = createContext(null);

export const LayoutProvider = ({ children }) => {
  const [headerConfig, setHeaderConfig] = useState({
    title: "",
    breadcrumb: [{ label: "Dashboard", path: "/dashboard", active: true }],
    onBack: null
  });

  return (
    <LayoutContext.Provider value={{ headerConfig, setHeaderConfig }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => useContext(LayoutContext);
