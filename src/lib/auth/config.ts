import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import { getAuthProviderConfig } from "./provider";



/**
 * NextAuth.js v5 타입 확장
 * - JWT에 accessToken, githubId 저장
 * - Session에서 accessToken, githubId 노출
 */
declare module "next-auth" {
  interface Session {
    accessToken: string;
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
    githubId: string;
  }
}

function buildAuthConfig(): NextAuthConfig {
  const provider = getAuthProviderConfig();

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
       * JWT 콜백: 로그인 시 account에서 access_token을 추출하여 JWT에 저장
       * 이후 요청에서는 기존 token이 유지됨
       */
      async jwt({ token, account, profile }) {
        // 최초 로그인 시에만 account가 존재
        if (account && profile) {
          token.accessToken = account.access_token ?? "";
          // GitHub profile의 login 필드 = GitHub username
          token.githubId = (profile as { login?: string }).login ?? "";
        }
        return token;
      },

      /**
       * Session 콜백: JWT의 accessToken과 githubId를 클라이언트 세션에 노출
       */
      async session({ session, token }) {
        session.accessToken = token.accessToken;
        session.user.githubId = token.githubId;
        return session;
      },
    },
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(buildAuthConfig());
