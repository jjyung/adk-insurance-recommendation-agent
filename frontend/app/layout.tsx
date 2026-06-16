import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';

import './globals.css';
import { Providers } from '../components/Providers';

const sans = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: '保險代理系統',
  description:
    '一個專為保險代理人打造的系統，提供客戶管理、保單追蹤、銷售分析等功能，幫助代理人提升工作效率和業績。',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='zh-Hant'>
      <body className={`${sans.variable} ${mono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
