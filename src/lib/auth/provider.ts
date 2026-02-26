/**
 * 인증 추상화 레이어
 *
 * AUTH_PROVIDER 환경변수에 따라 GitHub App OAuth / OAuth App 전환
 * - "github-app" (기본): GitHub App의 clientId/clientSecret 사용
 * - "oauth-app": 기존 OAuth App의 clientId/clientSecret 사용
 */

export type AuthProviderType = "github-app" | "oauth-app";

interface AuthProviderConfig {
  type: AuthProviderType;
  clientId: string;
  clientSecret: string;
  /**
   * GitHub App: read:org (조직 멤버십 확인에 필요)
   * OAuth App: read:org, repo (private repo 접근에 필요)
   */
  scope: string;
}

function getAuthProvider(): AuthProviderConfig {
  const providerType =
    (process.env.AUTH_PROVIDER as AuthProviderType) ?? "github-app";

  switch (providerType) {
    case "github-app": {
      const clientId = process.env.GITHUB_APP_CLIENT_ID;
      const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        // 빌드 타임에는 환경변수가 없을 수 있으므로 빈 문자열로 fallback
        // 런타임에서 실제 요청 시 GitHub OAuth가 실패하여 에러 발생
        console.warn(
          "[Auth] GitHub App 인증 설정 누락: GITHUB_APP_CLIENT_ID, GITHUB_APP_CLIENT_SECRET 환경변수를 확인하세요."
        );
      }

      return {
        type: "github-app",
        clientId: clientId ?? "",
        clientSecret: clientSecret ?? "",
        // GitHub App은 Installation Token으로 repo 접근하므로
        // 사용자 OAuth에는 read:org만 필요
        scope: "read:org",
      };
    }

    case "oauth-app": {
      const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.warn(
          "[Auth] OAuth App 인증 설정 누락: GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_CLIENT_SECRET 환경변수를 확인하세요."
        );
      }

      return {
        type: "oauth-app",
        clientId: clientId ?? "",
        clientSecret: clientSecret ?? "",
        // OAuth App은 사용자 토큰으로 직접 repo 접근해야 하므로 repo scope 필요
        scope: "read:org repo",
      };
    }

    default:
      throw new Error(
        `[Auth] 알 수 없는 AUTH_PROVIDER: "${providerType}". "github-app" 또는 "oauth-app"을 사용하세요.`
      );
  }
}

/** 싱글턴 캐시 */
let _cachedProvider: AuthProviderConfig | null = null;

export function getAuthProviderConfig(): AuthProviderConfig {
  if (!_cachedProvider) {
    _cachedProvider = getAuthProvider();
  }
  return _cachedProvider;
}
