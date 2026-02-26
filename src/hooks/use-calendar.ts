"use client";

import { useState, useCallback, useMemo } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from "date-fns";

export function useCalendar() {
  const [currentDate, setCurrentDate] = useState(() => startOfMonth(new Date()));

  const goToPrevMonth = useCallback(() => {
    setCurrentDate((prev) => subMonths(prev, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentDate((prev) => addMonths(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(startOfMonth(new Date()));
  }, []);

  /** YYYY-MM 형식 (API 호출용) */
  const monthKey = format(currentDate, "yyyy-MM");

  /** 월 표시 텍스트 */
  const monthLabel = format(currentDate, "yyyy년 M월");

  /** 캘린더 그리드에 표시할 날짜 배열 (이전/다음 월 날짜 포함) */
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    // 일요일 시작 주
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  return {
    currentDate,
    monthKey,
    monthLabel,
    calendarDays,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
  };
}
