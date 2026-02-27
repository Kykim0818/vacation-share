import type { Octokit } from "@octokit/rest";
import type {
  Vacation,
  CreateVacationRequest,
  UpdateVacationRequest,
  TeamConfig,
} from "@/lib/types";
import { VACATION_LABEL_PREFIX } from "@/lib/constants";
import { parseVacationIssue, buildVacationBody, buildIssueTitle } from "./parser";
import { getOctokitForRead, getOctokitForWrite, getRepoInfo } from "./client";

// ============================================================
// 읽기 작업 (GitHub App Installation Token 또는 사용자 토큰)
// ============================================================

/**
 * 지정 월의 휴가 목록을 조회합니다.
 *
 * - Open 상태의 Issue만 조회
 * - "vacation/*" 라벨이 붙은 Issue만 필터
 * - 월(YYYY-MM) 기반으로 날짜 범위 필터링
 *
 * @param month 대상 월 (YYYY-MM 형식)
 * @param userAccessToken OAuth App 폴백 시 사용할 사용자 토큰
 */
export async function listVacations(
  month: string,
  userAccessToken?: string
): Promise<Vacation[]> {
  const octokit = getOctokitForRead(userAccessToken);
  const { owner, repo } = getRepoInfo();

  // 월의 시작일/종료일 계산 (YYYY-MM → YYYY-MM-01 ~ YYYY-MM-{lastDay})
  const monthStart = `${month}-01`;
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

  // GitHub Issues API로 모든 open Issue를 가져온다 (pagination 처리)
  const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner,
    repo,
    state: "open",
    per_page: 100,
    // vacation 라벨로 필터 — 모든 vacation/* 라벨을 OR로 필터링할 수 없으므로
    // 전체 조회 후 클라이언트에서 라벨 필터링
  });

  const vacations: Vacation[] = [];

  for (const issue of issues) {
    // Pull Request 제외 (Issues API는 PR도 포함하므로)
    if ("pull_request" in issue && issue.pull_request) continue;

    // vacation/* 라벨 확인
    const hasVacationLabel = issue.labels.some((label) => {
      const labelName = typeof label === "string" ? label : label.name;
      return labelName?.startsWith(VACATION_LABEL_PREFIX);
    });
    if (!hasVacationLabel) continue;

    // frontmatter 파싱
    const vacation = parseVacationIssue({
      number: issue.number,
      body: issue.body ?? null,
      html_url: issue.html_url,
      created_at: issue.created_at,
      state: issue.state ?? "open",
    });
    if (!vacation) continue;

    // 날짜 범위 필터: 휴가 기간이 해당 월과 겹치는지 확인
    // 겹침 조건: vacation.startDate <= monthEnd && vacation.endDate >= monthStart
    if (vacation.startDate <= monthEnd && vacation.endDate >= monthStart) {
      vacations.push(vacation);
    }
  }

  return vacations;
}

/**
 * 특정 날짜 이후의 휴가 목록을 조회합니다.
 *
 * - Open 상태의 Issue만 조회
 * - "vacation/*" 라벨이 붙은 Issue만 필터
 * - endDate >= sinceDate 인 휴가만 반환 (진행 중인 휴가 포함)
 *
 * @param sinceDate 시작 기준 날짜 (YYYY-MM-DD 형식)
 * @param userAccessToken OAuth App 폴백 시 사용할 사용자 토큰
 */
export async function listVacationsSince(
  sinceDate: string,
  userAccessToken?: string
): Promise<Vacation[]> {
  const octokit = getOctokitForRead(userAccessToken);
  const { owner, repo } = getRepoInfo();

  const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner,
    repo,
    state: "open",
    per_page: 100,
  });

  const vacations: Vacation[] = [];

  for (const issue of issues) {
    if ("pull_request" in issue && issue.pull_request) continue;

    const hasVacationLabel = issue.labels.some((label) => {
      const labelName = typeof label === "string" ? label : label.name;
      return labelName?.startsWith(VACATION_LABEL_PREFIX);
    });
    if (!hasVacationLabel) continue;

    const vacation = parseVacationIssue({
      number: issue.number,
      body: issue.body ?? null,
      html_url: issue.html_url,
      created_at: issue.created_at,
      state: issue.state ?? "open",
    });
    if (!vacation) continue;

    // endDate가 sinceDate 이후인 휴가만 포함 (진행 중 + 미래 휴가)
    if (vacation.endDate >= sinceDate) {
      vacations.push(vacation);
    }
  }

  return vacations;
}

/**
 * 특정 Issue 번호로 휴가를 조회합니다.
 */
export async function getVacation(
  issueNumber: number,
  userAccessToken?: string
): Promise<Vacation | null> {
  const octokit = getOctokitForRead(userAccessToken);
  const { owner, repo } = getRepoInfo();

  const { data: issue } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  return parseVacationIssue({
    number: issue.number,
    body: issue.body ?? null,
    html_url: issue.html_url,
    created_at: issue.created_at,
    state: issue.state ?? "open",
  });
}

// ============================================================
// 쓰기 작업 (사용자 OAuth Token — Issue 작성자 = 해당 사용자)
// ============================================================

/**
 * 새 휴가를 등록합니다 (Issue 생성).
 *
 * @param data 휴가 생성 요청 데이터
 * @param typeLabel 휴가 유형 라벨 (예: "연차") — Issue 제목에 사용
 * @param labelName GitHub 라벨 이름 (예: "vacation/연차")
 * @param userAccessToken 사용자 OAuth accessToken
 */
export async function createVacation(
  data: CreateVacationRequest,
  typeLabel: string,
  labelName: string,
  userAccessToken: string
): Promise<Vacation> {
  const octokit = getOctokitForWrite(userAccessToken);
  const { owner, repo } = getRepoInfo();

  const title = buildIssueTitle(data.name, typeLabel);
  const body = buildVacationBody(data);

  const { data: issue } = await octokit.rest.issues.create({
    owner,
    repo,
    title,
    body,
    labels: [labelName],
  });

  const vacation = parseVacationIssue({
    number: issue.number,
    body: issue.body ?? null,
    html_url: issue.html_url,
    created_at: issue.created_at,
    state: issue.state ?? "open",
  });

  if (!vacation) {
    throw new Error("[GitHub] 생성된 Issue를 파싱할 수 없습니다.");
  }

  return vacation;
}

/**
 * 기존 휴가를 수정합니다 (Issue 업데이트).
 *
 * 기존 frontmatter를 유지하면서 변경된 필드만 업데이트합니다.
 *
 * @param issueNumber Issue 번호
 * @param updateData 수정할 필드
 * @param typeLabel 변경된 경우 새 휴가 유형 라벨
 * @param labelName 변경된 경우 새 GitHub 라벨 이름
 * @param userAccessToken 사용자 OAuth accessToken
 */
export async function updateVacation(
  issueNumber: number,
  updateData: UpdateVacationRequest,
  typeLabel: string | undefined,
  labelName: string | undefined,
  userAccessToken: string
): Promise<Vacation> {
  const octokit = getOctokitForWrite(userAccessToken);
  const { owner, repo } = getRepoInfo();

  // 기존 Issue 조회
  const { data: existingIssue } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  // 기존 데이터 파싱
  const existing = parseVacationIssue({
    number: existingIssue.number,
    body: existingIssue.body ?? null,
    html_url: existingIssue.html_url,
    created_at: existingIssue.created_at,
    state: existingIssue.state ?? "open",
  });

  if (!existing) {
    throw new Error(
      `[GitHub] Issue #${issueNumber}의 기존 데이터를 파싱할 수 없습니다.`
    );
  }

  // 병합: 기존 데이터 + 업데이트 데이터
  const merged: CreateVacationRequest = {
    name: existing.name,
    githubId: existing.githubId,
    type: updateData.type ?? existing.type,
    startDate: updateData.startDate ?? existing.startDate,
    endDate: updateData.endDate ?? existing.endDate,
    reason: updateData.reason !== undefined ? updateData.reason : existing.reason,
  };

  const newBody = buildVacationBody(merged);

  // Issue 업데이트 페이로드
  const updatePayload: Parameters<Octokit["rest"]["issues"]["update"]>[0] = {
    owner,
    repo,
    issue_number: issueNumber,
    body: newBody,
  };

  // 제목 업데이트 (유형이 변경된 경우)
  if (typeLabel) {
    updatePayload.title = buildIssueTitle(merged.name, typeLabel);
  }

  // 라벨 업데이트 (유형이 변경된 경우)
  if (labelName) {
    updatePayload.labels = [labelName];
  }

  const { data: updatedIssue } = await octokit.rest.issues.update(updatePayload);

  const vacation = parseVacationIssue({
    number: updatedIssue.number,
    body: updatedIssue.body ?? null,
    html_url: updatedIssue.html_url,
    created_at: updatedIssue.created_at,
    state: updatedIssue.state ?? "open",
  });

  if (!vacation) {
    throw new Error("[GitHub] 수정된 Issue를 파싱할 수 없습니다.");
  }

  return vacation;
}

/**
 * 휴가를 취소합니다 (Issue Close).
 *
 * @param issueNumber Issue 번호
 * @param userAccessToken 사용자 OAuth accessToken
 */
export async function closeVacation(
  issueNumber: number,
  userAccessToken: string
): Promise<void> {
  const octokit = getOctokitForWrite(userAccessToken);
  const { owner, repo } = getRepoInfo();

  await octokit.rest.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    state: "closed",
  });
}

// ============================================================
// 팀 설정 조회 (데이터 repo의 team-config.json)
// ============================================================

/**
 * 데이터 repo에서 team-config.json을 조회합니다.
 *
 * @param userAccessToken OAuth App 폴백 시 사용할 사용자 토큰
 */
export async function fetchTeamConfig(
  userAccessToken?: string
): Promise<TeamConfig> {
  const octokit = getOctokitForRead(userAccessToken);
  const { owner, repo } = getRepoInfo();

  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: "team-config.json",
  });

  // getContent는 파일이면 content 필드에 base64 인코딩된 내용을 반환
  if (Array.isArray(data) || data.type !== "file" || !data.content) {
    throw new Error("[GitHub] team-config.json을 읽을 수 없습니다.");
  }

  const decoded = Buffer.from(data.content, "base64").toString("utf-8");
  const config: TeamConfig = JSON.parse(decoded);

  return config;
}
