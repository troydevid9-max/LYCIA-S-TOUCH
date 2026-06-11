# 💄 Lycia's Touch – Luxury Makeup Artist Website

A production-ready, fully-featured luxury beauty website built with **HTML, CSS, JavaScript** and **Firebase (Firestore + Storage)**.

---

## 📁 Folder Structure

```
lycias-touch/
├── index.html                  ← Main website
├── firebase/
│   └── config.js               ← Firebase configuration (edit this!)
├── css/
│   ├── variables.css           ← Design tokens, buttons, shared styles
│   ├── nav.css                 ← Navigation & announcement bar
│   └── sections.css            ← All section-specific styles
├── js/
│   ├── main.js                 ← App entry point (initialises everything)
│   ├── utils.js                ← Scroll reveal, counters, modals, Firebase helpers
│   ├── booking.js              ← Calendar, intake form, group booking, testimonial submit
│   ├── gallery.js              ← Portfolio, reels, lookbook, before/after, testimonials
│   └── whatsapp.js             ← WhatsApp message templates
├── admin/
│   ├── index.html              ← Admin dashboard (password protected)
│   ├── css/
│   │   └── admin.css           ← Admin-specific styles
│   └── js/
│       └── admin.js            ← All admin logic (Firebase CRUD)
└── images/
    └── (place your images here)
```

---

## 🚀 Setup Instructions

### Step 1 – Firebase Project Setup

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → name it `lycias-touch`
3. Disable Google Analytics (optional) → **Create project**

### Step 2 – Enable Firestore Database

1. In your Firebase project → **Firestore Database** → **Create database**
2. Choose **"Start in test mode"** (you can secure it later)
3. Pick a server location (e.g. `europe-west1` or `us-central1`)

### Step 3 – Enable Firebase Storage

1. In your Firebase project → **Storage** → **Get started**
2. Choose **"Start in test mode"**
3. Select a location → **Done**

### Step 4 – Get Your Firebase Config

1. Go to **Project Settings** (gear icon) → **Your apps** → **Web app** (`</>`)
2. Register app name: `lycias-touch-web`
3. Copy the `firebaseConfig` object

### Step 5 – Update `firebase/config.js`

Open `firebase/config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 6 – Firestore Security Rules (Recommended)

In Firebase Console → Firestore → **Rules**, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public can read approved testimonials and portfolio
    match /testimonials/{id} {
      allow read: if resource.data.approved == true;
      allow create: if true;
    }
    match /portfolio/{id} {
      allow read: if true;
    }
    match /reels/{id} {
      allow read: if true;
    }
    // Public can write bookings, intake forms, newsletter
    match /bookings/{id} {
      allow create: if true;
      allow read, update, delete: if false; // admin only via console
    }
    match /intakeForms/{id} {
      allow create: if true;
    }
    match /newsletter/{id} {
      allow create: if true;
    }
  }
}
```

### Step 7 – Storage Security Rules

In Firebase Console → Storage → **Rules**, paste:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /portfolio/{allPaths=**} {
      allow read: if true;
      allow write: if false; // admin only via local upload
    }
    match /reels/{allPaths=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

> **Note:** For admin uploads to work in production, you'll need to set up Firebase Auth or use the Firebase Admin SDK on a backend. For now, use **test mode** during development.

---

## 🔑 Admin Dashboard

**Access:** Go to `yoursite.com/admin/` or open `admin/index.html`

**Default Password:** `lycias2025!`

> ⚠️ **IMPORTANT:** Change the password before going live!
> Open `admin/js/admin.js` and update line 7:
> ```js
> const ADMIN_PASSWORD = 'your-new-strong-password';
> ```

### Admin Features:
| Page | Features |
|------|----------|
| 📊 Dashboard | Stats overview, recent bookings |
| 📅 Bookings | View all bookings, update status, WhatsApp client |
| 🗓 Calendar | Visual calendar with booking counts per day |
| 💄 Intake Forms | View client beauty intake submissions |
| 🖼 Portfolio | Upload/delete portfolio images (Firebase Storage) |
| 🎬 Reels | Add/delete video reels (upload or YouTube URL) |
| ⭐ Testimonials | Approve/reject client reviews before they go live |
| 💬 WhatsApp | Pre-built message templates with variable insertion |
| 📧 Newsletter | View & export subscriber list as CSV |

---

## 📱 Website Features

| Section | Features |
|---------|----------|
| 🎭 Hero | Parallax zoom, floating decorations, trust badges |
| 👤 About | Portrait, credentials, bio |
| 💄 Services | 6 service cards with pricing |
| 🖼 Portfolio | Masonry gallery, category filters, lightbox, Firebase data |
| ↔️ Before/After | Drag slider comparison on 3 transformations |
| 🎬 Reels | 9-reel grid, video modal player (YouTube/file), Firebase data |
| 📚 Look Book | Pinterest-style gallery with category filters |
| 📅 Calendar | Live availability calendar synced with Firebase bookings |
| 💬 Booking Form | Full booking form → saves to Firestore + opens WhatsApp |
| 💄 Intake Form | Skin tone picker, inspo photo upload, allergy notes |
| 👥 Group Booking | Package selector, people counter → Firestore + WhatsApp |
| ⭐ Testimonials | Auto-rotating carousel, live from Firestore |
| 📝 Review Form | Client review submission → Firestore (pending approval) |
| 💬 WA Templates | 6 pre-built WhatsApp templates with variable substitution |
| 🎓 Training | 3 training programmes with enrollment CTA |
| ❓ FAQ | Accordion with smooth animations |
| 📞 Contact | Booking form, Google Map, social links |
| 📧 Newsletter | Email capture → Firestore |
| 🦶 Footer | Full links, social, contact info |

---

## 🎨 Customization Guide

### Change Business Info
Search and replace across all files:
- `+234 812 345 6789` → your WhatsApp number
- `hello@lyciastouch.com` → your email
- `@lyciastouch` → your Instagram handle
- `Lagos, Nigeria` → your location

### Replace Images
Put your actual portfolio photos in the `images/` folder and update the `src` attributes in `index.html`. Replace all Unsplash URLs with your own images.

### Change Colors
Edit the CSS variables in `css/variables.css`:
```css
:root {
  --rose-gold: #D98C9A;   /* Main brand color */
  --gold:      #C9A35B;   /* Accent gold */
  --cream:     #FFF8F5;   /* Background */
}
```

### Change Admin Password
In `admin/js/admin.js`, line 7:
```js
const ADMIN_PASSWORD = 'your-secure-password';
```

---

## 🌐 Deployment Options

### Option A – GitHub Pages (Free)
1. Push to GitHub repo
2. Settings → Pages → Deploy from `main` branch
3. Your site: `https://username.github.io/lycias-touch`

### Option B – Netlify (Recommended, Free)
1. Drag the `lycias-touch` folder to [netlify.com/drop](https://app.netlify.com/drop)
2. Get instant HTTPS URL
3. Connect custom domain in settings

### Option C – Vercel (Free)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project folder
3. Follow prompts

### Option D – Hostinger / cPanel
1. Zip the folder
2. Upload via File Manager to `public_html`
3. Extract and done

---

## ⚠️ Important Notes

- The site uses **ES Modules** (`type="module"`), so it must be served from a web server — **not opened directly as a file** in the browser.
- For local development, use **VS Code Live Server** extension or run: `npx serve .`
- Firebase config is exposed in the frontend — this is normal for Firebase web apps. Secure your Firestore rules properly.
- For production admin security, consider adding Firebase Authentication instead of the password system.

---

## 📞 Support

For customization help or questions, contact the developer.

**Built with ❤️ for Lycia's Touch**
