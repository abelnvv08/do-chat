export default function Loading() {
  return (
    <div className="h-full flex flex-col bg-white animate-pulse">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <div className="w-8 h-8 rounded-full bg-gray-200" />
        <div className="h-3 bg-gray-200 rounded w-24" />
        <div className="flex-1" />
        <div className="w-8 h-8 rounded-full bg-gray-200" />
      </div>
      {/* Chat list */}
      <div className="flex-1 px-4 pt-4 space-y-3">
        <div className="w-full flex items-center gap-3 bg-blue-100 rounded-2xl px-4 py-3.5">
          <div className="w-10 h-10 rounded-full bg-blue-200 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-blue-200 rounded w-16" />
            <div className="h-2.5 bg-blue-200 rounded w-32" />
          </div>
        </div>
        <div className="w-full flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-2.5 bg-gray-200 rounded w-36" />
          </div>
        </div>
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-28" />
                <div className="h-2.5 bg-gray-200 rounded w-10" />
              </div>
              <div className="h-2.5 bg-gray-100 rounded w-48" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
