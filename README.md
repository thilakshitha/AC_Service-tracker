# CoolTrack - AC Service Management Application

CoolTrack is a web application for tracking air conditioning service dates and receiving reminders. Built with React, Firebase, and modern web technologies.

## Features

- User authentication with Firebase
- Track multiple AC units with service dates
- Dashboard with upcoming service reminders
- Notification preferences for email and SMS reminders
- Responsive design for desktop and mobile

## Tech Stack

- **Frontend**: React with Vite build tool
- **Styling**: Tailwind CSS with shadcn/ui components
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **Routing**: Wouter for lightweight routing
- **State Management**: React Query for data fetching and cache management

## Installation

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up environment variables (see below)
4. Run the development server with `npm run dev`

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

## Firebase Setup

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password
3. Set up Firestore Database
4. Add your app and get the config values for the environment variables

## Deployment

To deploy the application:

1. Build the production version with `npm run build`
2. Deploy to your preferred hosting service (Firebase Hosting recommended)

## Email Reminders (Production Only)

Email reminders require Firebase Cloud Functions and a paid Firebase plan (Blaze plan). In the demo version, reminders are only logged to the database.

## License

This project is licensed under the MIT License - see the LICENSE file for details.