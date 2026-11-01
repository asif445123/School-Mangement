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
| **teacher** | Created by school (Users page) | Diary, papers, enter marks, result reports, their own timetable, and the **Students** page — but only for the classes and sections they teach. No fees |
| **student** | Created from Students page (school or teacher) with login email/password | Read-only **My Portal**: own fee chalans, class diary, test/exam marks. The **same login email on brothers/sisters makes it a Guardian Portal** for all of them (see below) |

All data is separated per school. Pending / rejected / logged-out visitors can click **View Demo**.

### Guardian portal: one login for all his / her children
A guardian with 2, 3, 4 or more children in the school does **not** need a separate login per child. In the Students form, type the **same "Guardian / student login email"** for every brother and sister. The first child creates the login (with its password); each further child with that email is attached to the same login — no password has to be typed again, the guardian keeps the first password (typing a new one changes the guardian's password).

With that one login the portal opens as **Guardian Portal**:
- an **All children** overview — combined family fee total / paid / balance with a per-child fee table, the daily diary of **all children for one chosen date**, and an exam-marks snapshot (First / Mid / Final term + overall %) for every child;
- one tab per child with that child's full detail — month-by-month fee chalans, class daily diary by date, test papers with marks obtained, and subject-by-subject exam (paper) marks per term.

Notes:
- Only the email typed by the school/teacher links children — never the phone number or father name alone — so one family can never see another family's children. An email belonging to a teacher, another school or any non-student account still gives "Login email already in use".
- Children who already have separate logins **merge**: edit the brother/sister, change his login email to the guardian's email and save. His old separate login is closed; the guardian's one login now shows him too. Students lists mark such a login with a **"Guardian · N children"** badge.
- To give one child his own login later, edit him and type a **new** email: only that child moves to the new login (same password unless a new one is typed); the guardian keeps the old login for the remaining children. Changing the email of a login that belongs to a single child simply renames that login, as before.
- Enabling/disabling (✓/✕) acts on the login, i.e. on the guardian and all his children at once. Deleting one child only unlinks him — the guardian login is removed only when its last child is deleted.
- Diary and papers follow each child's class **and section**: a diary written for section B is not shown to a section A child (entries/students without a section behave as before).
- Old single-student logins keep working with no migration: a login linked to only one student still shows the original My Portal, and `/api/my` still returns that child's `student / fees / diary / marks / papers` fields next to the new `children[]` / `family` data.

### Who sees student data
Every role is limited to **its own** classes. The page always starts with a **Class** picker and then a **Section** picker — a teacher never sees a student of another class or section.

- **School admin**: every student of the school, with fees, phone, leaving certificate and student login approvals. The Class / Section pickers on top of the table are only filters.
- **Class teacher** (at least one assignment of type *Class teacher* with a class): the Students page opens on **his own class and section**. He can add students there, edit and delete them and print the leaving certificate. New students are saved into his class and section automatically — the Class and Section fields are not asked for, so he can never add a student to another class.
- **A teacher who also teaches a subject in another class**: he changes the Class picker (then the Section picker) and sees that class. There the list is **read-only** — no Add, no Edit, no Delete, and the phone, admission data and the student's login email are not sent to his browser at all.
- **Subject teacher** (no *Class teacher* assignment): the same Class → Section flow over exactly the classes and sections he is assigned to. Everything is read-only.
- **Marks entry** and the marks status table use `/api/roster`, which returns only `name`, `rollNo`, `className`, `section` and `leftDate` for the classes (and sections) that teacher is assigned to — never father name, phone, fees, admission data or the student's login email.

Sections are stored on the student (`section`, empty when the school does not use sections). A student saved **without** a section stays visible to every teacher of that class, so schools that do not use sections (and students added before this field existed) keep working. A teacher assigned to a class with **no** section on his assignment sees **every** section of that class.


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

## Student WhatsApp, fee voucher images and payment accounts

### Students

- **Students → Add / Edit** now has a separate **WhatsApp number**. School admins and class teachers can maintain it.
- Leave WhatsApp empty to use the student's **Phone** number. Pakistani local numbers such as `0300…` are converted to `92300…`; international numbers should include `+countrycode`.
- Subject-only teachers still cannot see phone, WhatsApp or login details. Class teachers only see contact details for their own class/section.

### Fee chalans

- **Generate monthly chalans** creates the regular monthly vouchers. **Create chalan** creates one student's voucher and immediately opens its WhatsApp/image preview.
- The pencil button edits **Monthly fee, Discount, Admission fee and Annual charges** on any voucher. These extra charges default to zero and are not silently repeated on every monthly generation.
- `Voucher total = monthly fee − discount + admission fee + annual charges`. Previous pending is shown separately. Existing vouchers without the new fields continue to work with zero extra charges.
- Print includes both voucher copies, the charge breakdown and active school payment accounts. The PNG contains the same information in one readable image.
- Families can print/download their own vouchers and see active school payment accounts in **My Portal**. They cannot see other children's vouchers or the school's WhatsApp credentials/send logs.

### WhatsApp sending

1. In Meta's developer console, create an app with WhatsApp Business Platform enabled.
2. Set a long random `CREDENTIALS_ENCRYPTION_KEY` in the server environment (see `.env.example`) and restart. Keep this key stable and backed up securely; changing it requires re-entering saved tokens.
3. Open the user menu → **WhatsApp settings**. Enter the **Phone Number ID** and a permanent System User access token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions. Enable sending and save. Tokens are encrypted with AES-256-GCM, never returned to the browser after saving, and never included in voucher images.
4. Recommended: create an approved **UTILITY** template with an **IMAGE header** and four body variables, in order: **student name, chalan number, month, balance due**. Enter its exact name and language in settings. The uploaded voucher image becomes the header. Without a template, ordinary image messages only work inside Meta's open 24-hour customer-service window.
5. Open **Fee Chalan → WhatsApp icon**, check the recipient and image, then **Send image via WhatsApp**. Use **Send again** for reminders; there is no arbitrary two-send limit.

Status is per voucher:

- **Green tick / WhatsApp sent**: Meta accepted the image message, or an admin explicitly recorded a manual send. This is not a delivered/read receipt.
- **Red cross / Not sent or Send failed**: no successful send, or the latest attempt failed. The error is shown for troubleshooting.
- **Sent count** counts successful sends/confirmed manual sends; failed attempts are counted separately. The last recipient, sender and timestamps are stored.
- **Updated · send again** means the charges changed after the last successful send. Editing fees cannot change paid amounts or send history.
- A server-side send lease prevents accidental concurrent double sends. Network timeouts can still be ambiguous: check WhatsApp before retrying a timed-out message.

**No Meta account yet?** Use **Download image** or **Share manually**. Browser sharing attaches the PNG where supported; otherwise download it and attach it in the WhatsApp chat. Opening a chat or the share sheet does **not** mark it sent. Only click **Record manual send** after actually sending the image. Meta may charge for API messages; this app does not bypass WhatsApp's rules.

### School payment accounts

User menu → **Add payment account** supports **Bank account, JazzCash, Easypaisa and Raast ID**. Enter the account title and account/mobile/ID number; bank accounts also accept bank name, IBAN and branch. **Payment accounts** lets admins edit, hide or delete destinations. Active accounts appear on printed vouchers, PNG images and the family portal. These destinations are separate from the accounting **Account Master**, so adding a wallet does not create a ledger entry or change accounting reports.

### Verification

```sh
npm run typecheck
npm test                 # calculations, fallback, encryption, PNG and mocked Meta API
npm run build
```

Optional browser smoke test against a **disposable, seeded test school** (never production): run the app, install a Playwright Chromium browser (`npx playwright install chromium`), then set `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_ALLOW_MUTATIONS=1` and run `npm run test:e2e`. Optional: `E2E_BASE_URL`, `E2E_STUDENT`, `E2E_PAYMENT_ACCOUNT`, `CHROMIUM_PATH`. The test edits a voucher and adds a payment account. External Meta sending is unit-tested with mocked responses; a real send requires the school's own credentials.

### Startup safety

The opaque, obfuscated payload appended to the original `init` startup file was removed. The small, readable initializer (which only creates `.tmp`) is preserved. Review startup scripts before deploying and keep `.env.local` and encryption keys out of Git.

### Deployment dependency install

Voucher PNG generation uses the native `@resvg/resvg-js` runtime dependency. `vercel.json` forces a clean `npm ci --include=dev` before each Vercel build so a cached `node_modules` directory cannot omit it. If your Vercel project has a custom Install Command override, use that same command (or remove the override), then redeploy **without the build cache**. For another host, run `npm ci` before `npm run build`; do not install only dev dependencies or copy a prebuilt `node_modules` from another platform.
