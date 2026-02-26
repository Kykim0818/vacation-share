"use client";

import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Vacation, Member, VacationType } from "@/lib/types";

interface VacationCardProps {
  vacation: Vacation;
  member?: Member;
  vacationType?: VacationType;
}

export function VacationCard({
  vacation,
  member,
  vacationType,
}: VacationCardProps) {
  const startDate = parseISO(vacation.startDate);
  const endDate = parseISO(vacation.endDate);
  const days = differenceInCalendarDays(endDate, startDate) + 1;
  const isSingleDay = days === 1;

  const displayName = member?.name ?? vacation.name;
  const teamName = member?.team;
  const initials = displayName.slice(0, 2);
  const memberColor = member?.color ?? "#6B7280";
  const typeLabel = vacationType?.label ?? vacation.type;
  const typeColor = vacationType?.color ?? "#6B7280";

  return (
    <Card className="transition-colors hover:bg-accent/50">
      <CardContent className="flex items-center gap-3 p-4">
        {/* 멤버 아바타 */}
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback
            className="text-xs font-medium text-white"
            style={{ backgroundColor: memberColor }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* 멤버 정보 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{displayName}</span>
            {teamName && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {teamName}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {isSingleDay ? (
              <span>{format(startDate, "M/d (EEE)", { locale: ko })}</span>
            ) : (
              <span>
                {format(startDate, "M/d", { locale: ko })} ~{" "}
                {format(endDate, "M/d (EEE)", { locale: ko })} ({days}일)
              </span>
            )}
          </div>
        </div>

        {/* 휴가 유형 배지 */}
        <Badge
          variant="secondary"
          className="shrink-0 text-xs"
          style={{
            backgroundColor: `${typeColor}15`,
            color: typeColor,
            borderColor: `${typeColor}30`,
          }}
        >
          {typeLabel}
        </Badge>
      </CardContent>
    </Card>
  );
}
