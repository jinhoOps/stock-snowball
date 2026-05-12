# Phase 1 Plan: Foundation & Precision Engine

**Goal**: 금융적 무결성을 갖춘 계산 엔진과 기초적인 시각화 레이어 구축

## Must-Haves
- [x] Vite + React + TypeScript + Tailwind CSS 환경 구성
- [x] `Decimal.js` 기반의 `SnowballEngine` 핵심 로직 (매일 복리 계산) 구현
- [x] Banker's Rounding 유틸리티 구현 및 검증
- [x] `visx`를 활용한 기본적인 자산 성장 선형 차트
- [x] `DESIGN.md` 기반의 테마 설정 (Colors, Typography) 및 기본 레이아웃 (Global Nav)
- [x] 금융 연산 정확성 검증을 위한 단위 테스트 (Unit Tests)

## Task List

### 1.1 Project Scaffolding
- [x] Vite 프로젝트 초기화 (TS) 및 필수 패키지 설치 (`decimal.js`, `tailwind-merge`, `lucide-react`)
- [x] `tailwind.config.ts`에 `DESIGN.md` 컬러 및 타이포그래피 토큰 이식
- [x] 기본 디렉토리 구조 설정 (`src/core`, `src/components`, `src/hooks`, `src/styles`)

### 1.2 Core Precision Engine
- [x] `Decimal.js`를 래핑한 `SnowballEngine` 클래스 개발
- [x] 일 단위(Daily) 복리 계산 로직 구현: `P * (1 + r/365)^n`
- [x] Banker's Rounding (Rounding Half to Even) 함수 구현 및 테스트
- [x] 실질 가치 환산 로직 구현 (Context 반영)

### 1.3 Foundation UI & Visualization
- [x] `GlobalNav` 컴포넌트 구현 (Apple 스타일 블랙 바)
- [x] `ProductTile` 스타일의 메인 히어로 섹션 레이아웃
- [x] `visx` 기본 선형 차트 (`LinePath`) 및 축(Axis) 구현

### 1.4 Integrity Validation
- [x] 연산 엔진 무결성 테스트 (1년, 5년, 10년 단위 오차 검증)
- [x] 디자인 시스템 기초 적용 여부 확인

## Success Criteria
1. 복리 연산 결과가 엑셀/금융 계산기와 1원 단위까지 일치함. (Passed: Integrity.test.ts)
2. SF Pro 폰트와 Action Blue 컬러가 UI에 올바르게 적용됨. (Verified: Static analysis)
3. 차트가 실시간 데이터(입력값 변화)에 따라 즉각적으로 반응함. (Verified: App.tsx state binding)
