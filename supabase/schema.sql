-- Coaching Management System database schema
create extension if not exists pgcrypto;

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  program text not null check (program in ('Mathematics 1st Year','Mathematics 2nd Year','Honours 1st Year','Honours 2nd Year')),
  name text not null,
  subject_code text,
  monthly_fee numeric(10,2) not null default 0 check (monthly_fee >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(program, name)
);

insert into public.subjects(program,name) values
('Honours 1st Year','Fundamentals of Mathematics'),
('Honours 1st Year','Calculus - I'),
('Honours 1st Year','Linear & Analytic Geometry'),
('Honours 2nd Year','Calculus - II'),
('Honours 2nd Year','Ordinary and Differential Equations'),
('Honours 2nd Year','Fortran Programming')
on conflict (program,name) do nothing;

create table if not exists public.students (
 id uuid primary key default gen_random_uuid(),
 student_code text unique not null,
 name text not null,
 phone text,
 guardian_name text,
 guardian_phone text,
 program text not null check (program in ('Mathematics 1st Year','Mathematics 2nd Year','Honours 1st Year','Honours 2nd Year')),
 subject_id uuid references public.subjects(id) on delete set null,
 monthly_fee numeric(10,2) not null default 0 check (monthly_fee >= 0),
 join_date date default current_date,
 address text,
 active boolean not null default true,
 created_at timestamptz not null default now()
);

create table if not exists public.student_subjects (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete cascade,
 subject_id uuid not null references public.subjects(id) on delete restrict,
 monthly_fee numeric(10,2) not null default 0 check (monthly_fee >= 0),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(student_id, subject_id)
);

create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id),
 amount numeric(10,2) not null check (amount > 0),
 fee_month date not null,
 method text not null default 'Cash',
 note text,
 paid_at timestamptz not null default now()
);

create table if not exists public.sms_logs (
 id uuid primary key default gen_random_uuid(),
 student_id uuid references public.students(id),
 phone text not null,
 message text not null,
 status text not null default 'queued',
 provider_response jsonb,
 created_at timestamptz not null default now()
);

alter table public.subjects enable row level security;
alter table public.students enable row level security;
alter table public.student_subjects enable row level security;
alter table public.payments enable row level security;
alter table public.sms_logs enable row level security;

drop policy if exists "authenticated users manage subjects" on public.subjects;
drop policy if exists "authenticated users manage students" on public.students;
drop policy if exists "authenticated users manage student subjects" on public.student_subjects;
drop policy if exists "authenticated users manage payments" on public.payments;
drop policy if exists "authenticated users manage sms logs" on public.sms_logs;
create policy "authenticated users manage subjects" on public.subjects for all to authenticated using (true) with check (true);
create policy "authenticated users manage student subjects" on public.student_subjects for all to authenticated using (true) with check (true);
create policy "authenticated users manage students" on public.students for all to authenticated using (true) with check (true);
create policy "authenticated users manage payments" on public.payments for all to authenticated using (true) with check (true);
create policy "authenticated users manage sms logs" on public.sms_logs for all to authenticated using (true) with check (true);

create index if not exists subjects_program_idx on public.subjects(program);
create index if not exists students_program_idx on public.students(program);
create index if not exists students_subject_idx on public.students(subject_id);
create index if not exists student_subjects_student_idx on public.student_subjects(student_id);
create index if not exists payments_paid_at_idx on public.payments(paid_at);
create index if not exists payments_student_month_idx on public.payments(student_id,fee_month);
