# Vaca-Sync

GitHub Issue 기반 팀 휴가 현황 대시보드. 약 15명 규모 팀의 휴가를 GitHub Issues에 저장하고, 대시보드 + 캘린더 + 등록 폼을 제공합니다.

**별도 백엔드 없이** GitHub API를 데이터 저장소로 사용합니다 (Git-as-a-Backend).

## 주요 기능

- **대시보드**: 오늘 휴가자 요약, 향후 7일 예정 휴가 목록
- **월간 캘린더**: 연속 휴가 바 표시, 클릭 시 상세 모달
- **휴가 등록/수정**: 연차, 반차, 반반차, 돌봄 등 다양한 유형 지원
- **GitHub 인증**: GitHub App OAuth (1순위) / OAuth App (폴백) 자동 전환
- **권한 관리**: 본인 휴가만 수정/취소 가능, admin은 전체 관리 가능

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| 인증 | NextAuth.js v5 beta.30 |
| GitHub API | Octokit (REST) + @octokit/auth-app |
| 상태 관리 | TanStack Query v5 |
| UI | shadcn/ui + Radix UI + Tailwind CSS v4 |
| 검증 | Zod v4 |
| 날짜 | date-fns v4 |

## 아키텍처

```
사용자 브라우저
    ↓ (Next.js App)
API Routes (Serverless)
    ↓
GitHub API (Issues)
    ↓
조직 Private Repo (vacation-data)
  └── Issues = 휴가 데이터
  └── Labels = 휴가 유형
```

- **읽기 (GitHub App 모드)**: Installation Access Token으로 앱 자체 인증 → 별도 rate limit
- **쓰기**: 사용자 OAuth Token → Issue 작성자 = 해당 사용자
- **읽기 (OAuth App 폴백)**: 사용자 OAuth Token으로 읽기/쓰기 모두 처리

## 사전 준비

### 1. 데이터 저장소 Repo 생성

조직(또는 개인) 계정에 Private Repository를 하나 생성합니다.

- 예: `your-org/vacation-data`
- 이 Repo의 Issues 탭이 휴가 데이터 저장소가 됩니다
- Repo에 별도 코드는 필요 없습니다

### 2. GitHub App 생성

> GitHub App을 만들 수 없는 경우 [OAuth App 폴백](#oauth-app-폴백-방식)을 참고하세요.

1. https://github.com/settings/apps/new 에서 GitHub App 생성
2. 설정값:

| 항목 | 값 |
|------|-----|
| App name | `vaca-sync` (원하는 이름) |
| Homepage URL | 배포할 URL 또는 `http://localhost:3000` |
| Callback URL | `{배포URL}/api/auth/callback/github` |
| Webhook | **비활성화** (Active 체크 해제) |

3. **Permissions 설정**:

| Permission | Access |
|------------|--------|
| Issues | Read & Write |
| Metadata | Read-only (자동 선택됨) |

4. **"Where can this app be installed?"** → `Only on this account` 선택
5. 생성 후 기록할 값:
   - `App ID` → `GITHUB_APP_ID`
   - `Client ID` → `GITHUB_APP_CLIENT_ID`
   - **Client Secret 생성** → `GITHUB_APP_CLIENT_SECRET`
   - **Private Key 생성** (`.pem` 파일 다운로드) → `GITHUB_APP_PRIVATE_KEY`
6. 좌측 메뉴 **"Install App"** → 데이터 저장소 Repo가 있는 조직/계정에 설치
   - 설치 후 URL에서 Installation ID 확인: `https://github.com/settings/installations/{ID}` → `GITHUB_APP_INSTALLATION_ID`

### 3. team-config.json 수정

프로젝트 루트의 `team-config.json`을 실제 팀원 정보로 수정합니다:

```json
{
  "repository": {
    "owner": "your-org",
    "repo": "vacation-data"
  },
  "members": [
    {
      "githubId": "actual-github-id",
      "name": "실제 이름",
      "team": "소속팀",
      "color": "#3B82F6",
      "role": "admin"
    },
    {
      "githubId": "another-member",
      "name": "다른 팀원",
      "team": "소속팀",
      "color": "#EF4444",
      "role": "member"
    }
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

- `role: "admin"` → 다른 팀원의 휴가 수정/취소 가능
- `role: "member"` → 본인 휴가만 관리 가능
- `color` → 캘린더에서 해당 팀원의 휴가 바 색상

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.local.example .env.local
# .env.local 파일을 열어 값을 채워주세요 (아래 환경변수 섹션 참고)

# 개발 서버 실행
npm run dev
```

http://localhost:3000 에서 확인합니다.

## 환경변수

`.env.local.example`을 `.env.local`로 복사 후 값을 설정합니다:

```env
# 인증 전략 (github-app 또는 oauth-app)
AUTH_PROVIDER=github-app

# --- GitHub App ---
GITHUB_APP_ID=123456
GITHUB_APP_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxx
GITHUB_APP_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"
GITHUB_APP_INSTALLATION_ID=12345678

# --- NextAuth ---
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=openssl-rand-base64-32-로-생성한-값

# --- 데이터 저장소 ---
GITHUB_OWNER=your-org
GITHUB_REPO=vacation-data
```

> `NEXTAUTH_SECRET`은 터미널에서 `openssl rand -base64 32`로 생성할 수 있습니다.

> `GITHUB_APP_PRIVATE_KEY`는 `.pem` 파일 내용을 한 줄로 만들어야 합니다. 줄바꿈을 `\n`으로 치환하세요.

## OAuth App 폴백 방식

GitHub App을 생성할 수 없는 경우 OAuth App으로 대체할 수 있습니다.

1. https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
2. **Authorization callback URL**: `{배포URL}/api/auth/callback/github`
3. 환경변수 변경:

```env
AUTH_PROVIDER=oauth-app
GITHUB_OAUTH_CLIENT_ID=xxxxxxxxxxxxxxxx
GITHUB_OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# GitHub App 관련 변수는 설정하지 않아도 됩니다
```

> OAuth App 모드에서는 사용자 토큰으로 읽기/쓰기 모두 처리하므로 `repo` scope이 자동으로 요청됩니다.

## Vercel 배포

1. [Vercel](https://vercel.com)에 GitHub 레포지토리 연결
2. **Environment Variables**에 위 환경변수 모두 추가
   - `NEXTAUTH_URL`은 배포된 도메인으로 변경 (예: `https://vaca-sync.vercel.app`)
3. GitHub App의 **Callback URL**도 배포 도메인으로 업데이트:
   - `https://vaca-sync.vercel.app/api/auth/callback/github`

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router 페이지
│   ├── page.tsx            # 대시보드 (오늘 휴가자 + 다가오는 휴가)
│   ├── calendar/page.tsx   # 월간 캘린더 뷰
│   ├── register/page.tsx   # 휴가 등록 폼
│   ├── login/page.tsx      # GitHub 로그인
│   └── api/                # API Routes (Serverless)
│       ├── vacations/      # 휴가 CRUD
│       └── team/           # 팀 설정 조회
├── components/
│   ├── ui/                 # shadcn/ui 기본 컴포넌트
│   ├── layout/             # 헤더, 네비게이션
│   ├── dashboard/          # 대시보드 전용 컴포넌트
│   ├── calendar/           # 캘린더 전용 컴포넌트
│   └── vacation/           # 휴가 폼 컴포넌트
├── hooks/                  # React Query 커스텀 훅
├── lib/
│   ├── auth/               # 인증 설정 (NextAuth + Provider 추상화)
│   └── github/             # GitHub API 클라이언트, Issue 파서, CRUD
└── providers/              # React Context Providers
```

## 휴가 데이터 구조

각 휴가는 GitHub Issue 하나로 저장됩니다:

- **Issue Title**: `[연차] 홍길동 2025-03-01 ~ 2025-03-03`
- **Issue Body**: YAML frontmatter 형식
- **Issue Labels**: `vacation/연차` 등 유형별 라벨
- **Issue State**: `open` = 유효 / `closed` = 취소됨

```yaml
---
githubId: hong-gildong
type: annual
startDate: "2025-03-01"
endDate: "2025-03-03"
---
가족 여행
```

## 스크립트

```bash
npm run dev      # 개발 서버 (Turbopack)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버
npm run lint     # ESLint
```

## License

Private project.
