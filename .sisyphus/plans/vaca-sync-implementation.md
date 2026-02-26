# Vaca-Sync 구현 계획서

## 1. 프로젝트 개요

GitHub Issues를 DB로 사용하는 팀 휴가 현황 대시보드. 15명 내외 팀원의 휴가를 GitHub Issues에 YAML frontmatter로 저장하고, 대시보드/캘린더/등록 폼을 제공하는 Next.js 웹 서비스. 별도 백엔드 없이 Next.js API Routes(Serverless Functions)로 서버 로직 처리.

## 2. 확정된 기술 스택

| 영역 | 기술 | 버전/비고 |
|------|------|-----------|
| 프레임워크 | Next.js (App Router) | 15.x |
| 스타일링 | Tailwind CSS + shadcn/ui | v4 + latest |
| 상태/캐싱 | @tanstack/react-query | 5.x, staleTime 1분 |
| GitHub API | octokit | 공식 SDK |
| YAML 파싱 | gray-matter | Issue body frontmatter |
| 검증 | zod | 폼 + API 데이터 검증 |
| 날짜 | date-fns | 캘린더 직접 구현 |
| 인증 | NextAuth.js | GitHub App OAuth (폴백: OAuth App) |
| 배포 | Vercel Hobby (무료) | 개인 repo 연결 |

## 3. 아키텍처

```
[브라우저] → [Vercel/Next.js] → [GitHub API] → [조직 Private Repo Issues]
                  │
                  ├─ /api/auth/*        ← NextAuth.js (GitHub App OAuth)
                  ├─ /api/vacations/*   ← Issues CRUD 프록시
                  └─ /api/team/*        ← team-config.json 조회
```

### 인증 추상화 설계 (GitHub App ↔ OAuth App 전환)

환경변수 `AUTH_PROVIDER`로 전환:
- `github-app` → GitHub App OAuth (특정 repo Issues만 접근, 최소 권한)
- `oauth-app` → OAuth App (모든 private repo 접근, 폴백)

두 방식 모두 NextAuth.js GitHub Provider 사용. 차이점은 clientId/clientSecret/scope만 다름.
인증 추상화 레이어(`lib/auth/`)에서 환경변수에 따라 적절한 설정을 반환.

### API 호출 시 토큰 전략

- **읽기(GET)**: GitHub App Installation Access Token 사용 (사용자 로그인 무관, 별도 rate limit 5000/hour)
- **쓰기(POST/PATCH/DELETE)**: 사용자의 OAuth accessToken 사용 (Issue 작성자가 해당 사용자로 기록됨)
- OAuth App 폴백 모드에서는 읽기/쓰기 모두 사용자 accessToken 사용

## 4. 확정된 의사결정 (Q1~Q10)

| # | 결정 | 내용 |
|---|------|------|
| Q1 | 인증 | GitHub App OAuth (1순위), OAuth App (2순위 폴백) |
| Q2 | API 호출 | 서버사이드 통일 (Next.js API Routes) |
| Q3 | 캐싱 | 1분 단위 캐싱 (TanStack Query staleTime + ISR) |
| Q4 | 데이터 포맷 | Issue body에 YAML Frontmatter |
| Q5 | Issue 생성 | 앱에서만 생성 |
| Q6 | 연속 휴가 | 1 Issue = 1 휴가 건 (startDate/endDate 포함) |
| Q7 | Labels | 유형별 라벨 (vacation/연차, vacation/반차 등) |
| Q8 | 대리 등록 | 불가. GitHub ID ↔ 실명 매핑은 team-config.json |
| Q9 | 수정 플로우 | Issue 내용 수정 (본인 및 관리자만) |
| Q10 | 기술 스택 | 위 표 참조 |

## 5. 디렉토리 구조

```
vacation-share/
├── app/
│   ├── layout.tsx                 # 루트 레이아웃 (Providers, 네비게이션)
│   ├── page.tsx                   # 대시보드 (오늘 휴가자)
│   ├── calendar/
│   │   └── page.tsx               # 캘린더 뷰
│   ├── register/
│   │   └── page.tsx               # 휴가 등록 폼
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   │   └── route.ts           # NextAuth.js 핸들러
│   │   ├── vacations/
│   │   │   ├── route.ts           # GET (목록), POST (등록)
│   │   │   └── [id]/
│   │   │       └── route.ts       # PATCH (수정), DELETE (Close)
│   │   └── team/
│   │       └── route.ts           # GET team-config.json
│   └── login/
│       └── page.tsx               # 로그인 페이지
├── components/
│   ├── ui/                        # shadcn/ui 컴포넌트
│   ├── layout/
│   │   ├── header.tsx             # 상단 네비게이션
│   │   └── sidebar.tsx            # (선택) 사이드바
│   ├── dashboard/
│   │   ├── today-summary.tsx      # 오늘 휴가자 요약 카드
│   │   ├── vacation-card.tsx      # 개별 휴가 카드
│   │   └── upcoming-list.tsx      # 다가오는 휴가 목록
│   ├── calendar/
│   │   ├── calendar-grid.tsx      # 월간 캘린더 그리드
│   │   ├── calendar-header.tsx    # 월 네비게이션
│   │   ├── calendar-cell.tsx      # 날짜 셀 (휴가자 표시)
│   │   └── vacation-badge.tsx     # 캘린더 내 휴가 배지
│   └── vacation/
│       ├── vacation-form.tsx      # 휴가 등록/수정 폼
│       └── vacation-detail.tsx    # 휴가 상세 모달
├── lib/
│   ├── auth/
│   │   ├── config.ts              # NextAuth 설정 (GitHub App/OAuth 전환)
│   │   └── provider.ts            # 인증 추상화 레이어
│   ├── github/
│   │   ├── client.ts              # Octokit 인스턴스 생성
│   │   ├── issues.ts              # Issue CRUD 함수
│   │   └── parser.ts              # YAML frontmatter 파싱 (gray-matter)
│   ├── types.ts                   # TypeScript 타입/인터페이스
│   ├── schemas.ts                 # Zod 스키마 (휴가 데이터, 폼)
│   ├── constants.ts               # 상수 (라벨, 색상 등)
│   └── utils.ts                   # 유틸리티 함수
├── hooks/
│   ├── use-vacations.ts           # 휴가 데이터 React Query 훅
│   ├── use-team.ts                # 팀 설정 React Query 훅
│   └── use-calendar.ts            # 캘린더 네비게이션 훅
├── providers/
│   └── query-provider.tsx         # TanStack Query Provider
├── team-config.json               # (로컬 개발용, 실제는 데이터 repo)
├── .env.local.example             # 환경변수 예시
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
└── package.json
```

## 6. 데이터 모델

### Issue 형식
```
Title: [휴가] 홍길동 - 연차
Labels: vacation/연차
Body:
---
name: 홍길동
githubId: hong-gildong
type: annual
startDate: 2026-03-01
endDate: 2026-03-03
---
개인 사유로 휴가 신청합니다.
```

### team-config.json (데이터 repo에 위치)
```json
{
  "repository": { "owner": "org-name", "repo": "vacation-data" },
  "members": [
    { "githubId": "hong-gildong", "name": "홍길동", "team": "개발팀", "color": "#3B82F6", "role": "admin" }
    { "githubId": "kim-cheolsu", "name": "김철수", "team": "개발팀", "color": "#EF4444", "role": "member" }
  ],
  "vacationTypes": [
    { "key": "annual", "label": "연차", "labelName": "vacation/연차", "color": "#10B981" },
    { "key": "am-half", "label": "오전 반차", "labelName": "vacation/오전반차", "color": "#F59E0B" },
    { "key": "pm-half", "label": "오후 반차", "labelName": "vacation/오후반차", "color": "#F59E0B" },
    { "key": "am-quarter", "label": "오전 반반차", "labelName": "vacation/오전반반차", "color": "#FBBF24" },
    { "key": "pm-quarter", "label": "오후 반반차", "labelName": "vacation/오후반반차", "color": "#FBBF24" },
    { "key": "care", "label": "돌봄", "labelName": "vacation/돌봄", "color": "#EC4899" },
    { "key": "other", "label": "기타 휴가", "labelName": "vacation/기타", "color": "#6B7280" }
  ]
}
```

## 7. API 엔드포인트

| Method | Path | 설명 | 입력 | 출력 |
|--------|------|------|------|------|
| GET | /api/vacations | 휴가 목록 조회 | query: month(YYYY-MM), memberId?, type? | Vacation[] |
| POST | /api/vacations | 휴가 등록 | body: { name, githubId, type, startDate, endDate, reason? } | Vacation |
| PATCH | /api/vacations/[id] | 휴가 수정 | body: { type?, startDate?, endDate?, reason? } | Vacation |
| DELETE | /api/vacations/[id] | 휴가 취소 (Issue Close) | - | { success: true } |
| GET | /api/team | team-config.json 조회 | - | TeamConfig |
| GET/POST | /api/auth/[...nextauth] | NextAuth 핸들러 | - | Session |

### 권한 검사
- POST /api/vacations: 인증된 사용자만 (본인 GitHub ID로만 등록)
- PATCH /api/vacations/[id]: Issue 작성자 본인 또는 team-config.json에서 role이 "admin"인 멤버
- DELETE /api/vacations/[id]: Issue 작성자 본인 또는 team-config.json에서 role이 "admin"인 멤버

## 8. 구현 순서 (Phase별)

### Phase 1: 프로젝트 기반 (scaffold)
1. Next.js 15 App Router 프로젝트 생성 (`npx create-next-app@latest`)
2. Tailwind CSS v4 설정 확인
3. shadcn/ui 초기화 및 기본 컴포넌트 설치 (Button, Card, Dialog, Input, Select, Badge, Skeleton, Calendar 관련)
4. 추가 패키지 설치: @tanstack/react-query, octokit, gray-matter, zod, date-fns, next-auth
5. 기본 디렉토리 구조 생성 (위 구조 참조)
6. TypeScript 타입 정의 (lib/types.ts): Vacation, TeamConfig, Member, VacationType
7. Zod 스키마 정의 (lib/schemas.ts): vacationSchema, teamConfigSchema
8. TanStack Query Provider 설정 (providers/query-provider.tsx)
9. 환경변수 예시 파일 생성 (.env.local.example)

**완료 기준**: `npm run dev` 성공, 빈 페이지 렌더링, 타입/스키마 컴파일 통과

### Phase 2: 인증
1. NextAuth.js v5 설정 (lib/auth/config.ts)
   - GitHub App OAuth: GITHUB_APP_CLIENT_ID, GITHUB_APP_CLIENT_SECRET 사용
   - scope: `read:org` (org 멤버십 확인용)
2. 인증 추상화 레이어 (lib/auth/provider.ts)
   - AUTH_PROVIDER 환경변수에 따라 clientId/clientSecret/scope 분기
   - GitHub App: 최소 scope
   - OAuth App: `repo` scope (private repo 접근)
3. API route 핸들러 (app/api/auth/[...nextauth]/route.ts)
4. 로그인 페이지 (app/login/page.tsx): GitHub 로그인 버튼
5. 루트 레이아웃에 SessionProvider 적용
6. 미들웨어: 미인증 시 /login으로 리디렉트 (middleware.ts)
7. NextAuth 콜백에서 accessToken을 session에 포함 (GitHub API 호출용)

**완료 기준**: 로그인/로그아웃 동작, 미인증 시 리디렉트, 세션에 accessToken 포함

### Phase 3: 데이터 레이어
1. Octokit 클라이언트 팩토리 (lib/github/client.ts)
   - GitHub App 모드 (읽기): Installation Access Token 사용 (JWT → Installation Token 발급)
   - GitHub App 모드 (쓰기): 사용자 OAuth accessToken 사용 (Issue 작성자 = 해당 사용자)
   - OAuth App 모드: 읽기/쓰기 모두 사용자 accessToken 사용
2. Issue CRUD 함수 (lib/github/issues.ts)
   - listVacations(month): Open Issues 조회, 라벨 필터, 날짜 범위 필터
   - createVacation(data): Issue 생성 (title, body, labels)
   - updateVacation(id, data): Issue 업데이트
   - closeVacation(id): Issue Close
3. YAML frontmatter 파서 (lib/github/parser.ts)
   - parseVacationIssue(issue): Issue → Vacation 객체
   - buildVacationBody(data): Vacation 데이터 → Issue body
4. API Routes 구현
   - GET /api/vacations: listVacations → 파싱 → 필터링 → 반환
   - POST /api/vacations: 인증 확인 → Zod 검증 → createVacation
   - PATCH /api/vacations/[id]: 권한 확인 → Zod 검증 → updateVacation
   - DELETE /api/vacations/[id]: 권한 확인 → closeVacation
   - GET /api/team: 데이터 repo에서 team-config.json 조회 → 반환
5. React Query 훅
   - useVacations(month): GET /api/vacations, staleTime: 60_000
   - useTeam(): GET /api/team, staleTime: 300_000 (5분, 변경 드묾)
   - useCreateVacation(): POST mutation + invalidateQueries
   - useUpdateVacation(): PATCH mutation + invalidateQueries
   - useCancelVacation(): DELETE mutation + invalidateQueries

**완료 기준**: API Routes 수동 테스트 통과 (Postman/curl), React Query 훅 동작

### Phase 4: 대시보드 뷰
1. 루트 레이아웃 완성 (app/layout.tsx)
   - 상단 헤더: 로고, 네비게이션 (대시보드/캘린더/등록), 사용자 정보/로그아웃
2. 대시보드 페이지 (app/page.tsx)
   - 오늘 휴가자 요약 카드 (today-summary.tsx): "오늘 N명 휴가 중" + 아이콘
   - 오늘 휴가자 목록: vacation-card.tsx로 각 휴가 표시 (이름, 유형, 기간, 라벨 색상)
   - 다가오는 휴가 목록 (upcoming-list.tsx): 향후 7일 내 휴가 예정자
3. 반응형 레이아웃: 모바일(1열) / 태블릿(2열) / 데스크탑(3열)
4. 빈 상태 UI: "오늘 휴가자가 없습니다" 메시지
5. 로딩 상태: Skeleton UI

**완료 기준**: 대시보드에서 오늘/다가오는 휴가 정확히 표시, 반응형 동작

### Phase 5: 캘린더 뷰
1. 월간 캘린더 그리드 (calendar-grid.tsx)
   - date-fns로 월의 시작/끝 계산, 주 단위 행 렌더링
   - 7열(일~토) × N행 그리드
2. 월 네비게이션 (calendar-header.tsx): ← 이전 / 2026년 3월 / 다음 → / 오늘 버튼
3. 날짜 셀 (calendar-cell.tsx)
   - 해당 날짜의 휴가자를 vacation-badge.tsx로 표시
   - 배지: 멤버 색상 + 이름 (공간 부족 시 "+N" 표시)
4. 연속 휴가 시각적 표현
   - 여러 날에 걸친 휴가는 바(bar) 형태로 연결 표시
   - 시작일에 라운드 왼쪽, 종료일에 라운드 오른쪽
5. 휴가 클릭 시 상세 모달 (vacation-detail.tsx)
   - 이름, 유형, 기간, 사유, 수정/취소 버튼 (권한 있을 때만)
6. 캘린더 네비게이션 훅 (hooks/use-calendar.ts): 현재 월 상태, 이전/다음 월 이동

**완료 기준**: 월간 캘린더에 휴가 정확히 표시, 연속 휴가 바 렌더링, 월 이동 동작

### Phase 6: 휴가 등록/수정
1. 휴가 등록 폼 (vacation-form.tsx)
   - 필드: 휴가 유형(Select), 시작일(DatePicker), 종료일(DatePicker), 사유(Textarea, 선택)
   - 이름/githubId는 세션에서 자동 채움
   - Zod 폼 검증: endDate >= startDate, 유형 필수
2. 휴가 등록 페이지 (app/register/page.tsx): vacation-form.tsx 사용
3. 휴가 수정 기능
   - 상세 모달에서 "수정" 버튼 → 같은 폼을 수정 모드로 렌더링
   - 권한 검사: 본인 또는 관리자만 수정 버튼 표시
4. 휴가 취소 기능
   - 상세 모달에서 "취소" 버튼 → 확인 다이얼로그 → Issue Close
   - 권한 검사: 본인 또는 관리자만 취소 버튼 표시
5. 성공/실패 토스트 알림

**완료 기준**: 휴가 등록 → Issue 생성 확인, 수정 → Issue 업데이트 확인, 취소 → Issue Close 확인

### Phase 7: 마무리
1. 에러 핸들링
   - API 실패 시 사용자 친화적 에러 메시지
   - GitHub API rate limit 초과 시 안내 메시지
   - 네트워크 오류 시 재시도 안내
2. 로딩 상태: 모든 데이터 fetching에 Skeleton UI 적용
3. 빈 상태 UI: 각 뷰별 적절한 빈 상태 메시지
4. 접근성: 키보드 네비게이션, ARIA 라벨
5. Vercel 배포 설정 확인
   - 환경변수 설정
   - 빌드 성공 확인
   - 프로덕션 동작 확인

**완료 기준**: 빌드 성공 (`npm run build`), 에러 상태 처리 완료, Vercel 배포 동작

## 9. 환경변수

```env
# 인증 전략 전환
AUTH_PROVIDER=github-app

# GitHub App (1순위)
GITHUB_APP_ID=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_INSTALLATION_ID=

# OAuth App (폴백)
# AUTH_PROVIDER=oauth-app
# GITHUB_OAUTH_CLIENT_ID=
# GITHUB_OAUTH_CLIENT_SECRET=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# 데이터 저장소
GITHUB_OWNER=org-name
GITHUB_REPO=vacation-data
```

## 10. 제약사항 (사용자 명시)

- 별도의 백엔드 서버를 구축하지 않는다
- 모든 휴가 데이터는 해당 Private Repo의 Issues 탭에 저장된다
- Open된 Issue만 유효한 데이터로 간주하며, 종료되거나 취소된 휴가는 Issue를 Close하여 관리한다
- 최대 15명 내외의 인원이 사용하기 적합한 컴팩트한 레이아웃
- 대리 등록 불가 / GitHub ID ↔ 실명 매핑은 team-config.json
- FullCalendar 사용 금지 (너무 무거움). date-fns 기반 직접 구현
- 인증 레이어는 GitHub App ↔ OAuth App 환경변수 전환 지원 필수

## 11. 위험 요소 및 대응

| 위험 | 영향 | 대응 |
|------|------|------|
| GitHub App 설치 거부 | 인증 불가 | OAuth App 폴백 (AUTH_PROVIDER 전환) |
| API Rate Limit (5000/hour) | 데이터 조회 실패 | 1분 캐싱으로 호출 최소화, 15명 규모에 충분 |
| Issue 직접 편집 (GitHub UI) | 데이터 불일치 | Q5에서 앱 전용 생성으로 합의, frontmatter 파싱 실패 시 graceful skip |
| Vercel 콜드 스타트 | 초기 응답 지연 | Hobby 플랜 한계, 허용 범위 |
| team-config.json 관리 | 팀원 변경 시 수동 업데이트 | 데이터 repo에서 직접 편집 또는 추후 관리 UI 추가 |
