"use client";

import { format, parseISO, isAfter, startOfDay, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Vacation, Member, VacationType } from "@/lib/types";

interface UpcomingListProps {
  vacations: Vacation[] | undefined;
  members: Member[] | undefined;
  vacationTypes: VacationType[] | undefined;
  isLoading: boolean;
}

export function UpcomingList({
  vacations,
  members,
  vacationTypes,
  isLoading,
}: UpcomingListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            다가오는 휴가
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const today = startOfDay(new Date());
  const nextWeek = addDays(today, 7);

  // 오늘 이후 ~ 7일 내 시작하는 휴가 필터
  const upcoming = (vacations ?? [])
    .filter((v) => {
      const start = parseISO(v.startDate);
      return isAfter(start, today) && !isAfter(start, nextWeek);
    })
    .sort(
      (a, b) =>
        parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()
    );

  const getMember = (githubId: string) =>
    members?.find((m) => m.githubId === githubId);

  const getVacationType = (typeKey: string) =>
    vacationTypes?.find((t) => t.key === typeKey);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          다가오는 휴가
          {upcoming.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {upcoming.length}건
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            향후 7일 내 예정된 휴가가 없습니다
          </p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((vacation) => {
              const member = getMember(vacation.githubId);
              const type = getVacationType(vacation.type);
              const displayName = member?.name ?? vacation.name;
              const startDate = parseISO(vacation.startDate);
              const typeColor = type?.color ?? "#6B7280";

              return (
                <li
                  key={vacation.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: member?.color ?? "#6B7280" }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{displayName}</span>
                    <span className="ml-1.5 text-muted-foreground">
                      {format(startDate, "M/d (EEE)", { locale: ko })}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-xs"
                    style={{
                      color: typeColor,
                      borderColor: `${typeColor}40`,
                    }}
                  >
                    {type?.label ?? vacation.type}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
