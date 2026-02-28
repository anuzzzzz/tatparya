export default function StoreLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      {/* Nav skeleton */}
      <div className="h-14 border-b" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-full">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="flex gap-3">
            <div className="h-5 w-5 bg-gray-200 rounded" />
            <div className="h-5 w-5 bg-gray-200 rounded" />
          </div>
        </div>
      </div>

      {/* Hero skeleton */}
      <div className="h-[50vh] bg-gray-100" />

      {/* Product grid skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="h-6 w-48 bg-gray-200 rounded mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-3" />
              <div className="h-4 w-3/4 bg-gray-200 rounded mb-1.5" />
              <div className="h-4 w-1/3 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
