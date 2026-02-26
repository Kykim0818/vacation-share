/** 팀 멤버 */
export interface Member {
  githubId: string;
  name: string;
  team: string;
  color: string;
  role: "admin" | "member";
}

/** 휴가 유형 */
export interface VacationType {
  key: string;
  label: string;
  labelName: string; // GitHub label name (예: "vacation/연차")
  color: string;
}

/** 팀 설정 (데이터 repo의 team-config.json) */
export interface TeamConfig {
  repository: {
    owner: string;
    repo: string;
  };
  members: Member[];
  vacationTypes: VacationType[];
}

/** 휴가 데이터 (Issue에서 파싱된 결과) */
export interface Vacation {
  id: number; // GitHub Issue number
  name: string;
  githubId: string;
  type: string; // VacationType.key
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason?: string;
  issueUrl: string;
  createdAt: string;
  state: "open" | "closed";
}

/** 휴가 생성 요청 */
export interface CreateVacationRequest {
  name: string;
  githubId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

/** 휴가 수정 요청 */
export interface UpdateVacationRequest {
  type?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
}

/** API 응답 타입 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
