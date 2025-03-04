# Rotating Savings and Credit Association (ROSCA) Management

A comprehensive web application for managing a Rotating Savings and Credit Association, also known as a Chit Fund. This platform helps members contribute regular payments, track contributions, manage payouts, and vote on fund recipients.

## Overview

The ROSCA Management system is built to streamline the administration of chit funds, improving transparency and reducing the manual work involved in tracking payments, approvals, and payouts. It's designed for both administrators and regular members with appropriate permission levels.

### What is a ROSCA/Chit Fund?

A Rotating Savings and Credit Association (ROSCA) is a group of individuals who contribute a fixed amount to a common fund at regular intervals. The accumulated funds are given to a single member of the group in each cycle, selected through a voting process. This continues until all members have received a payout.

## Features

### User Management
- **User Registration**: Secure signup with email verification
- **Authentication**: Email and password-based login system
- **Role-based Access**: Admin and member privileges
- **Member Management**: Add, view, and manage members

### Payment System
- **Regular Contributions**: Track weekly payments of $156.25 from each member
- **Payment Approvals**: Admin approval for non-admin payment submissions
- **Payment History**: Comprehensive payment tracking with status indicators
- **Email Reminders**: Notification system for upcoming payment due dates

### Payout Management
- **Member Voting**: Democratic system for selecting next payout recipient
- **Payout Schedule**: Visual representation of past and upcoming payouts
- **Fund Transparency**: Clear view of total collected funds and distributions

### Administrative Features
- **Dashboard**: Overview of fund statistics and member contributions
- **Pending Approvals**: Centralized view of payments requiring approval
- **Member Administration**: Tools for adding and removing members
- **Settings**: Application configuration options

## Tech Stack

- **Frontend**: React 19.0.0 with React Router 7.2.0
- **UI Framework**: Tailwind CSS with Heroicons
- **Backend**: Firebase (Authentication, Firestore, Security Rules)
- **State Management**: React Context API
- **Forms & Validation**: Custom form handling
- **Notifications**: Email service integration

## Installation

### Prerequisites
- Node.js (16.x or higher)
- npm or yarn
- Firebase account

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/ahdhi/rosca-management.git
   cd rosca-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication with Email/Password
   - Create a Firestore database
   - Set up Security Rules (see Security section below)
   - Update the Firebase configuration in `src/firebase.js`

4. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

## Usage Guide

### Regular Member Workflow

1. **Register an account** and verify your email
2. **Login** to access your dashboard
3. **Make weekly contributions** through the Payment Tracker
4. **Vote** for the next member to receive the payout
5. **Track** your contribution history and upcoming payout schedule

### Administrator Workflow

1. **Review pending payments** and approve or reject them
2. **Manage members** through the Settings panel
3. **Send payment reminders** to all members
4. **Record payouts** to members according to the schedule
5. **Monitor fund health** through the dashboard statistics

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── Layout.jsx     # Main layout with sidebar and navbar
│   ├── MemberList.jsx # Member listing component
│   ├── Navbar.jsx     # Top navigation bar
│   └── Sidebar.jsx    # Side navigation menu
├── context/
│   └── ChitFundContext.js # Global state management
├── pages/
│   ├── Dashboard.jsx       # Main dashboard view
│   ├── Login.jsx           # Authentication views
│   ├── PaymentTracker.jsx  # Payment management
│   ├── PayoutSchedule.jsx  # Payout scheduling and voting
│   └── Settings.jsx        # Application settings
├── styles/
│   └── global.css          # Global styles and Tailwind configuration
├── firebase.js             # Firebase configuration and utilities
└── App.js                  # Main application component
```

## Firestore Data Model

### Collections:
- **users**: Authentication and profile information
- **members**: Member details and contribution tracking
- **payments**: Individual payment records with approval status
- **payouts**: Payout history and scheduling
- **notifications**: System notifications including payment reminders
- **votes**: Member votes for next payout recipient

## Security

The application implements Firebase Security Rules to ensure:
- Users can only access their own data
- Only administrators can approve payments and manage members
- Secure document access patterns for all collections
- Protection against unauthorized modifications

### Sample Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions for common authorization checks
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // User profiles and their subcollections
    match /users/{userId} {
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow read: if request.auth.uid == userId || isAdmin();
      allow update: if request.auth.uid == userId || isAdmin();
      allow delete: if isAdmin();
    }
    
    // Members collection
    match /members/{memberId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }
    
    // Additional rules for payments, payouts, etc.
  }
}
```

## Deployment

The application is configured for Firebase Hosting deployment:

1. **Build the application**
   ```bash
   npm run build
   # or
   yarn build
   ```

2. **Install Firebase CLI** (if not already installed)
   ```bash
   npm install -g firebase-tools
   ```

3. **Login to Firebase**
   ```bash
   firebase login
   ```

4. **Initialize Firebase** (if not already done)
   ```bash
   firebase init
   ```
   - Select Hosting and other required services
   - Choose your Firebase project
   - Set the public directory to `build`
   - Configure as a single-page app

5. **Deploy the application**
   ```bash
   firebase deploy
   ```

## Admin Setup

After deployment, to create the first admin user:

1. Register a regular user through the application
2. Go to Firebase Console > Firestore Database
3. Navigate to the `users` collection
4. Find the document for your user
5. Add the field `isAdmin: true`
6. This user can now manage other users and approve/reject transactions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Project Link: [https://github.com/ahdhi/rosca-management](https://github.com/ahdhi/rosca-management)

---

Built with ❤️ for better community savings management.