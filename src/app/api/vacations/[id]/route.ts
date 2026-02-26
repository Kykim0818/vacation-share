import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import {
  getVacation,
  updateVacation,
  closeVacation,
  fetchTeamConfig,
} from "@/lib/github/issues";
import { updateVacationSchema } from "@/lib/schemas";
import type { ApiResponse, Vacation } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 권한 검사: 본인 또는 admin만 수정/삭제 가능
 */
async function checkPermission(
  issueGithubId: string,
  sessionGithubId: string,
  sessionAccessToken: string
): Promise<boolean> {
  // 본인이면 허용
  if (issueGithubId === sessionGithubId) return true;

  // admin 역할 확인
  try {
    const teamConfig = await fetchTeamConfig(sessionAccessToken);
    const member = teamConfig.members.find(
      (m) => m.githubId === sessionGithubId
    );
    return member?.role === "admin";
  } catch {
    return false;
  }
}

/**
 * PATCH /api/vacations/[id]
 *
 * 기존 휴가를 수정합니다.
 * - 인증 필수
 * - 본인 또는 admin만 수정 가능
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session.user?.githubId) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const issueNumber = Number(id);
    if (isNaN(issueNumber) || issueNumber <= 0) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "유효하지 않은 Issue 번호입니다." },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Zod 검증
    const parsed = updateVacationSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json<ApiResponse<never>>(
        { error: `유효성 검증 실패: ${errors}` },
        { status: 400 }
      );
    }

    // 기존 Issue 조회하여 권한 확인
    const existing = await getVacation(issueNumber, session.accessToken);
    if (!existing) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "해당 휴가를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const hasPermission = await checkPermission(
      existing.githubId,
      session.user.githubId,
      session.accessToken
    );
    if (!hasPermission) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "수정 권한이 없습니다. 본인 또는 관리자만 수정할 수 있습니다." },
        { status: 403 }
      );
    }

    const data = parsed.data;

    // 유형이 변경된 경우 라벨 정보 조회
    let typeLabel: string | undefined;
    let labelName: string | undefined;

    if (data.type && data.type !== existing.type) {
      const teamConfig = await fetchTeamConfig(session.accessToken);
      const vacationType = teamConfig.vacationTypes.find(
        (vt) => vt.key === data.type
      );
      if (!vacationType) {
        return NextResponse.json<ApiResponse<never>>(
          { error: `알 수 없는 휴가 유형: ${data.type}` },
          { status: 400 }
        );
      }
      typeLabel = vacationType.label;
      labelName = vacationType.labelName;
    }

    const vacation = await updateVacation(
      issueNumber,
      data,
      typeLabel,
      labelName,
      session.accessToken
    );

    return NextResponse.json<ApiResponse<Vacation>>({ data: vacation });
  } catch (error) {
    console.error(`[API] PATCH /api/vacations/[id] 오류:`, error);
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json<ApiResponse<never>>(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/vacations/[id]
 *
 * 휴가를 취소합니다 (Issue Close).
 * - 인증 필수
 * - 본인 또는 admin만 취소 가능
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session.user?.githubId) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const issueNumber = Number(id);
    if (isNaN(issueNumber) || issueNumber <= 0) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "유효하지 않은 Issue 번호입니다." },
        { status: 400 }
      );
    }

    // 기존 Issue 조회하여 권한 확인
    const existing = await getVacation(issueNumber, session.accessToken);
    if (!existing) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "해당 휴가를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const hasPermission = await checkPermission(
      existing.githubId,
      session.user.githubId,
      session.accessToken
    );
    if (!hasPermission) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "취소 권한이 없습니다. 본인 또는 관리자만 취소할 수 있습니다." },
        { status: 403 }
      );
    }

    await closeVacation(issueNumber, session.accessToken);

    return NextResponse.json<ApiResponse<{ success: boolean }>>({
      data: { success: true },
    });
  } catch (error) {
    console.error(`[API] DELETE /api/vacations/[id] 오류:`, error);
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json<ApiResponse<never>>(
      { error: message },
      { status: 500 }
    );
  }
}
