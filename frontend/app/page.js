// app/page.js
import MainCanvas from '@/components/three/mainCanvas';

export default function Home() {
  return (
    <>
      <div className="flex min-h-screen items-center justify-center font-sans z-10">
        <div className="text-center">
          <p className="text-2xl">👁️👁️👁️</p>
          <p className="text-white text-base font-medium">HANG TIGHT</p>
        </div>
      </div>
      <MainCanvas />
    </>

  );
}
