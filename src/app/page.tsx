"use client";

import { useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, compareAsc } from "date-fns";
import { useSession } from "next-auth/react";

import { useVacations, useMyUpcomingVacations, useCancelVacation } from "@/hooks/use-vacations";
import { useTeam } from "@/hooks/use-team";
import { TodaySummary } from "@/components/dashboard/today-summary";
import { VacationCard } from "@/components/dashboard/vacation-card";
import { UpcomingList } from "@/components/dashboard/upcoming-list";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, isRateLimitError } from "@/components/ui/error-state";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palmtree, CalendarCheck, Pencil, Trash2 } from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const currentMonth = format(new Date(), "yyyy-MM");
  const {
    data: vacations,
    isLoading: vacationsLoading,
    error: vacationsError,
    refetch: refetchVacations,
  } = useVacations(currentMonth);
  const {
    data: teamConfig,
    isLoading: teamLoading,
    error: teamError,
    refetch: refetchTeam,
  } = useTeam();

  const {
    data: myUpcomingVacations,
    isLoading: myVacationsLoading,
  } = useMyUpcomingVacations(session?.user?.githubId);

  const isLoading = vacationsLoading || teamLoading;

  const error = vacationsError || teamError;
  const cancelMutation = useCancelVacation();

  // 수정 모달 상태
  const [editVacation, setEditVacation] = useState<Vacation | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // 취소 확인 다이얼로그 상태
  const [cancelTarget, setCancelTarget] = useState<Vacation | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handleEdit = useCallback((vacation: Vacation) => {
    setEditVacation(vacation);
    setEditOpen(true);
  }, []);

  const handleEditComplete = useCallback(() => {
    setEditOpen(false);
    setEditVacation(null);
  }, []);

  const handleCancelRequest = useCallback((vacation: Vacation) => {
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

  // 오늘 휴가자 필터
  const todayVacations = useMemo(() => {
    if (!vacations) return [];
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    return vacations.filter((v) => {
      const start = parseISO(v.startDate);
      const end = parseISO(v.endDate);
      // 오늘이 [startDate, endDate] 범위에 포함되면 오늘 휴가자
      return (
        isWithinInterval(dayStart, { start: startOfDay(start), end: endOfDay(end) })
      );
    });
  }, [vacations]);
  // 내 휴가: 오늘 이후 활성 휴가 (별도 API 조회, 월 제한 없음)
  const myVacations = useMemo(() => {
    if (!myUpcomingVacations) return [];
    return [...myUpcomingVacations].sort((a, b) =>
      compareAsc(parseISO(a.startDate), parseISO(b.startDate))
    );
  }, [myUpcomingVacations]);


  const getMember = (githubId: string) =>
    teamConfig?.members.find((m) => m.githubId === githubId);

  const getVacationType = (typeKey: string) =>
    teamConfig?.vacationTypes.find((t) => t.key === typeKey);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {/* 인사말 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {session?.user?.name
            ? `${session.user.name}님, 안녕하세요`
            : "팀 휴가 현황"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "yyyy년 M월 d일")} 기준 팀 휴가 현황입니다.
        </p>
      </div>

      {/* 오늘 요약 카드 */}
      <TodaySummary vacations={todayVacations} isLoading={isLoading} />

      {/* 에러 상태 */}
      {error && !isLoading && (
        <ErrorState
          message={error instanceof Error ? error.message : "데이터를 불러오는 데 실패했습니다."}
          isRateLimit={isRateLimitError(error)}
          onRetry={() => {
            refetchVacations();
            refetchTeam();
          }}
        />
      )}

      {/* 메인 그리드: 오늘 휴가자 + 다가오는 휴가 */}
      {!error && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* 오늘 휴가자 목록 (2열) */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palmtree className="h-4 w-4" />
                  오늘 휴가자
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-36" />
                        </div>
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : todayVacations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                      <Palmtree className="h-6 w-6 text-emerald-500" />
                    </div>
                    <p className="font-medium">오늘 휴가자가 없습니다</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      모든 팀원이 출근 중입니다
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayVacations.map((vacation) => (
                      <VacationCard
                        key={vacation.id}
                        vacation={vacation}
                        member={getMember(vacation.githubId)}
                        vacationType={getVacationType(vacation.type)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 다가오는 휴가 (1열) */}
          <div>
            <UpcomingList
              vacations={vacations}
              members={teamConfig?.members}
              vacationTypes={teamConfig?.vacationTypes}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* 내 휴가 섹션 */}
      {!error && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="h-4 w-4" />
              내 휴가
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(isLoading || myVacationsLoading) ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : myVacations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="font-medium text-muted-foreground">등록된 휴가가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myVacations.map((vacation) => {
                  const type = getVacationType(vacation.type);
                  return (
                    <div
                      key={vacation.id}
                      className="flex flex-col justify-between gap-4 rounded-lg border p-4 sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: type?.color ?? "#gray" }}
                          />
                          <span className="font-medium">
                            {type?.label ?? vacation.type}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {vacation.startDate === vacation.endDate
                            ? vacation.startDate
                            : `${vacation.startDate} ~ ${vacation.endDate}`}
                        </div>
                        {vacation.reason && (
                          <div className="text-xs text-muted-foreground">
                            {vacation.reason}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(vacation)}
                          className="h-8 gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only sm:not-sr-only">수정</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelRequest(vacation)}
                          className="h-8 gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only sm:not-sr-only">취소</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
              선택한 휴가를 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
