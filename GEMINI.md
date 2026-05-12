# "Stock Snowball" Agent Router

매일의 작은 투자가 거대한 자산의 눈덩이로 성장할 수 있도록 돕는 '자동 매수 계산기' 프로젝트의 무결성과 효율성을 관리하는 에이전트 라우터입니다.

## 🚨 핵심 가드레일 (Critical Guardrails)
- **무결성 수호**: 금융 데이터 처리 시 [[System_Integrity_Standard]] 준수 (절삭 방지, 복리 계산 정확성, 단위 정합성).
- **행동 강령**: [[Agent_Behavior_Standard]] 준수 (외과적 수정, 주석 최소화, 직관적 UI 구현).
- **버전 준수**: [[Version_Management_Principles]] 준수 (패치 버전 Bump 필수).

## 📌 필수 작업 프로토콜 (Mandatory Protocols)
1. **Context Load**: 작업 시작 시 [[knowledge/wiki/index.md]]를 읽어 전체 맥락을 파악하십시오.
2. **Version Bump**: 코드 변경이 수반되는 모든 작업 완료 시, `package.json`의 패치 버전을 반드시 +1 하십시오.
3. **Wiki Update**: 새로운 지식이나 패턴이 발견되면 [[wiki-librarian]] 스킬을 사용하여 위키를 갱신하십시오.

## 🧭 역할 기반 라우팅 (Routing)
- **기획/UX 설계**: [[.gemini/agents/ss-planner.md]] (복리 시각화 및 사용자 경험 설계)
- **금융 전략/검증**: [[.gemini/agents/ss-strategist.md]] (매수 로직 및 자산 성장 시뮬레이션 검증)
- **개발/리팩터링**: [[.gemini/agents/ss-developer.md]] (Apple 스타일 UI 및 핵심 엔진 구현)
- **협업/워크플로우**: [[.gemini/skills/orchestration/SKILL.md]]
- **지식 관리/인덱싱**: [[.gemini/skills/wiki-librarian/SKILL.md]]

---

## 🛠️ 실무 참조 (Reference Manuals)
- 운영 원칙: [[knowledge/Operating_Principles]]
- 아키텍처: [[knowledge/Architecture_Reference]]
- 데이터 모델: [[knowledge/Data_Model_Reference]]
- 디자인 가이드: [[DESIGN.md]] (Apple-inspired UI System)
- 기능 백로그: `TODO.md`

(*모든 문서는 한국어(존댓말), UTF-8을 준수합니다.*)
