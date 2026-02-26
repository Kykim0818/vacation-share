"use client";

import { useMemo } from "react";
import {
  format,
  parseISO,
  isSameDay,
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfMonth,
  getDay,
} from "date-fns";

import { CalendarCell, type VacationBar } from "./calendar-cell";
import { Skeleton } from "@/components/ui/skeleton";
import type { Vacation, Member, VacationType } from "@/lib/types";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

interface CalendarGridProps {
  days: Date[];
  currentDate: Date;
  vacations: Vacation[] | undefined;
  members: Member[] | undefined;
  vacationTypes: VacationType[] | undefined;
  isLoading: boolean;
  onVacationClick: (vacation: Vacation) => void;
  isExpanded?: boolean;
}

/**
 * 각 날짜에 대해 VacationBar 배열을 계산합니다.
 * 연속 휴가는 동일한 lane에 배치하여 바(bar) 형태로 연결합니다.
 */
function computeBars(
  days: Date[],
  vacations: Vacation[],
  members: Member[] | undefined,
  vacationTypes: VacationType[] | undefined
): Map<string, VacationBar[]> {
  const barMap = new Map<string, VacationBar[]>();

  // dateKey 초기화
  for (const day of days) {
    barMap.set(format(day, "yyyy-MM-dd"), []);
  }

  // 각 주(week row) 단위로 lane을 할당해야 시각적으로 정확
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  for (const week of weeks) {
    // 이 주에 표시되는 모든 휴가를 수집
    const weekStart = startOfDay(week[0]);
    const weekEnd = endOfDay(week[6]);

    const weekVacations = vacations.filter((v) => {
      const vStart = startOfDay(parseISO(v.startDate));
      const vEnd = endOfDay(parseISO(v.endDate));
      // 휴가 기간이 이 주와 겹치는지
      return vStart <= weekEnd && vEnd >= weekStart;
    });

    // startDate 기준 정렬 (먼저 시작하는 휴가가 위 lane)
    weekVacations.sort(
      (a, b) =>
        parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()
    );

    // lane 할당: 간단한 greedy 알고리즘
    const laneEndDays: number[] = []; // 각 lane이 사용 중인 마지막 요일 인덱스

    for (const vacation of weekVacations) {
      const vStart = startOfDay(parseISO(vacation.startDate));
      const vEnd = endOfDay(parseISO(vacation.endDate));
      const member = members?.find((m) => m.githubId === vacation.githubId);
      const vacationType = vacationTypes?.find(
        (t) => t.key === vacation.type
      );

      // 이 주에서의 시작/끝 요일 인덱스 (0~6)
      let startIdx = 0;
      let endIdx = 6;

      for (let i = 0; i < 7; i++) {
        if (isSameDay(week[i], vStart) || week[i] > vStart) {
          startIdx = i;
          break;
        }
      }
      // vStart가 이 주 이전이면 startIdx = 0
      if (vStart < startOfDay(week[0])) {
        startIdx = 0;
      }

      for (let i = 6; i >= 0; i--) {
        if (isSameDay(week[i], vEnd) || week[i] < vEnd) {
          endIdx = i;
          break;
        }
      }
      // vEnd가 이 주 이후이면 endIdx = 6
      if (vEnd > endOfDay(week[6])) {
        endIdx = 6;
      }

      // lane 찾기
      let lane = -1;
      for (let l = 0; l < laneEndDays.length; l++) {
        if (laneEndDays[l] < startIdx) {
          lane = l;
          break;
        }
      }
      if (lane === -1) {
        lane = laneEndDays.length;
        laneEndDays.push(-1);
      }
      laneEndDays[lane] = endIdx;

      // 각 날짜에 bar 정보 추가
      for (let i = startIdx; i <= endIdx; i++) {
        const dateKey = format(week[i], "yyyy-MM-dd");
        const bars = barMap.get(dateKey);
        if (bars) {
          bars.push({
            vacation,
            member,
            vacationType,
            isStart: isSameDay(week[i], vStart),
            isEnd: isSameDay(week[i], vEnd),
            lane,
          });
        }
      }
    }
  }

  return barMap;
}

export function CalendarGrid({
  days,
  currentDate,
  vacations,
  members,
  vacationTypes,
  isLoading,
  isExpanded = false,
  onVacationClick,
}: CalendarGridProps) {
  const barMap = useMemo(() => {
    if (!vacations || vacations.length === 0) {
      return new Map<string, VacationBar[]>();
    }
    return computeBars(days, vacations, members, vacationTypes);
  }, [days, vacations, members, vacationTypes]);

  // 전체에서 최대 lane 수 (셀 높이 일관성용)
  const maxLanes = useMemo(() => {
    let max = 0;
    for (const bars of barMap.values()) {
      const maxLane = bars.reduce((m, b) => Math.max(m, b.lane), -1);
      if (maxLane + 1 > max) max = maxLane + 1;
    }
    return max;
  }, [barMap]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-px">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="flex h-8 items-center justify-center text-xs font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="min-h-[80px] rounded-none border-b border-r md:min-h-[100px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "flex items-center justify-center font-medium",
              isExpanded ? "h-10 text-sm" : "h-8 text-xs",
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
            )}
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 캘린더 그리드 */}
      <div className="grid grid-cols-7 border-l border-t">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const bars = barMap.get(dateKey) ?? [];

          return (
            <CalendarCell
              key={dateKey}
              date={day}
              currentMonth={currentDate}
              bars={bars}
              maxLanes={maxLanes}
              isExpanded={isExpanded}
              onVacationClick={onVacationClick}
            />
          );
        })}
      </div>
    </div>
  );
}
