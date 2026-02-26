import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import { getAuthProviderConfig } from "./provider";

/**
 * NextAuth.js v5 타입 확장
 *
 * - JWT에 accessToken, refreshToken, expiresAt, githubId 저장
 * - Session에서 accessToken, githubId, error 노출
 */
declare module "next-auth" {
  interface Session {
    accessToken: string;
    error?: "RefreshTokenError";
    user: {
      id: string;
      name: string;
      email: string;
      image: string;
      githubId: string; // GitHub login (username)
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number; // Unix timestamp (초 단위)
    githubId: string;
    error?: "RefreshTokenError";
  }
}

/**
 * GitHub App OAuth 토큰 갱신
 *
 * GitHub App의 user access token은 8시간 후 만료됨.
 * refresh_token으로 새 access_token + refresh_token을 발급받음.
 * (refresh_token은 한 번 사용하면 무효화되므로 반드시 새 값으로 교체)
 */
async function refreshAccessToken(
  token: import("@auth/core/jwt").JWT
): Promise<import("@auth/core/jwt").JWT> {
  const provider = getAuthProviderConfig();

  try {
    if (!token.refreshToken) {
      throw new Error("refresh_token이 없습니다.");
    }

    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          client_id: provider.clientId,
          client_secret: provider.clientSecret,
          grant_type: "refresh_token",
          refresh_token: token.refreshToken,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(
        data.error_description ?? data.error ?? "토큰 갱신 실패"
      );
    }

    console.log("[Auth] GitHub 토큰 갱신 성공");

    return {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000 + (data.expires_in ?? 28800)),
      error: undefined,
    };
  } catch (error) {
    console.error("[Auth] GitHub 토큰 갱신 실패:", error);
    return {
      ...token,
      error: "RefreshTokenError",
    };
  }
}

function buildAuthConfig(): NextAuthConfig {
  const provider = getAuthProviderConfig();
  const isGitHubApp = provider.type === "github-app";

  return {
    // Vercel 등 리버스 프록시 환경에서 X-Forwarded-Host 헤더를 신뢰
    trustHost: true,

    providers: [
      GitHub({
        clientId: provider.clientId,
        clientSecret: provider.clientSecret,
        authorization: {
          params: {
            scope: provider.scope,
          },
        },
      }),
    ],

    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60, // 30일
    },

    pages: {
      signIn: "/login",
    },

    callbacks: {
      /**
       * JWT 콜백: 토큰 저장 + 자동 갱신 처리
       *
       * 1) 최초 로그인: account에서 access_token, refresh_token, expires_at 추출
       * 2) 토큰 유효: 그대로 반환
       * 3) 토큰 만료 (GitHub App만): refresh_token으로 자동 갱신
       *
       * OAuth App은 토큰이 만료되지 않으므로 갱신 로직 불필요.
       */
      async jwt({ token, account, profile }) {
        // 1) 최초 로그인 시에만 account가 존재
        if (account && profile) {
          token.accessToken = account.access_token ?? "";
          token.githubId =
            (profile as { login?: string }).login ?? "";

          // GitHub App 모드: refresh_token과 만료 시간 저장
          if (isGitHubApp && account.refresh_token) {
            token.refreshToken = account.refresh_token;
            // expires_at이 있으면 사용, 없으면 8시간 후로 설정
            token.expiresAt =
              account.expires_at ??
              Math.floor(Date.now() / 1000 + 28800);
          }

          token.error = undefined;
          return token;
        }

        // 2) OAuth App 모드: 토큰 만료 없음 → 그대로 반환
        if (!isGitHubApp) {
          return token;
        }

        // 3) GitHub App 모드: 만료 확인
        // expiresAt이 없는 경우 (이전 세션 호환) → 갱신 시도
        if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
          // 토큰 아직 유효
          return token;
        }

        // 4) 토큰 만료 → refresh
        return refreshAccessToken(token);
      },

      /**
       * Session 콜백: JWT의 accessToken, githubId, error를 클라이언트 세션에 노출
       */
      async session({ session, token }) {
        session.accessToken = token.accessToken;
        session.user.githubId = token.githubId;
        if (token.error) {
          session.error = token.error;
        }
        return session;
      },
    },
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(buildAuthConfig());
