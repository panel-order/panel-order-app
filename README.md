# 판넬오더 (Panel-Order) V2.1 풀스택 구현 가이드 (Next.js App Router + Supabase)

본 패키지는 **[기획서 프롬프트] 판넬오더 (Panel-Order) V2.1 (최종 완성 통합본)**의 제1장~제7장 요구사항을 빠짐없이 반영하여 순차적으로 바로 실행·배포할 수 있도록 구성한 풀스택 코드 패키지입니다.

## 1. 디렉토리 구조
- `supabase/migrations/20261102000001_panel_order_v2_1_schema.sql`:
  - 4.2절 전체 테이블(`profiles`, `private_profiles`, `account_roles`, `admin_roles`, `organizations`, `worker_profiles`, `teams`, `team_members`, `verification_requests`, `verification_files`, `jobs`, `job_recruitment_slots`, `applications`, `offers`, `engagements`, `terms_snapshots`, `work_days`, `payment_confirmations`, `cancellation_requests`, `supplier_profiles`, `supplier_listings`, `weather_cache`, `score_events`, `score_summaries`, `appeals`, `contact_grants`, `blocks`, `consent_receipts`, `audit_logs`)
  - 동시 정원 초과 방지 Row-level Lock RPC 함수(`confirm_job_engagement`)
  - 기본 거부 원칙(Default Deny) 및 클라이언트 임의 수정 원천 차단 RLS 정책
- `src/app/page.tsx`:
  - 모바일 퍼스트(Max-width 480px) 세이프티 그린(`#10B981`) & 슬레이트 블랙(`#0F172A`) 4대 탭 풀인터랙티브 UI
- `src/app/api/weather/route.ts`:
  - 기상청 격자(`nx, ny`) 공유 캐시 및 안전보건규칙 제37조 풍속 알림 서버 어댑터
- `src/app/actions/security_actions.ts`:
  - 비공개 증빙 버킷(`private-verifications`) 60초 유효 Signed URL 발급, 감사 로그(`audit_logs`) 기록, 기상악화 취소 시 노쇼(`-15.0점`) 자동 감점 보류 Server Actions

## 2. 순차적 세팅 및 실행 방법
1. **Supabase DB 스키마 및 RLS 적용**
   ```bash
   supabase db push
   # 또는 Supabase SQL Editor에 supabase/migrations/20261102000001_panel_order_v2_1_schema.sql 전체 붙여넣기 후 실행
   ```
2. **비공개 증빙 스토리지 버킷 생성**
   - Supabase Storage에서 `private-verifications` (Private 버킷) 및 `public-thumbnails` (EXIF 제거 썸네일 전용) 생성
3. **환경변수(`.env.local`) 설정**
   ```ini
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   KMA_SERVICE_KEY=your-kma-api-key
   ENABLE_LIVE_KMA_API=false
   ```
4. **개발 서버 실행**
   ```bash
   npm install
   npm run dev
   ```
