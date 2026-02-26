"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTeam } from "@/hooks/use-team";
import {
  useCreateVacation,
  useUpdateVacation,
} from "@/hooks/use-vacations";
import type { Vacation } from "@/lib/types";

interface VacationFormProps {
  /** 수정 모드일 때 기존 휴가 데이터 */
  editVacation?: Vacation | null;
  /** 수정 완료/취소 시 콜백 */
  onComplete?: () => void;
}

export function VacationForm({ editVacation, onComplete }: VacationFormProps) {
  const { data: session } = useSession();
  const { data: teamConfig } = useTeam();
  const createMutation = useCreateVacation();
  const updateMutation = useUpdateVacation();

  const isEditMode = !!editVacation;

  // 폼 상태
  const [type, setType] = useState(editVacation?.type ?? "");
  const [startDate, setStartDate] = useState(
    editVacation?.startDate ?? format(new Date(), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    editVacation?.endDate ?? format(new Date(), "yyyy-MM-dd")
  );
  const [reason, setReason] = useState(editVacation?.reason ?? "");

  // 수정 모드 전환 시 폼 데이터 갱신
  useEffect(() => {
    if (editVacation) {
      setType(editVacation.type);
      setStartDate(editVacation.startDate);
      setEndDate(editVacation.endDate);
      setReason(editVacation.reason ?? "");
    }
  }, [editVacation]);

  // 유효성 검사
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!type) {
      newErrors.type = "휴가 유형을 선택해주세요";
    }
    if (!startDate) {
      newErrors.startDate = "시작일을 선택해주세요";
    }
    if (!endDate) {
      newErrors.endDate = "종료일을 선택해주세요";
    }
    if (startDate && endDate && endDate < startDate) {
      newErrors.endDate = "종료일은 시작일 이후여야 합니다";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    if (isEditMode && editVacation) {
      // 수정
      updateMutation.mutate(
        {
          id: editVacation.id,
          data: {
            type,
            startDate,
            endDate,
            reason: reason || undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success("휴가가 수정되었습니다");
            onComplete?.();
          },
          onError: (error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : "휴가 수정에 실패했습니다"
            );
          },
        }
      );
    } else {
      // 등록
      if (!session?.user) {
        toast.error("로그인이 필요합니다");
        return;
      }

      createMutation.mutate(
        {
          name: session.user.name ?? "",
          githubId: session.user.githubId,
          type,
          startDate,
          endDate,
          reason: reason || undefined,
        },
        {
          onSuccess: () => {
            toast.success("휴가가 등록되었습니다");
            // 폼 초기화
            setType("");
            setStartDate(format(new Date(), "yyyy-MM-dd"));
            setEndDate(format(new Date(), "yyyy-MM-dd"));
            setReason("");
            setErrors({});
            onComplete?.();
          },
          onError: (error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : "휴가 등록에 실패했습니다"
            );
          },
        }
      );
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  // 반차/반반차 유형 선택 시 종료일 = 시작일로 고정
  const isHalfDay = ["am-half", "pm-half", "am-quarter", "pm-quarter"].includes(
    type
  );
  useEffect(() => {
    if (isHalfDay && startDate) {
      setEndDate(startDate);
    }
  }, [isHalfDay, startDate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? "휴가 수정" : "휴가 등록"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 등록자 정보 (읽기 전용) */}
          {!isEditMode && session?.user && (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">등록자</p>
              <p className="font-medium">
                {session.user.name}{" "}
                <span className="text-sm text-muted-foreground">
                  (@{session.user.githubId})
                </span>
              </p>
            </div>
          )}

          {/* 휴가 유형 */}
          <div className="space-y-2">
            <Label htmlFor="vacation-type">
              휴가 유형 <span className="text-destructive">*</span>
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="vacation-type">
                <SelectValue placeholder="유형을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {teamConfig?.vacationTypes.map((vt) => (
                  <SelectItem key={vt.key} value={vt.key}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: vt.color }}
                      />
                      {vt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type}</p>
            )}
          </div>

          {/* 시작일 / 종료일 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-date">
                시작일 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">
                종료일 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isHalfDay}
              />
              {errors.endDate && (
                <p className="text-xs text-destructive">{errors.endDate}</p>
              )}
              {isHalfDay && (
                <p className="text-xs text-muted-foreground">
                  반차/반반차는 하루 단위입니다
                </p>
              )}
            </div>
          </div>

          {/* 사유 */}
          <div className="space-y-2">
            <Label htmlFor="reason">사유 (선택)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="휴가 사유를 입력하세요 (선택 사항)"
              rows={3}
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditMode
                  ? "수정 중..."
                  : "등록 중..."
                : isEditMode
                  ? "수정"
                  : "등록"}
            </Button>
            {isEditMode && onComplete && (
              <Button type="button" variant="outline" onClick={onComplete}>
                취소
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
