"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

import { useCalendar } from "@/hooks/use-calendar";
import { useVacations, useCancelVacation } from "@/hooks/use-vacations";
import { useTeam } from "@/hooks/use-team";

import { CalendarHeader } from "@/components/calendar/calendar-header";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { VacationDetail } from "@/components/calendar/vacation-detail";
import { VacationForm } from "@/components/vacation/vacation-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Vacation } from "@/lib/types";
import { ErrorState, isRateLimitError } from "@/components/ui/error-state";

import { cn } from "@/lib/utils";
export default function CalendarPage() {
  const {
    currentDate,
    monthKey,
    monthLabel,
    calendarDays,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
  } = useCalendar();

  const {
    data: vacations,
    isLoading: vacationsLoading,
    error: vacationsError,
    refetch: refetchVacations,
  } = useVacations(monthKey);
  const {
    data: teamConfig,
    isLoading: teamLoading,
    error: teamError,
    refetch: refetchTeam,
  } = useTeam();

  const isLoading = vacationsLoading || teamLoading;

  const error = vacationsError || teamError;
  const cancelMutation = useCancelVacation();

  // 크게 보기 모드 상태
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // 상세 모달 상태
  const [selectedVacation, setSelectedVacation] = useState<Vacation | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);

  // 수정 모달 상태
  const [editVacation, setEditVacation] = useState<Vacation | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // 취소 확인 다이얼로그 상태
  const [cancelTarget, setCancelTarget] = useState<Vacation | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handleVacationClick = useCallback((vacation: Vacation) => {
    setSelectedVacation(vacation);
    setDetailOpen(true);
  }, []);

  const handleEdit = useCallback((vacation: Vacation) => {
    setDetailOpen(false);
    setEditVacation(vacation);
    setEditOpen(true);
  }, []);

  const handleEditComplete = useCallback(() => {
    setEditOpen(false);
    setEditVacation(null);
  }, []);

  const handleCancelRequest = useCallback((vacation: Vacation) => {
    setDetailOpen(false);
    setCancelTarget(vacation);
    setCancelDialogOpen(true);
  }, []);

  const handleCancelConfirm = useCallback(async () => {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync(cancelTarget.id);
      toast.success("휴가가 취소되었습니다");
      setCancelDialogOpen(false);
      setCancelTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "휴가 취소에 실패했습니다"
      );
    }
  }, [cancelTarget, cancelMutation]);

  const selectedMember = selectedVacation
    ? teamConfig?.members.find(
        (m) => m.githubId === selectedVacation.githubId
      )
    : undefined;

  const selectedType = selectedVacation
    ? teamConfig?.vacationTypes.find(
        (t) => t.key === selectedVacation.type
      )
    : undefined;

  return (
    <div
      className={cn(
        "mx-auto space-y-4 px-4 py-6 transition-all duration-300",
        isExpanded ? "max-w-[80vw]" : "max-w-5xl"
      )}
    >
<CalendarHeader
monthLabel={monthLabel}
onPrevMonth={goToPrevMonth}
onNextMonth={goToNextMonth}
        onToday={goToToday}
        isExpanded={isExpanded}
        onToggleExpand={toggleExpand}
/>

      {error && !isLoading ? (
        <ErrorState
          message={error instanceof Error ? error.message : "데이터를 불러오는 데 실패했습니다."}
          isRateLimit={isRateLimitError(error)}
          onRetry={() => {
            refetchVacations();
            refetchTeam();
          }}
        />
      ) : (
        <CalendarGrid
          days={calendarDays}
          currentDate={currentDate}
          vacations={vacations}
          members={teamConfig?.members}
          vacationTypes={teamConfig?.vacationTypes}
          isLoading={isLoading}
          isExpanded={isExpanded}
          onVacationClick={handleVacationClick}
        />
      )}

      <VacationDetail
        vacation={selectedVacation}
        member={selectedMember}
        vacationType={selectedType}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleEdit}
        onCancel={handleCancelRequest}
      />

      {/* 수정 모달 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <VacationForm
            editVacation={editVacation}
            onComplete={handleEditComplete}
          />
        </DialogContent>
      </Dialog>

      {/* 취소 확인 다이얼로그 */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>휴가 취소</DialogTitle>
            <DialogDescription>
              {cancelTarget && (
                <>
                  <strong>{cancelTarget.name}</strong>님의 휴가를
                  취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelDialogOpen(false)}
            >
              닫기
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelConfirm}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "취소 중..." : "휴가 취소"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
