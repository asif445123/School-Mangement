# School Management System (Next.js + MongoDB)

## Run
1. Start MongoDB on `mongodb://localhost:27017`
2. `npm install`, set a long random `JWT_SECRET` in `.env.local`
3. `npm run dev` -> http://localhost:3000

## Roles
| Role | How created | Can do |
|---|---|---|
| **admin** | First account that signs up | Approve / reject / delete **schools** |
| **school** (school admin) | Signs up at /signup, waits for admin approval | Everything in its school: students, fee chalans, diary, papers, marks, reports, create **teachers**, approve/disable teacher & student logins |
| **teacher** | Created by school (Users page) | Add students (+ student login), diary, papers, enter marks, result reports. No fees |
| **student** | Created from Students page (school or teacher) with login email/password | Read-only **My Portal**: own fee chalans, class diary, test/exam marks |

All data is separated per school. Pending / rejected / logged-out visitors can click **View Demo**.

## Install this app (PWA) + responsive layout
- The app is a **Progressive Web App**: `public/manifest.webmanifest`, app icons in `public/icons/` (made from the school-cap logo) and a service worker (`public/sw.js`, network-first for pages/APIs so live data is never stale, `/offline.html` fallback) let any visitor **install it on mobile, PC or laptop** — no app store needed. Serve it over **HTTPS** (or `localhost`) or browsers will not offer the install prompt.
- On **every page/link** (public pages and the logged-in app) an **Install App banner** appears at the bottom after ~1.5s: Chrome/Edge/Android get the real one-tap install prompt, iPhone/iPad get *Share → Add to Home Screen* instructions, other browsers get *menu (⋮) → Install app / Add to Home screen*. **Later** hides it for 3 days, the **Install App button in the top bar** reopens it any time, and once installed it never shows again.
- The layout is responsive throughout: navigation and tabs scroll sideways on phones, data tables keep a readable minimum width inside sideways-scrolling cards, search bars / date pickers / card grids stack on small screens, and phone form fields use 16px text so iOS does not auto-zoom.
- **All popups** (Add Teacher, Daily Diary, Papers & Tests, Marks, Students, Fees, Settings...) share one style from `src/app/globals.css` + `src/lib/alerts.ts`: UI font, **14px field text / 13px labels / 18px title, 40px-high fields**, popup width fits the screen, and short fields sit two-per-row on screens ≥560px while long fields (notes, questions, addresses) take the full width.

## Timetable
- Period times are **one school-wide setting**, not per class. School admins open **Set Timetable** and set periods 1–8 plus the break once for the whole school. Monday–Thursday uses one set of times; Friday has separate times. Every class uses these same times.
- Teacher and subject assignments include a **Period (1–8)** field. School admins can set it for any assignment, and class teachers can set it for subject teachers in their own class. Every place that shows a period also shows its **school time** (from the schedule above), e.g. "Period 3 · 09:20 – 10:00".
- **One teacher per class period.** When a class (and section) already has a teacher in a period, that period is shown as `(Name taken)` and **cannot be selected** in the class teacher portal (the school admin also cannot pick it for another teacher). The save is refused as well (server returns 409). A blank section counts as every section of the class.
- Both the school admin and the class teacher can expand a teacher's row to see **all his assignments** (type, class, section, subject, period and period times). The class teacher portal no longer repeats that information in a separate "Also teaches" column.
- The **School period times** editor/summary is shown only to the school admin. Class teacher and subject teacher portals do not repeat the school-wide schedule.
- A class teacher's **Timetable** page shows only the class he is class teacher of, followed by a separate **My periods in other classes** table (class, section, subject, period, Mon–Thu and Friday time), like the Daily Diary page.
- A subject teacher's **My Timetable** page lists only his own periods (class, section, subject, period and school times) - other classes' timetables are never shown.
- Only the school admin can change the school period times.
