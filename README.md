# peace

두통 양상과 복용 약물(허브류·진통제)의 투약 시기, 일일 횟수, 안전 간격을 차분하고 직관적으로 기록·추적하는 개인용 **두통 및 투약 관리 PWA**입니다.

## 주요 기능

- **미니멀 & 젠(Zen) 다크 테마**: 두통 시 눈의 피로를 줄여주는 딥 슬레이트(`#090d16`, `#0f172a`) & 올리브/세이지 그린(`#84a98c`, `#52796f`) 팔레트와 오리가미 비둘기(Peace Dove & Olive Arc) SVG 아이콘.
- **엄지 영역(Thumb Zone) 원클릭 투약 기록**: 하단에 배치된 5개 캡슐 버튼(`허브 1`, `허브 2`, `허브 3`, `진통제 1`, `진통제 2`)을 한 손으로 터치해 즉시 기록하고, 약물 이름·세부 라벨·최소 간격·일일 한도를 자유롭게 설정할 수 있습니다.
- **안전 복용 간격 & 일일 카운터**: 자정(00:00) 기준 오늘 복용 횟수 배지, 마지막 복용 후 경과 시간(`3시간 20분 전 복용`), 권장 간격 내 또는 일일 한도 도달 시 경고 모달을 표시합니다.
- **타임라인, 패턴 통계, 데이터 내보내기**: 일자별 역순 타임라인(수정·삭제), 최근 7일/30일 Chart.js 통계, CSV 및 JSON 로컬 다운로드 지원.
- **Firebase Auth + Offline-First Firestore**:
  - Google 계정 원클릭 로그인 및 `/users/{uid}/medications`, `/users/{uid}/logs` 사용자별 격리([`firestore.rules`](firestore.rules)).
  - IndexedDB 오프라인 우선 캐싱 지원 (`VITE_FIREBASE_*` 환경변수가 설정되지 않은 로컬 테스트 환경에서는 브라우저 로컬 저장소 모드로 동작).
- **PWA 지원**: 모바일 홈 화면 추가 및 서비스 워커 오프라인 셸 캐싱.

---

## 개발 및 실행

### 1. 설치 및 로컬 실행
```bash
npm install
npm run dev
```

### 2. 테스트 및 프로덕션 빌드
```bash
npm test
npm run build
```

---

## GitHub Actions 자동 배포 (GitHub Pages)

이 저장소는 `main` 브랜치에 푸시할 때마다 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) 워크플로를 통해 테스트, 빌드, GitHub Pages 배포를 자동으로 실행합니다.

1. GitHub 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
2. GitHub 저장소 **Settings → Secrets and variables → Actions**에 Firebase 웹 앱 설정 시크릿 6개를 등록합니다:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. Firebase Console 설정:
   - **Authentication → Sign-in method**에서 **Google** 로그인을 활성화하고 **승인된 도메인**에 `2gateless.github.io`를 추가합니다.
   - **Firestore Database → Rules**에 [`firestore.rules`](firestore.rules) 내용을 게시합니다.
4. 로컬 개발 시에는 [`.env.example`](.env.example)을 복사해 `.env` 파일을 만들어 위 값을 입력합니다.
