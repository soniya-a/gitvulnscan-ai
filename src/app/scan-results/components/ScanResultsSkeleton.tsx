import React from 'react';

export default function ScanResultsSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Back link skeleton */}
      <div className="h-4 w-28 bg-muted rounded" />
      {/* Meta header skeleton */}
      <div className="card-elevated p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted" />
          <div className="flex flex-col gap-1.5">
            <div className="h-5 w-48 bg-muted rounded" />
            <div className="h-3 w-32 bg-muted rounded" />
          </div>
        </div>
        <div className="flex gap-4 pt-2 border-t border-border">
          {[1, 2, 3]?.map((i) => (
            <div key={`meta-skel-${i}`} className="h-3 w-24 bg-muted rounded" />
          ))}
        </div>
      </div>
      {/* Metric cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {[1, 2, 3, 4, 5, 6, 7]?.map((i) => (
          <div key={`metric-skel-${i}`} className="card-elevated p-5 flex flex-col gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted" />
            <div className="h-6 w-12 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div className="card-elevated overflow-hidden">
        <div className="border-b border-border px-4 py-3 flex gap-4">
          {[1, 2, 3, 4, 5]?.map((i) => (
            <div key={`filter-skel-${i}`} className="h-6 w-16 bg-muted rounded-md" />
          ))}
        </div>
        <table className="w-full">
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7]?.map((i) => (
              <tr key={`row-skel-${i}`} className="border-b border-border">
                <td className="px-4 py-3"><div className="h-4 w-28 bg-muted rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-20 bg-muted rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-12 bg-muted rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-12 bg-muted rounded" /></td>
                <td className="px-4 py-3"><div className="h-5 w-16 bg-muted rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-8 bg-muted rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-48 bg-muted rounded" /></td>
                <td className="px-4 py-3"><div className="h-4 w-10 bg-muted rounded" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}