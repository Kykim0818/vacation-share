"use client";

import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarHeaderProps {
  monthLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function CalendarHeader({
  monthLabel,
  onPrevMonth,
  onNextMonth,
  onToday,
  isExpanded = false,
  onToggleExpand,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between">
<h2 className="text-lg font-semibold">{monthLabel}</h2>
      <div className="flex items-center gap-1">
        {onToggleExpand && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleExpand}
            className="hidden gap-2 sm:flex"
          >
            {isExpanded ? (
              <>
                <Minimize2 className="h-4 w-4" />
                기본 보기
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" />
                크게 보기
              </>
            )}
          </Button>
        )}
        {onToggleExpand && (
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleExpand}
            className="sm:hidden"
            aria-label={isExpanded ? "기본 보기" : "크게 보기"}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        )}
        <div className="w-2" /> {/* Spacer */}
<Button variant="outline" size="sm" onClick={onToday}>
오늘
</Button>
        <Button variant="ghost" size="icon" onClick={onPrevMonth} aria-label="이전 달">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onNextMonth} aria-label="다음 달">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
