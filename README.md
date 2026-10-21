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
