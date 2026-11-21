# School Management System (Next.js + MongoDB)

## Run
1. Start MongoDB on `mongodb://localhost:27017`
2. `npm install`, set a long random `JWT_SECRET` in `.env.local`
3. `npm run dev` -> http://localhost:3000

## Roles
| Role | How created | Can do |
|---|---|---|
| **admin** | First account that signs up | Approve / reject / delete **schools** |
| **school** (school admin) | Signs up at /signup, waits for admin approval | Everything in its school: students, fee chalans, diary, papers, marks, reports, **student attendance** (all classes, with the class-wise summary), create **teachers**, approve/disable teacher & student logins |
| **teacher** | Created by school (Users page) | Diary, papers, enter marks, result reports, their own timetable, the **Enroll Students** page — but only for the classes and sections they teach — and **Student Attendance** for the class he is class teacher of. No fees |
| **student** | Created from the Enroll Students page (school or teacher) with login email/password | Read-only **My Portal**: own fee chalans, class diary, test/exam marks. The **same login email on brothers/sisters makes it a Guardian Portal** for all of them (see below) |

All data is separated per school. Pending / rejected / logged-out visitors can click **View Demo**.

### Dashboard (school admin + class teachers)
The dashboard opens on **today** and has one **Date** picker at the top: every card, chart and report below follows the selected date.

- **Diary card — `S … - D … - R …`** — *S* = total subjects (one row per subject of every subject teacher), *D* = diaries submitted for that date, *R* = diaries remaining. Clicking the card (or **Which teachers did not submit?** under the Diary Report chart) opens the detail: one row per teacher / class / section / subject whose diary is still missing, plus a per-teacher S / D / R table. A diary saved without a section counts for every section of that class, exactly like the Daily Diary page.
- **Tests card — `T … - M … - R …`** — *T* = tests created on that date (tests only, exams are excluded), *M* = their total marks, *R* = marks still to be entered. Clicking it opens the test report (per class / section / subject: tests, marks entered, total marks and remaining marks).
- **Students Today / Staff Today** — `P … / A … / L …` present, absent and leave counts with how many were marked, how many are unmarked and the attendance %.
- **Report of the day** — total teachers, other staff (*type* = Staff accounts) and active students, **Students by Class** bar chart, the **Student Attendance** donut, the **Diary Report** donut (submitted vs remaining) and the **Test Report** donut (marks entered vs remaining).
- The finance section (income / expense / receivable / payable breakdown and charts) stays below, school admin only.
- A **class teacher** sees the same page for his own class and section only (diary, tests and student attendance of that class; no staff figures). A subject-only teacher has no dashboard, and the page is not shown to students or the platform admin.

### Navigation: **Enroll Students** and **Fee Management**
The navbar's **Enroll Students** item contains the student list (Class / Section / Status filters, Add / Edit / Delete, school leaving certificate and student-login approvals) and the school-only **GR Register** tab. A teacher sees only the students in assigned classes and sections and has no fee access.

School administrators also have a separate **Fee Management** item with four tabs:

- **Chalans & Payments** — create, print, receive and share fee chalans.
- **Fee Structure** — review and edit each student's monthly fee and recurring discount.
- **Student Fee Ledger** — find a student by admission / roll number or name, review totals and every voucher, and print the full ledger.
- **Defaulters & WhatsApp** — one row per student with the combined outstanding balance and an icon-only WhatsApp reminder action.

The existing `/fees` link now opens **Chalans & Payments**. The fee-management tabs are directly addressable at `/fee-structure`, `/student-fee-ledger` and `/fee-defaulters`; `/gr-register` remains directly addressable under Enroll Students.

### Navigation: **Teachers & time table**, **Diary & Tests** and **Exams & Results**
**Teachers & time table** (school admin) opens a tab strip: **Teachers & Staff** (the teacher and staff list with assignments) and **Set Timetable** (`/timetable`). Set Timetable is no longer a separate sidebar link; teachers still see **Timetable** in their menu.
The **Diary & Tests** item (school admin and class teachers) shows a tab strip:

- **Daily Diary** — the class diary.
- **Tests** — test papers, with the **+ Test** action only.
- **Marks Entry** — class-wise status and marks entry for **test papers only** (`/teachers/marks`).

Subject-only teachers, who do not have the Diary & Tests tab strip, can open the same test marks page from **Test Marks Entry** in their menu. Teachers continue to see only papers from their assigned classes and sections.

**Exams & Results** is a separate navbar item with these tabs:

- **Exams** — create exam papers with **+ Exam**, using the same date / class / subject flow as Tests. The form also asks for the **session** (e.g. 2025-2026) and **pass percentage**, which defaults to 33% when left empty.
- **Marks Entry** — class-wise status and marks entry for **exam papers only** (`/marks`). The existing `/marks` link continues to work.
- **Result & Card** — pick an **exam** (one session + term + class, e.g. *Mid Term - Class1*) to see every student's position, subject wise marks, total, percentage, grade and Pass / Fail. A student passes when he reaches the pass percentage in **every** subject. The row **Card** button prints that student's result card, **Print All Result Cards** prints every card in one window, and **Result Sheet** prints the whole table.
- **Student Promotion** (school admin only) — pick a class, section and exam, then move the students to the **Promote to Class** with a **New Section** and **New Session**. The list can show all students or only those who passed the exam, and students are promoted one by one or by selection.

### Navigation: **Student Attendance** (school admin + class teachers)
**Student Attendance** is its own navbar item near **Enroll Students**. It is shown to the school admin and to every teacher who is a **class teacher** of at least one class (a subject-only teacher does not see it, and no other role does). It has up to four tabs:

- **Mark Attendance** — Date / Class / Section with a Load button, one **Present / Absent / Leave** radio per student, **All Present** / **All Absent** shortcuts and the green **Save Attendance** button. Saving writes one row per student for that date, and opening the date again shows what was already marked.
- **Monthly Report** — Month / Class / Section, a day-by-day register (P / A / L, absent days highlighted) with per-student **P / A / L** totals and attendance %, printable.
- **Absent List** — Date and Class (or **All**), listing the admission number, name, father, class and phone of every absent student with a **WhatsApp** button to message the parent, printable.
- **Class Summary** — school admin only: for the selected day or month, one row per class and section with the present / absent / leave counts and attendance %, plus school totals.

Attendance is stored per student per day (unique per student + date). A class teacher can only mark and read attendance of the classes he is class teacher of; the class and section saved with each day are kept as a snapshot so an old register still shows the class the student was in then.

### Navigation: one **Enter Expenses** page with tabs
The navbar has a single **Enter Expenses** item for all accounting setup and expense entry (school admin only). Opening it shows a tab strip (same style as Enroll Students / Teacher Data):

- **Account Types** — the account type list (receivable / payable / income / expense flags).
- **Account Master** — the account master file (code, name and account type).
- **Enter Expenses** — the expense entries page (add entry rows by date, with Code / Date / Narration / Account wise search).

Account Types and Account Master used to be separate navbar items. They are now tabs inside Enter Expenses, and their old links (`/account-types`, `/accounts`) still work, keep the same tab selected and open straight on that tab. The navbar **Enter Expenses** item stays highlighted on all three tabs.

### Navigation: one **Inventory & Purchases** page with six tabs
The navbar has a single **Inventory & Purchases** item (school admin only). Opening it shows a tab strip (same style as Enroll Students / Teacher Data / Enter Expenses):

- **Items (Stock)** — *Items - Stationery, Books, Furniture & Equipment*: item name, category, unit, rate, live **in stock** and stock **value**, with search, Edit / Delete, **+ Add New** and a printable stock report. The form asks for Item Name, Category, Unit (pcs / box / set…), Rate, Opening Stock and **Minimum Stock Alert** (the stock turns red with a *Low* badge when it reaches the alert).
- **Purchase Requisition** — a department's purchase demand: date, item / description, quantity, department, requested by, status (Pending / Approved / Ordered / Rejected) and note.
- **Purchase Invoice** — buy items: date, auto invoice number (`PI-0001`, `PI-0002`…), supplier (or **Cash Purchase**), item rows with qty / rate / amount, **Paid Now**, mode, bank account and note. Saving raises the stock (a Stock In row per item), posts the paid amount as an expense and leaves the rest as the supplier's payable. **Purchase History** lists every invoice with total / paid / due, a **Print** button and Delete (which reverses the stock and the expense).
- **Stock In / Out** — receive or issue items: item (shown with its current stock), type (Stock In / Stock Out), qty, date, note / issued to. A **Stock Out** also posts its cost (qty × rate) as an expense. Rows that came from a purchase invoice are marked with their invoice number and can only be removed by deleting that invoice.
- **Suppliers** — supplier name, phone, address, opening payable and the live **balance payable**.
- **Supplier Ledger** — pick a supplier and **Show**: opening payable, every purchase (credit), every payment (debit) and the running balance, with **Print** and **+ Payment to Supplier** (amount, date, mode, bank, note). Payments can be deleted from the ledger; each one reverses its expense entry.

All amounts are posted to the **Inventory / Store expense** account (created automatically with a *Store & inventory* account type on first use), so purchases, stock outs and supplier payments appear in **Enter Expenses**, the ledger report and the dashboard like any other expense. Every tab is reachable straight from its own link (`/inventory`, `/inventory/requisitions`, `/inventory/purchases`, `/inventory/stock`, `/inventory/suppliers`, `/inventory/ledger`) and the navbar item stays highlighted on all six.

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
- The fee table omits the chalan image thumbnail to keep the list compact. Use the WhatsApp action to preview the voucher, or the **Share icon** to share the chalan PNG directly — native share sheet, or download + WhatsApp chat where file sharing is unsupported. Share status details are expandable per row.
- Families can print/download their own vouchers and see active school payment accounts in **My Portal**. They cannot see other children's vouchers or the school's WhatsApp credentials/send logs.

### WhatsApp sending

1. In Meta's developer console, create an app with WhatsApp Business Platform enabled.
2. Set a long random `CREDENTIALS_ENCRYPTION_KEY` in the server environment (see `.env.example`) and restart. Keep this key stable and backed up securely; changing it requires re-entering saved tokens.
3. Open the user menu → **WhatsApp settings**. Enter the **Phone Number ID** and a permanent System User access token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions. Enable sending and save. Tokens are encrypted with AES-256-GCM, never returned to the browser after saving, and never included in voucher images.
4. Recommended: create an approved **UTILITY** template with an **IMAGE header** and four body variables, in order: **student name, chalan number, month, balance due**. Enter its exact name and language in settings. The uploaded voucher image becomes the header. Without a template, ordinary image messages only work inside Meta's open 24-hour customer-service window.
5. Open **Fee Management → Chalans & Payments → WhatsApp icon**, check the recipient and image, then **Send image via WhatsApp**. Use **Send again** for reminders; there is no arbitrary two-send limit.

Status is per voucher, in the table's **Share status** column:

- **Green tick / WhatsApp sent**: Meta accepted the image message, or an admin explicitly recorded a manual send. This is not a delivered/read receipt.
- **Red cross / Not sent or Send failed**: no successful send, or the latest attempt failed. The error is shown for troubleshooting.
- **How many times sent** is shown under the status (e.g. "3 times sent"), with failed attempts counted separately. Open **Details** to see the last sent date & time, the recipient number and who sent it (WhatsApp API or manually confirmed). The same status appears inside the WhatsApp preview dialog.
- The table's **Share icon** (and the dialog's Share manually) only counts towards that total after the user confirms "Yes, I sent it" — closing the share sheet or opening a chat changes nothing.
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
