// app/page.js
'use client';

import MainCanvas from '@/components/three/mainCanvas';
import SiteFooter from '@/components/ui/SiteFooter';

export default function Home() {
  return (
    <>
      {/* Canvas sits at z-0, receives all pointer events */}
      <MainCanvas />

      {/* Site footer with marquee and navigation */}
      <SiteFooter />
    </>
  );
}
