import matter from "gray-matter";
import type { Vacation, CreateVacationRequest } from "@/lib/types";
import { ISSUE_TITLE_PREFIX } from "@/lib/constants";

/**
 * GitHub Issue의 body에서 YAML frontmatter를 파싱하여 Vacation 객체로 변환합니다.
 *
 * Issue body 형식:
 * ```
 * ---
 * name: 홍길동
 * githubId: hong-gildong
 * type: annual
 * startDate: 2026-03-01
 * endDate: 2026-03-03
 * ---
 * 개인 사유로 휴가 신청합니다.
 * ```
 */

interface GitHubIssue {
  number: number;
  body: string | null;
  html_url: string;
  created_at: string;
  state: string;
}

/**
 * GitHub Issue → Vacation 객체로 파싱합니다.
 * frontmatter에 필수 필드가 없으면 null을 반환합니다.
 */
export function parseVacationIssue(issue: GitHubIssue): Vacation | null {
  if (!issue.body) return null;

  try {
    const { data, content } = matter(issue.body);

    // 필수 필드 검증
    const { name, githubId, type, startDate, endDate } = data;
    if (!name || !githubId || !type || !startDate || !endDate) {
      return null;
    }

    return {
      id: issue.number,
      name: String(name),
      githubId: String(githubId),
      type: String(type),
      startDate: String(startDate),
      endDate: String(endDate),
      reason: content.trim() || undefined,
      issueUrl: issue.html_url,
      createdAt: issue.created_at,
      state: issue.state === "open" ? "open" : "closed",
    };
  } catch {
    // frontmatter 파싱 실패 시 해당 Issue는 건너뜀
    console.warn(
      `[Parser] Issue #${issue.number} frontmatter 파싱 실패, 건너뜁니다.`
    );
    return null;
  }
}

/**
 * Vacation 데이터 → Issue body (YAML frontmatter + reason)로 변환합니다.
 */
export function buildVacationBody(data: CreateVacationRequest): string {
  const frontmatter = {
    name: data.name,
    githubId: data.githubId,
    type: data.type,
    startDate: data.startDate,
    endDate: data.endDate,
  };

  // gray-matter의 stringify로 YAML frontmatter 생성
  const body = matter.stringify(data.reason ?? "", frontmatter);
  return body;
}

/**
 * Issue 제목을 생성합니다.
 * 형식: "[휴가] 홍길동 - 연차"
 *
 * @param name 멤버 이름
 * @param typeLabel 휴가 유형 라벨 (예: "연차", "오전 반차")
 */
export function buildIssueTitle(name: string, typeLabel: string): string {
  return `${ISSUE_TITLE_PREFIX} ${name} - ${typeLabel}`;
}
