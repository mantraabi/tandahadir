// src/app/(dashboard)/teacher/loading.tsx

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
      <SkeletonChart />
      <SkeletonTable rows={5} cols={4} />
    </div>
  );
}
