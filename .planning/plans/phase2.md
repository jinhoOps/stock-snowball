# Phase 2 Plan: Persistence & PWA

**Goal**: 앱처럼 시나리오를 저장하고 오프라인에서 구동되는 로컬 퍼스트 환경 구축

## Must-Haves
- [ ] `RxDB` 기반의 로컬 데이터베이스 스토리지 구축
- [ ] 시나리오(Scenario) CRUD API 및 리포지토리 패턴 구현
- [ ] PWA Manifest 및 Service Worker (Vite PWA Plugin) 설정
- [ ] Apple 스타일 KPI Grid (총자산, 누적수익, 연평균 수익률 등)
- [ ] `Web Crypto API`를 활용한 데이터 보안 기초

## Task List

### 2.1 Local-First Persistence
- [x] `RxDB` 초기화 및 `Scenarios` 컬렉션 스키마 정의
- [x] `useScenario` 커스텀 훅 개발 (저장, 수정, 삭제, 로드)
- [x] 오프라인 모드 데이터 동기화 확인

### 2.2 PWA & Mobile UX
- [x] Vite-PWA 플러그인 설정 및 아이콘/스플래시 이미지 생성
- [x] A2HS (Add to Home Screen) 가이드 구현 (iOS 메타 태그 포함)
- [x] iOS 전용 메타 태그 및 스터터링 방지 최적화

### 2.3 Dashboard UI (Apple Style)
- [x] KPI Grid 컴포넌트 구현 (`rounded.lg` 카드 기반)
- [x] 시나리오 전환용 사이드바 또는 세그먼트 컨트롤러 구현 (시나리오 리스트로 대체)
- [x] 로딩 상태 및 빈 시나리오 안내 페이지 디자인

## Success Criteria
1. 인터넷 연결 없이도 앱이 실행되고 기존 데이터가 유지됨.
2. 사용자가 저장한 시나리오가 로컬 DB에 안전하게 암호화되어 보관됨.
3. 모바일에서 앱 아이콘을 통해 진입 시 네이티브 앱과 같은 전체화면 경험 제공.
