import { CaptureSurface } from "@/components/CaptureSurface";

/**
 * Home is not a dashboard — it's an empty piece of paper waiting for you.
 * Put something in here; retrieve it in Notes; watch it take shape on Home.
 */
const Home = () => (
  <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-1 pb-10">
    <div className="w-full max-w-[560px]">
      <CaptureSurface />
    </div>
  </div>
);

export default Home;
