import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword, 
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  addDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  writeBatch,
  increment,
  orderBy,
  deleteDoc,
  deleteField
} from 'firebase/firestore';
import { format } from 'date-fns';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAZWk5C9_WIjKWkLb2XXpJ7GXgX8fM5MfU",
  authDomain: "chit-fund-manager-ee405.firebaseapp.com",
  projectId: "chit-fund-manager-ee405",
  storageBucket: "chit-fund-manager-ee405.firebasestorage.app",
  messagingSenderId: "650728406153",
  appId: "1:650728406153:web:4a848245747a022bdeda58",
  measurementId: "G-NHLR4F0LQ7"
};

// Initialize Firebase
console.log("Initializing Firebase...");
const app = initializeApp(firebaseConfig);

// Initialize services AFTER the app is initialized
let analytics;
try {
  analytics = getAnalytics(app);
  console.log("Analytics initialized successfully");
} catch (error) {
  console.error("Error initializing analytics:", error);
}

const auth = getAuth(app);
console.log("Auth initialized successfully");

const db = getFirestore(app);
console.log("Firestore initialized successfully");

// Authentication functions with enhanced error handling
export const registerUser = async (email, password, name) => {
    console.log(`Attempting to register user: ${email}`);
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log(`User created successfully: ${user.uid}`);
      
      try {
        // Send email verification
        await sendEmailVerification(user);
        console.log(`Verification email sent to: ${email}`);
      } catch (verificationError) {
        console.error("Error sending verification email:", verificationError);
        // Continue despite email verification error
      }
      
      // Use a batch write to ensure both operations succeed or fail together
      const batch = writeBatch(db);
      
      // Prepare user document
      const userDocRef = doc(db, 'users', user.uid);
      batch.set(userDocRef, {
        name: name,
        email: email,
        createdAt: serverTimestamp(),
        isAdmin: false,
        isVerified: false,
        uid: user.uid
      });
      
      // Prepare member document
      const memberRef = doc(collection(db, 'members'));
      batch.set(memberRef, {
        name: name,
        email: email,
        uid: user.uid,
        joinedAt: serverTimestamp(),
        isVerified: false,
        totalContributed: 0,
        paymentDates: []
      });
      
      // Commit both operations atomically
      await batch.commit();
      console.log(`User and member records created successfully for ${email}`);
      
      return { 
        success: true, 
        user, 
        memberId: memberRef.id 
      };
    } catch (error) {
      console.error(`Registration error for ${email}:`, error.code, error.message);
      
      // If user was created but member wasn't, attempt to delete the user
      if (auth.currentUser) {
        try {
          await auth.currentUser.delete();
          console.log("Reverted user creation due to failure in creating member record");
        } catch (deleteError) {
          console.error("Could not delete user after failure:", deleteError);
        }
      }
      
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
  };

// Migrating Signed up users to members
export const migrateUsersToMembers = async () => {
    console.log("Starting migration of users to members");
    try {
      // Get all users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      // Get all existing members with UIDs
      const membersRef = collection(db, 'members');
      const membersQuery = query(membersRef, where("uid", "!=", null));
      const membersSnapshot = await getDocs(membersQuery);
      
      // Create a set of user IDs that already have member records
      const existingMemberUids = new Set();
      membersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.uid) {
          existingMemberUids.add(data.uid);
        }
      });
      
      console.log(`Found ${existingMemberUids.size} users that already have member records`);
      
      // Create member records for users who don't have one
      const batch = writeBatch(db);
      let count = 0;
      
      usersSnapshot.forEach(userDoc => {
        const userData = userDoc.data();
        const uid = userDoc.id;
        
        if (!existingMemberUids.has(uid)) {
          console.log(`Creating member record for user: ${userData.email} (${uid})`);
          
          // This line had the error - corrected version:
          const newMemberRef = doc(collection(db, 'members'));
          
          batch.set(newMemberRef, {
            name: userData.name || (userData.email ? userData.email.split('@')[0] : 'Unknown User'),
            email: userData.email || '',
            uid: uid,
            joinedAt: userData.createdAt || serverTimestamp(),
            isVerified: userData.isVerified || false,
            totalContributed: 0,
            paymentDates: []
          });
          
          count++;
        }
      });
      
      // If we have users to migrate, commit the batch
      if (count > 0) {
        await batch.commit();
        console.log(`Successfully migrated ${count} users to members`);
      } else {
        console.log("No users to migrate");
      }
      
      return { success: true, count };
    } catch (error) {
      console.error("Error migrating users to members:", error);
      return { success: false, error: error.message };
    }
  };

export const updateUserVerification = async (uid, isVerified = true) => {
  console.log(`Updating verification status for user: ${uid} to ${isVerified}`);
  try {
    // Update users collection
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { 
      isVerified,
      updatedAt: serverTimestamp()
    });
    console.log(`User verification status updated in users collection: ${uid}`);
    
    // Find and update the corresponding member document
    const membersRef = collection(db, 'members');
    const q = query(membersRef, where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const memberDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, 'members', memberDoc.id), { 
        isVerified,
        updatedAt: serverTimestamp()
      });
      console.log(`Member verification status updated in members collection: ${memberDoc.id}`);
    } else {
      console.warn(`No member record found for user: ${uid}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error updating verification status:", error);
    return { success: false, error: error.message };
  }
};

export const loginUser = async (email, password) => {
  console.log(`Attempting login for: ${email}`);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log(`Login successful for: ${email}, uid: ${userCredential.user.uid}`);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error(`Login error for ${email}:`, error.code, error.message);
    return { 
      success: false, 
      error: error.message,
      code: error.code 
    };
  }
};

export const logoutUser = async () => {
  console.log("Attempting to log out user");
  try {
    const currentUser = auth.currentUser;
    console.log(`Logging out user: ${currentUser?.email || 'Unknown user'}`);
    await signOut(auth);
    console.log("Logout successful");
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error.code, error.message);
    return { 
      success: false, 
      error: error.message,
      code: error.code 
    };
  }
};

export const resetPassword = async (email) => {
  console.log(`Attempting to send password reset email to: ${email}`);
  try {
    await sendPasswordResetEmail(auth, email);
    console.log(`Password reset email sent to: ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`Password reset error for ${email}:`, error.code, error.message);
    return { 
      success: false, 
      error: error.message,
      code: error.code 
    };
  }
};

// Function to get current user data including Firestore profile data
export const getCurrentUser = async () => {
  const user = auth.currentUser;
  if (!user) {
    console.log("getCurrentUser: No user is currently logged in");
    return null;
  }
  
  console.log(`Getting data for current user: ${user.email}, uid: ${user.uid}`);
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      console.log(`User profile data retrieved for: ${user.email}`);
      return {
        ...user,
        ...userDoc.data()
      };
    } else {
      console.log(`No profile data found for user: ${user.email}, returning basic user object`);
      return user;
    }
  } catch (error) {
    console.error(`Error getting user profile for ${user.email}:`, error);
    // Return basic user object in case of error
    return user;
  }
};

// Function to check if email is verified (useful on page load and after login)
export const checkUserEmailVerified = async () => {
  const user = auth.currentUser;
  if (!user) {
    console.log("checkUserEmailVerified: No user is currently logged in");
    return false;
  }
  
  console.log(`Checking if email is verified for: ${user.email}`);
  try {
    // Force refresh the token to get the latest email verification status
    await user.reload();
    console.log(`Email verification status for ${user.email}: ${user.emailVerified}`);
    return user.emailVerified;
  } catch (error) {
    console.error(`Error checking email verification for ${user.email}:`, error);
    return false;
  }
};

// Function to check if the current user is an admin
export const isUserAdmin = async () => {
  console.log("Checking if current user is admin");
  try {
    const user = auth.currentUser;
    
    if (!user) {
      console.log("No user is logged in");
      return false;
    }
    
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    const isAdmin = userDoc.exists() && userDoc.data().isAdmin === true;
    console.log(`User ${user.email} admin status: ${isAdmin}`);
    
    return isAdmin;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

// TEMPORARY FUNCTION: Update a user's email verification status (for testing)
export const manuallyVerifyEmail = async (uid) => {
  console.log(`Manually verifying email for user: ${uid}`);
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      isVerified: true
    });
    console.log(`User ${uid} manually verified`);
    return { success: true };
  } catch (error) {
    console.error(`Error manually verifying user ${uid}:`, error);
    return { success: false, error: error.message };
  }
};

// Add or update member
export const saveMember = async (memberData) => {
  console.log(`Attempting to save member: ${memberData.email}`);
  try {
    // First check if the member exists
    const membersRef = collection(db, 'members');
    const q = query(membersRef, where("email", "==", memberData.email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Member exists, update their data
      const memberDoc = querySnapshot.docs[0];
      console.log(`Updating existing member: ${memberData.email}, id: ${memberDoc.id}`);
      await updateDoc(doc(db, 'members', memberDoc.id), {
        ...memberData,
        updatedAt: serverTimestamp()
      });
      return { success: true, id: memberDoc.id };
    } else {
      // New member, add them
      console.log(`Creating new member: ${memberData.email}`);
      const docRef = await addDoc(collection(db, 'members'), {
        ...memberData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`New member created: ${memberData.email}, id: ${docRef.id}`);
      return { success: true, id: docRef.id };
    }
  } catch (error) {
    console.error(`Error saving member ${memberData.email}:`, error);
    return { success: false, error: error.message };
  }
};

// Get all members
export const getAllMembers = async () => {
  console.log("Fetching all members");
  try {
    const membersRef = collection(db, 'members');
    const querySnapshot = await getDocs(membersRef);
    
    const members = [];
    querySnapshot.forEach((doc) => {
      members.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Retrieved ${members.length} members`);
    return { success: true, members };
  } catch (error) {
    console.error("Error getting members:", error);
    return { success: false, error: error.message };
  }
};

// Record a payment
export const recordPayment = async (memberId, date, amount) => {
    console.log(`Recording payment: Member ID: ${memberId}, Date: ${date}, Amount: ${amount}`);
    try {
      // Get the current user
      const user = auth.currentUser;
      
      if (!user) {
        console.error("User must be logged in to record a payment");
        return { success: false, error: "Authentication required" };
      }
      
      // Check if the user is trying to record their own payment but provided their uid instead of member id
      if (memberId === user.uid) {
        // Find the member document that corresponds to the current user
        const membersRef = collection(db, 'members');
        const q = query(membersRef, where("uid", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const memberDoc = querySnapshot.docs[0];
          memberId = memberDoc.id;
          console.log(`Found member document for current user: ${memberId}`);
        } else {
          console.error(`No member document found for user: ${user.uid}`);
          return { success: false, error: "User is not registered as a member" };
        }
      }
      
      // Check if the user is an admin
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const isAdmin = userDoc.exists() && userDoc.data().isAdmin === true;
      
      // Find the member record to check ownership
      const memberRef = doc(db, 'members', memberId);
      const memberDoc = await getDoc(memberRef);
      
      if (!memberDoc.exists()) {
        return { success: false, error: "Member not found" };
      }
      
      const memberData = memberDoc.data();
      const isSelf = user.uid === memberData.uid;
      
      // SECURITY FIX: Use different strategies for admins vs. regular users
      // Regular users need a workaround for Firestore permissions
      if (!isAdmin) {
        console.log("Payment recording: isAdmin=false, isSelf=" + isSelf + ", status=pending");
        
        try {
          // Store pending payments in user's document (where they have write permission)
          const userPendingRef = collection(db, 'users', user.uid, 'pendingPayments');
          const pendingDoc = await addDoc(userPendingRef, {
            memberId,
            date,
            amount,
            createdAt: serverTimestamp(),
            status: 'pending'
          });
          
          // Create a notification for admins
          await addDoc(collection(db, 'notifications'), {
            type: 'payment_approval',
            memberId: memberId,
            memberName: memberData.name || 'Unknown Member',
            userId: user.uid,
            date: date,
            amount: amount,
            pendingId: pendingDoc.id,
            createdAt: serverTimestamp(),
            read: false
          });
          
          console.log(`Pending payment stored in user's document. Notification created for admin.`);
          
          return { 
            success: true, 
            status: 'pending',
            message: 'Payment submitted for approval'
          };
        } catch (err) {
          console.error("Error storing pending payment:", err);
          return { success: false, error: err.message };
        }
      } else {
        // Admins can write directly to payments collection
        console.log("Payment recording: isAdmin=true, status=approved");
        
        const paymentData = {
          memberId,
          date,
          amount,
          createdAt: serverTimestamp(),
          status: 'approved',
          requestedBy: user.uid,
          approvedBy: user.uid,
          approvedAt: serverTimestamp()
        };
        
        try {
          const paymentRef = await addDoc(collection(db, 'payments'), paymentData);
          console.log(`Payment approved with ID: ${paymentRef.id}`);
          
          // Update the member's payment history
          await updateDoc(memberRef, {
            paymentDates: arrayUnion(date),
            totalContributed: increment(amount),
            updatedAt: serverTimestamp()
          });
          console.log(`Member ${memberId} payment history updated`);
          
          return { 
            success: true, 
            status: 'approved',
            message: 'Payment recorded successfully'
          };
        } catch (err) {
          console.error("Error recording approved payment:", err);
          return { success: false, error: err.message };
        }
      }
    } catch (error) {
      console.error(`Error in recordPayment:`, error);
      return { success: false, error: error.message };
    }
  };

// Undo a payment
export const undoPayment = async (memberId, date) => {
  console.log(`Undoing payment: Member ID: ${memberId}, Date: ${date}`);
  try {
    // Get the current user
    const user = auth.currentUser;
    
    if (!user) {
      console.error("User must be logged in to undo a payment");
      return { success: false, error: "Authentication required" };
    }
    
    // Check if the user is an admin or the payment owner
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    const isAdmin = userDoc.exists() && userDoc.data().isAdmin === true;
    
    // Get the member to check ownership
    const memberRef = doc(db, 'members', memberId);
    const memberDoc = await getDoc(memberRef);
    
    if (!memberDoc.exists()) {
      return { success: false, error: "Member not found" };
    }
    
    const memberData = memberDoc.data();
    const isSelf = user.uid === memberData.uid;
    
    if (!isAdmin && !isSelf) {
      return { 
        success: false, 
        error: "Only the member or an admin can undo this payment" 
      };
    }
    
    // Find the payment
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef, 
      where("memberId", "==", memberId),
      where("date", "==", date),
      where("status", "in", ["approved", "pending"])
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: "Payment not found" };
    }
    
    // For each matching payment (should only be one), update it to 'cancelled'
    const batch = writeBatch(db);
    
    querySnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'cancelled',
        cancelledBy: user.uid,
        cancelledAt: serverTimestamp(),
        cancelReason: 'User requested cancellation'
      });
    });
    
    await batch.commit();
    console.log(`Payment for Member ${memberId} on ${date} cancelled`);
    
    // If this was an approved payment, update the member's contribution total
    const hasApprovedPayment = querySnapshot.docs.some(
      doc => doc.data().status === 'approved'
    );
    
    if (hasApprovedPayment) {
      try {
        const membersRef = doc(db, 'members', memberId);
        const memberDoc = await getDoc(membersRef);
        
        if (memberDoc.exists()) {
          // Get the amount of the payment being undone
          const paymentAmount = querySnapshot.docs.find(
            doc => doc.data().status === 'approved'
          )?.data().amount || 156.25;
          
          await updateDoc(membersRef, {
            paymentDates: arrayRemove(date),
            totalContributed: increment(-paymentAmount), // Subtract the payment amount
            updatedAt: serverTimestamp()
          });
          console.log(`Member ${memberId} payment history updated after cancellation`);
        }
      } catch (memberUpdateError) {
        console.error(`Error updating member after payment cancellation for ${memberId}:`, memberUpdateError);
      }
    }
    
    return { success: true, message: "Payment cancelled successfully" };
  } catch (error) {
    console.error(`Error cancelling payment for member ${memberId}:`, error);
    return { success: false, error: error.message };
  }
};

// Approve a pending payment
export const approvePayment = async (notificationId) => {
    console.log(`Approving payment for notification: ${notificationId}`);
    try {
      // Get the current user
      const user = auth.currentUser;
      
      if (!user) {
        console.error("User must be logged in to approve a payment");
        return { success: false, error: "Authentication required" };
      }
      
      // Check if the user is an admin
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const isAdmin = userDoc.exists() && userDoc.data().isAdmin === true;
      
      if (!isAdmin) {
        return { success: false, error: "Only admins can approve payments" };
      }
      
      // Get the notification
      const notificationRef = doc(db, 'notifications', notificationId);
      const notificationDoc = await getDoc(notificationRef);
      
      if (!notificationDoc.exists()) {
        return { success: false, error: "Notification not found" };
      }
      
      const notificationData = notificationDoc.data();
      
      // Add to the payments collection
      const paymentRef = await addDoc(collection(db, 'payments'), {
        memberId: notificationData.memberId,
        date: notificationData.date,
        amount: notificationData.amount,
        createdAt: notificationData.createdAt || serverTimestamp(),
        status: 'approved',
        requestedBy: notificationData.userId,
        approvedBy: user.uid,
        approvedAt: serverTimestamp()
      });
      
      console.log(`Payment approved with ID: ${paymentRef.id}`);
      
      // Update the member's payment history
      const memberRef = doc(db, 'members', notificationData.memberId);
      await updateDoc(memberRef, {
        paymentDates: arrayUnion(notificationData.date),
        totalContributed: increment(notificationData.amount),
        updatedAt: serverTimestamp()
      });
      
      // Delete the notification - THIS IS THE KEY CHANGE
      await deleteDoc(notificationRef);
      console.log(`Notification ${notificationId} deleted after approval`);
      
      return { success: true, message: "Payment approved successfully" };
    } catch (error) {
      console.error(`Error approving payment:`, error);
      return { success: false, error: error.message };
    }
  };

// Reject a pending payment
export const rejectPayment = async (notificationId) => {
    console.log(`Rejecting payment for notification: ${notificationId}`);
    try {
      // Get the current user
      const user = auth.currentUser;
      
      if (!user) {
        console.error("User must be logged in to reject a payment");
        return { success: false, error: "Authentication required" };
      }
      
      // Check if the user is an admin
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const isAdmin = userDoc.exists() && userDoc.data().isAdmin === true;
      
      if (!isAdmin) {
        return { success: false, error: "Only admins can reject payments" };
      }
      
      // Get the notification
      const notificationRef = doc(db, 'notifications', notificationId);
      const notificationDoc = await getDoc(notificationRef);
      
      if (!notificationDoc.exists()) {
        return { success: false, error: "Notification not found" };
      }
      
      const notificationData = notificationDoc.data();
      
      // Record the rejection in a separate collection if you want to track it
      await addDoc(collection(db, 'rejectedPayments'), {
        memberId: notificationData.memberId,
        date: notificationData.date,
        amount: notificationData.amount,
        requestedBy: notificationData.userId,
        rejectedBy: user.uid,
        rejectedAt: serverTimestamp(),
        reason: "Rejected by admin"
      });
      
      // Delete the notification after rejection - THIS IS THE KEY CHANGE
      await deleteDoc(notificationRef);
      console.log(`Notification ${notificationId} deleted after rejection`);
      
      return { success: true, message: "Payment rejected successfully" };
    } catch (error) {
      console.error(`Error rejecting payment:`, error);
      return { success: false, error: error.message };
    }
  };

// Function to get all pending payments (for admin dashboard)
export const getPendingPayments = async () => {
    console.log("Fetching pending payments for admin");
    try {
      // Get the current user
      const user = auth.currentUser;
      
      if (!user) {
        console.error("User must be logged in to view pending payments");
        return { success: false, error: "Authentication required" };
      }
      
      // Check if the user is an admin
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const isAdmin = userDoc.exists() && userDoc.data().isAdmin === true;
      
      if (!isAdmin) {
        console.error("User is not admin, cannot access pending payments");
        return { success: false, error: "Only admins can view all pending payments" };
      }
      
      console.log("Admin confirmed, fetching payment notifications");
      
      // Query for notifications with type="payment_approval"
      const notificationsRef = collection(db, 'notifications');
      
      // Simplified query to help debug
      const querySnapshot = await getDocs(notificationsRef);
      
      console.log(`Retrieved ${querySnapshot.size} total notifications`);
      
      const pendingPayments = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Notification data:", data);
        
        // Only process payment approval notifications
        if (data.type === 'payment_approval') {
          // Format the data for the UI
          pendingPayments.push({
            id: doc.id,
            memberId: data.memberId,
            memberName: data.memberName || 'Unknown',
            date: data.date,
            amount: data.amount,
            createdAt: data.createdAt?.toDate() || new Date(),
            userId: data.userId,
            pendingId: data.pendingId,
            status: 'pending'
          });
        }
      });
      
      console.log(`Found ${pendingPayments.length} pending payments`);
      return { success: true, pendingPayments };
    } catch (error) {
      console.error("Error getting pending payments:", error);
      return { success: false, error: error.message };
    }
  };

// Record a payout
export const recordPayout = async (memberId, amount, month) => {
  console.log(`Recording payout: Member ID: ${memberId}, Month: ${month}, Amount: ${amount}`);
  try {
    const payoutData = {
      memberId,
      amount,
      month,
      date: new Date(),
      createdAt: serverTimestamp(),
      status: 'completed'
    };
    
    const payoutRef = await addDoc(collection(db, 'payouts'), payoutData);
    console.log(`Payout recorded with ID: ${payoutRef.id}`);
    
    // Update the member's payout record
    try {
      const membersRef = doc(db, 'members', memberId);
      await updateDoc(membersRef, {
        receivedPayout: true,
        payoutMonth: month,
        payoutAmount: amount,
        updatedAt: serverTimestamp()
      });
      console.log(`Member ${memberId} payout status updated`);
    } catch (memberUpdateError) {
      console.error(`Error updating member payout status for ${memberId}:`, memberUpdateError);
      // Payout was still recorded, so we'll return success
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error recording payout for member ${memberId}:`, error);
    return { success: false, error: error.message };
  }
};

// Get all payments for reporting
export const getAllPayments = async () => {
  console.log("Fetching all payments");
  try {
    const paymentsRef = collection(db, 'payments');
    const querySnapshot = await getDocs(paymentsRef);
    
    const payments = [];
    querySnapshot.forEach((doc) => {
      payments.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Retrieved ${payments.length} payments`);
    return { success: true, payments };
  } catch (error) {
    console.error("Error getting payments:", error);
    return { success: false, error: error.message };
  }
};

// Get all payouts for reporting
export const getAllPayouts = async () => {
  console.log("Fetching all payouts");
  try {
    const payoutsRef = collection(db, 'payouts');
    const querySnapshot = await getDocs(payoutsRef);
    
    const payouts = [];
    querySnapshot.forEach((doc) => {
      payouts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Retrieved ${payouts.length} payouts`);
    return { success: true, payouts };
  } catch (error) {
    console.error("Error getting payouts:", error);
    return { success: false, error: error.message };
  }
};

// Listen to auth state changes with additional logging
export const subscribeToAuthChanges = (callback) => {
    console.log("Setting up auth state change listener");
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log(`Auth state changed: User is signed in - ${user.email}, uid: ${user.uid}`);
      } else {
        console.log("Auth state changed: User is signed out");
      }
      callback(user);
    }, (error) => {
      console.error("Error in auth state change listener:", error);
    });
  };
  
  // TEMPORARY FUNCTION - only for development/debugging
  export const getCurrentAuthState = () => {
    const user = auth.currentUser;
    console.log("Current auth state:", user ? `Logged in as ${user.email}` : "Not logged in");
    return user;
  };
  
  // Send payment reminder emails to all members one day before payment date
  export const sendPaymentReminders = async () => {
    console.log("Sending payment reminders");
    try {
      // Get tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
      
      // Check if tomorrow is a payment date (Friday)
      if (tomorrow.getDay() !== 5) { // 5 is Friday
        console.log("Tomorrow is not a payment date (not Friday), skipping reminders");
        return { success: true, message: "No payment due tomorrow" };
      }
      
      // Get all members
      const membersResult = await getAllMembers();
      if (!membersResult.success) {
        return { success: false, error: "Failed to fetch members" };
      }
      
      // In a real implementation, you would use a third-party email service here
      // For this demo, we'll just log that emails would be sent
      console.log(`Would send payment reminders to ${membersResult.members.length} members for payment due on ${tomorrowStr}`);
      
      // Example of what the email would look like:
      const emailTemplate = (name) => `
  Subject: Payment Reminder: Chit Fund Contribution Due Tomorrow
  
  Dear ${name},
  
  This is a friendly reminder that your weekly chit fund contribution of $156.25 is due tomorrow.
  
  Please ensure your payment is made on time to avoid any delays in the fund distribution.
  
  Thank you for your participation.
  
  Best regards,
  Chit Fund Management Team
      `;
      
      // Log an example email
      if (membersResult.members.length > 0) {
        console.log("Example email:");
        console.log(emailTemplate(membersResult.members[0].name));
      }
      
      return { 
        success: true, 
        message: `Payment reminders would be sent to ${membersResult.members.length} members`
      };
    } catch (error) {
      console.error("Error sending payment reminders:", error);
      return { success: false, error: error.message };
    }
  };
  
  // This function would be set up as a scheduled Cloud Function in a real app
  // For this demo, we'll provide a manual trigger function
  export const triggerPaymentReminders = async () => {
    console.log("Manually triggering payment reminders");
    
    try {
      const result = await sendPaymentReminders();
      console.log("Payment reminder result:", result);
      return result;
    } catch (error) {
      console.error("Error triggering payment reminders:", error);
      return { success: false, error: error.message };
    }
  };
  
  // Cast a vote for the next payout recipient
export const castVote = async (memberId) => {
    console.log(`Casting vote for member: ${memberId || 'CLEAR'}`);
    try {
      // Get the current user
      const user = auth.currentUser;
      
      if (!user) {
        console.error("User must be logged in to vote");
        return { success: false, error: "Authentication required" };
      }
      
      const votesRef = doc(db, 'votes', 'current');
      const votesDoc = await getDoc(votesRef);
      
      if (memberId === null) {
        // Instead of trying to remove the field, we'll use an empty string to represent a cleared vote
        // This satisfies the security rule while still functionally clearing the vote
        if (votesDoc.exists()) {
          await updateDoc(votesRef, {
            [user.uid]: ""  // Use empty string instead of trying to delete
          });
          console.log(`Vote cleared for user: ${user.uid}`);
        } else {
          // If no votes document exists yet, nothing to clear
          console.log("No votes document exists yet");
        }
        
        return { success: true, message: "Vote removed successfully" };
      } else {
        // Normal voting flow remains the same
        if (votesDoc.exists()) {
          await updateDoc(votesRef, {
            [user.uid]: memberId
          });
        } else {
          await setDoc(votesRef, { [user.uid]: memberId });
        }
        
        console.log(`Vote recorded: User ${user.uid} voted for member ${memberId}`);
        return { success: true, message: "Vote recorded successfully" };
      }
    } catch (error) {
      console.error("Error casting vote:", error);
      return { success: false, error: error.message };
    }
  };
  
  // Get all current votes
  export const getVotes = async () => {
    console.log("Fetching votes");
    try {
      const votesRef = doc(db, 'votes', 'current');
      const votesDoc = await getDoc(votesRef);
      
      if (votesDoc.exists()) {
        console.log(`Retrieved votes`);
        return { success: true, votes: votesDoc.data() };
      } else {
        console.log("No votes found");
        return { success: true, votes: {} };
      }
    } catch (error) {
      console.error("Error getting votes:", error);
      return { success: false, error: error.message };
    }
  };
  
  // Select member for next payout (Admin only)
  export const selectNextPayoutMember = async (memberId) => {
    console.log(`Selecting member ${memberId} for next payout`);
    try {
      // Get the current user
      const user = auth.currentUser;
      
      if (!user) {
        return { success: false, error: "Authentication required" };
      }
      
      // Check if user is admin
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const isAdmin = userDoc.exists() && userDoc.data().isAdmin === true;
      
      if (!isAdmin) {
        return { success: false, error: "Only admins can select payout recipients" };
      }
      
      // Check if member exists
      const memberRef = doc(db, 'members', memberId);
      const memberDoc = await getDoc(memberRef);
      
      if (!memberDoc.exists()) {
        return { success: false, error: "Member not found" };
      }
      
      // Get the next available payout month
      const payoutsRef = collection(db, 'payouts');
      const payoutsSnapshot = await getDocs(payoutsRef);
      
      const usedMonths = [];
      payoutsSnapshot.forEach(doc => {
        const month = doc.data().month;
        if (month) usedMonths.push(month);
      });
      
      // Find the next available month (1-9)
      let nextMonth = 1;
      while (usedMonths.includes(nextMonth) && nextMonth <= 9) {
        nextMonth++;
      }
      
      if (nextMonth > 9) {
        return { success: false, error: "All payout months have been allocated" };
      }
      
      // Check if member has already received a payout
      const memberPayoutsQuery = query(
        payoutsRef,
        where("memberId", "==", memberId),
        where("status", "in", ["scheduled", "completed"])
      );
      
      const memberPayoutsSnapshot = await getDocs(memberPayoutsQuery);
      
      if (!memberPayoutsSnapshot.empty) {
        return { success: false, error: "This member has already been allocated a payout" };
      }
      
      // Update the nextPayout document
      const nextPayoutRef = doc(db, 'nextPayout', 'current');
      await setDoc(nextPayoutRef, {
        memberId,
        memberName: memberDoc.data().name,
        month: nextMonth,
        amount: 5625, // Default amount
        status: 'scheduled',
        selectedBy: user.uid,
        selectedAt: serverTimestamp()
      });
      
      // Also add to payouts collection for historical record
      await addDoc(collection(db, 'payouts'), {
        memberId,
        memberName: memberDoc.data().name,
        month: nextMonth,
        amount: 5625,
        status: 'scheduled',
        scheduledBy: user.uid,
        scheduledAt: serverTimestamp()
      });
      
      // Reset votes after selection
      await setDoc(doc(db, 'votes', 'current'), {});
      
      return { 
        success: true, 
        message: "Next payout member selected successfully",
        nextMonth
      };
    } catch (error) {
      console.error("Error selecting next payout member:", error);
      return { success: false, error: error.message };
    }
  };
  
  // Get current next payout information
  export const getNextPayout = async () => {
    console.log("Fetching next payout information");
    try {
      const nextPayoutRef = doc(db, 'nextPayout', 'current');
      const nextPayoutDoc = await getDoc(nextPayoutRef);
      
      if (nextPayoutDoc.exists()) {
        console.log("Retrieved next payout information");
        return { 
          success: true, 
          nextPayout: {
            ...nextPayoutDoc.data(),
            id: nextPayoutDoc.id
          }
        };
      } else {
        console.log("No next payout information found");
        return { success: true, nextPayout: null };
      }
    } catch (error) {
      console.error("Error getting next payout information:", error);
      return { success: false, error: error.message };
    }
  };
  
  // Remove a member (Admin only)
  export const removeMember = async (memberId) => {
    console.log(`Attempting to remove member with ID: ${memberId}`);
    try {
      // Get the current user
      const user = auth.currentUser;
  
      if (!user) {
        console.error("User must be logged in to remove a member");
        return { success: false, error: "Authentication required" };
      }
  
      // Check if the user is an admin
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const isAdmin = userDoc.exists() && userDoc.data().isAdmin === true;
  
      if (!isAdmin) {
        console.error("Only admins can remove members");
        return { success: false, error: "Only administrators can remove members" };
      }
  
      // Check if the member exists
      const memberRef = doc(db, 'members', memberId);
      const memberDoc = await getDoc(memberRef);
  
      if (!memberDoc.exists()) {
        console.error(`Member with ID ${memberId} not found`);
        return { success: false, error: "Member not found" };
      }
  
      const memberData = memberDoc.data();
      console.log(`Found member to remove: ${memberData.name} (${memberData.email})`);
  
      // Check if the member has received a payout
      const payoutsRef = collection(db, 'payouts');
      const q = query(
        payoutsRef,
        where("memberId", "==", memberId),
        where("status", "==", "completed")
      );
  
      const payoutsSnapshot = await getDocs(q);
  
      if (!payoutsSnapshot.empty) {
        console.error("Cannot remove a member who has received a payout");
        return { 
          success: false, 
          error: "Cannot remove a member who has already received a payout. This would affect financial records." 
        };
      }
  
      // Now it's safe to remove the member
      await deleteDoc(memberRef);
      console.log(`Member ${memberId} successfully removed`);
  
      // Log the removal action
      await addDoc(collection(db, 'adminLogs'), {
        action: 'removeMember',
        memberId: memberId,
        memberName: memberData.name,
        memberEmail: memberData.email,
        removedBy: user.uid,
        removedAt: serverTimestamp()
      });
  
      return { success: true, message: "Member removed successfully" };
    } catch (error) {
      console.error(`Error removing member ${memberId}:`, error);
      return { success: false, error: error.message };
    }
  };
  
  // Export Firebase services
  export { auth, db };
  export const getAppAnalytics = () => analytics;