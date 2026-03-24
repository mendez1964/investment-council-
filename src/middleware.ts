import createMiddleware from 'next-intl/middleware'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { locales, defaultLocale } from './i18n'

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
})

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip API routes and auth callback
  if (pathname.startsWith('/api') || pathname.startsWith('/auth')) {
    return NextResponse.next()
  }

  // Strip locale prefix to check the real path
  const pathnameWithoutLocale = pathname.replace(/^\/(es|pt|fr)/, '') || '/'

  // Run intl middleware first to handle locale routing
  const intlResponse = intlMiddleware(request)

  // Auth check for /app routes
  if (pathnameWithoutLocale.startsWith('/app') || pathnameWithoutLocale === '/app') {
    let response = intlResponse ?? NextResponse.next({ request: { headers: request.headers } })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options })
            response = NextResponse.next({ request: { headers: request.headers } })
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options })
            response = NextResponse.next({ request: { headers: request.headers } })
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Detect current locale from URL to redirect to locale-prefixed login
      const locale = pathname.match(/^\/(es|pt|fr)/)?.[1] ?? 'en'
      const loginPath = locale === 'en' ? '/login' : `/${locale}/login`
      return NextResponse.redirect(new URL(loginPath, request.url))
    }

    return response
  }

  // Redirect logged-in users away from login page
  if (pathnameWithoutLocale === '/login') {
    let response = intlResponse ?? NextResponse.next({ request: { headers: request.headers } })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options })
            response = NextResponse.next({ request: { headers: request.headers } })
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options })
            response = NextResponse.next({ request: { headers: request.headers } })
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const locale = pathname.match(/^\/(es|pt|fr)/)?.[1] ?? 'en'
      const appPath = locale === 'en' ? '/app' : `/${locale}/app`
      return NextResponse.redirect(new URL(appPath, request.url))
    }

    return response
  }

  return intlResponse ?? NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo-preview.svg|sitemap.xml|robots.txt).*)'],
}
