export default function StoreLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Nav skeleton */}
      <div className="h-14 flex items-center justify-between px-6" style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-text) 6%, transparent)' }}>
        <div className="skeleton h-5 w-32" />
        <div className="flex gap-3">
          <div className="skeleton h-5 w-5 rounded-full" />
          <div className="skeleton h-5 w-5 rounded-full" />
        </div>
      </div>

      {/* Hero skeleton */}
      <div className="skeleton" style={{ height: '50vh' }} />

      {/* Products skeleton */}
      <div className="container-store" style={{ paddingTop: 'var(--spacing-section)', paddingBottom: 'var(--spacing-section)' }}>
        <div className="skeleton h-6 w-48 mb-8" style={{ borderRadius: 'var(--radius)' }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton mb-3" style={{ aspectRatio: '3/4', borderRadius: 'var(--radius)' }} />
              <div className="skeleton h-4 w-3/4 mb-1.5" />
              <div className="skeleton h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
