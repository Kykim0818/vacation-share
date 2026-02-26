"use client";

import { useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { toast } from "sonner";

/**
 * 세션 상태 모니터링 컴포넌트
 *
 * JWT 콜백에서 토큰 갱신 실패 시 session.error = "RefreshTokenError"가 설정됨.
 * 이를 감지하여 사용자에게 재로그인을 유도합니다.
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.error === "RefreshTokenError") {
      toast.error("인증이 만료되었습니다. 다시 로그인합니다.", {
        id: "session-expired",
        duration: 3000,
      });
      // 짧은 딜레이 후 재로그인 (토스트 표시 시간 확보)
      const timer = setTimeout(() => {
        signIn("github");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [session?.error]);

  return <>{children}</>;
}
