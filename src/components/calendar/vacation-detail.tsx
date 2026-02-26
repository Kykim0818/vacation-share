"use client";

import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays, User, Tag, FileText } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTeam } from "@/hooks/use-team";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Vacation, Member, VacationType } from "@/lib/types";

interface VacationDetailProps {
  vacation: Vacation | null;
  member?: Member;
  vacationType?: VacationType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (vacation: Vacation) => void;
  onCancel?: (vacation: Vacation) => void;
}

export function VacationDetail({
  vacation,
  member,
  vacationType,
  open,
  onOpenChange,
  onEdit,
  onCancel,
}: VacationDetailProps) {
  const { data: session } = useSession();
  const { data: teamConfig } = useTeam();

  if (!vacation) return null;

  const startDate = parseISO(vacation.startDate);
  const endDate = parseISO(vacation.endDate);
  const days = differenceInCalendarDays(endDate, startDate) + 1;
  const displayName = member?.name ?? vacation.name;
  const typeLabel = vacationType?.label ?? vacation.type;
  const typeColor = vacationType?.color ?? "#6B7280";

  // 권한 검사: 본인 또는 admin (team-config.json의 role 필드)
  const currentGithubId = session?.user?.githubId;
  const isOwner = currentGithubId === vacation.githubId;
  const currentMember = teamConfig?.members.find(
    (m) => m.githubId === currentGithubId
  );
  const isAdmin = currentMember?.role === "admin";
  const canModify = isOwner || isAdmin;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: member?.color ?? "#6B7280" }}
            />
            {displayName}
          </DialogTitle>
          <DialogDescription>휴가 상세 정보</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 휴가 유형 */}
          <div className="flex items-center gap-3">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">유형</span>
            <Badge
              variant="secondary"
              className="ml-auto"
              style={{
                backgroundColor: `${typeColor}15`,
                color: typeColor,
                borderColor: `${typeColor}30`,
              }}
            >
              {typeLabel}
            </Badge>
          </div>

          <Separator />

          {/* 기간 */}
          <div className="flex items-center gap-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">기간</span>
            <span className="ml-auto text-sm font-medium">
              {format(startDate, "yyyy.M.d (EEE)", { locale: ko })}
              {days > 1 && (
                <>
                  {" ~ "}
                  {format(endDate, "M.d (EEE)", { locale: ko })}
                </>
              )}
              <span className="ml-1.5 text-muted-foreground">
                ({days}일)
              </span>
            </span>
          </div>

          <Separator />

          {/* 팀 */}
          {member?.team && (
            <>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">팀</span>
                <span className="ml-auto text-sm">{member.team}</span>
              </div>
              <Separator />
            </>
          )}

          {/* 사유 */}
          {vacation.reason && (
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm text-muted-foreground">사유</span>
                <p className="mt-1 text-sm">{vacation.reason}</p>
              </div>
            </div>
          )}
        </div>

        {canModify && (
          <DialogFooter className="gap-2 sm:gap-0">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(vacation)}
              >
                휴가 수정
              </Button>
            )}
            {onCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancel(vacation)}
              >
                휴가 취소
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
