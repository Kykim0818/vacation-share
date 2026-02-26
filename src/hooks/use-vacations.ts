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
 * 성공 시 휴가 목록 캐시를 무효화합니다.
 */
export function useCreateVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postVacation,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.VACATIONS],
      });
    },
  });
}

/**
 * 기존 휴가를 수정합니다.
 * 성공 시 휴가 목록 캐시를 무효화합니다.
 */
export function useUpdateVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patchVacation,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.VACATIONS],
      });
    },
  });
}

/**
 * 휴가를 취소합니다 (Issue Close).
 * 성공 시 휴가 목록 캐시를 무효화합니다.
 */
export function useCancelVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVacation,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.VACATIONS],
      });
    },
  });
}
