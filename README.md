# Peace

개인적으로 사용하기 위해 만든 간이 **두통 기록 & 패턴 트래커** 웹 애플리케이션입니다.

## 포크 및 수정 내역 (Fork & Personalization Notice)

이 저장소는 오픈소스 프로젝트인 [crmne/cluster-headache-tracker](https://github.com/crmne/cluster-headache-tracker) (GPL-3.0 라이선스)를 포크한 뒤, **개인 전용 사용 목적**에 맞게 대폭 수정·간소화한 버전입니다.

### 주요 변경 사항
- **기술 스택 간소화**: Ruby on Rails + PostgreSQL 구성을 **Node.js (Express + EJS + Node 24 내장 `node:sqlite`)** 기반으로 재구축하여, 별도의 Ruby 런타임이나 외부 DB 서버 없이 단일 SQLite 파일(`data/peace.sqlite`)로 간편하게 실행할 수 있습니다.
- **Gmail(Google OAuth2) 전용 로그인**: 기존 아이디/비밀번호 로그인·회원가입을 제거하고 Google 계정 로그인만 사용하도록 변경했습니다. `.env`의 `ALLOWED_EMAILS` 설정으로 지정한 Gmail 주소만 접근을 허용할 수 있습니다.
- **불필요한 공개 서비스/SaaS 기능 제거**:
  - 피드백 설문(`FeedbackSurvey`), 어드민 대시보드, 메일러 제거
  - GDPR 건강정보 동의(`/consent`), 공지/환영/업데이트 모달 제거
  - 공유 링크(`ShareToken`), SEO/마케팅 랜딩 페이지, `llms.txt`, 사이트맵, 외부 통계(Plausible)/뉴스레터(Sendfox)/Sentry 연동 제거
  - Hotwire Native 모바일 앱 브리지 코드 제거
- **핵심 기능 및 디자인 유지**:
  - 기존 **Tailwind CSS v4 + DaisyUI v5** 디자인, 다크/라이트 테마, 하단 탭 바, 강도(1~10) 컬러 스케일 유지
  - 두통 발작 기록(시작/종료 시간, 진행 중 타이머, 강도, 유발 요인, 기압 hPa, 메모, 사진 첨부)
  - 군발 사이클 & 관해기 분석, 무통증 연속일 통계, 52주 캘린더 히트맵, Chart.js 패턴 차트
  - 약물 관리(급성기/산소/예방약), 복용 기록, 타임라인, 약물 효과 요약
  - CSV 가져오기/내보내기(Migraine Buddy 호환), 인쇄 및 PDF 리포트 다운로드
  - 한국어 / English UI 전환 및 12/24시간 표기 설정

---

## 실행 방법

### 1. 요구 사항
- **Node.js 24+** (내장 `node:sqlite` 사용)

### 2. 설치
```bash
npm install
npm run build:css
```

### 3. 환경 변수 설정 (`.env`)
[`.env.example`](.env.example)을 복사해 `.env` 파일을 생성합니다.

```env
PORT=3000
SESSION_SECRET=임의의_긴_비밀키
GOOGLE_CLIENT_ID=구글_클라우드_콘솔_클라이언트_ID
GOOGLE_CLIENT_SECRET=구글_클라우드_콘솔_클라이언트_시크릿
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
ALLOWED_EMAILS=본인이메일@gmail.com
```

Google Cloud Console의 OAuth 2.0 클라이언트 설정에서:
- **승인된 자바스크립트 원본**: `http://localhost:3000`
- **승인된 리디렉션 URI**: `http://localhost:3000/auth/google/callback`
- (테스트 모드일 경우) **테스트 사용자**에 본인 Gmail 주소를 등록하세요.

### 4. 서버 실행 및 테스트
```bash
npm start
# 또는
node src/server.js
```

테스트 실행:
```bash
npm test
```

---

## GitHub Actions & Docker 배포

`main` 브랜치에 푸시하면 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)이 자동으로 실행됩니다.

1. **`test`**: Node.js 24 환경에서 CSS 빌드 및 테스트 실행
2. **`build-and-push`**: Docker 이미지를 빌드해 `ghcr.io/2gateless/peace:latest` (GHCR)에 자동 푸시
3. **`deploy`** *(선택)*: SSH 원격 서버 자동 배포
   - 원격 서버 배포 폴더(기본값: `~/peace`)에 `.env` 파일(Google OAuth 콜백 URL을 운영 도메인 `https://도메인/auth/google/callback`으로 설정)을 배치합니다.
   - GitHub 저장소 **Settings → Secrets and variables → Actions**에서 설정합니다:
     - **Variables**: `DEPLOY_ENABLED` = `true` (선택: `DEPLOY_PATH`, 기본값 `peace`)
     - **Secrets**: `SSH_HOST`, `SSH_USER`, `SSH_KEY` (선택: `SSH_PORT`, 기본값 `22`)
   - 로컬/서버에서 수동 실행 시:
     ```bash
     docker compose up -d
     ```

---

## 라이선스

원본 저장소와 동일하게 **GNU General Public License v3.0 (GPL-3.0)** 을 따릅니다. 자세한 내용은 [`LICENSE`](LICENSE) 파일을 참고하세요.
