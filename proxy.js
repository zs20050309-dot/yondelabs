import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

const PROTECTED_ROUTES = ['/dashboard', '/apply', '/admin']
const AUTH_ROUTES = ['/login', '/register']
const STUDENT_LOGIN_ROUTE = '/student/login'

export async function proxy(req) {
  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value)
          })
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const pathname = req.nextUrl.pathname
  const role = session?.user?.app_metadata?.role || session?.user?.user_metadata?.role
  const isStudentRoute =
    pathname === '/student' ||
    (pathname.startsWith('/student/') && pathname !== STUDENT_LOGIN_ROUTE)

  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route)) && !session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('message', 'Please log in to continue.')
    return NextResponse.redirect(loginUrl)
  }

  if (isStudentRoute && !session) {
    const loginUrl = new URL(STUDENT_LOGIN_ROUTE, req.url)
    loginUrl.searchParams.set('message', 'Use your student portal credentials to continue.')
    return NextResponse.redirect(loginUrl)
  }

  if (isStudentRoute && role !== 'student_portal') {
    const loginUrl = new URL(STUDENT_LOGIN_ROUTE, req.url)
    loginUrl.searchParams.set('message', 'Sign in with your separate student portal credentials.')
    return NextResponse.redirect(loginUrl)
  }

  if (pathname === STUDENT_LOGIN_ROUTE && role === 'student_portal') {
    return NextResponse.redirect(new URL('/student', req.url))
  }

  if (AUTH_ROUTES.includes(pathname) && session) {
    const destination =
      role === 'admin' ? '/admin' : role === 'student_portal' ? '/student' : '/dashboard'
    return NextResponse.redirect(new URL(destination, req.url))
  }

  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route)) && role === 'student_portal') {
    return NextResponse.redirect(new URL('/student', req.url))
  }

  if (pathname.startsWith('/admin') && session) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/dashboard',
    '/apply',
    '/apply/:path*',
    '/admin',
    '/admin/:path*',
    '/login',
    '/register',
    '/student',
    '/student/:path*',
  ],
}
