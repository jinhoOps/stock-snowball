# Node 20 jsdom 배포 Hotfix 설계

## 문제

GitHub Pages 배포 run `31783093314`는 `npm test`에서 실패했다. 배포 워크플로는 승인된 Node 20을 사용하지만 새 테스트 의존성 `jsdom@30.0.1`은 Node `^22.22.2 || ^24.15.0 || >=26.0.0`만 지원한다. 그 결과 jsdom이 불러오는 `undici@8`이 Node 20에 없는 WebIDL API를 호출해 네 개의 Vitest jsdom worker가 시작되지 못했다. 로컬 Node 26에서는 같은 문제가 가려졌다.

## 결정

Node 20을 지원하는 최신 jsdom인 `29.1.1`로 정확히 고정한다. 이 버전의 엔진 범위는 `^20.19.0 || ^22.13.0 || >=24.0.0`이며, GitHub Actions의 `node-version: 20` 최신 패치와 호환된다.

Node 런타임은 변경하지 않는다. Node 24 전환은 별도 런타임 마이그레이션 작업이고, 현재 프로젝트의 Python/uv 및 Pages 설계는 Node 20 보존을 명시한다. DOM 구현 교체도 테스트 동작 범위를 불필요하게 넓히므로 하지 않는다.

## 변경 범위

- `package.json`: `jsdom`을 `29.1.1`로 정확히 고정한다.
- `package-lock.json`: jsdom 및 전이 의존성을 clean install 결과로 갱신한다.
- 애플리케이션 코드, 시장 데이터, GitHub Actions 워크플로는 변경하지 않는다.
- 저장소 규칙에 따라 패치 버전을 `1.3.29`로 올리고 lockfile 루트 메타데이터를 동기화한다.

## 검증

RED는 실패한 Pages run의 Node 20 스택과, hotfix 전 lockfile을 Node 20.19.x로 실행한 jsdom import/Vitest 재현으로 고정한다.

GREEN 조건은 다음과 같다.

1. clean install에서 `jsdom@29.1.1`이 해석된다.
2. Node 20.19.x에서 jsdom import와 `npm test`가 성공한다.
3. Python 17개 테스트, 14종목 데이터 검사, Vitest 123개, 프로덕션 빌드가 통과한다.
4. hotfix를 main에 fast-forward하고 push한 뒤 새 Pages run의 build와 deploy job이 모두 성공한다.

## 롤백

배포가 계속 실패하면 hotfix 커밋 하나를 revert하면 된다. Node 런타임이나 애플리케이션 코드를 건드리지 않으므로 롤백 범위는 package metadata와 lockfile로 제한된다.
