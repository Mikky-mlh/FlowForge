<div align="center">

# 🚀 FlowForge

### Your Free, All-in-One Productivity Companion

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_App-10b981?style=for-the-badge)](https://flowforge-f5e99.web.app)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Made with React](https://img.shields.io/badge/Made_with-React_19-61dafb?style=for-the-badge&logo=react)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Powered_by-Firebase-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com)

<a href="https://flowforge-f5e99.web.app">
  <img src="public/icon-512.png" alt="FlowForge Logo" width="120" height="120">
</a>

**[✨ Try FlowForge Now](https://flowforge-f5e99.web.app)** • **[📖 Documentation](#features)** • **[🐛 Report Bug](https://github.com/Yuvraj-Sarathe/FlowForge/issues)**

---

</div>

## 💡 Why FlowForge?

> *"I searched for a free To-Do and routine manager app for a long time online but I could not find it! Either they lacked what I wanted them to be able to do or they just charged money for the things I wanted. No single 100% free app with a rather simple UI/UX, so I made one for myself that satisfies my needs!"*

**FlowForge is:**
- ✅ **100% Free** - No premium features, no paywalls, no subscriptions
- ✅ **Simple & Clean** - Intuitive UI/UX that just works
- ✅ **Feature-Complete** - Everything you need, nothing you don't
- ✅ **Privacy-Focused** - Your data, your control
- ✅ **Cross-Platform** - Works on Android, iOS, Windows, Mac, Linux

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📋 Task Management
- ✅ Create, edit, delete tasks
- ✅ Subtasks & checklists
- ✅ Priority levels (Low, Medium, High)
- ✅ Tags & categories
- ✅ Due dates & reminders
- ✅ Natural language input

### ⏱️ Pomodoro Timer
- ✅ 25-minute focus sessions
- ✅ 5-minute breaks
- ✅ Visual progress tracking
- ✅ Customizable durations

### 📅 Calendar & Planning
- ✅ Calendar view
- ✅ Kanban board
- ✅ Habit tracking
- ✅ Routine management

</td>
<td width="50%">

### 🔄 Sync & Offline
- ✅ Cross-device sync
- ✅ Offline-first architecture
- ✅ QR code device linking
- ✅ Auto-sync when online

### 🎨 Customization
- ✅ Dark/Light themes
- ✅ Custom color schemes
- ✅ Background images
- ✅ Glassmorphism effects

### 🔐 Authentication
- ✅ Google Sign-In
- ✅ Anonymous mode
- ✅ Secure data storage

</td>
</tr>
</table>

---

## 💻 Technology Stack

<div align="center">

| Category | Technology |
|----------|------------|
| 🏛️ **Frontend** | React 19, TypeScript, Tailwind CSS 4 |
| ⚡ **Build Tool** | Vite 6.2 |
| 🔥 **Backend** | Firebase (Auth, Firestore, Hosting) |
| 🎨 **UI/UX** | Framer Motion, Lucide Icons |
| 💾 **Storage** | IndexedDB (idb), Firestore |
| 📦 **PWA** | Vite PWA Plugin, Workbox |

</div>

---

## 🚀 Quick Start

### 📱 Install as App (Recommended)

**Android:**
1. Visit [flowforge-f5e99.web.app](https://flowforge-f5e99.web.app)
2. Tap menu (⋮) → "Install app"
3. Done! App on your home screen

**Desktop (Chrome/Edge):**
1. Visit [flowforge-f5e99.web.app](https://flowforge-f5e99.web.app)
2. Click install icon (⊕) in address bar
3. Click "Install"

**iOS (Safari):**
1. Visit [flowforge-f5e99.web.app](https://flowforge-f5e99.web.app)
2. Tap Share → "Add to Home Screen"

### 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- npm 9+
- Firebase project (see setup below)

### Installation

```bash
# Clone and install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm run build
```

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project
2. Enable **Firestore Database** and **Firebase Authentication** (Google Sign-In)
3. Register a web app to get configuration
4. Replace values in `firebase-applet-config.json`:

```json
{
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_PROJECT.firebaseapp.com",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_PROJECT.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "1:123456789:web:abc123",
  "measurementId": "G-ABCDEF"
}
```

5. Deploy security rules:
```bash
firebase deploy --only firestore:rules,storage
```

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ErrorBoundary.tsx
│   ├── Layout.tsx
│   ├── PomodoroTimer.tsx
│   ├── QuickAdd.tsx
│   └── TaskDetailModal.tsx
├── contexts/           # React Context providers
│   ├── AuthContext.tsx
│   ├── TaskContext.tsx
│   └── ThemeContext.tsx
├── lib/              # Utilities
│   ├── firestore-errors.ts
│   ├── googleApi.ts
│   ├── idb.ts
│   └── utils.ts
├── pages/            # Route pages
│   ├── Dashboard.tsx
│   ├── LinkDevice.tsx
│   └── Settings.tsx
├── App.tsx
├── main.tsx
├── firebase.ts
└── index.css
```

## Routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | Dashboard | Main task list view |
| `/timer` | PomodoroTimer | Focus/break timer |
| `/link` | LinkDevice | Device linking |
| `/settings` | Settings | Theme customization |

## API Reference

### Task Model

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
  tags: string[];
  dueDate?: string;
  duration?: number;
  syncId: string;
  createdAt: number;
  subtasks?: Subtask[];
  calendarEventId?: string;
  googleTaskId?: string;
  googleTaskListId?: string;
}
```

### Quick Add Syntax

```
# Tags: #work #shopping
!priority: !high !medium !low
Dates: tomorrow, next friday, at 5pm, on Jan 15
```

### Firestore Collections

- `tasks` - Task documents (keyed by task ID)
- `settings` - Theme settings (keyed by syncId)
- `users` - User data (keyed by user UID)

## Known Issues

- Error handling throws instead of graceful recovery
- IndexedDB operations have no error handling
- Device linking saves without Firestore verification
- No test coverage

See `.planning/codebase/CONCERNS.md` for full details.

## Development Commands

```bash
npm run dev      # Development server (port 3000)
npm run build   # Production build
npm run preview # Preview production build
npm run lint    # Type check only
npm run clean   # Remove dist folder
```

## Browser Support

- Chrome 111+
- Safari 16.4+
- Firefox 128+
- Edge 111+

Requires IndexedDB support (excludes private browsing in some browsers).

## Resources

- [React 19 Documentation](https://react.dev)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com)
- [chrono-node](https://github.com/wanasit/chrono-node)

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- 🐛 Report bugs
- 💡 Suggest features
- 🛠️ Submit pull requests

---

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

---

## 👤 Author

**Yuvraj Sarathe**

- GitHub: [@Yuvraj-Sarathe](https://github.com/Yuvraj-Sarathe)
- Project: [FlowForge](https://github.com/Yuvraj-Sarathe/FlowForge)

---

<div align="center">

### ⭐ If you find FlowForge useful, give it a star!

**[🚀 Try FlowForge Now](https://flowforge-f5e99.web.app)**

Made with ❤️ and lots of ☕

</div>