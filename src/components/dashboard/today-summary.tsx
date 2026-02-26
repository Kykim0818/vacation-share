"use client";

import { Palmtree, Sun } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Vacation } from "@/lib/types";

interface TodaySummaryProps {
  vacations: Vacation[] | undefined;
  isLoading: boolean;
}

export function TodaySummary({ vacations, isLoading }: TodaySummaryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const count = vacations?.length ?? 0;

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
          {count > 0 ? (
            <Palmtree className="h-6 w-6 text-primary" />
          ) : (
            <Sun className="h-6 w-6 text-amber-500" />
          )}
        </div>
        <div>
          <p className="text-lg font-semibold">
            {count > 0
              ? `오늘 ${count}명 휴가 중`
              : "오늘 휴가자가 없습니다"}
          </p>
          <p className="text-sm text-muted-foreground">
            {count > 0
              ? "아래에서 상세 현황을 확인하세요"
              : "모든 팀원이 출근 중입니다"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
