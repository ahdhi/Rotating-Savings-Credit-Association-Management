import React, { useState } from 'react';
import { triggerPaymentReminders } from '../firebase';

const EmailReminderControl = () => {
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null);
  
  const handleSendReminders = async () => {
    setIsSending(true);
    setResult(null);
    
    try {
      const response = await triggerPaymentReminders();
      setResult({
        success: response.success,
        message: response.message || 'Reminders sent successfully',
        error: response.error
      });
    } catch (error) {
      setResult({
        success: false,
        error: error.message || 'Failed to send reminders'
      });
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Payment Reminders
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>
            Send payment reminder emails to all members. This should typically be done one day before the payment due date.
          </p>
        </div>
        
        {result && (
          <div className={`mt-3 p-3 rounded-md ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
              {result.success ? result.message : result.error}
            </p>
          </div>
        )}
        
        <div className="mt-5">
          <button
            type="button"
            onClick={handleSendReminders}
            disabled={isSending}
            className={`inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-white ${
              isSending 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-primary-600 hover:bg-primary-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm`}
          >
            {isSending ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </>
            ) : 'Send Payment Reminders'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailReminderControl;