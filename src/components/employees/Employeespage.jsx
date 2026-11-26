import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Import your icons from assets folder
// import DashboardIcon from '../assets/icons/dashboard.svg';
// import EmployeesIcon from '../assets/icons/employees.svg';
// import SearchIcon from '../assets/icons/search.svg';
// import FilterIcon from '../assets/icons/filter.svg';
// import SettingsIcon from '../assets/icons/settings.svg';
// import NotificationIcon from '../assets/icons/notification.svg';
// import SortIcon from '../assets/icons/sort.svg';

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // Department color mapping
//   const departmentColors = {
//     'Customer Service': '#4D190E',
//     'Operations': '#EB4000',
//     'Marketing': '#FBD9CC',
//     'Product Design': '#63716E',
//     'Research & Development': '#A4ACAB',
//     'R&D': '#A4ACAB',
//     'Human Resources': '#E5E6E6',
//     'HR': '#E5E6E6',
//     'Executive Marketing': '#FBD9CC',
//   };

  // Fetch employee statistics
  useEffect(() => {
    fetchEmployeeStats();
    fetchDepartments();
    fetchEmployees();
  }, []);

  // Fetch employees when filters change
  useEffect(() => {
    fetchEmployees();
  }, [currentPage, searchQuery, selectedFilter, sortBy]);

  const fetchEmployeeStats = async () => {
    try {
      // TODO: Replace with your backend URL
      // const response = await fetch(`${BACKEND_URL}/api/employees/stats`);
      // const data = await response.json();
      
      // Mock data - Remove this when connecting to backend
      const data = {
        success: true,
        data: {
          totalEmployees: 128,
          totalEmployeesChange: 1.6,
          newEmployees: 7,
          newEmployeesChange: 5.8,
          turnoverRate: 3.1,
          turnoverRateChange: -2.4,
          resignedEmployees: 4,
          resignedEmployeesChange: 2.1,
        }
      };
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch employee statistics');
      console.error('Error fetching stats:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      // TODO: Replace with your backend URL
      // const response = await fetch(`${BACKEND_URL}/api/departments/summary`);
      // const data = await response.json();
      
      // Mock data - Remove this when connecting to backend
      const data = {
        success: true,
        data: [
          { name: 'Customer Service', count: 26, percentage: 20, color: '#4D190E' },
          { name: 'Product Design', count: 20, percentage: 16, color: '#63716E' },
          { name: 'Operations', count: 26, percentage: 20, color: '#EB4000' },
          { name: 'Research & Development', count: 18, percentage: 14, color: '#A4ACAB' },
          { name: 'Marketing', count: 23, percentage: 18, color: '#FBD9CC' },
          { name: 'Human Resources', count: 15, percentage: 12, color: '#E5E6E6' },
        ]
      };
      
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch departments');
      console.error('Error fetching departments:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      new URLSearchParams({
        page: currentPage,
        limit: 10,
        search: searchQuery,
        sortBy: sortBy,
        ...(selectedFilter !== 'all' && { filter: selectedFilter })
      });

      // TODO: Replace with your backend URL
      // const response = await fetch(`${BACKEND_URL}/api/employees?${params}`);
      // const data = await response.json();
      
      // Mock data - Remove this when connecting to backend
      const data = {
        success: true,
        data: {
          employees: [
            {
              id: 'EMP-0234',
              name: 'Olivia Mason',
              jobTitle: 'Marketing',
              department: 'Executive Marketing',
              employmentType: 'Full-Time',
              workModel: 'Hybrid',
              joinDate: '2034-01-12',
              status: 'Active',
              avatar: null
            },
            {
              id: 'EMP-0178',
              name: 'Ethan Ray',
              jobTitle: 'UI Designer',
              department: 'Product Design',
              employmentType: 'Full-Time',
              workModel: 'Remote',
              joinDate: '2033-03-03',
              status: 'Active',
              avatar: null
            },
            {
              id: 'EMP-0312',
              name: 'Lina Armand',
              jobTitle: 'Lab Analyst',
              department: 'R&D',
              employmentType: 'Part-Time',
              workModel: 'On-Site',
              joinDate: '2034-07-22',
              status: 'On Leave',
              avatar: null
            },
            {
              id: 'EMP-0115',
              name: 'Jacob Yuen',
              jobTitle: 'Site Supervisor',
              department: 'Operations',
              employmentType: 'Full-Time',
              workModel: 'On-Site',
              joinDate: '2032-09-05',
              status: 'Absent',
              avatar: null
            },
            {
              id: 'EMP-0289',
              name: 'Mia Torres',
              jobTitle: 'HR Officer',
              department: 'Human Resources',
              employmentType: 'Full-Time',
              workModel: 'Hybrid',
              joinDate: '2033-02-14',
              status: 'Active',
              avatar: null
            },
          ],
          pagination: {
            currentPage: 1,
            totalPages: 16,
            totalResults: 480,
            resultsPerPage: 10
          }
        }
      };
      
      if (data.success) {
        setEmployees(data.data.employees);
        setCurrentPage(data.data.pagination.currentPage);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      toast.error('Failed to fetch employees');
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  // eslint-disable-next-line no-unused-vars
  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
    setCurrentPage(1);
  };

  const handleSortChange = (sort) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const handleSelectEmployee = (employeeId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(emp => emp.id));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Active': 'bg-[#EB4000] text-white',
      'On Leave': 'bg-gray-200 text-gray-700',
      'Absent': 'bg-[#4D190E] text-white',
    };
    return colors[status] || 'bg-gray-200 text-gray-700';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2d', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50 ">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
            <div className="flex items-center gap-2 mt-1 text-sm">
              <span className="text-[#EB4000]">Dashboard</span>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">Employees</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search anything"
                value={searchQuery}
                onChange={handleSearch}
                className="w-80 pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EB4000] focus:border-transparent"
              />
              {/* Add SearchIcon here */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Settings Icon */}
            <button className="p-2.5 bg-[#FBD9CC] rounded-lg hover:bg-[#f5c8b5] transition-colors">
              {/* Add SettingsIcon here */}
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Notification Icon */}
            <button className="p-2.5 bg-[#FBD9CC] rounded-lg hover:bg-[#f5c8b5] transition-colors">
              {/* Add NotificationIcon here */}
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#EB4000] rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">DL</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Davis Levin</div>
                <div className="text-xs text-gray-500">User</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Employees */}
          <div className="bg-[#FBD9CC] rounded-xl p-6 transition-transform hover:scale-[1.02] duration-300">
            <div className="flex items-center gap-2 mb-4">
              {/* Add EmployeesIcon here */}
              <svg className="w-5 h-5 text-[#EB4000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm text-gray-700">Total Employees</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-4xl font-bold text-gray-900">
                {stats?.totalEmployees || 0}
              </div>
              <div className="flex items-center gap-1 bg-[#4D190E] text-white px-2 py-1 rounded text-xs font-semibold">
                <span>+{stats?.totalEmployeesChange || 0}%</span>
              </div>
            </div>
            <div className="text-xs text-gray-600 mt-2">from last month</div>
          </div>

          {/* New Employees */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 transition-transform hover:scale-[1.02] duration-300">
            <div className="flex items-center gap-2 mb-4">
              {/* Add NewEmployeesIcon here */}
              <svg className="w-5 h-5 text-[#EB4000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="text-sm text-gray-700">New Employees (This Month)</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-4xl font-bold text-gray-900">
                {stats?.newEmployees || 0}
              </div>
              <div className="flex items-center gap-1 bg-[#EB4000] text-white px-2 py-1 rounded text-xs font-semibold">
                <span>+{stats?.newEmployeesChange || 0}%</span>
              </div>
            </div>
            <div className="text-xs text-gray-600 mt-2">from last month</div>
          </div>

          {/* Turnover Rate */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 transition-transform hover:scale-[1.02] duration-300">
            <div className="flex items-center gap-2 mb-4">
              {/* Add TurnoverIcon here */}
              <svg className="w-5 h-5 text-[#EB4000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="text-sm text-gray-700">Turnover Rate</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-4xl font-bold text-gray-900">
                {stats?.turnoverRate || 0}%
              </div>
              <div className="flex items-center gap-1 bg-gray-700 text-white px-2 py-1 rounded text-xs font-semibold">
                <span>{stats?.turnoverRateChange || 0}%</span>
              </div>
            </div>
            <div className="text-xs text-gray-600 mt-2">from last month</div>
          </div>

          {/* Resigned Employees */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 transition-transform hover:scale-[1.02] duration-300">
            <div className="flex items-center gap-2 mb-4">
              {/* Add ResignedIcon here */}
              <svg className="w-5 h-5 text-[#EB4000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
              </svg>
              <span className="text-sm text-gray-700">Resigned Employees (This Month)</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-4xl font-bold text-gray-900">
                {stats?.resignedEmployees || 0}
              </div>
              <div className="flex items-center gap-1 bg-[#EB4000] text-white px-2 py-1 rounded text-xs font-semibold">
                <span>+{stats?.resignedEmployeesChange || 0}%</span>
              </div>
            </div>
            <div className="text-xs text-gray-600 mt-2">from last month</div>
          </div>
        </div>

        {/* Departments Section */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Departments</h2>
            <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EB4000]">
              <option>This Month</option>
              <option>Last Month</option>
              <option>This Quarter</option>
            </select>
          </div>

          <div className="flex items-center gap-8">
            {/* Donut Chart */}
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {departments.map((dept, index) => {
                  const total = departments.reduce((sum, d) => sum + d.percentage, 0);
                  const startAngle = departments.slice(0, index).reduce((sum, d) => sum + (d.percentage / total) * 360, 0);
                  const angle = (dept.percentage / total) * 360;
                  const largeArc = angle > 180 ? 1 : 0;
                  
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = ((startAngle + angle) * Math.PI) / 180;
                  
                  const x1 = 50 + 40 * Math.cos(startRad);
                  const y1 = 50 + 40 * Math.sin(startRad);
                  const x2 = 50 + 40 * Math.cos(endRad);
                  const y2 = 50 + 40 * Math.sin(endRad);
                  
                  return (
                    <path
                      key={dept.name}
                      d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={dept.color}
                      className="transition-opacity hover:opacity-80"
                    />
                  );
                })}
                <circle cx="50" cy="50" r="25" fill="white" />
              </svg>
            </div>

            {/* Department List */}
            <div className="flex-1 grid grid-cols-2 gap-4">
              {departments.map((dept) => (
                <div key={dept.name} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: dept.color }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{dept.name}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      {/* Add UsersIcon here */}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>{dept.count}</span>
                      <span className="ml-2">— {dept.percentage}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-white rounded-xl border border-gray-200">
          {/* List Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Employee List</h2>
              
              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search employee"
                    value={searchQuery}
                    onChange={handleSearch}
                    className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EB4000]"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Filter */}
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  {/* Add FilterIcon here */}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>Filter</span>
                </button>

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <select 
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EB4000]"
                  >
                    <option value="name">Name</option>
                    <option value="joinDate">Join Date</option>
                    <option value="department">Department</option>
                  </select>
                </div>

                {/* New Employee Button */}
                <button className="px-4 py-2 bg-[#EB4000] text-white rounded-lg text-sm font-semibold hover:bg-[#d43800] transition-colors">
                  New Employee
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.length === employees.length && employees.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-[#EB4000] border-gray-300 rounded focus:ring-[#EB4000]"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Employee ID
                    {/* Add SortIcon here */}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Name
                    {/* Add SortIcon here */}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Job Title
                    {/* Add SortIcon here */}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Department
                    {/* Add SortIcon here */}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Employment Type
                    {/* Add SortIcon here */}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Work Model
                    {/* Add SortIcon here */}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Join Date
                    {/* Add SortIcon here */}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                    {/* Add SortIcon here */}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                      No employees found
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(employee.id)}
                          onChange={() => handleSelectEmployee(employee.id)}
                          className="w-4 h-4 text-[#EB4000] border-gray-300 rounded focus:ring-[#EB4000]"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#EB4000] rounded flex items-center justify-center flex-shrink-0">
                            {/* Add EmployeeIdIcon here */}
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <span className="text-sm text-gray-900">{employee.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#EB4000] rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-xs">
                              {employee.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{employee.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{employee.jobTitle}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{employee.department}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                          {employee.employmentType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            employee.workModel === 'Remote' ? 'bg-gray-900' : 
                            employee.workModel === 'Hybrid' ? 'bg-gray-400' : 
                            'bg-gray-900'
                          }`} />
                          <span className="text-sm text-gray-700">{employee.workModel}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{formatDate(employee.joinDate)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(employee.status)}`}>
                          {employee.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EB4000]">
                <option>10</option>
                <option>25</option>
                <option>50</option>
                <option>100</option>
              </select>
              <span>of 480 results</span>
            </div>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-[#EB4000] text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="text-gray-400">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-2 w-8 h-8 rounded-lg flex items-center justify-center bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Add ArrowRightIcon here */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeesPage;