"use client";

import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { CACHE_TIMES } from "@/lib/constants";

/**
 * API 응답에서 인증 만료 에러인지 확인
 */
function isAuthExpiredError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    msg.includes("인증이 만료되었습니다") ||
    msg.includes("Bad credentials") ||
    msg.includes("401")
  );
}

/**
 * 인증 만료 시 재로그인 유도 (중복 방지)
 */
let isRedirectingToLogin = false;
function handleAuthExpired() {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;
  toast.error("인증이 만료되었습니다. 다시 로그인합니다.", {
    id: "session-expired",
    duration: 3000,
  });
  setTimeout(() => {
    signIn("github");
    isRedirectingToLogin = false;
  }, 1500);
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: CACHE_TIMES.VACATIONS,
            gcTime: 10 * 60 * 1000, // 10분
            retry: (failureCount, error) => {
              // 인증 만료 에러는 재시도하지 않음
              if (isAuthExpiredError(error)) {
                return false;
              }
              // rate limit 에러는 재시도하지 않음
              if (error instanceof Error && error.message.includes("rate limit")) {
                return false;
              }
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
        },
        queryCache: new QueryCache({
          onError: (error) => {
            if (isAuthExpiredError(error)) {
              handleAuthExpired();
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (isAuthExpiredError(error)) {
              handleAuthExpired();
              return;
            }
            // mutation에서 개별 onError가 없는 경우 글로벌 토스트
            const msg = error instanceof Error ? error.message : "요청에 실패했습니다.";
            if (msg.toLowerCase().includes("rate limit")) {
              toast.error("API 요청 한도 초과. 잠시 후 다시 시도해주세요.");
            }
          },
        }),
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
