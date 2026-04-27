# Phase 6: Frontend UI & Multi-language System (Next.js)

This document contains the implementation details for Phase 6, focusing on a Next.js (App Router) frontend with a robust i18n system using `next-intl`.

*(Note: The current live preview in this environment is running Vite/React. This documentation provides the exact Next.js implementation as requested for your target architecture.)*

## 1. Dependencies
To implement this in your Next.js project, install `next-intl`:
```bash
npm install next-intl
```

## 2. i18n Configuration

**`src/i18n.ts`**
```typescript
import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
 
// Can be imported from a shared config
const locales = ['en', 'th'];
 
export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();
 
  return {
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
```

**`src/middleware.ts`**
```typescript
import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'th'],
 
  // Used when no locale matches
  defaultLocale: 'en'
});
 
export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(th|en)/:path*']
};
```

**`next.config.mjs`**
```javascript
import createNextIntlPlugin from 'next-intl/plugin';
 
const withNextIntl = createNextIntlPlugin();
 
/** @type {import('next').NextConfig} */
const nextConfig = {};
 
export default withNextIntl(nextConfig);
```

## 3. Translation Files

**`messages/en.json`**
```json
{
  "Navigation": {
    "dashboard": "Dashboard",
    "customers": "Customers",
    "jobs": "Jobs",
    "quotations": "Quotations",
    "approvals": "Approvals",
    "settings": "Settings"
  },
  "Header": {
    "search": "Search...",
    "notifications": "Notifications",
    "profile": "Profile"
  },
  "Dashboard": {
    "welcome": "Welcome back",
    "overview": "Overview",
    "recent_activity": "Recent Activity",
    "total_revenue": "Total Revenue",
    "active_jobs": "Active Jobs",
    "new_customers": "New Customers",
    "pending_approvals": "Pending Approvals"
  },
  "Status": {
    "new": "New",
    "pending": "Pending",
    "approved": "Approved",
    "rejected": "Rejected"
  }
}
```

**`messages/th.json`**
```json
{
  "Navigation": {
    "dashboard": "แดชบอร์ด",
    "customers": "ลูกค้า",
    "jobs": "งาน",
    "quotations": "ใบเสนอราคา",
    "approvals": "การอนุมัติ",
    "settings": "การตั้งค่า"
  },
  "Header": {
    "search": "ค้นหา...",
    "notifications": "การแจ้งเตือน",
    "profile": "โปรไฟล์"
  },
  "Dashboard": {
    "welcome": "ยินดีต้อนรับกลับ",
    "overview": "ภาพรวม",
    "recent_activity": "กิจกรรมล่าสุด",
    "total_revenue": "รายได้รวม",
    "active_jobs": "งานที่กำลังดำเนินการ",
    "new_customers": "ลูกค้าใหม่",
    "pending_approvals": "รอการอนุมัติ"
  },
  "Status": {
    "new": "ใหม่",
    "pending": "รอดำเนินการ",
    "approved": "อนุมัติแล้ว",
    "rejected": "ปฏิเสธ"
  }
}
```

## 4. React Components (Next.js App Router)

**`src/app/[locale]/layout.tsx`**
```tsx
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Sidebar from '@/components/Sidebar';

export default async function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();
 
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <div className="min-h-screen bg-surface flex flex-col md:flex-row">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <header className="h-16 px-8 flex items-center justify-between border-b">
                <div className="flex-1" />
                <LanguageSwitcher currentLocale={locale} />
              </header>
              <div className="p-8">
                {children}
              </div>
            </main>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**`src/components/LanguageSwitcher.tsx`**
```tsx
'use client';

import {useRouter, usePathname} from 'next/navigation';
import {useTransition} from 'react';

export default function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLanguage = () => {
    const nextLocale = currentLocale === 'en' ? 'th' : 'en';
    
    // Replace the current locale in the pathname with the new locale
    const newPathname = pathname.replace(`/${currentLocale}`, `/${nextLocale}`);
    
    startTransition(() => {
      router.replace(newPathname);
    });
  };

  return (
    <button 
      onClick={toggleLanguage}
      disabled={isPending}
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors"
    >
      <span className={currentLocale === 'th' ? 'text-primary' : ''}>TH</span>
      <span className="text-outline-variant">|</span>
      <span className={currentLocale === 'en' ? 'text-primary' : ''}>EN</span>
    </button>
  );
}
```

**`src/app/[locale]/page.tsx` (Dashboard Example)**
```tsx
import {useTranslations} from 'next-intl';

export default function Dashboard() {
  const t = useTranslations('Dashboard');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-2">
          {t('welcome')}, John
        </h1>
        <p className="text-on-surface-variant">
          {t('overview')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Example Stat Card */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border">
          <h3 className="text-on-surface-variant text-sm font-medium mb-1">{t('total_revenue')}</h3>
          <div className="text-2xl font-headline font-semibold text-on-surface">$124,500</div>
        </div>
      </div>
    </div>
  );
}
```
