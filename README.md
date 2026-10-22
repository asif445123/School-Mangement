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

## Timetable
- Period times are **one school-wide setting**, not per class. School admins open **Set Timetable** and set periods 1–8 plus the break once for the whole school. Monday–Thursday uses one set of times; Friday has separate times. Every class uses these same times.
- Teacher and subject assignments include a **Period (1–8)** field. School admins can set it for any assignment, and class teachers can set it for subject teachers in their own class.
- Class teachers and subject teachers get a read-only view of their assigned classes, subjects, periods and the shared school times. Only the school admin can change the period times.
