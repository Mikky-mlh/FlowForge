# FlowForge

A production-ready, cross-platform productivity application built with React 19, Vite, TypeScript, and Firebase. Designed for individuals who need to organize tasks across multiple devices with offline-first capabilities.

## Features

### Core Functionality
- **Task Management**: Full CRUD with subtasks, priorities, tags, and due dates
- **Offline-First Sync**: Uses IndexedDB to queue actions when offline, syncs with Firestore when back online
- **Device Linking**: Sync tasks across devices using a 12-character sync ID or QR code
- **Natural Language Quick Add**: Add tasks like "Review PR tomorrow at 10am #work !high" using chrono-node
- **Pomodoro Timer**: Built-in focus timer with SVG animations (25min focus / 5min break)
- **Theme Customization**: 9 customizable color variables with background image support

### Integrations
- **Google Calendar**: Sync tasks with due dates to Google Calendar
- **Google Tasks**: Import tasks from Google Tasks
- **Calendar Events**: Import upcoming events as tasks

### Architecture
- **State Management**: React Context API (Auth, Task, Theme contexts)
- **Persistence**: Firebase Firestore with IndexedDB persistence enabled
- **Offline Queue**: IndexedDB via idb library for sync queue
- **Authentication**: Google Sign-In via Firebase Auth

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| UI Framework | React | 19.0.0 |
| Build Tool | Vite | 6.2.0 |
| Language | TypeScript | ~5.8.2 |
| Routing | React Router DOM | 7.14.1 |
| Styling | Tailwind CSS | 4.1.14 |
| Animations | Framer Motion | 12.38.0 |
| Backend | Firebase | 12.12.0 |
| IndexedDB | IDB | 8.0.3 |
| Date Parsing | chrono-node | 2.9.0 |

## Quick Start

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

Built with React 19 + Firebase + Tailwind CSS v4