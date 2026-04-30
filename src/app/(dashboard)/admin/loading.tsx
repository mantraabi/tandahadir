// src/app/(dashboard)/admin/loading.tsx

import {
  SkeletonHeader,
  SkeletonStatGrid,
  SkeletonChart,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonStatGrid count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SkeletonChart />
        <SkeletonChart className="lg:col-span-2" />
      </div>
      <SkeletonTable rows={5} cols={6} />
    </div>
  );
}
