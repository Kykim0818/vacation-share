import { z } from "zod";

/** YYYY-MM-DD 형식 날짜 패턴 */
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

/** 날짜 문자열 스키마 (YYYY-MM-DD) */
const dateString = z.string().regex(datePattern, "YYYY-MM-DD 형식이어야 합니다");

/** 팀 멤버 스키마 */
export const memberSchema = z.object({
  githubId: z.string().min(1),
  name: z.string().min(1),
  team: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "HEX 색상 코드여야 합니다"),
  role: z.enum(["admin", "member"]),
});

/** 휴가 유형 스키마 */
export const vacationTypeSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  labelName: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

/** 팀 설정 스키마 */
export const teamConfigSchema = z.object({
  repository: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  members: z.array(memberSchema),
  vacationTypes: z.array(vacationTypeSchema),
});

/** 휴가 생성 요청 스키마 */
export const createVacationSchema = z
  .object({
    name: z.string().min(1, "이름은 필수입니다"),
    githubId: z.string().min(1, "GitHub ID는 필수입니다"),
    type: z.string().min(1, "휴가 유형을 선택해주세요"),
    startDate: dateString,
    endDate: dateString,
    reason: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "종료일은 시작일 이후여야 합니다",
    path: ["endDate"],
  });

/** 휴가 수정 요청 스키마 */
export const updateVacationSchema = z
  .object({
    type: z.string().min(1).optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    reason: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "종료일은 시작일 이후여야 합니다",
      path: ["endDate"],
    }
  );

/** 휴가 데이터 스키마 (Issue 파싱 결과) */
export const vacationSchema = z.object({
  id: z.number(),
  name: z.string(),
  githubId: z.string(),
  type: z.string(),
  startDate: dateString,
  endDate: dateString,
  reason: z.string().optional(),
  issueUrl: z.string().url(),
  createdAt: z.string(),
  state: z.enum(["open", "closed"]),
});
