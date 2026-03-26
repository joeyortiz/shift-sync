# ⚡ Shift Sync

A retro Windows 99-style shared calendar for syncing work schedules with your crew. Boot into a VGA BIOS screen, log in, and land on a vibrant desktop where everyone's shifts are visible in real time.

---

## Features

- 🖥️ VGA BIOS boot animation with terminal-style auth
- 📅 Weekly calendar with color-coded shift blocks per user
- 👥 Group invite codes — share a code, your crew joins
- 📷 Screenshot OCR — upload a work schedule image and shifts auto-populate
- ⚙️ Settings: choose your shift color, pick a desktop theme
- 🔄 Real-time sync — shifts appear instantly for everyone in the group
- 8 desktop themes: Vaporwave, Midnight, Forest, Retrowave, Candy, Arctic, Matrix, Sunset

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- A Supabase account (already configured — see below)

### 2. Install dependencies

```bash
cd shift-sync
npm install
```

### 3. Environment variables

The `.env` file is already populated with your Supabase project credentials. If you ever need to reset it, copy from `.env.example`.

### 4. ⚠️ Required Supabase setup — disable email confirmation

Because Shift Sync uses username-only login (no real email), you must disable email confirmation:

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Open the **shift-sync** project
3. Go to **Authentication → Settings**
4. Under **Email Auth**, turn off **"Confirm email"**
5. Save

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deploying to Netlify

### Option A: Netlify UI (easiest)

1. Push this folder to a GitHub repo
2. Go to [netlify.com](https://netlify.com) → **Add new site → Import from Git**
3. Select your repo
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Under **Environment variables**, add:
   - `VITE_SUPABASE_URL` = `https://pzayxiqsrgnanavmpyyq.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = *(your anon key from .env)*
7. Deploy!

### Option B: Netlify CLI

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

---

## How to Use

### First Time
1. Boot sequence plays automatically
2. Enter a **username** of your choice — this creates your account
3. Enter a **password** — save it, there's no recovery currently
4. Choose to **Create a crew** or **Join with a code**
5. If creating: share your 6-character invite code with friends
6. If joining: paste the code a friend sent you

### Adding Shifts
- Click **+ Add Shift** in the calendar header
- **Manual tab**: pick date, start/end time
- **Screenshot OCR tab**: upload a photo of your work schedule — Shift Sync extracts the dates and times automatically

### Settings
- Double-click the **Settings** icon on the desktop
- Change your **shift color** (what everyone sees on the calendar)
- Change the **desktop theme**

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite |
| Database & Auth | Supabase (PostgreSQL + Row Level Security) |
| OCR | Tesseract.js (runs in browser, no API key needed) |
| Hosting | Netlify |

---

## Project Structure

```
src/
  App.jsx                 # Session check, phase routing
  components/
    BootScreen.jsx        # VGA BIOS animation + auth + group flow
    Desktop.jsx           # Windows 99-style desktop shell
    Window.jsx            # Draggable window component
    Taskbar.jsx           # Bottom taskbar with clock
    DesktopIcon.jsx       # Desktop icons
    CalendarWindow.jsx    # Weekly calendar with shift blocks
    SettingsWindow.jsx    # Color picker + theme presets
    ShiftEntryModal.jsx   # Manual entry + OCR upload
  lib/
    supabase.js           # All Supabase auth + data helpers
    ocr.js                # Tesseract.js OCR + schedule parser
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | Username, shift color, theme preference |
| `groups` | Crew name + invite code |
| `group_members` | Who's in which crew |
| `shifts` | Individual shift entries per user per day |

All tables use Row Level Security — users can only see data for their own crew.
