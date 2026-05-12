# Phase 4 Plan: Apple Polish & Interactions

**Goal**: Apple 수준의 유려한 애니메이션과 인터랙션을 통한 사용자 경험 극대화

## Must-Haves
- [ ] `Framer Motion`을 활용한 레이아웃 전이 및 감성적 애니메이션
- [ ] 고도화된 `visx` 스크러빙(Scrubbing) 인터랙션 (Tooltip & Marker)
- [ ] 자산 성장 마일스톤 달성 축하 UI
- [ ] `DESIGN.md` 전수 점검 및 디자인 디테일 폴리싱
- [ ] 성능 최적화 (차트 렌더링 부하 감소)

## Task List

### 4.1 Emotional UX & Animation
- [ ] 시나리오 전환 시 `AnimatePresence`를 이용한 부드러운 슬라이드 구현
- [ ] 수치 업데이트 시 숫자가 부드럽게 카운팅되는 `AnimatedCounter` 구현
- [ ] 주요 자산 마일스톤 (예: 1억 달성) 시 파티클 효과 또는 배지 부여

### 4.2 Advanced Interactions
- [ ] 차트 스크러빙 시 햅틱 피드백(모바일) 및 정교한 툴팁 추적
- [ ] 곡선 그래프의 특정 시점을 클릭하여 "What-if" 시나리오 즉시 변경
- [ ] 마우스 휠 및 터치 제스처를 통한 차트 시간축 확대/축소

### 4.3 Final Audit & Polish
- [ ] `DESIGN.md` 가이드라인 준수 여부 최종 전수 검사
- [ ] 모든 디바이스(iPhone, iPad, Desktop)에서의 반응성 최종 점검
- [ ] 번들 사이즈 최적화 및 최종 배포 자동화 (CI/CD)

## Success Criteria
1. 모든 화면 전환과 수치 변경이 끊김 없이 부드럽게(60fps) 일어남.
2. 스크러빙 인터랙션을 통해 사용자가 손끝으로 자산 성장을 체감할 수 있음.
3. Apple App Store 앱에 준하는 수준의 UI 완성도를 확보함.
