"use client";

import { useMemo } from "react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { useSession } from "next-auth/react";

import { useVacations } from "@/hooks/use-vacations";
import { useTeam } from "@/hooks/use-team";
import { TodaySummary } from "@/components/dashboard/today-summary";
import { VacationCard } from "@/components/dashboard/vacation-card";
import { UpcomingList } from "@/components/dashboard/upcoming-list";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, isRateLimitError } from "@/components/ui/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palmtree } from "lucide-react";

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

  const isLoading = vacationsLoading || teamLoading;

  const error = vacationsError || teamError;
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
    </div>
  );
}
