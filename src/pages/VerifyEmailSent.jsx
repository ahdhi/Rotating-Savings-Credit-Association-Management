import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const VerifyEmailSent = () => {
  const location = useLocation();
  const email = location.state?.email || 'your email';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Verification Email Sent</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please check your inbox to complete registration
          </p>
        </div>
        
        <div className="bg-white p-6 shadow rounded-lg">
          <div className="flex flex-col items-center">
            <svg className="h-16 w-16 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            
            <h3 className="mt-4 text-lg font-medium text-gray-900">Verification Email Sent!</h3>
            
            <p className="mt-2 text-sm text-gray-600 text-center">
              We've sent a verification email to <span className="font-semibold">{email}</span>. 
              Please check your inbox and click the verification link to activate your account.
            </p>
            
            <div className="mt-6 space-y-4 w-full">
              <div className="rounded-md bg-yellow-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Important notes:</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>The verification link will expire in 24 hours</li>
                        <li>Check your spam folder if you don't see the email</li>
                        <li>Make sure to use the same device/browser to complete the process</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600">Didn't receive the email?</p>
                <button
                  type="button"
                  className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  Resend verification email
                </button>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <Link
                  to="/login"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailSent;