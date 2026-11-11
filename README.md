# peace

두통 양상과 복용 약물(허브류·진통제)의 투약 시기, 일일 횟수, 안전 간격을 차분하고 직관적으로 기록·추적하는 개인용 **두통 및 투약 관리 PWA**입니다.

## 포크 및 수정 내역 (Fork & Personalization Notice)

이 저장소는 오픈소스 프로젝트인 [crmne/cluster-headache-tracker](https://github.com/crmne/cluster-headache-tracker) (GPL-3.0 라이선스)에서 출발한 개인 저장소(`2gateless/peace`)로, **개인 전용 두통/투약 관리 목적**에 맞게 전면 재설계되었습니다.

### 주요 특징
- **미니멀 & 젠(Zen) 다크 테마 (`peace`)**: 두통 시 눈의 피로를 줄여주는 딥 슬레이트(`#090d16`, `#0f172a`) & 올리브/세이지 그린(`#84a98c`, `#52796f`) 팔레트와 오리가미 비둘기(Peace Dove & Olive Arc) SVG 아이콘.
- **엄지 영역(Thumb Zone) 원클릭 투약 기록**: 하단에 배치된 5개 기본 캡슐 버튼(`허브 1`, `허브 2`, `허브 3`, `진통제 1`, `진통제 2`)을 한 손으로 터치해 즉시 기록하고, 약물 이름·라벨·최소 간격·일일 한도를 자유롭게 커스터마이징할 수 있습니다.
- **안전 복용 간격 & 일일 카운터**: 자정 기준 오늘 복용 횟수 배지, 마지막 복용 후 경과 시간(`3시간 20분 전 복용`), 권장 간격 내/일일 한도 초과 시 경고 모달 표시.
- **타임라인, 패턴 통계, CSV/JSON 내보내기**: 일자별 역순 타임라인(수정/삭제), 최근 7일/30일 Chart.js 통계, CSV/JSON 로컬 다운로드 지원.
- **Firebase Auth + Offline-First Firestore + GitHub Pages**:
  - Firebase Google 로그인 및 `/users/{uid}/medications`, `/users/{uid}/logs` 사용자별 격리([`firestore.rules`](firestore.rules)).
  - IndexedDB 오프라인 우선 캐싱 지원 (`VITE_FIREBASE_*` 미설정 시 로컬 브라우저 저장소 및 모의 Google 로그인 모드로 즉시 동작).
  - `main` 브랜치 푸시 시 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)이 테스트·빌드 후 GitHub Pages(`actions/deploy-pages@v4`)에 자동 배포.

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

### 3. Firebase & GitHub Pages 배포 설정
1. 로컬 개발 시 [`.env.example`](.env.example)을 복사해 `.env` 파일을 만들고 Firebase 웹 앱 설정값을 입력합니다.
2. GitHub 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 설정합니다.
3. GitHub 저장소 **Settings → Secrets and variables → Actions**에 아래 6개 Secret을 등록합니다:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Firebase Console의 **Firestore Database → Rules**에 [`firestore.rules`](firestore.rules) 내용을 반영하고, **Authentication → Sign-in method**에서 **Google**을 활성화합니다(승인된 도메인에 `2gateless.github.io` 추가).

---

## 라이선스

원본 저장소와 동일하게 **GNU General Public License v3.0 (GPL-3.0)** 을 따릅니다. 자세한 내용은 [`LICENSE`](LICENSE) 파일을 참고하세요.
