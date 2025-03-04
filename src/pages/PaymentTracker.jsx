import React, { useState, useEffect } from 'react';
import { useChitFund } from '../context/ChitFundContext';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/solid';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc 
} from 'firebase/firestore';
import { db, getPendingPayments, approvePayment, rejectPayment } from '../firebase';

const PaymentTracker = () => {
  const { members, paymentDates, payments, recordPayment, undoPayment, currentUser, isAdmin } = useChitFund();
  const [activeMonth, setActiveMonth] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    memberId: null,
    date: null,
    action: null // 'mark', 'undo', 'approve', or 'reject'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  
  // Group payment dates by month
  const groupedDates = paymentDates.reduce((acc, date) => {
    const month = date.substring(0, 7); // Get YYYY-MM part
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(date);
    return acc;
  }, {});
  
  // Get unique months
  const months = Object.keys(groupedDates).sort();
  
  // Get dates for the active month
  const activeDates = months.length > 0 ? groupedDates[months[activeMonth]] || [] : [];
  
  // Fetch pending payments for admin
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchPendingPayments = async () => {
      try {
        console.log("Fetching pending payments for Payment Tracker");
        setIsLoading(true);
        
        const result = await getPendingPayments();
        
        if (result.success) {
          console.log("Successfully loaded pending payments:", result.pendingPayments);
          setPendingApprovals(result.pendingPayments);
        } else {
          console.error("Failed to load pending payments:", result.error);
          setError(result.error);
        }
      } catch (err) {
        console.error("Error fetching pending payments:", err);
        setError("Failed to load pending payments. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPendingPayments();
    
    // Set up a listener for changes to pending payments
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where("type", "==", "payment_approval"));
    
    const unsubscribe = onSnapshot(q, () => {
      console.log("Notifications changed, refreshing pending payments");
      fetchPendingPayments();
    }, (err) => {
      console.error("Error in notifications listener:", err);
    });
    
    return () => unsubscribe();
  }, [isAdmin]);

  // Debug logging
  useEffect(() => {
    console.log("Current members:", members);
    console.log("Current user:", currentUser);
    console.log("Current payments:", payments);
  }, [members, currentUser, payments]);
  
  // Function to check if a user can interact with a member's payments
  const canInteractWithMember = (member) => {
    if (isAdmin) return true;
    if (!currentUser) return false;
    
    // Check if this is the user's own member record (comparing UID)
    return member.uid === currentUser.uid;
  };
  
  // Handler for approving payments
  const handleApprovePayment = async (notificationId) => {
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    try {
      console.log("Approving payment with notification ID:", notificationId);
      const result = await approvePayment(notificationId);
      
      if (result.success) {
        // Remove this notification from the list
        setPendingApprovals(prev => prev.filter(p => p.id !== notificationId));
        // Show success message
        setSuccess("Payment approved successfully");
      } else {
        setError(result.error || "Failed to approve payment");
      }
    } catch (err) {
      console.error("Error approving payment:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for rejecting payments
  const handleRejectPayment = async (notificationId) => {
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    try {
      console.log("Rejecting payment with notification ID:", notificationId);
      const result = await rejectPayment(notificationId);
      
      if (result.success) {
        // Remove this notification from the list
        setPendingApprovals(prev => prev.filter(p => p.id !== notificationId));
        // Show success message
        setSuccess("Payment rejected successfully");
      } else {
        setError(result.error || "Failed to reject payment");
      }
    } catch (err) {
      console.error("Error rejecting payment:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Open confirmation dialog
  const openConfirmDialog = (memberId, date, action) => {
    console.log(`Opening dialog for: ${memberId}, date: ${date}, action: ${action}`);
    console.log(`Current user is admin: ${isAdmin}`);
    console.log(`Current user ID: ${currentUser?.uid}`);
    
    setConfirmDialog({
      isOpen: true,
      memberId,
      date,
      action
    });
  };
  
  // Close confirmation dialog
  const closeConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      memberId: null,
      date: null,
      action: null
    });
  };
  
  // Handle payment actions (mark/undo)
  const handlePaymentAction = async () => {
    const { memberId, date, action } = confirmDialog;
    
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    try {
      let success = false;
      
      if (action === 'mark') {
        console.log(`Attempting to mark payment for member ${memberId} on ${date}`);
        success = await recordPayment(memberId, date);
        
        if (success) {
          console.log(`Successfully marked payment for ${memberId} on ${date}`);
          setSuccess(isAdmin ? 'Payment approved successfully' : 'Payment submitted for approval');
        } else {
          console.error(`Failed to mark payment for ${memberId} on ${date}`);
          setError('Failed to mark payment. Please try again.');
        }
      } else if (action === 'undo') {
        console.log(`Attempting to undo payment for member ${memberId} on ${date}`);
        success = await undoPayment(memberId, date);
        
        if (success) {
          console.log(`Successfully undid payment for ${memberId} on ${date}`);
          setSuccess('Payment undone successfully');
        } else {
          console.error(`Failed to undo payment for ${memberId} on ${date}`);
          setError('Failed to undo payment. Please try again.');
        }
      }
      
      closeConfirmDialog();
    } catch (err) {
      console.error("Error in payment action:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get payment status
  const getPaymentStatus = (payment) => {
    if (!payment) return 'unpaid';
    console.log("Payment status check:", payment);
    if (payment.status === 'pending') return 'pending';
    if (payment.status === 'approved' || payment.paid) return 'paid';
    return 'unpaid';
  };
  
  // Get payment icon based on status
  const getPaymentIcon = (payment) => {
    const status = getPaymentStatus(payment);
    
    switch(status) {
      case 'paid':
        return <CheckCircleIcon className="h-6 w-6 text-green-500 mx-auto" aria-hidden="true" />;
      case 'pending':
        return <ClockIcon className="h-6 w-6 text-yellow-500 mx-auto" aria-hidden="true" />;
      case 'unpaid':
      default:
        return <XCircleIcon className="h-6 w-6 text-red-400 mx-auto" aria-hidden="true" />;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Error/Success messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Payment Tracker */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Payment Tracker</h3>
            <p className="mt-1 text-sm text-gray-500">
              Track weekly contributions of $156.25 from each member.
            </p>
          </div>
          
          {/* Month selector */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveMonth(Math.max(0, activeMonth - 1))}
              disabled={activeMonth === 0}
              className={`inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                activeMonth === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Previous
            </button>
            
            <span className="text-sm font-medium text-gray-700">
              {months.length > 0 
                ? new Date(months[activeMonth]).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  }) 
                : 'No data'
              }
            </span>
            
            <button
              onClick={() => setActiveMonth(Math.min(months.length - 1, activeMonth + 1))}
              disabled={activeMonth === months.length - 1}
              className={`inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                activeMonth === months.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Next
            </button>
          </div>
        </div>
        
        <div className="border-t border-gray-200">
          <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
            <span className="text-xs font-medium text-gray-500">
              Weekly contribution: $156.25 per member
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  {activeDates.map((date) => (
                    <th key={date} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-100">
                            <span className="text-sm font-medium leading-none text-primary-700">
                              {member.name && typeof member.name === 'string' ? member.name.charAt(0) : 'M'}
                            </span>
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                          {canInteractWithMember(member) && (
                            <div className="text-xs text-primary-600 font-medium">
                              {isAdmin ? "(Admin Access)" : "(Your Account)"}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {activeDates.map((date) => {
                      const payment = payments[member.id]?.[date];
                      const paymentStatus = getPaymentStatus(payment);
                      
                      return (
                        <td key={`${member.id}-${date}`} className="px-6 py-4 whitespace-nowrap text-center">
                          {/* Show different buttons based on payment status and user permissions */}
                          {paymentStatus === 'paid' ? (
                            <button
                              onClick={() => canInteractWithMember(member) ? openConfirmDialog(member.id, date, 'undo') : null}
                              disabled={!canInteractWithMember(member)}
                              className={`${!canInteractWithMember(member) ? 'cursor-not-allowed' : 'hover:bg-gray-100'} p-1 rounded-full focus:outline-none`}
                              title={canInteractWithMember(member) ? "Undo payment" : "Only the member or admin can undo"}
                            >
                              {getPaymentIcon(payment)}
                            </button>
                          ) : paymentStatus === 'pending' ? (
                            <div className="text-center">
                              {getPaymentIcon(payment)}
                              <span className="block text-xs text-yellow-600 mt-1">Pending</span>
                              {isAdmin && (
                                <div className="mt-1 flex justify-center space-x-1">
                                  <button
                                    onClick={() => openConfirmDialog(member.id, date, 'approve')}
                                    className="inline-flex items-center px-1 py-0.5 border border-transparent text-xs rounded text-green-700 bg-green-100 hover:bg-green-200"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => openConfirmDialog(member.id, date, 'reject')}
                                    className="inline-flex items-center px-1 py-0.5 border border-transparent text-xs rounded text-red-700 bg-red-100 hover:bg-red-200"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => canInteractWithMember(member) ? openConfirmDialog(member.id, date, 'mark') : null}
                              disabled={!canInteractWithMember(member)}
                              className={`${!canInteractWithMember(member) ? 'cursor-not-allowed' : 'hover:text-green-500'} p-1 rounded-full text-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
                              title={canInteractWithMember(member) ? "Mark as paid" : "Only the member or admin can mark as paid"}
                            >
                              {getPaymentIcon(payment)}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Admin-only section: Payment Approvals */}
      {isAdmin && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mt-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Pending Approvals</h3>
            <p className="mt-1 text-sm text-gray-500">
              Review and approve pending payment submissions.
            </p>
          </div>
          <div className="border-t border-gray-200">
            {isLoading ? (
              <div className="px-4 py-5 sm:p-6 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
              </div>
            ) : pendingApprovals.length === 0 ? (
              <div className="px-4 py-5 sm:p-6">
                <p className="text-sm text-gray-500">No pending payments to approve.</p>
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
                    {pendingApprovals.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-100">
                                <span className="text-sm font-medium leading-none text-primary-700">
                                  {payment.memberName ? payment.memberName.charAt(0) : 'U'}
                                </span>
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {payment.memberName || 'Unknown Member'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {payment.date ? new Date(payment.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'Unknown'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            ${payment.amount ? payment.amount.toFixed(2) : '156.25'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {payment.createdAt ? new Date(payment.createdAt).toLocaleString() : 'Unknown'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handleApprovePayment(payment.id)}
                              disabled={isLoading}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              <CheckCircleIcon className="mr-1 h-4 w-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectPayment(payment.id)}
                              disabled={isLoading}
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
        </div>
      )}
      
      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeConfirmDialog}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 sm:mx-0 sm:h-10 sm:w-10">
                    {confirmDialog.action === 'mark' && (
                      <CheckCircleIcon className="h-6 w-6 text-primary-600" aria-hidden="true" />
                    )}
                    {confirmDialog.action === 'undo' && (
                      <XCircleIcon className="h-6 w-6 text-primary-600" aria-hidden="true" />
                    )}
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      {confirmDialog.action === 'mark' && 'Confirm Payment'}
                      {confirmDialog.action === 'undo' && 'Undo Payment'}
                      {confirmDialog.action === 'approve' && 'Approve Payment'}
                      {confirmDialog.action === 'reject' && 'Reject Payment'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {confirmDialog.action === 'mark' && (
                          <>
                            Are you sure you want to mark this payment as paid? 
                            {!isAdmin && ' This will be submitted for admin approval.'}
                          </>
                        )}
                        {confirmDialog.action === 'undo' && (
                          <>
                            Are you sure you want to undo this payment? This action cannot be reversed.
                          </>
                        )}
                        {confirmDialog.action === 'approve' && (
                          <>
                            Are you sure you want to approve this payment?
                          </>
                        )}
                        {confirmDialog.action === 'reject' && (
                          <>
                            Are you sure you want to reject this payment?
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={isLoading}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white ${
                    isLoading ? 'bg-gray-400 cursor-not-allowed' : 
                    confirmDialog.action === 'mark' || confirmDialog.action === 'approve' 
                      ? 'bg-primary-600 hover:bg-primary-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm`}
                  onClick={handlePaymentAction}
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
                    <>
                      {confirmDialog.action === 'mark' && 'Confirm Payment'}
                      {confirmDialog.action === 'undo' && 'Undo Payment'}
                      {confirmDialog.action === 'approve' && 'Approve Payment'}
                      {confirmDialog.action === 'reject' && 'Reject Payment'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={closeConfirmDialog}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentTracker;