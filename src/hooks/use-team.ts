"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS, CACHE_TIMES } from "@/lib/constants";
import type { ApiResponse, TeamConfig } from "@/lib/types";

// ============================================================
// API 호출 함수
// ============================================================

async function fetchTeam(): Promise<TeamConfig> {
  const res = await fetch("/api/team");
  const json: ApiResponse<TeamConfig> = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error ?? "팀 설정 조회에 실패했습니다.");
  }

  return json.data!;
}

// ============================================================
// React Query 훅
// ============================================================

/**
 * 팀 설정(team-config.json)을 조회합니다.
 * 팀 멤버, 휴가 유형 등의 정보를 포함합니다.
 *
 * staleTime: 5분 (팀 설정은 자주 변경되지 않음)
 */
export function useTeam() {
  return useQuery({
    queryKey: [QUERY_KEYS.TEAM_CONFIG],
    queryFn: fetchTeam,
    staleTime: CACHE_TIMES.TEAM_CONFIG,
  });
}
