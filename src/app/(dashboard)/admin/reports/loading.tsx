// src/app/(dashboard)/admin/reports/loading.tsx

import {
  SkeletonHeader,
  SkeletonStatGrid,
  SkeletonChart,
  SkeletonTable,
  Skeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      <SkeletonStatGrid count={4} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SkeletonChart />
        <SkeletonChart className="lg:col-span-2" />
      </div>

      <SkeletonChart />

      <SkeletonTable rows={6} cols={9} />
    </div>
  );
}
