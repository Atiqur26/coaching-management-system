# Vercel Deploy Checklist (বাংলা)

১. Supabase-এ নতুন Project তৈরি করুন।
২. SQL Editor খুলে `supabase/schema.sql`-এর সম্পূর্ণ কোড Run করুন।
৩. Authentication > Users থেকে নিজের Admin Email/Password তৈরি করুন। Public Sign-ups বন্ধ রাখুন।
৪. Project Settings > API থেকে Project URL ও anon/public key কপি করুন।
৫. GitHub-এ এই ZIP-এর ভেতরের `coaching-management` ফোল্ডারের ফাইলগুলো Upload করুন।
৬. Vercel-এ GitHub Repository Import করুন।
৭. Environment Variables-এ নিচের দুটি মান দিন:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
৮. Deploy চাপুন।
৯. তৈরি হওয়া ওয়েবসাইটে `/login` থেকে Admin হিসেবে প্রবেশ করুন।
১০. SMS চালু করতে হলে নির্বাচিত SMS provider-এর API documentation অনুযায়ী `app/api/sms/route.ts` configure করে Vercel-এ `SMS_API_URL`, `SMS_API_KEY`, `SMS_SENDER_ID` যোগ করতে হবে।

## প্রাথমিক Honours Subject
- Honours 1st Year: Fundamentals of Mathematics, Calculus - I, Linear & Analytic Geometry
- Honours 2nd Year: Calculus - II, Ordinary and Differential Equations, Fortran Programming

Subject Management মেনু থেকে পরবর্তীতে Subject যোগ/সম্পাদনা/নিষ্ক্রিয় করা যাবে।
