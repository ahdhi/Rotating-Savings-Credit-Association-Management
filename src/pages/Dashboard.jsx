import React from 'react';
import { useChitFund } from '../context/ChitFundContext';
import { 
  CashIcon, 
  UserGroupIcon, 
  CalendarIcon, 
  CheckCircleIcon 
} from '@heroicons/react/outline';

const Dashboard = () => {
  const { 
    members, 
    calculateTotalCollected, 
    calculateMemberContributions, 
    getUpcomingPayouts 
  } = useChitFund();
  
  const totalCollected = calculateTotalCollected();
  const memberContributions = calculateMemberContributions();
  const upcomingPayouts = getUpcomingPayouts();
  
  // Calculate completion percentage
  const totalExpected = 9 * 36 * 156.25; // 9 members * 36 weeks * $156.25
  const completionPercentage = (totalCollected / totalExpected) * 100;
  
  // Find the next payout
  const nextPayout = upcomingPayouts.length > 0 ? upcomingPayouts[0] : null;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Fund */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CashIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Collected</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">${totalCollected.toFixed(2)}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <div className="font-medium text-primary-700 truncate">
                {completionPercentage.toFixed(1)}% Complete
              </div>
            </div>
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Members</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{members.length}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <a href="/payment-tracker" className="font-medium text-primary-700 hover:text-primary-900">
                View all payments
              </a>
            </div>
          </div>
        </div>

        {/* Next Payment Due */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Next Payment Due</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">This Friday</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <div className="font-medium text-primary-700 truncate">
                $156.25 per member
              </div>
            </div>
          </div>
        </div>

        {/* Next Payout */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Next Payout</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {nextPayout ? nextPayout.memberName : 'N/A'}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <a href="/payout-schedule" className="font-medium text-primary-700 hover:text-primary-900">
                View payout schedule
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Member Contributions Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Member Contributions</h3>
          <p className="mt-1 text-sm text-gray-500">
            Summary of all member contributions to date.
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {members.map((member) => (
            <li key={member.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-100">
                        <span className="text-sm font-medium leading-none text-primary-700">
                          {member.name.charAt(0)}
                        </span>
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900">
                      ${memberContributions[member.id].toFixed(2)}
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;