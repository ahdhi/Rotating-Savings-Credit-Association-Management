import React from 'react';
import { MenuIcon, BellIcon } from '@heroicons/react/outline';
import { useChitFund } from '../context/ChitFundContext';
import { useLocation } from 'react-router-dom';

const Navbar = ({ setSidebarOpen }) => {
  const { currentUser } = useChitFund();
  const location = useLocation();
  
  // Get the current page title based on the route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('payment-tracker')) return 'Payment Tracker';
    if (path.includes('payout-schedule')) return 'Payout Schedule';
    if (path.includes('settings')) return 'Settings';
    return 'Rotating Savings Credit Association Management';
  };

  // Safely get user initial
  const getUserInitial = () => {
    if (!currentUser) return 'G';
    if (currentUser.name && typeof currentUser.name === 'string') 
      return currentUser.name.charAt(0);
    if (currentUser.email && typeof currentUser.email === 'string') 
      return currentUser.email.charAt(0);
    return 'U';
  };

  // Safely get display name
  const getDisplayName = () => {
    if (!currentUser) return 'Guest User';
    if (currentUser.name && typeof currentUser.name === 'string') 
      return currentUser.name;
    if (currentUser.email && typeof currentUser.email === 'string') 
      return currentUser.email;
    return 'User';
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex px-2 lg:px-0">
            <div className="flex-shrink-0 flex items-center">
              {/* Mobile menu button */}
              <button
                type="button"
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                onClick={() => setSidebarOpen(true)}
              >
                <span className="sr-only">Open sidebar</span>
                <MenuIcon className="h-6 w-6" aria-hidden="true" />
              </button>
              <h1 className="ml-2 md:ml-0 text-lg font-semibold text-gray-700">{getPageTitle()}</h1>
            </div>
          </div>
          
          <div className="flex items-center">
            {/* Notification bell */}
            <button
              type="button"
              className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Profile dropdown */}
            <div className="ml-3 relative">
              <div className="flex items-center">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-100">
                  <span className="text-sm font-medium leading-none text-primary-700">
                    {getUserInitial()}
                  </span>
                </span>
                <span className="ml-2 text-sm font-medium text-gray-700 hidden md:block">
                  {getDisplayName()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;