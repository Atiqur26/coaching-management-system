import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
   setAll: (cookies: { name: string; value: string; options: any }[]) => cookies.forEach(({ name, value, options }) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !request.nextUrl.pathname.startsWith('/login')) return NextResponse.redirect(new URL('/login', request.url));
  if (user && request.nextUrl.pathname === '/login') return NextResponse.redirect(new URL('/dashboard', request.url));
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
