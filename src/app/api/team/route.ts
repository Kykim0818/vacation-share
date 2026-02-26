import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { fetchTeamConfig } from "@/lib/github/issues";
import type { ApiResponse, TeamConfig } from "@/lib/types";

/**
 * GET /api/team
 *
 * 데이터 repo에서 team-config.json을 조회하여 반환합니다.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const teamConfig = await fetchTeamConfig(session.accessToken);

    return NextResponse.json<ApiResponse<TeamConfig>>({ data: teamConfig });
  } catch (error) {
    console.error("[API] GET /api/team 오류:", error);
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json<ApiResponse<never>>(
      { error: message },
      { status: 500 }
    );
  }
}
