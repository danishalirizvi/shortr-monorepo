import UrlShortener from '@/components/UrlShortener';

export default function HomePage() {
  return (
    <main className="min-h-dvh grid place-items-center px-6 py-16">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">shortr</h1>
          <p className="text-zinc-500 text-sm">Paste a long URL. Get a short one.</p>
        </div>
        <UrlShortener />
      </div>
    </main>
  );
}
