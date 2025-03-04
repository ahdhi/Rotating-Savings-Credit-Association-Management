import React, { createContext, useState, useContext, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  auth, 
  db, 
  subscribeToAuthChanges, 
  getCurrentUser,
  getAllMembers,
  saveMember,
  recordPayment as recordFirebasePayment,
  recordPayout as recordFirebasePayout,
  getAllPayments,
  getAllPayouts,
  registerUser,
  loginUser,
  logoutUser,
  checkUserEmailVerified,
  isUserAdmin,
  undoPayment as undoFirebasePayment,
  approvePayment as approveFirebasePayment,
  rejectPayment as rejectFirebasePayment,
  getPendingPayments as getFirebasePendingPayments,
  removeMember as removeFirebaseMember,
  migrateUsersToMembers as migrateFirebaseUsersToMembers
} from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  serverTimestamp,
  orderBy,
  doc,
  getDoc
} from 'firebase/firestore';

// Create the context
const ChitFundContext = createContext();

// Generate payment dates (every Friday for 9 months)
const generatePaymentDates = () => {
  const dates = [];
  const startDate = new Date(); // Current date
  // Set to the next Friday if not already Friday
  startDate.setDate(startDate.getDate() + ((7 - startDate.getDay() + 5) % 7 || 7));
  
  for (let i = 0; i < 36; i++) { // 9 months * 4 weeks
    const paymentDate = new Date(startDate);
    paymentDate.setDate(startDate.getDate() + (i * 7)); // Every 7 days
    dates.push(format(paymentDate, 'yyyy-MM-dd'));
  }
  
  return dates;
};

// Provider component
export const ChitFundProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState([]);
  const [paymentDates, setPaymentDates] = useState(generatePaymentDates());
  const [payments, setPayments] = useState({});
  const [pendingPayments, setPendingPayments] = useState([]);
  const [payoutSchedule, setPayoutSchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Subscribe to authentication state changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      if (user) {
        // User is signed in
        const fullUserData = await getCurrentUser();
        setCurrentUser(fullUserData);
        
        // Check if the user is an admin
        const adminStatus = await isUserAdmin();
        setIsAdmin(adminStatus);
      } else {
        // User is signed out
        setCurrentUser(null);
        setIsAdmin(false);
      }
    });
    
    return () => unsubscribe(); // Unsubscribe on cleanup
  }, []);

// Fetch members from Firestore with real-time updates
useEffect(() => {
    console.log("Setting up members listener");
    setIsLoading(true);
    
    // Set up real-time listener for members collection
    const membersRef = collection(db, 'members');
    // Remove orderBy to ensure we get all members
    const q = query(membersRef);
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const membersList = [];
      querySnapshot.forEach((doc) => {
        membersList.push({ id: doc.id, ...doc.data() });
      });
      console.log(`Members updated: ${membersList.length} members found`);
      setMembers(membersList);
      setIsLoading(false);
    }, (err) => {
      console.error('Error in members snapshot listener:', err);
      setError('Error fetching members: ' + err.message);
      setIsLoading(false);
    });
    
    return () => {
      console.log("Cleaning up members listener");
      unsubscribe();
    };
  }, []); // Empty dependency array to run only once

  useEffect(() => {
    if (members.length === 0) return;
    
    const fetchPayments = async () => {
      try {
        const result = await getAllPayments();
        if (result.success) {
          // Transform into the format our app expects
          const paymentsData = {};
          
          members.forEach(member => {
            paymentsData[member.id] = {};
            paymentDates.forEach(date => {
              paymentsData[member.id][date] = {
                paid: false,
                status: 'unpaid',
                amount: 156.25,
                paidOn: null,
              };
            });
          });
          
          // Update with actual payment data
          result.payments.forEach(payment => {
            if (paymentsData[payment.memberId] && paymentsData[payment.memberId][payment.date]) {
              paymentsData[payment.memberId][payment.date] = {
                paid: payment.status === 'approved',
                status: payment.status || 'unpaid',
                amount: payment.amount || 156.25,
                paidOn: payment.createdAt?.toDate() || null,
                paymentId: payment.id // Store the payment ID for admin actions
              };
            }
          });
          
          setPayments(paymentsData);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Failed to fetch payments: ' + err.message);
      }
    };
    
    fetchPayments();
    
    // Set up real-time listener for payments collection
    const paymentsRef = collection(db, 'payments');
    
    const unsubscribe = onSnapshot(paymentsRef, (querySnapshot) => {
      // This is a simplified approach - in a real app you might want to 
      // do more sophisticated merging of the existing and new data
      fetchPayments();
    }, (err) => {
      setError('Error in payments snapshot listener: ' + err.message);
    });
    
    return () => unsubscribe();
  }, [members, paymentDates]);
  
  // Fetch pending payments for admin
  useEffect(() => {
    if (!isAdmin || !currentUser) return;
    
    const fetchPendingPayments = async () => {
      try {
        const result = await getFirebasePendingPayments();
        if (result.success) {
          setPendingPayments(result.pendingPayments);
        } else {
          console.error('Failed to fetch pending payments:', result.error);
        }
      } catch (err) {
        console.error('Error fetching pending payments:', err);
      }
    };
    
    fetchPendingPayments();
    
    // Set up listener for pending payments
    const paymentsRef = collection(db, 'payments');
    const q = query(paymentsRef, where('status', '==', 'pending'));
    
    const unsubscribe = onSnapshot(q, () => {
      fetchPendingPayments();
    });
    
    return () => unsubscribe();
  }, [isAdmin, currentUser]);
  
  // Fetch and construct payout schedule
  useEffect(() => {
    if (members.length === 0) return;
    
    const fetchPayouts = async () => {
      try {
        const result = await getAllPayouts();
        if (result.success) {
          // First create a default schedule
          const defaultSchedule = members.map((member, index) => {
            return {
              memberId: member.id,
              memberName: member.name,
              payoutMonth: index + 1,
              paid: false,
              amount: 5625,
            };
          });
          
          // Now update with actual payout data
          const updatedSchedule = defaultSchedule.map(scheduledPayout => {
            const actualPayout = result.payouts.find(
              p => p.memberId === scheduledPayout.memberId
            );
            
            if (actualPayout) {
              return {
                ...scheduledPayout,
                paid: true,
                amount: actualPayout.amount,
                paidOn: actualPayout.createdAt.toDate()
              };
            }
            
            return scheduledPayout;
          });
          
          setPayoutSchedule(updatedSchedule);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Failed to fetch payout schedule: ' + err.message);
      }
    };
    
    fetchPayouts();
    
    // Set up real-time listener for payouts collection
    const payoutsRef = collection(db, 'payouts');
    
    const unsubscribe = onSnapshot(payoutsRef, (querySnapshot) => {
      fetchPayouts();
    }, (err) => {
      setError('Error in payouts snapshot listener: ' + err.message);
    });
    
    return () => unsubscribe();
  }, [members]);
  
  // Calculate total collected funds
  const calculateTotalCollected = () => {
    let total = 0;
    
    Object.values(payments).forEach(memberPayments => {
      Object.values(memberPayments).forEach(payment => {
        if (payment.paid) {
          total += payment.amount;
        }
      });
    });
    
    return total;
  };
  
  // Calculate individual contributions
  const calculateMemberContributions = () => {
    const contributions = {};
    
    members.forEach(member => {
      let total = 0;
      
      if (payments[member.id]) {
        Object.values(payments[member.id]).forEach(payment => {
          if (payment.paid) {
            total += payment.amount;
          }
        });
      }
      
      contributions[member.id] = total;
    });
    
    return contributions;
  };

  const migrateUsersToMembers = async () => {
    try {
      const result = await migrateFirebaseUsersToMembers();
      if (!result.success) {
        setError(result.error);
        return result;
      }
      
      // Force a refresh of the members list after migration
      const refreshResult = await getAllMembers();
      if (refreshResult.success) {
        setMembers(refreshResult.members);
      }
      
      return result;
    } catch (error) {
      setError(`Migration error: ${error.message}`);
      return { success: false, error: error.message };
    }
  };
  
// Record a payment (using Firebase)
const recordPayment = async (memberId, date) => {
    console.log(`Recording payment: Member ${memberId}, Date ${date}`);
    
    if (payments[memberId] && payments[memberId][date]) {
      try {
        const result = await recordFirebasePayment(
          memberId, 
          date, 
          payments[memberId][date].amount
        );
        
        console.log("Firebase payment result:", result);
        
        if (!result.success) {
          setError(result.error);
          return false;
        }
        
        // IMPORTANT: Update the UI state immediately regardless of admin status
        // Create a copy of the current payments state
        const updatedPayments = {...payments};
        
        // Update the specific payment status in the UI
        if (updatedPayments[memberId] && updatedPayments[memberId][date]) {
          updatedPayments[memberId][date] = {
            ...updatedPayments[memberId][date],
            paid: isAdmin, // Only mark as paid if admin
            status: isAdmin ? 'approved' : 'pending', // Pending for regular users
            paidOn: new Date()
          };
          
          // Update the state
          setPayments(updatedPayments);
          console.log(`Payment UI updated to status: ${isAdmin ? 'approved' : 'pending'}`);
        }
        
        return true;
      } catch (err) {
        console.error('Failed to record payment:', err);
        setError('Failed to record payment: ' + err.message);
        return false;
      }
    }
    return false;
  };
  
  // Undo a payment (using Firebase)
  const undoPayment = async (memberId, date) => {
    if (payments[memberId] && payments[memberId][date]) {
      try {
        const result = await undoFirebasePayment(memberId, date);
        
        if (!result.success) {
          setError(result.error);
          return false;
        }
        
        // The data will update automatically through the Firestore listener
        return true;
      } catch (err) {
        setError('Failed to undo payment: ' + err.message);
        return false;
      }
    }
    return false;
  };
  
  // Approve a pending payment
  const approvePayment = async (paymentId) => {
    try {
      const result = await approveFirebasePayment(paymentId);
      
      if (!result.success) {
        setError(result.error);
        return false;
      }
      
      // The data will update automatically through the Firestore listener
      return true;
    } catch (err) {
      setError('Failed to approve payment: ' + err.message);
      return false;
    }
  };
  
  // Reject a pending payment
  const rejectPayment = async (paymentId, reason) => {
    try {
      const result = await rejectFirebasePayment(paymentId, reason);
      
      if (!result.success) {
        setError(result.error);
        return false;
      }
      
      // The data will update automatically through the Firestore listener
      return true;
    } catch (err) {
      setError('Failed to reject payment: ' + err.message);
      return false;
    }
  };
  
  // Record a payout (using Firebase)
  const recordPayout = async (payoutIndex) => {
    const payout = payoutSchedule[payoutIndex];
    if (!payout) return false;
    
    try {
      const result = await recordFirebasePayout(
        payout.memberId,
        payout.amount,
        payout.payoutMonth
      );
      
      if (!result.success) {
        setError(result.error);
        return false;
      }
      
      // The data will update automatically through the Firestore listener
      return true;
    } catch (err) {
      setError('Failed to record payout: ' + err.message);
      return false;
    }
  };
  
  // Add a new member (using Firebase)
  const addMember = async (name, email, additionalData = {}) => {
    try {
      const memberData = {
        name,
        email,
        isVerified: additionalData.isVerified || false,
        joinedAt: serverTimestamp(),
        // Add any other member-specific data
        ...additionalData
      };
      
      const result = await saveMember(memberData);
      
      if (!result.success) {
        setError(result.error);
        return null;
      }
      
      // Return the member with ID
      return { id: result.id, ...memberData };
    } catch (err) {
      setError('Failed to add member: ' + err.message);
      return null;
    }
  };
  
  // Register a new user with Firebase Authentication
  const register = async (name, email, password) => {
    try {
      const result = await registerUser(email, password, name);
      
      if (!result.success) {
        setError(result.error);
        return false;
      }
      
      // Add the user as a member
      await addMember(name, email, {
        uid: result.user.uid,
        isVerified: false
      });
      
      return true;
    } catch (err) {
      setError('Registration failed: ' + err.message);
      return false;
    }
  };

  const [successMessage, setSuccessMessage] = useState("");
  const removeMember = async (memberId) => {
    try {
        console.log(" Attempting to remove member:", memberId);
        const result = await removeFirebaseMember(memberId);

        console.log(" Remove Firebase Member Result:", result);

        if (!result.success) { 
            console.warn(" Member removal failed:", result.error);
            return false; //  No UI message, just return false
        }

        console.log(" Member removed successfully. Updating UI...");
        
        //  Only update state, no UI messages
        setMembers(prevMembers => prevMembers.filter(member => member.id !== memberId));

        return true;
    } catch (err) {
        console.error("Unexpected Error in removeMember:", err);
        return false; // No UI message, just return false
    }
};
  
  // Login with Firebase Authentication
  const login = async (email, password) => {
    try {
      const result = await loginUser(email, password);
      
      if (!result.success) {
        setError(result.error);
        return false;
      }
      
      // The currentUser will be updated through the auth state listener
      return true;
    } catch (err) {
      setError('Login failed: ' + err.message);
      return false;
    }
  };
  
  // Logout with Firebase Authentication
  const logout = async () => {
    try {
      const result = await logoutUser();
      
      if (!result.success) {
        setError(result.error);
        return false;
      }
      
      // The currentUser will be updated through the auth state listener
      return true;
    } catch (err) {
      setError('Logout failed: ' + err.message);
      return false;
    }
  };
  
  // Check if email is verified
  const isEmailVerified = async () => {
    try {
      return await checkUserEmailVerified();
    } catch (err) {
      setError('Failed to check email verification: ' + err.message);
      return false;
    }
  };
  
  // Calculate upcoming payouts
  const getUpcomingPayouts = () => {
    return payoutSchedule.filter(payout => !payout.paid);
  };
  
  // Value object to be provided to consumers
  const value = {
    currentUser,
    isAdmin,
    members,
    paymentDates,
    payoutSchedule,
    payments,
    pendingPayments,
    isLoading,
    error,
    calculateTotalCollected,
    calculateMemberContributions,
    recordPayment,
    undoPayment,
    approvePayment,
    rejectPayment,
    recordPayout,
    addMember,
    removeMember,
    register,
    login,
    logout,
    isEmailVerified,
    getUpcomingPayouts,
    migrateUsersToMembers
  };
  
  return (
    <ChitFundContext.Provider value={value}>
      {children}
    </ChitFundContext.Provider>
  );
};

// Custom hook to use the context
export const useChitFund = () => {
  const context = useContext(ChitFundContext);
  if (!context) {
    throw new Error('useChitFund must be used within a ChitFundProvider');
  }
  return context;
};

