# Chattr — Modern Real-Time Messaging PWA

**Chattr** is a production-ready, real-time messaging Progressive Web App built with React, TypeScript, Tailwind CSS, and Firebase (Authentication, Cloud Firestore, and Firebase Storage).

---

## Features

- **Real-Time 1-on-1 & Group Chat**: Instant message dispatch, delivery, and read receipts powered by Firestore real-time snapshot listeners.
- **Duplicate Conversation Prevention**: Deterministic 1-on-1 conversation identifiers prevent duplicate threads between the same users.
- **Rich Message Types**:
  - Text messaging with markdown and auto-grow input
  - Image and document file sharing with upload progress tracking
  - Voice notes recording via the browser MediaRecorder API with audio wave visualizer
  - System activity messages
- **Message Actions**:
  - Message editing (original message owner only)
  - Message deletion ("Delete for me" and "Delete for everyone")
  - Message replies with quote reference and jump-to-message scrolling
  - Emoji reactions with live counter pills
  - Message copying to clipboard
- **Presence & Ephemeral Indicators**:
  - Live online/offline presence tracking with automatic visibility & disconnect handlers
  - Ephemeral typing indicators ("X is typing...")
  - Last-seen timestamp formatting
- **User Profile System**:
  - Unique username validation and enforcement
  - Display name, custom bio, status message presets
  - Avatar image uploads with fallback initials and deterministic color gradients
- **Group Management**:
  - Create groups with name, description, and group photo
  - Add/remove members, promote/demote administrators
- **Privacy & Safety Controls**:
  - User blocking
  - User and message moderation reporting
  - Visibility toggles for online presence and read receipts
- **Protected Admin Panel**:
  - Accessible to authorized administrator roles (`gitdev8@gmail.com`)
  - Live analytics: Total users, active connections, total conversations, open reports
  - User account moderation: disable or restore accounts
  - Moderation report review and resolution
- **PWA & Offline Resilience**:
  - Installable PWA with Web App Manifest, service worker asset precaching, and compliant icons
  - In-app install banner with guided setup for iOS Safari
  - Offline connectivity banner and cached state handling

---

## 1. Firebase Project Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and give it a name (e.g., `chattr-messenger`).
3. (Optional) Disable Google Analytics or enable it as desired.
4. Click **Create Project**.

---

## 2. Enable Firebase Authentication

1. In your Firebase Console, navigate to **Build** > **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab:
   - Click **Email/Password**, toggle **Enable**, and click **Save**.
   - Click **Add new provider** > **Google**, toggle **Enable**, select your project support email, and click **Save**.

---

## 3. Enable Cloud Firestore

1. In the console left sidebar, navigate to **Build** > **Firestore Database**.
2. Click **Create Database**.
3. Select your Cloud Firestore location (e.g., `nam5` or `eur3`).
4. Choose **Start in production mode** (our hardened `firestore.rules` will protect the data).
5. Click **Create**.

---

## 4. Enable Firebase Storage

1. Navigate to **Build** > **Storage**.
2. Click **Get Started**.
3. Select your storage bucket location.
4. Click **Done**.

---

## 5. Environment Variables & App Configuration

For local development or deployment outside AI Studio, copy `.env.example` to `.env.local` and add your Firebase configuration credentials:

```bash
cp .env.example .env.local
```

Fill in the values found in your Firebase Console under **Project Settings** > **General** > **Your apps** > **Web app**:

```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```

In AI Studio, configuration is loaded automatically from `firebase-applet-config.json`.

---

## 6. Deploy Firestore Security Rules

Deploy the included hardened security rules using the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add <your-project-id>
firebase deploy --only firestore:rules
```

Our rules enforce:
- Authenticated user checks on all operations
- Users can only edit or delete their own messages
- Group admins have exclusive member moderation rights
- Default deny on unlisted paths
- Reports and admin records can only be read/written by verified administrators

---

## 7. Deploy Storage Security Rules

Deploy the storage security rules located in `storage.rules`:

```bash
firebase deploy --only storage
```

Rules restrict avatars to 10MB and media attachments to 50MB, requiring valid user authentication.

---

## 8. Run the Application Locally

```bash
# Install dependencies
npm install

# Start Vite dev server on port 3000
npm run dev
```

Open your browser to `http://localhost:3000`.

---

## 9. Build the PWA

```bash
# Production bundle
npm run build

# Preview production build locally
npm run preview
```

The generated files in `dist/` include the service worker, Web App Manifest, pre-cached assets, and application bundles.

---

## 10. Deploy to Vercel

1. Push your repository to GitHub or GitLab.
2. In [Vercel](https://vercel.com/), click **New Project** and import the repository.
3. In the project settings:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add your Firebase environment variables under the **Environment Variables** tab.
5. Click **Deploy**.
