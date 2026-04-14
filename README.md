# FlowForge

A production-ready, cross-platform productivity application built with React, Vite, TypeScript, and Firebase.

## Features
- **Offline-First**: Uses IndexedDB to queue actions when offline and syncs with Firestore when back online.
- **Device Linking**: Sync your tasks across devices using a 12-character sync ID or QR code.
- **Natural Language Quick Add**: Add tasks like "Review PR tomorrow at 10am" using `chrono-node`.
- **Pomodoro Timer**: Built-in focus timer with beautiful SVG animations.
- **Asymmetric Design**: Sleek, modern UI powered by Tailwind CSS and Framer Motion.

## Firebase Setup Instructions

Because this app uses Firebase Authentication, Firestore, and Storage, you need to configure your own Firebase project.

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Enable **Firestore Database** and **Firebase Authentication** (Google Sign-In provider).
3. Register a web app in your Firebase project settings to get your configuration object.
4. Open `firebase-applet-config.json` in the root of this project and replace the placeholder values with your actual Firebase config:

```json
{
  "apiKey": "AIzaSy...",
  "authDomain": "your-app.firebaseapp.com",
  "projectId": "your-app-id",
  "storageBucket": "your-app.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "1:123456789:web:abcdef",
  "measurementId": "G-ABCDEF"
}
```

5. Deploy the security rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules,storage
```

## Development
Run the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```
