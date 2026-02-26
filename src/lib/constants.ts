/** 캐시 시간 설정 (밀리초) */
export const CACHE_TIMES = {
  VACATIONS: 60 * 1000, // 1분
  TEAM_CONFIG: 5 * 60 * 1000, // 5분
} as const;

/** GitHub Issue 라벨 접두사 */
export const VACATION_LABEL_PREFIX = "vacation/" as const;

/** GitHub Issue 제목 접두사 */
export const ISSUE_TITLE_PREFIX = "[휴가]" as const;

/** React Query 키 */
export const QUERY_KEYS = {
  VACATIONS: "vacations",
  TEAM_CONFIG: "team-config",
} as const;
