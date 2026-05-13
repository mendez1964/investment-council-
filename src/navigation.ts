import { createNavigation } from 'next-intl/navigation'
import { locales, defaultLocale } from './i18n'

export const { Link, redirect, useRouter, usePathname } = createNavigation({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // English: no prefix, others get /es/ /pt/ /fr/
})
