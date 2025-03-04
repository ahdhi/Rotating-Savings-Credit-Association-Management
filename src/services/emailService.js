/**
 * Email Service
 * 
 * In a production environment, this would connect to a real email service provider
 * like SendGrid, Mailgun, or AWS SES to send actual emails.
 * 
 * For this demo, we'll simulate email sending with console logs and promises.
 */

/**
 * Sends a verification email to the user
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @param {string} token - Verification token
 * @returns {Promise} - Resolves when the email is "sent"
 */
export const sendVerificationEmail = (email, name, token) => {
    console.log(`[EMAIL SERVICE] Sending verification email to ${email}`);
    
    // Simulate the email content
    const emailContent = `
      Hello ${name},
      
      Thank you for registering for the Chit Fund Management System.
      
      Please verify your email address by clicking on the link below:
      
      https://btenchits.netlify.app/verify-email?token=${token}&email=${encodeURIComponent(email)}
      
      This link will expire in 24 hours.
      
      If you did not register for an account, please ignore this email.
      
      Best regards,
      Chit Fund Management Team
    `;
    
    console.log('[EMAIL SERVICE] Email content:');
    console.log(emailContent);
    
    // Simulate network delay
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[EMAIL SERVICE] Verification email sent to ${email}`);
        resolve({ success: true });
      }, 1500);
    });
  };
  
  /**
   * Sends a welcome email to the user after verification
   * @param {string} email - User's email address
   * @param {string} name - User's name
   * @returns {Promise} - Resolves when the email is "sent"
   */
  export const sendWelcomeEmail = (email, name) => {
    console.log(`[EMAIL SERVICE] Sending welcome email to ${email}`);
    
    // Simulate the email content
    const emailContent = `
      Hello ${name},
      
      Welcome to the Chit Fund Management System!
      
      Your email has been verified and your account is now active.
      
      You can now log in and start tracking your chit fund contributions.
      
      Best regards,
      Chit Fund Management Team
    `;
    
    console.log('[EMAIL SERVICE] Email content:');
    console.log(emailContent);
    
    // Simulate network delay
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[EMAIL SERVICE] Welcome email sent to ${email}`);
        resolve({ success: true });
      }, 1000);
    });
  };
  
  /**
   * Sends a payment reminder email to the user
   * @param {string} email - User's email address
   * @param {string} name - User's name
   * @param {string} paymentDate - Due date for payment
   * @param {number} amount - Payment amount
   * @returns {Promise} - Resolves when the email is "sent"
   */
  export const sendPaymentReminderEmail = (email, name, paymentDate, amount) => {
    console.log(`[EMAIL SERVICE] Sending payment reminder to ${email}`);
    
    // Simulate the email content
    const emailContent = `
      Hello ${name},
      
      This is a reminder that your next chit fund payment of $${amount} is due on ${paymentDate}.
      
      Please ensure your payment is made on time to avoid any delays in the fund distribution.
      
      Best regards,
      Chit Fund Management Team
    `;
    
    console.log('[EMAIL SERVICE] Email content:');
    console.log(emailContent);
    
    // Simulate network delay
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[EMAIL SERVICE] Payment reminder sent to ${email}`);
        resolve({ success: true });
      }, 1000);
    });
  };
  
  /**
   * Sends a payout notification email to the user
   * @param {string} email - User's email address
   * @param {string} name - User's name
   * @param {number} amount - Payout amount
   * @returns {Promise} - Resolves when the email is "sent"
   */
  export const sendPayoutNotificationEmail = (email, name, amount) => {
    console.log(`[EMAIL SERVICE] Sending payout notification to ${email}`);
    
    // Simulate the email content
    const emailContent = `
      Hello ${name},
      
      Good news! Your chit fund payout of $${amount} has been processed.
      
      You should receive the funds in your account within the next 1-2 business days.
      
      Best regards,
      Chit Fund Management Team
    `;
    
    console.log('[EMAIL SERVICE] Email content:');
    console.log(emailContent);
    
    // Simulate network delay
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[EMAIL SERVICE] Payout notification sent to ${email}`);
        resolve({ success: true });
      }, 1000);
    });
  };