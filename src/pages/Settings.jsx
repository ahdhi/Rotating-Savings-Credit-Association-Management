import React, { useState, useEffect } from 'react';
import { useChitFund } from '../context/ChitFundContext';
import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc, 
  getDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../firebase';

const Settings = () => {
  const { members, addMember, removeMember, isAdmin, currentUser, migrateUsersToMembers } = useChitFund();
  const [newMember, setNewMember] = useState({ name: '', email: '' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [themeMode, setThemeMode] = useState('light');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize theme from localStorage on component mount
  useEffect(() => {
    // Check for saved theme preference or prefer-color-scheme
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark' || 
        (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setThemeMode('dark');
      document.documentElement.classList.add('dark');
    } else {
      setThemeMode('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);
  
  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!isAdmin) {
      setError('Only administrators can add new members');
      return;
    }
    
    if (newMember.name && newMember.email) {
      try {
        const result = await addMember(newMember.name, newMember.email);
        if (result) {
          setSuccess(`Member ${newMember.name} added successfully`);
          setNewMember({ name: '', email: '' });
          setIsFormOpen(false);
        } else {
          setError('Failed to add member');
        }
      } catch (err) {
        setError(`Error adding member: ${err.message}`);
      }
    }
  };

  const handleMigrateUsers = async () => {
    if (!isAdmin) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await migrateUsersToMembers();
      
      if (result.success) {
        setSuccess(`Migration complete. ${result.count} users migrated to members.`);
      } else {
        setError(result.error || 'Migration failed');
      }
    } catch (err) {
      setError('Error in migration: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveMember = async (memberId) => {
    setError('');
    setSuccess('');
  
    if (!isAdmin) {
      setError('Only administrators can remove members');
      return;
    }
  
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        const result = await removeMember(memberId);
        if (result.success) {
          setSuccess('Member removed successfully');
        } else {
          setError(result.error || 'Failed to remove member');
        }
      } catch (err) {
        setError(`Error removing member: ${err.message}`);
      }
    }
  };
  
  const resetAppData = async () => {
    if (!isAdmin) {
      setError("Only administrators can reset app data");
      return;
    }
    
    // Show a confirmation dialog
    if (!window.confirm(
      "WARNING: This will delete ALL application data including members, payments, and payouts. This action cannot be undone. Are you absolutely sure?"
    )) {
      return;
    }
    
    // Double-check confirmation with a typed response
    const confirmText = prompt("Type 'RESET' to confirm deletion of all app data:");
    if (confirmText !== 'RESET') {
      setError("Reset cancelled");
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Delete collections using batch operations
      // Note: Firestore batches are limited to 500 operations
      // For simplicity, we'll use multiple smaller batches
      
      // 1. Delete members
      const membersSnapshot = await getDocs(collection(db, 'members'));
      const membersBatch = writeBatch(db);
      let memberCount = 0;
      
      membersSnapshot.forEach((doc) => {
        membersBatch.delete(doc.ref);
        memberCount++;
      });
      
      if (memberCount > 0) {
        await membersBatch.commit();
        console.log(`Deleted ${memberCount} members`);
      }
      
      // 2. Delete payments
      const paymentsSnapshot = await getDocs(collection(db, 'payments'));
      const paymentsBatch = writeBatch(db);
      let paymentCount = 0;
      
      paymentsSnapshot.forEach((doc) => {
        paymentsBatch.delete(doc.ref);
        paymentCount++;
      });
      
      if (paymentCount > 0) {
        await paymentsBatch.commit();
        console.log(`Deleted ${paymentCount} payments`);
      }
      
      // 3. Delete payouts
      const payoutsSnapshot = await getDocs(collection(db, 'payouts'));
      const payoutsBatch = writeBatch(db);
      let payoutCount = 0;
      
      payoutsSnapshot.forEach((doc) => {
        payoutsBatch.delete(doc.ref);
        payoutCount++;
      });
      
      if (payoutCount > 0) {
        await payoutsBatch.commit();
        console.log(`Deleted ${payoutCount} payouts`);
      }
      
      // 4. Delete votes
      const votesRef = doc(db, 'votes', 'current');
      const votesDoc = await getDoc(votesRef);
      
      if (votesDoc.exists()) {
        await deleteDoc(votesRef);
        console.log('Deleted votes document');
      }
      
      // 5. Delete notifications
      const notificationsSnapshot = await getDocs(collection(db, 'notifications'));
      const notificationsBatch = writeBatch(db);
      let notificationCount = 0;
      
      notificationsSnapshot.forEach((doc) => {
        notificationsBatch.delete(doc.ref);
        notificationCount++;
      });
      
      if (notificationCount > 0) {
        await notificationsBatch.commit();
        console.log(`Deleted ${notificationCount} notifications`);
      }
      
      setSuccess("Application data has been reset successfully");
    } catch (error) {
      console.error("Error resetting app data:", error);
      setError(`Error resetting app data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newTheme);
    
    // Apply dark mode to the document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Member Management - Only visible to admins */}
      {isAdmin ? (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Member Management</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Add or remove members from the chit fund.
              </p>
            </div>
            
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {isFormOpen ? 'Cancel' : 'Add Member'}
            </button>
          </div>
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 dark:bg-green-900 border-l-4 border-green-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-green-700 dark:text-green-200">{success}</p>
                </div>
              </div>
            </div>
          )}
          
          {isFormOpen && (
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
              <form onSubmit={handleAddMember}>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Name
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={newMember.name}
                        onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={newMember.email}
                        onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Add Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="mt-4 px-4 py-3 sm:px-6">
            <button
              onClick={handleMigrateUsers}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Migrate Users to Members'}
            </button>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This will create member records for all users who have registered but don't have a corresponding member record.
            </p>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {members.map((member) => (
                <li key={member.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900">
                            <span className="text-sm font-medium leading-none text-primary-700 dark:text-primary-200">
                              {member.name && typeof member.name === 'string' ? member.name.charAt(0) : 'U'}
                            </span>
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Member Management</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Member management is restricted to administrators.
            </p>
          </div>
        </div>
      )}
      
      {/* App Settings */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">App Settings</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Customize your app experience.
          </p>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
          <div className="space-y-6">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Toggle between light and dark theme.</p>
              </div>
              <button
                onClick={toggleTheme}
                className={`${
                  themeMode === 'dark' ? 'bg-primary-600' : 'bg-gray-200'
                } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
              >
                <span className="sr-only">Use dark mode</span>
                <span
                  className={`${
                    themeMode === 'dark' ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                ></span>
              </button>
            </div>
            
            {/* Payment Amount Setting - only editable by admins */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Weekly Contribution Amount</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Currently set to $156.25 per week per member.</p>
              <div className="flex items-center">
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  disabled={!isAdmin}
                  className={`shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-32 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="156.25"
                />
                <button
                  type="button"
                  disabled={!isAdmin}
                  className={`ml-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 ${!isAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-700'}`}
                >
                  Update
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {isAdmin 
                  ? "As an admin, you can update the weekly contribution amount."
                  : "Only administrators can change the weekly contribution amount."}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Danger Zone - Admin Only */}
      {isAdmin && (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mt-6">
          <div className="px-4 py-5 sm:px-6 bg-red-50 dark:bg-red-900">
            <h3 className="text-lg leading-6 font-medium text-red-800 dark:text-red-200">Danger Zone</h3>
            <p className="mt-1 text-sm text-red-600 dark:text-red-300">
              Actions here can cause irreversible data loss. Proceed with caution.
            </p>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
            <div className="sm:flex sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Reset Application Data</h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
                  <p>
                    This will permanently delete all members, payments, payouts, and other app data.
                    User accounts will be preserved. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="mt-5 sm:mt-0 sm:ml-6 sm:flex-shrink-0">
                <button
                  type="button"
                  onClick={resetAppData}
                  disabled={isLoading}
                  className={`inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Reset All Data'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;