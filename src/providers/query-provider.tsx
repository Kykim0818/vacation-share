"use client";

import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CACHE_TIMES } from "@/lib/constants";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: CACHE_TIMES.VACATIONS,
            gcTime: 10 * 60 * 1000, // 10분
            retry: (failureCount, error) => {
              // rate limit 에러는 재시도하지 않음
              if (error instanceof Error && error.message.includes("rate limit")) {
                return false;
              }
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
        },
        mutationCache: new MutationCache({
          onError: (error) => {
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
