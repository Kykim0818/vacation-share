"use client";

import { format, isSameMonth, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import type { Vacation, Member, VacationType } from "@/lib/types";

/** 캘린더 셀에 표시할 연속 휴가 바 정보 */
export interface VacationBar {
  vacation: Vacation;
  member?: Member;
  vacationType?: VacationType;
  /** 이 셀이 바의 시작인지 */
  isStart: boolean;
  /** 이 셀이 바의 끝인지 */
  isEnd: boolean;
  /** 바가 할당된 행 인덱스 (겹침 방지) */
  lane: number;
}

interface CalendarCellProps {
  date: Date;
  currentMonth: Date;
  bars: VacationBar[];
  maxLanes: number;
  onVacationClick: (vacation: Vacation) => void;
}

const MAX_VISIBLE_LANES = 3;

export function CalendarCell({
  date,
  currentMonth,
  bars,
  maxLanes,
  onVacationClick,
}: CalendarCellProps) {
  const isCurrentMonth = isSameMonth(date, currentMonth);
  const today = isToday(date);
  const dayNumber = format(date, "d");

  const visibleBars = bars.filter((b) => b.lane < MAX_VISIBLE_LANES);
  const hiddenCount = bars.length - visibleBars.length;

  // 빈 lane 슬롯을 포함한 배열 (위치 보정용)
  const laneSlots: (VacationBar | null)[] = Array.from(
    { length: Math.min(maxLanes, MAX_VISIBLE_LANES) },
    (_, i) => visibleBars.find((b) => b.lane === i) ?? null
  );

  return (
    <div
      className={cn(
        "relative flex min-h-[80px] flex-col border-b border-r p-1 text-sm md:min-h-[100px]",
        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
        today && "bg-primary/5"
      )}
    >
      {/* 날짜 숫자 */}
      <span
        className={cn(
          "mb-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
          today && "bg-primary text-primary-foreground"
        )}
      >
        {dayNumber}
      </span>

      {/* 휴가 바 */}
      <div className="flex flex-1 flex-col gap-px overflow-hidden">
        {laneSlots.map((bar, idx) =>
          bar ? (
            <button
              key={`${bar.vacation.id}-${idx}`}
              type="button"
              onClick={() => onVacationClick(bar.vacation)}
              className={cn(
                "flex h-5 items-center truncate px-1 text-[10px] font-medium leading-tight text-white transition-opacity hover:opacity-80",
                bar.isStart && "rounded-l",
                bar.isEnd && "rounded-r",
                !bar.isStart && "-ml-1 pl-0",
                !bar.isEnd && "-mr-1 pr-0"
              )}
              style={{
                backgroundColor: bar.member?.color ?? bar.vacationType?.color ?? "#6B7280",
              }}
              title={`${bar.member?.name ?? bar.vacation.name} - ${bar.vacationType?.label ?? bar.vacation.type}`}
              aria-label={`${bar.member?.name ?? bar.vacation.name}의 ${bar.vacationType?.label ?? bar.vacation.type} 휴가 상세 보기`}
            >
              {bar.isStart && (
                <span className="truncate">
                  {bar.member?.name ?? bar.vacation.name}
                </span>
              )}
            </button>
          ) : (
            <div key={`empty-${idx}`} className="h-5" />
          )
        )}
        {hiddenCount > 0 && (
          <span className="mt-auto text-[10px] font-medium text-muted-foreground">
            +{hiddenCount}
          </span>
        )}
      </div>
    </div>
  );
}
