"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { QUERY_KEYS, CACHE_TIMES } from "@/lib/constants";
import type {
  ApiResponse,
  Vacation,
  CreateVacationRequest,
  UpdateVacationRequest,
} from "@/lib/types";

// ============================================================
// 캐시 유틸리티
// ============================================================

function getMonthFromQueryKey(queryKey: unknown): string | null {
  if (!Array.isArray(queryKey)) return null;
  if (queryKey[0] !== QUERY_KEYS.VACATIONS) return null;
  return typeof queryKey[1] === "string" ? queryKey[1] : null;
}

function isVacationInMonth(vacation: Vacation, month: string): boolean {
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`;

  return vacation.startDate <= monthEnd && vacation.endDate >= monthStart;
}

// ============================================================
// API 호출 함수
// ============================================================

async function fetchVacations(month: string): Promise<Vacation[]> {
  const res = await fetch(`/api/vacations?month=${month}`);
  const json: ApiResponse<Vacation[]> = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error ?? "휴가 목록 조회에 실패했습니다.");
  }

  return json.data ?? [];
}

async function postVacation(data: CreateVacationRequest): Promise<Vacation> {
  const res = await fetch("/api/vacations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<Vacation> = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error ?? "휴가 등록에 실패했습니다.");
  }

  return json.data!;
}

async function patchVacation({
  id,
  data,
}: {
  id: number;
  data: UpdateVacationRequest;
}): Promise<Vacation> {
  const res = await fetch(`/api/vacations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<Vacation> = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error ?? "휴가 수정에 실패했습니다.");
  }

  return json.data!;
}

async function deleteVacation(id: number): Promise<void> {
  const res = await fetch(`/api/vacations/${id}`, {
    method: "DELETE",
  });
  const json: ApiResponse<{ success: boolean }> = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.error ?? "휴가 취소에 실패했습니다.");
  }
}

// ============================================================
// React Query 훅
// ============================================================

/**
 * 특정 월의 휴가 목록을 조회합니다.
 *
 * @param month YYYY-MM 형식
 */
export function useVacations(month: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.VACATIONS, month],
    queryFn: () => fetchVacations(month),
    staleTime: CACHE_TIMES.VACATIONS,
    enabled: !!month,
  });
}

/**
 * 새 휴가를 등록합니다.
 * 성공 시 응답 데이터로 캐시를 직접 업데이트합니다.
 */
export function useCreateVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postVacation,
    onSuccess: (newVacation) => {
      // 월 범위에 포함되는 캐시에만 새 휴가 추가
      const entries = queryClient.getQueriesData<Vacation[]>({
        queryKey: [QUERY_KEYS.VACATIONS],
      });

      entries.forEach(([queryKey]) => {
        const month = getMonthFromQueryKey(queryKey);
        if (!month) return;

        queryClient.setQueryData<Vacation[]>(queryKey, (current) => {
          const list = current ?? [];
          if (!isVacationInMonth(newVacation, month)) return list;
          if (list.some((v) => v.id === newVacation.id)) return list;
          return [...list, newVacation];
        });
      });
    },
  });
}

/**
 * 기존 휴가를 수정합니다.
 * 성공 시 응답 데이터로 캐시를 직접 업데이트합니다.
 */
export function useUpdateVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patchVacation,
    onSuccess: (updatedVacation) => {
      // 월 범위에 맞춰 해당 휴가를 교체/제거
      const entries = queryClient.getQueriesData<Vacation[]>({
        queryKey: [QUERY_KEYS.VACATIONS],
      });

      entries.forEach(([queryKey]) => {
        const month = getMonthFromQueryKey(queryKey);
        if (!month) return;

        queryClient.setQueryData<Vacation[]>(queryKey, (current) => {
          const list = current ?? [];
          const inMonth = isVacationInMonth(updatedVacation, month);
          const exists = list.some((v) => v.id === updatedVacation.id);

          if (inMonth) {
            if (!exists) return [...list, updatedVacation];
            return list.map((v) =>
              v.id === updatedVacation.id ? updatedVacation : v
            );
          }

          if (!exists) return list;
          return list.filter((v) => v.id !== updatedVacation.id);
        });
      });
    },
  });
}

/**
 * 휴가를 취소합니다 (Issue Close).
 * 성공 시 캐시에서 해당 휴가를 제거합니다.
 */
export function useCancelVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVacation,
    onSuccess: (_data, deletedId) => {
      // 모든 월 캐시에서 해당 휴가 제거
      queryClient.setQueriesData<Vacation[]>(
        { queryKey: [QUERY_KEYS.VACATIONS] },
        (old) => old?.filter((v) => v.id !== deletedId) ?? []
      );
    },
  });
}
