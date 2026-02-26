import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { listVacations, createVacation, fetchTeamConfig } from "@/lib/github/issues";
import { createVacationSchema } from "@/lib/schemas";
import type { ApiResponse, Vacation } from "@/lib/types";

/**
 * GET /api/vacations
 *
 * 쿼리 파라미터:
 * - month (필수): YYYY-MM 형식
 * - memberId (선택): 특정 멤버 필터
 * - type (선택): 특정 휴가 유형 필터
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 토큰 갱신 실패 시 재로그인 유도
    if (session.error === "RefreshTokenError") {
      return NextResponse.json<ApiResponse<never>>(
        { error: "인증이 만료되었습니다. 다시 로그인해주세요." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "month 파라미터가 필요합니다. (형식: YYYY-MM)" },
        { status: 400 }
      );
    }

    let vacations = await listVacations(month, session.accessToken);

    // 선택적 필터링
    const memberId = searchParams.get("memberId");
    if (memberId) {
      vacations = vacations.filter((v) => v.githubId === memberId);
    }

    const type = searchParams.get("type");
    if (type) {
      vacations = vacations.filter((v) => v.type === type);
    }

    return NextResponse.json<ApiResponse<Vacation[]>>({ data: vacations });
  } catch (error) {
    console.error("[API] GET /api/vacations 오류:", error);
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    // GitHub API 인증 에러 감지 → 401로 전달
    const isAuthError =
      message.includes("Bad credentials") ||
      message.includes("401") ||
      message.includes("Unauthorized");
    return NextResponse.json<ApiResponse<never>>(
      { error: isAuthError ? "인증이 만료되었습니다. 다시 로그인해주세요." : message },
      { status: isAuthError ? 401 : 500 }
    );
  }
}

/**
 * POST /api/vacations
 *
 * 새 휴가를 등록합니다.
 * - 인증 필수
 * - 본인 githubId로만 등록 가능
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session.user?.githubId) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 토큰 갱신 실패 시 재로그인 유도
    if (session.error === "RefreshTokenError") {
      return NextResponse.json<ApiResponse<never>>(
        { error: "인증이 만료되었습니다. 다시 로그인해주세요." },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Zod 검증
    const parsed = createVacationSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json<ApiResponse<never>>(
        { error: `유효성 검증 실패: ${errors}` },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // 본인 확인: 세션의 githubId와 요청의 githubId가 일치해야 함
    if (data.githubId !== session.user.githubId) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "본인의 휴가만 등록할 수 있습니다." },
        { status: 403 }
      );
    }

    // team-config.json에서 휴가 유형 정보 조회
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

    const vacation = await createVacation(
      data,
      vacationType.label,
      vacationType.labelName,
      session.accessToken
    );

    return NextResponse.json<ApiResponse<Vacation>>(
      { data: vacation },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/vacations 오류:", error);
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    const isAuthError =
      message.includes("Bad credentials") ||
      message.includes("401") ||
      message.includes("Unauthorized");
    return NextResponse.json<ApiResponse<never>>(
      { error: isAuthError ? "인증이 만료되었습니다. 다시 로그인해주세요." : message },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
