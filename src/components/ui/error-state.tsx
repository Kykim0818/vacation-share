"use client";

import { AlertCircle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorStateProps {
  /** 에러 메시지 */
  message?: string;
  /** 재시도 콜백 */
  onRetry?: () => void;
  /** rate limit 에러인지 */
  isRateLimit?: boolean;
}

/**
 * API 호출 실패 시 표시하는 에러 상태 UI.
 * - 일반 에러: AlertCircle + 재시도 버튼
 * - rate limit: WifiOff 아이콘 + rate limit 안내
 */
export function ErrorState({
  message = "데이터를 불러오는 데 실패했습니다.",
  onRetry,
  isRateLimit = false,
}: ErrorStateProps) {
  const Icon = isRateLimit ? WifiOff : AlertCircle;

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <Icon className="h-6 w-6 text-destructive" />
        </div>
        <p className="font-medium text-destructive">
          {isRateLimit ? "API 요청 한도 초과" : "오류가 발생했습니다"}
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {isRateLimit
            ? "GitHub API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요."
            : message}
        </p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-1.5"
            onClick={onRetry}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            다시 시도
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 에러 메시지에서 rate limit 여부를 감지합니다.
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("rate limit") ||
      msg.includes("api rate") ||
      msg.includes("403") ||
      msg.includes("secondary rate")
    );
  }
  return false;
}
