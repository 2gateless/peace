# PEACE

두통 양상과 복용 약물(허브류·진통제)의 투약 시기, 일일 횟수, 안전 간격을 차분하고 직관적으로 기록·추적하는 개인용 **두통 및 투약 관리 PWA**입니다.

배포 주소: https://2gateless.github.io/peace/

---

## 주요 기능

- **평화로운 라이트 스카이 & 메도우 테마**
  - 푸른 하늘과 초록 초원, 은은한 무지개 배경(`PeaceScenery`), 둥근 곡선 서체의 연보라색 **`PEACE`** 로고(`#8b7cf6`), 오리가미 비둘기(`PeaceDoveIcon`) SVG 아이콘을 적용해 두통이 있을 때도 눈이 편안한 밝은 화면을 제공합니다.
- **첫 화면 요약 · 미니 차트 · 2줄 약물 배치**
  - 상단 **오늘의 평온** 카드에서 오늘 총 투약 횟수와 최근 복용 경과 시간 확인, `설정` 및 `+ 상세 기록` 진입을 지원합니다.
  - 중앙에는 **일자별 투약 빈도 & 평균 통증(최근 7일)** 차트를 배치하고, 하단에는 첫 줄 `허브 1 · 허브 2 · 허브 3`, 둘째 줄 `진통제 1 · 진통제 2` 버튼을 배치해 모바일 화면 높이에 맞춰 균형 있게 한눈에 볼 수 있습니다.
- **약물 하부 메뉴 (추가 · 확인 · 수정 · 삭제)**
  - 하단의 `허브 1·2·3` 또는 `진통제 1·2` 카드를 터치하면 즉시 기록되지 않고 약물 하부 메뉴(`MedicationActionModal`)가 열립니다.
  - 하부 메뉴에서 **+ 지금 투약 추가**, **+ 상세 추가**(시간·용량·통증 강도·메모), 그리고 해당 약물의 최근 투약 기록 **확인 · 수정 · 삭제**를 바로 수행할 수 있습니다. (타일 하단 `상세` 버튼으로 상세 입력 창을 바로 열 수도 있습니다.)
- **안전 복용 간격 & 일일 카운터**
  - 자정(00:00) 기준 오늘 복용 횟수 배지, 마지막 복용 후 경과 시간, 다음 권장 복용까지 남은 시간을 표시하며, 권장 간격 내 또는 일일 최대 한도 도달 시 확인 모달(`SafetyWarningModal`)을 띄워 실수를 예방합니다.
- **타임라인, 확장된 패턴 통계, 데이터 내보내기**
  - **타임라인**: 일자별 역순 투약 목록 조회·수정·삭제 및 **CSV / JSON** 로컬 파일 내보내기를 지원합니다.
  - **패턴 통계**: `최근 7일`, `최근 30일` 외에 **사용자 지정(`3개월` · `6개월` · `1년` · `2년`)** 드롭다운을 제공하며, 요약 수치(총 투약·평균 통증·최다 복용)와 `일자별 투약 빈도 & 평균 통증`, `약물별 복용 비율` 차트를 모바일 한 화면 비율로 보여줍니다.
- **모바일 화면 쓸기 & 뒤로 가기 제어**
  - **순환 화면 쓸기**: 화면을 우로 쓸면 `투약 기록 → 타임라인 → 패턴 통계 → 투약 기록`, 좌로 쓸면 `투약 기록 → 패턴 통계 → 타임라인 → 투약 기록` 순으로 이동합니다.
  - **뒤로 가기 제어**: `타임라인`이나 `패턴 통계` 화면에서 뒤로 가기를 누르면 첫 화면(`투약 기록`)으로 돌아가고, 첫 화면에서 뒤로 가기를 눌렀을 때만 앱이 종료됩니다.
- **Firebase Auth + Offline-First Firestore**
  - Google 계정 원클릭 로그인 및 `/users/{uid}/medications`, `/users/{uid}/logs` 사용자별 격리([`firestore.rules`](firestore.rules)).
  - IndexedDB 오프라인 우선 캐싱 지원 (`VITE_FIREBASE_*` 환경변수가 설정되지 않은 로컬 테스트 환경에서는 브라우저 로컬 저장소 모드로 동작).
- **PWA 지원**: 모바일 홈 화면 추가 및 서비스 워커 오프라인 셸 캐싱([`public/sw.js`](public/sw.js)).

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
