import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { getAuthProviderConfig } from "@/lib/auth/provider";

/**
 * GitHub 클라이언트 팩토리
 *
 * 인증 전략에 따라 읽기/쓰기용 Octokit 인스턴스를 생성합니다.
 *
 * - GitHub App 모드 (AUTH_PROVIDER=github-app):
 *   - 읽기: Installation Access Token (앱 자체 인증, 사용자 무관, 별도 rate limit)
 *   - 쓰기: 사용자 OAuth accessToken (Issue 작성자 = 해당 사용자)
 *
 * - OAuth App 모드 (AUTH_PROVIDER=oauth-app):
 *   - 읽기/쓰기 모두: 사용자 OAuth accessToken
 */

// ============================================================
// 환경변수 헬퍼
// ============================================================

function getGitHubAppEnv() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;

  if (!appId || !privateKey || !installationId) {
    return null;
  }

  return {
    appId,
    privateKey: privateKey.replace(/\\n/g, "\n"), // PEM 줄바꿈 복원
    installationId: Number(installationId),
  };
}

function getRepoConfig() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!owner || !repo) {
    console.warn(
      "[GitHub] 데이터 저장소 설정 누락: GITHUB_OWNER, GITHUB_REPO 환경변수를 확인하세요."
    );
  }

  return {
    owner: owner ?? "",
    repo: repo ?? "",
  };
}

// ============================================================
// 싱글턴 캐시 (읽기 전용 클라이언트)
// ============================================================

let _readClient: Octokit | null = null;

// ============================================================
// 읽기 전용 Octokit (GitHub App Installation Token)
// ============================================================

/**
 * 읽기 전용 Octokit 인스턴스를 반환합니다.
 *
 * - GitHub App 모드: Installation Access Token으로 인증 (자동 갱신)
 * - OAuth App 모드: 사용할 수 없음 → 반드시 userAccessToken이 필요
 *
 * @throws GitHub App 환경변수가 설정되지 않은 경우
 */
function getReadClient(): Octokit {
  if (_readClient) return _readClient;

  const appEnv = getGitHubAppEnv();
  if (!appEnv) {
    throw new Error(
      "[GitHub] GitHub App 읽기 클라이언트 생성 실패: GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID 환경변수를 확인하세요."
    );
  }

  _readClient = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: appEnv.appId,
      privateKey: appEnv.privateKey,
      installationId: appEnv.installationId,
    },
  });

  return _readClient;
}

// ============================================================
// 쓰기용 Octokit (사용자 OAuth Token)
// ============================================================

/**
 * 사용자 OAuth accessToken으로 인증된 Octokit 인스턴스를 반환합니다.
 * Issue 작성자가 해당 사용자로 기록됩니다.
 */
function getUserClient(accessToken: string): Octokit {
  return new Octokit({
    auth: accessToken,
  });
}

// ============================================================
// 통합 팩토리
// ============================================================

/**
 * 읽기 전용 Octokit을 반환합니다.
 *
 * - GitHub App 모드: Installation Token (앱 인증)
 * - OAuth App 모드: 사용자 accessToken 필수
 *
 * @param userAccessToken OAuth App 폴백 시 사용할 사용자 토큰
 */
export function getOctokitForRead(userAccessToken?: string): Octokit {
  const providerConfig = getAuthProviderConfig();

  if (providerConfig.type === "github-app") {
    return getReadClient();
  }

  // OAuth App 모드: 사용자 토큰으로 읽기
  if (!userAccessToken) {
    throw new Error(
      "[GitHub] OAuth App 모드에서는 읽기에도 사용자 accessToken이 필요합니다."
    );
  }

  return getUserClient(userAccessToken);
}

/**
 * 쓰기용 Octokit을 반환합니다.
 * 모든 모드에서 사용자 accessToken을 사용합니다.
 * (Issue 작성자가 해당 사용자로 기록되기 위함)
 *
 * @param userAccessToken 사용자 OAuth accessToken
 */
export function getOctokitForWrite(userAccessToken: string): Octokit {
  return getUserClient(userAccessToken);
}

/**
 * 데이터 저장소(Owner/Repo) 설정을 반환합니다.
 */
export function getRepoInfo() {
  return getRepoConfig();
}
