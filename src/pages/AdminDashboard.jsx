import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChitFund } from '../context/ChitFundContext';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  UserIcon, 
  ShieldCheckIcon 
} from '@heroicons/react/solid';
import { getPendingPayments, approvePayment, rejectPayment, promoteToAdmin } from '../firebase';


const AdminDashboard = () => {
  const { currentUser, isAdmin } = useChitFund();
  const [pendingPayments, setPendingPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('payments');
  const [actionStatus, setActionStatus] = useState({ message: '', type: '' });
  
  const navigate = useNavigate();
  
  // Redirect non-admin users
  useEffect(() => {
    const checkAdmin = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      
      if (!isAdmin) {
        navigate('/dashboard');
      }
    };
    
    checkAdmin();
  }, [currentUser, isAdmin, navigate]);
  
  // Fetch pending payments
useEffect(() => {
    const fetchPendingPayments = async () => {
      setLoading(true);
      try {
        console.log("Fetching pending payments for admin dashboard");
        const result = await getPendingPayments();
        
        if (result.success) {
          console.log("Successfully fetched pending payments:", result.pendingPayments);
          setPendingPayments(result.pendingPayments);
        } else {
          console.error("Failed to fetch pending payments:", result.error);
          setError(result.error);
        }
      } catch (err) {
        console.error("Error in fetchPendingPayments:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (isAdmin) {
      fetchPendingPayments();
    }
  }, [isAdmin]);
  
  // Handle payment approval
  const handleApprovePayment = async (paymentId) => {
    try {
      setLoading(true);
      const result = await approvePayment(paymentId);
      
      if (result.success) {
        // Remove the payment from the list
        setPendingPayments(pendingPayments.filter(p => p.id !== paymentId));
        setActionStatus({ 
          message: 'Payment approved successfully', 
          type: 'success' 
        });
      } else {
        setActionStatus({ 
          message: 'Failed to approve payment: ' + result.error, 
          type: 'error' 
        });
      }
    } catch (err) {
      setActionStatus({ 
        message: 'Error approving payment: ' + err.message, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
      
      // Clear status message after 3 seconds
      setTimeout(() => {
        setActionStatus({ message: '', type: '' });
      }, 3000);
    }
  };
  
  // Handle payment rejection
  const handleRejectPayment = async (paymentId) => {
    try {
      setLoading(true);
      const result = await rejectPayment(paymentId);
      
      if (result.success) {
        // Remove the payment from the list
        setPendingPayments(pendingPayments.filter(p => p.id !== paymentId));
        setActionStatus({ 
          message: 'Payment rejected successfully', 
          type: 'success' 
        });
      } else {
        setActionStatus({ 
          message: 'Failed to reject payment: ' + result.error, 
          type: 'error' 
        });
      }
    } catch (err) {
      setActionStatus({ 
        message: 'Error rejecting payment: ' + err.message, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
      
      // Clear status message after 3 seconds
      setTimeout(() => {
        setActionStatus({ message: '', type: '' });
      }, 3000);
    }
  };
  
  // Handle promoting a user to admin
  const handlePromoteToAdmin = async (userId) => {
    try {
      setLoading(true);
      const result = await promoteToAdmin(userId);
      
      if (result.success) {
        // Update the user in the list
        setUsers(users.map(user => {
          if (user.id === userId) {
            return { ...user, isAdmin: true };
          }
          return user;
        }));
        setActionStatus({ 
          message: 'User promoted to admin successfully', 
          type: 'success' 
        });
      } else {
        setActionStatus({ 
          message: 'Failed to promote user: ' + result.error, 
          type: 'error' 
        });
      }
    } catch (err) {
      setActionStatus({ 
        message: 'Error promoting user: ' + err.message, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
      
      // Clear status message after 3 seconds
      setTimeout(() => {
        setActionStatus({ message: '', type: '' });
      }, 3000);
    }
  };
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage payments, users, and system settings.
            </p>
          </div>
          
          {/* Tab navigation */}
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <button
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'payments'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('payments')}
            >
              Pending Payments
            </button>
            <button
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'emails'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('emails')}
            >
              Email Controls
            </button>
            <button
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'users'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('users')}
            >
              User Management
            </button>
          </div>
        </div>
        
        {/* Status message */}
        {actionStatus.message && (
          <div className={`border-l-4 p-4 ${
            actionStatus.type === 'success' 
              ? 'bg-green-50 border-green-500 text-green-700' 
              : 'bg-red-50 border-red-500 text-red-700'
          }`}>
            {actionStatus.message}
          </div>
        )}
        
        {/* Loading state */}
        {loading && (
          <div className="px-4 py-5 sm:p-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Pending Payments Tab */}
        {activeTab === 'payments' && !loading && !error && (
          <div className="border-t border-gray-200">
            {pendingPayments.length === 0 ? (
              <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                No pending payments to approve.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-100">
                                <span className="text-sm font-medium leading-none text-primary-700">
                                  {payment.member?.name ? payment.member.name.charAt(0) : 'U'}
                                </span>
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {payment.member?.name || 'Unknown Member'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {payment.member?.email || 'No email'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(payment.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            ${payment.amount ? payment.amount.toFixed(2) : '156.25'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(payment.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handleApprovePayment(payment.id)}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              <CheckCircleIcon className="mr-1 h-4 w-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectPayment(payment.id)}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <XCircleIcon className="mr-1 h-4 w-4" />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* Email Controls Tab */}
{activeTab === 'emails' && !loading && !error && (
  <div className="border-t border-gray-200 p-4">
    <h3 className="text-lg font-medium text-gray-900 mb-4">Email Controls</h3>
    <EmailReminderControl />
  </div>
)}

        {/* User Management Tab */}
        {activeTab === 'users' && !loading && !error && (
          <div className="border-t border-gray-200 p-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Admin Setup Instructions</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Initially, there are no admin users. To set up an admin:</p>
                    <ol className="list-decimal pl-5 mt-2">
                      <li>Go to your Firebase Console</li>
                      <li>Navigate to Firestore Database</li>
                      <li>Find the 'users' collection</li>
                      <li>Locate your user document (identified by UID)</li>
                      <li>Edit the document and add: <code className="bg-gray-100 px-1 py-0.5 rounded">isAdmin: true</code></li>
                    </ol>
                    <p className="mt-2">After this, you can promote other users to admin from this interface.</p>
                  </div>
                </div>
              </div>
            </div>
          
            <h3 className="text-lg font-medium text-gray-900 mb-4">User Management</h3>
            <p className="text-center text-gray-500 py-5">
              User management features will be implemented here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;