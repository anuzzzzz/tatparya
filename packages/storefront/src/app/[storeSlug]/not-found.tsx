import Link from 'next/link';

export default function StoreNotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-20">
      <div className="text-center max-w-sm">
        <h1 className="font-bold text-5xl mb-3 text-gray-300">404</h1>
        <h2 className="text-lg font-semibold mb-2">Store Not Found</h2>
        <p className="text-sm text-gray-500 mb-6">
          The store you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}
