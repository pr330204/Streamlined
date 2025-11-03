
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { BottomNav } from '@/components/bottom-nav';
import Script from 'next/script';
import { UserProvider } from '@/hooks/use-user';
import NotificationListener from '@/components/NotificationListener';
import UserActivityTracker from '@/components/UserActivityTracker';

export const metadata: Metadata = {
  title: 'Streamlined',
  description: 'Find and share your favorite videos.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-4683763693438850" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-body antialiased">
        <UserProvider>
          <NotificationListener />
          <UserActivityTracker />
          <div className="pb-20">
            {children}
          </div>
          <Toaster />
          <BottomNav />
        </UserProvider>
        <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />
      </body>
    </html>
  );
}
