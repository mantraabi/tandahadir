"use client";

// src/components/shared/stats-card.tsx

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type StatsCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number; // positif = naik, negatif = turun
    label: string;
  };
  color?: "teal" | "amber" | "blue" | "red" | "green" | "purple";
  loading?: boolean;
};

const COLOR_MAP = {
  teal:   { bg: "bg-teal-50",   icon: "bg-[#0d5c63] text-white",  trend: "text-teal-600"   },
  amber:  { bg: "bg-amber-50",  icon: "bg-amber-500 text-white",  trend: "text-amber-600"  },
  blue:   { bg: "bg-blue-50",   icon: "bg-blue-600 text-white",   trend: "text-blue-600"   },
  red:    { bg: "bg-red-50",    icon: "bg-red-500 text-white",    trend: "text-red-600"    },
  green:  { bg: "bg-green-50",  icon: "bg-green-600 text-white",  trend: "text-green-600"  },
  purple: { bg: "bg-purple-50", icon: "bg-purple-600 text-white", trend: "text-purple-600" },
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "teal",
  loading = false,
}: StatsCardProps) {
  const colors = COLOR_MAP[color];

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 bg-gray-100 rounded-xl" />
          <div className="w-16 h-4 bg-gray-100 rounded" />
        </div>
        <div className="w-20 h-7 bg-gray-100 rounded mb-1" />
        <div className="w-28 h-3 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors.icon)}>
          <Icon size={18} />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            trend.value >= 0
              ? "bg-green-50 text-green-600"
              : "bg-red-50 text-red-500"
          )}>
            {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
      {trend && (
        <p className="text-xs text-gray-400 mt-1">{trend.label}</p>
      )}
    </div>
  );
}