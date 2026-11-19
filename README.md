# Coaching Management System

A Next.js 15 + Supabase (PostgreSQL/Auth) coaching-centre management starter, designed for Vercel deployment.

## Included modules
- Supabase email/password login; create admin/staff accounts manually in Supabase Auth
- Dashboard: active student count, total collections, current-month income and a current-month indicative due figure
- Student registration and searchable student list
- Programs: Mathematics 1st Year, Mathematics 2nd Year, Honours 1st Year and Honours 2nd Year
- Dynamic Subject Management: add/edit/activate/deactivate/delete subjects and set a default monthly fee
- Honours starter subjects seeded in SQL:
  - 1st Year: Fundamentals of Mathematics; Calculus - I; Linear & Analytic Geometry
  - 2nd Year: Calculus - II; Ordinary and Differential Equations; Fortran Programming
- Student subject selection; subject monthly fee pre-fills the student's monthly fee and can be adjusted
- Payment entry with fee month, payment method and transaction note; payment history and monthly income
- Month-wise due list showing monthly fee, amount paid and remaining balance
- SMS screen/API adapter and SMS log table (requires a compatible provider API)

## 1. Supabase setup
1. Create a project at https://supabase.com.
2. Open **SQL Editor** and run the complete `supabase/schema.sql` file.
3. In Authentication settings, enable Email and disable public sign-ups.
4. In Authentication > Users, create your admin account manually.
5. Copy Project URL and anon/public key from Project Settings > API.

## 2. Local setup
```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```
Open http://localhost:3000 and sign in at `/login`.

## 3. Vercel deployment
1. Upload this project folder to a GitHub repository.
2. In https://vercel.com choose **Add New > Project** and import that repository.
3. Add the variables from `.env.example` under Project Settings > Environment Variables for Production (and Preview if needed).
4. Deploy. Vercel detects Next.js automatically.

## 4. SMS configuration
The endpoint at `app/api/sms/route.ts` is a generic adapter. Configure `SMS_API_URL`, `SMS_API_KEY` and `SMS_SENDER_ID` in Vercel only after matching the request format to the chosen provider's official API. Providers in Bangladesh have different API formats and sender-ID requirements. Test with your own number first. Do not put provider secrets in `NEXT_PUBLIC_` variables.

## Important implementation notes
- This is a deployable starter/MVP, not a certified accounting or production-audited system.
- Database access is restricted to authenticated Supabase users by RLS policies. Disable public sign-up and create trusted accounts manually.
- A student currently has one selected subject in the registration form. For students taking multiple subjects simultaneously, extend this to a separate student-enrolments table and record each payment against an enrolment.
- Dashboard due is an indicative current-month calculation (active students' monthly fee less payments recorded against the current fee month). It is not a complete historical arrears ledger. Confirm month-by-month dues before using it for official accounting.
- Never expose the Supabase service-role key in browser code.
