# Nil Nil Server

Backend server for the Nil Nil app — monitors live Premier League matches and sends push notifications when goals are scored.

## How It Works

```
Football-Data.org API → Match Monitor → Goal Detector → APNs → User's iPhone
```

1. **Match Monitor** checks Football-Data.org every 5 minutes for today's PL schedule
2. When matches go live, it switches to polling every **30 seconds**
3. **Goal Detector** compares old scores to new scores — if it changed, someone scored
4. Figures out which devices should be notified based on their alarm preference
5. **Notification Service** sends an APNs push notification that wakes up the user's phone

---

## Quick Start (Local Development)

### 1. Install dependencies
```bash
cd nil-nil-server
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Then open `.env` and fill in:
- `FOOTBALL_DATA_API_KEY` — from https://www.football-data.org/client/login
- `APN_KEY_ID` — from Apple Developer → Certificates → Keys
- `APN_PRIVATE_KEY` — the content of your `.p8` file
- `APN_TEAM_ID` — already set to `6WY9675C6N`
- `APN_BUNDLE_ID` — already set to `com.nilnil.goalalarm`

### 3. Start the server
```bash
npm run dev   # development (auto-restarts on changes)
npm start     # production
```

### 4. Test it's working
```
http://localhost:3000/health
```
You should see JSON with server status and match monitor info.

---

## Getting Your APNs Key (.p8 file)

1. Go to https://developer.apple.com/account
2. Click **Certificates, Identifiers & Profiles**
3. Click **Keys** in the left sidebar
4. Click **+** to create a new key
5. Name it "Nil Nil APNs Key"
6. Check **Apple Push Notifications service (APNs)**
7. Click **Continue**, then **Register**
8. **Download the .p8 file** — you can only download it ONCE, save it safely!
9. Note your **Key ID** (shown on the page)

For your `.env` file, open the `.p8` file in a text editor and copy its entire contents into `APN_PRIVATE_KEY`.

---

## API Endpoints

### Register a device (call on app launch)
```
POST /api/alarms/register
{
  "deviceToken": "abc123...",
  "teamId": 64,
  "teamName": "Liverpool FC",
  "alarmType": "my_team"
}
```

Alarm types:
- `my_team` — only when your team scores
- `any_goal` — any goal in your team's match
- `first_goal` — only the very first goal of the match

### Update preferences
```
PUT /api/alarms/preferences
{
  "deviceToken": "abc123...",
  "alarmType": "any_goal",
  "alarmEnabled": true
}
```

### Disable alarm
```
POST /api/alarms/disable
{ "deviceToken": "abc123..." }
```

### Test notification
```
POST /api/alarms/test
{ "deviceToken": "abc123..." }
```

### Today's matches
```
GET /api/matches/today
```

### Monitor status
```
GET /api/matches/status
```

### Health check
```
GET /health
```

---

## Deploying to Railway (Recommended)

1. Go to https://railway.app and sign up with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select your `NilNil` repository
4. Set the **Root Directory** to `nil-nil-server`
5. Go to **Variables** and add all your `.env` values
6. Railway auto-deploys on every Git push

For the `APN_PRIVATE_KEY`, paste the entire `.p8` content as one line with `\n` replacing newlines.

---

## Deploying to Render (Alternative)

1. Go to https://render.com and sign up
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Set Root Directory to `nil-nil-server`
5. Build Command: `npm install`
6. Start Command: `node server.js`
7. Add environment variables in the dashboard

The `render.yaml` file in this folder will handle the configuration automatically.

---

## Premier League Team IDs (Football-Data.org)

| Team | ID |
|------|-----|
| Arsenal | 57 |
| Aston Villa | 58 |
| Brentford | 402 |
| Brighton | 397 |
| Chelsea | 61 |
| Crystal Palace | 354 |
| Everton | 62 |
| Fulham | 63 |
| Ipswich Town | 57 (check) |
| Leicester City | 338 |
| Liverpool | 64 |
| Man City | 65 |
| Man United | 66 |
| Newcastle | 67 |
| Nottingham Forest | 351 |
| Southampton | 340 |
| Spurs | 73 |
| West Ham | 563 |
| Wolves | 76 |

---

## Apple Critical Alerts (Future)

Critical Alerts bypass silent mode and Do Not Disturb — perfect for a wake-up alarm.
To enable:
1. Apply at https://developer.apple.com/contact/request/notifications-critical-alerts-entitlement/
2. Explain your use case (alarm clock for soccer fans in bad time zones)
3. Once approved, uncomment the Critical Alerts code in `notificationService.js`
4. Add the entitlement to your Expo app's `app.json`

---

## File Structure

```
nil-nil-server/
├── server.js              — Entry point
├── package.json
├── .env.example           — Copy to .env with your values
├── Procfile               — For Railway
├── render.yaml            — For Render
└── src/
    ├── config.js          — All environment variable handling
    ├── database.js        — SQLite: stores device tokens + preferences
    ├── matchMonitor.js    — Polls Football-Data.org, orchestrates everything
    ├── goalDetector.js    — Detects score changes, picks who to notify
    ├── notificationService.js — Sends APNs push notifications
    ├── routes/
    │   ├── alarms.js      — /api/alarms/* endpoints
    │   └── matches.js     — /api/matches/* endpoints
    └── utils/
        └── logger.js      — Console logging with timestamps
```
