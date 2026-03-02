import Link from 'next/link';

export default function StoreNotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 px-6 text-center"
      style={{ backgroundColor: 'var(--color-background)', minHeight: '60vh' }}
    >
      <p
        className="text-6xl font-display font-bold mb-4"
        style={{ color: 'color-mix(in srgb, var(--color-text) 15%, transparent)' }}
      >
        404
      </p>
      <h1
        className="font-display text-xl md:text-2xl font-bold mb-2"
        style={{ color: 'var(--color-text)' }}
      >
        Page not found
      </h1>
      <p className="text-sm mb-8 max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="btn-primary text-sm"
      >
        Go Home
      </Link>
    </div>
  );
}
