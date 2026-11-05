import './globals.css';
import React from 'react';

export const metadata = {
  title: '판넬오더 (Panel-Order) V2.1 - 전국 샌드위치 판넬 1:1 직거래',
  description: '전국 샌드위치 판넬 시공 기술자/팀, 구인 현장소장, 자재/장비 업체를 1:1로 직접 연결하는 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
