import React, { useState, useEffect } from 'react';
import { useChitFund } from '../context/ChitFundContext';
import { CheckCircleIcon, CalendarIcon, UserIcon } from '@heroicons/react/solid';
import { castVote, getVotes } from '../firebase';

const PayoutSchedule = () => {
  const { 
    payoutSchedule, 
    recordPayout, 
    members, 
    currentUser, 
    isAdmin 
  } = useChitFund();
  
  const [votes, setVotes] = useState({});
  const [selectedMember, setSelectedMember] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch votes
  useEffect(() => {
    const fetchVotes = async () => {
      try {
        const result = await getVotes();
        if (result.success) {
          setVotes(result.votes || {});
        }
      } catch (err) {
        console.error("Error fetching votes:", err);
      }
    };
    
    fetchVotes();
    
    // Set up a real-time listener for votes
    const intervalId = setInterval(fetchVotes, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);
  
  // Implement a direct way to change votes instead of using the existing castVote function
  const handleVote = async (memberId) => {
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    
    try {
      if (!currentUser) {
        setError('You must be logged in to vote');
        setIsSubmitting(false);
        return;
      }
      
      // Create a temporary local copy to show immediate feedback
      const newVotes = {...votes};
      
      if (memberId === null) {
        // If removing vote, delete the entry
        delete newVotes[currentUser.uid];
        setVotes(newVotes); // Update UI immediately
        
        // Clear your vote (this is now a custom implementation for changing votes)
        try {
          const result = await castVote(null);
          if (result.success) {
            setSuccess('Your vote has been removed');
          } else {
            // If API failed, revert UI
            setVotes(votes);
            setError(result.error || 'Failed to remove vote. Please try again.');
          }
        } catch (err) {
          // If error, revert UI
          setVotes(votes);
          setError('Error removing vote: ' + err.message);
        }
      } else {
        // If casting a new vote, update the entry
        newVotes[currentUser.uid] = memberId;
        setVotes(newVotes); // Update UI immediately
        
        // Cast your vote
        try {
          const result = await castVote(memberId);
          if (result.success) {
            setSuccess('Your vote has been recorded');
          } else {
            // If API failed, revert UI
            setVotes(votes);
            setError(result.error || 'Failed to cast vote. Please try again.');
          }
        } catch (err) {
          // If error, revert UI
          setVotes(votes);
          setError('Error casting vote: ' + err.message);
        }
      }
      
      // Wait a moment then refresh the votes
      setTimeout(async () => {
        const votesResult = await getVotes();
        if (votesResult.success) {
          setVotes(votesResult.votes || {});
        }
      }, 1500);
      
    } catch (err) {
      console.error('Error in vote handling:', err);
      setError('Error processing vote: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle payout
  const handleRecordPayout = async (index) => {
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    
    try {
      if (!isAdmin) {
        setError('Only administrators can record payouts');
        return;
      }
      
      const result = await recordPayout(index);
      
      if (result) {
        setSuccess('Payout recorded successfully');
      } else {
        setError('Failed to record payout');
      }
    } catch (err) {
      setError('Error recording payout: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle selecting the next payout recipient (admin only)
  const handleSelectPayoutRecipient = async () => {
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    
    try {
      if (!isAdmin) {
        setError('Only administrators can select payout recipients');
        return;
      }
      
      if (!selectedMember) {
        setError('Please select a member');
        return;
      }
      
      // In a real implementation, you'd update the payout schedule in the database
      // For this demo, we'll just show a success message
      const memberName = members.find(m => m.id === selectedMember)?.name || 'Selected member';
      setSuccess(`${memberName} has been selected for the next payout`);
      
      // Reset selection
      setSelectedMember('');
    } catch (err) {
      setError('Error selecting payout recipient: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
// Calculate vote counts for each member
const getVoteCount = (memberId) => {
  return Object.values(votes).filter(v => v === memberId && v !== "").length;
};

// Check if current user has voted
const hasVoted = () => {
  return currentUser && votes[currentUser.uid] !== undefined && votes[currentUser.uid] !== "";
};
  
  // Get member who current user voted for
  const getCurrentVote = () => {
    if (!currentUser) return null;
    const votedMemberId = votes[currentUser.uid];
    return members.find(m => m.id === votedMemberId);
  };
  
  // Get eligible members (those who haven't received a payout yet)
  const getEligibleMembers = () => {
    return members.filter(member => 
      !payoutSchedule.some(payout => 
        payout.memberId === member.id && payout.paid
      )
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Payout Schedule</h3>
          <p className="mt-1 text-sm text-gray-500">
            Each member receives $5,625 once during the cycle. Members vote on who receives the next payout.
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Next payout selection - Admin only */}
        {isAdmin && (
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Select Next Payout Recipient</h4>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-grow">
                <select
                  id="member-select"
                  name="member-select"
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  disabled={isSubmitting}
                >
                  <option value="">Select a member</option>
                  {getEligibleMembers().map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} - {getVoteCount(member.id)} votes
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleSelectPayoutRecipient}
                  disabled={isSubmitting || !selectedMember}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                    isSubmitting || !selectedMember
                      ? 'bg-primary-300 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
                >
                  Confirm Selection
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Voting section - For all members */}
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            {hasVoted()
              ? `You have voted for ${getCurrentVote()?.name || 'a member'}`
              : 'Vote for Next Payout'}
          </h4>
          {!hasVoted() ? (
            <div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {getEligibleMembers().map((member) => (
                  <div
                    key={member.id}
                    className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                  >
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary-100">
                        <span className="text-sm font-medium leading-none text-primary-700">
                          {member.name && typeof member.name === 'string' ? member.name.charAt(0) : 'U'}
                        </span>
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="focus:outline-none">
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-500 truncate">{getVoteCount(member.id)} votes</p>
                        {member.uid === currentUser?.uid && (
                          <p className="text-xs text-primary-600 font-medium">(Your Account)</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleVote(member.id)}
                      disabled={isSubmitting}
                      className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Processing...' : 'Vote'}
                    </button>
                  </div>
                ))}
              </div>
              {!currentUser && (
                <p className="mt-4 text-sm text-red-500">
                  You must be logged in to vote.
                </p>
              )}
            </div>
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <button
                  onClick={() => handleVote(null)} // Passing null to clear the vote
                  disabled={isSubmitting}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Processing...' : 'Clear My Vote'}
                </button>
                <p className="mt-1 text-sm text-gray-500">
                  If you want to vote for someone else, first clear your current vote, then select a new member.
                </p>
              </div>
              
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">You can vote for someone else:</h5>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {getEligibleMembers()
                    .filter(m => m.id !== votes[currentUser.uid])
                    .map((member) => (
                      <div
                        key={member.id}
                        className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary-100">
                            <span className="text-sm font-medium leading-none text-primary-700">
                              {member.name && typeof member.name === 'string' ? member.name.charAt(0) : 'U'}
                            </span>
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="focus:outline-none">
                            <p className="text-sm font-medium text-gray-900">{member.name}</p>
                            <p className="text-sm text-gray-500 truncate">{getVoteCount(member.id)} votes</p>
                            {member.uid === currentUser?.uid && (
                              <p className="text-xs text-primary-600 font-medium">(Your Account)</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleVote(member.id)}
                          disabled={isSubmitting}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? 'Processing...' : 'Vote'}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-200">
          <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
            <span className="text-xs font-medium text-gray-500">
              Total payout amount: $5,625 per member
            </span>
          </div>
          
          <ul className="divide-y divide-gray-200">
            {payoutSchedule.map((payout, index) => (
              <li key={`${payout.memberId}-${payout.payoutMonth}`}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {payout.paid ? (
                          <CheckCircleIcon className="h-6 w-6 text-green-500" aria-hidden="true" />
                        ) : (
                          <CalendarIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {payout.memberName}
                          {/* Indicate if this payout is for the current user */}
                          {members.find(m => m.id === payout.memberId)?.uid === currentUser?.uid && (
                            <span className="ml-2 text-xs text-primary-600 font-medium">(Your Account)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          Month {payout.payoutMonth} Payout
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        ${payout.amount.toFixed(2)}
                      </div>
                      {isAdmin && !payout.paid && (
                        <button
                          onClick={() => handleRecordPayout(index)}
                          disabled={isSubmitting}
                          className={`ml-4 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 ${
                            isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-200'
                          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
                        >
                          Mark as Paid
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-primary-100">
                        <div
                          style={{ width: payout.paid ? '100%' : '0%' }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500 transition-all duration-500"
                        ></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block text-primary-600">
                            {payout.paid ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold inline-block text-primary-600">
                            {payout.paid ? '100%' : '0%'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Explainer Card */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">How Payouts Work</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="text-sm text-gray-500">
            <p className="mb-3">
              Each month, one member receives a payout of <span className="font-semibold">$5,625</span>.
            </p>
            <p className="mb-3">
              This is the accumulated value of <span className="font-semibold">9 members</span> contributing 
              <span className="font-semibold"> $156.25 weekly</span> for approximately <span className="font-semibold">4 weeks</span>.
            </p>
            <p className="mb-3">
              <span className="font-semibold">Voting system:</span> Members can vote for who should receive the next payout. The administrator makes the final selection based on votes and other factors.
            </p>
            <p>
              This is a not-for-profit chit fund among colleagues, designed to help each member receive a lump sum once during the cycle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayoutSchedule;