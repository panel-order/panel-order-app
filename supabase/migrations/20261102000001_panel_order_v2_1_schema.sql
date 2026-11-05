-- =============================================================================
-- 판넬오더 (Panel-Order) V2.1 - Supabase PostgreSQL 통합 스키마 & RLS 보안 마이그레이션
-- 기획서 제4장(데이터베이스 구조), 제5장(핵심 기능), 제6장(RBAC), 제7장(보안/RLS) 완벽 반영
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. 공통 ENUM 및 도메인 정의
-- -----------------------------------------------------------------------------
CREATE TYPE user_role_type AS ENUM ('manager', 'worker', 'supplier');
CREATE TYPE admin_role_type AS ENUM ('reviewer', 'dispute_manager', 'super_admin');
CREATE TYPE panel_kind_type AS ENUM ('GW', 'EPS', 'URETHANE', 'ZINC', 'AL', 'LOUVER', 'ALL');
CREATE TYPE team_unit_type AS ENUM ('SINGLE_MASTER', 'PAIR_2', 'TEAM_3', 'FULL_TEAM', 'NEGOTIABLE');
CREATE TYPE verification_status_type AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE application_status_type AS ENUM ('APPLIED', 'OFFERED', 'CONFIRMED', 'REJECTED', 'CANCELLED');
CREATE TYPE engagement_status_type AS ENUM ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED', 'CANCELLED');
CREATE TYPE payment_claim_status_type AS ENUM ('UNPAID', 'PAYER_CLAIMED', 'RECIPIENT_CONFIRMED', 'DISPUTED');

-- -----------------------------------------------------------------------------
-- 2. 프로필 및 권한 분리 (profiles, private_profiles, account_roles, admin_roles)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  avatar_url TEXT,
  primary_role user_role_type NOT NULL DEFAULT 'worker',
  region_code TEXT NOT NULL DEFAULT 'KR-41',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 실제 연락처 및 성인인증 정보는 공개 프로필과 엄격히 분리 (주민번호/신분증원본/CI 수집 금지)
CREATE TABLE public.private_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  phone_masked TEXT NOT NULL, -- 예: 010-****-5678
  birth_year SMALLINT NOT NULL CHECK (birth_year <= EXTRACT(YEAR FROM NOW())::SMALLINT - 18), -- 만 18세 이상 성인 강제 (근로기준법 제65조)
  adult_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 활동 역할 (일반 유저 멀티 롤)
CREATE TABLE public.account_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role_type NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- 관리자 권한 테이블 (일반 유저 계정과 완전히 분리, 서버 전용 변경)
CREATE TABLE public.admin_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_role admin_role_type NOT NULL,
  mfa_enforced BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. 조직/사업장 및 시공팀 (organizations, worker_profiles, teams, team_members)
-- -----------------------------------------------------------------------------
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  biz_reg_number TEXT NOT NULL UNIQUE,
  rep_name TEXT NOT NULL,
  job_info_provider_reg_no TEXT,
  verification_status verification_status_type NOT NULL DEFAULT 'PENDING',
  has_industrial_accident_3y BOOLEAN NOT NULL DEFAULT FALSE, -- 공표 내역 동일성 확인 완료 시에만 TRUE
  identity_verified_for_accident BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL DEFAULT 'MANAGER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE public.worker_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  career_years SMALLINT NOT NULL DEFAULT 1 CHECK (career_years >= 0),
  specialties panel_kind_type[] NOT NULL DEFAULT '{GW,EPS}',
  trip_available BOOLEAN NOT NULL DEFAULT TRUE,
  wage_basis TEXT NOT NULL DEFAULT 'DAILY' CHECK (wage_basis IN ('DAILY', 'TEAM_UNIT', 'QUOTE')),
  desired_master_wage_krw INTEGER NOT NULL DEFAULT 300000 CHECK (desired_master_wage_krw >= 0),
  desired_helper_wage_krw INTEGER NOT NULL DEFAULT 200000 CHECK (desired_helper_wage_krw >= 0),
  portfolio_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  leader_user_id UUID NOT NULL REFERENCES public.profiles(id),
  is_disbanded BOOLEAN NOT NULL DEFAULT FALSE,
  history_attribution_policy TEXT NOT NULL DEFAULT 'BOTH_LEADER_AND_PARTICIPANTS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 팀 대표의 일방적 수락으로 미동의 팀원의 작업이 확정되지 않도록 consent_status 필수화
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_grade TEXT NOT NULL CHECK (skill_grade IN ('MASTER', 'HELPER')),
  consent_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (consent_status IN ('PENDING', 'CONSENTED', 'REVOKED')),
  consented_at TIMESTAMPTZ,
  UNIQUE (team_id, user_id)
);

CREATE TABLE public.worker_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (user_id, available_date)
);

CREATE TABLE public.worker_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  quantity SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. 비공개 증빙 심사 (verification_requests, verification_files)
-- -----------------------------------------------------------------------------
CREATE TABLE public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('BIZ_LICENSE', 'SAFETY_EDU', 'HEALTH_CHECK', 'SKILL_CERT')),
  status verification_status_type NOT NULL DEFAULT 'PENDING',
  reviewer_admin_id UUID REFERENCES public.admin_roles(user_id),
  verified_scope TEXT,
  valid_until DATE,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 영구 공개 URL 금지: 비공개 버킷(private-verifications) 내 오브젝트 키만 저장
CREATE TABLE public.verification_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_request_id UUID NOT NULL REFERENCES public.verification_requests(id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL DEFAULT 'private-verifications',
  storage_object_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  exif_stripped BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. 대한민국 17대 권역 및 구인 공고 (regions, jobs, job_recruitment_slots)
-- -----------------------------------------------------------------------------
CREATE TABLE public.region_groups (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order SMALLINT NOT NULL
);

CREATE TABLE public.regions (
  admin_code TEXT PRIMARY KEY,
  region_group_code TEXT NOT NULL REFERENCES public.region_groups(code),
  sido_name TEXT NOT NULL,
  sigungu_name TEXT NOT NULL,
  grid_nx SMALLINT NOT NULL,
  grid_ny SMALLINT NOT NULL
);

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id UUID NOT NULL REFERENCES public.profiles(id),
  organization_id UUID REFERENCES public.organizations(id),
  title TEXT NOT NULL,
  region_group_code TEXT NOT NULL REFERENCES public.region_groups(code),
  region_detail TEXT NOT NULL,
  address_road TEXT NOT NULL,
  gate_memo TEXT NOT NULL,
  grid_nx SMALLINT NOT NULL,
  grid_ny SMALLINT NOT NULL,
  panel_kind panel_kind_type NOT NULL,
  health_check_required BOOLEAN NOT NULL DEFAULT TRUE,
  safety_edu_required BOOLEAN NOT NULL DEFAULT TRUE,
  team_unit team_unit_type NOT NULL,
  wage_mode TEXT NOT NULL CHECK (wage_mode IN ('INDIVIDUAL', 'TEAM_TOTAL')),
  master_daily_wage_krw INTEGER NOT NULL CHECK (master_daily_wage_krw >= 0),
  helper_daily_wage_krw INTEGER NOT NULL DEFAULT 0 CHECK (helper_daily_wage_krw >= 0),
  team_total_wage_krw INTEGER NOT NULL CHECK (team_total_wage_krw >= 0),
  work_date DATE NOT NULL,
  work_hours TEXT NOT NULL,
  break_hours TEXT NOT NULL,
  overtime_rule TEXT NOT NULL,
  payer_entity_name TEXT NOT NULL,
  pay_timing_desc TEXT NOT NULL,
  cancel_compensation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  cancel_compensation_krw INTEGER NOT NULL DEFAULT 0 CHECK (cancel_compensation_krw >= 0),
  cancel_compensation_terms TEXT, -- 고용주 재원 부담 명시, 플랫폼 보증 오인 금지
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'HIDDEN', 'DELETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.job_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  public_storage_path TEXT NOT NULL,
  exif_stripped BOOLEAN NOT NULL DEFAULT TRUE, -- 위치 EXIF 자동 제거 강제
  display_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.job_recruitment_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  slot_type team_unit_type NOT NULL,
  capacity SMALLINT NOT NULL CHECK (capacity > 0),
  filled_count SMALLINT NOT NULL DEFAULT 0 CHECK (filled_count >= 0 AND filled_count <= capacity)
);

-- -----------------------------------------------------------------------------
-- 6. 지원/조건제안/확정/정산 (applications, offers, engagements, terms_snapshots)
-- -----------------------------------------------------------------------------
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  applicant_user_id UUID NOT NULL REFERENCES public.profiles(id),
  team_id UUID REFERENCES public.teams(id),
  status application_status_type NOT NULL DEFAULT 'APPLIED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, applicant_user_id) -- 중복 지원 원천 차단
);

CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  proposer_user_id UUID NOT NULL REFERENCES public.profiles(id),
  proposed_master_wage_krw INTEGER NOT NULL,
  proposed_helper_wage_krw INTEGER NOT NULL DEFAULT 0,
  proposed_team_total_krw INTEGER NOT NULL,
  proposed_work_date DATE NOT NULL,
  notes TEXT,
  is_accepted BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  slot_id UUID NOT NULL REFERENCES public.job_recruitment_slots(id),
  application_id UUID NOT NULL UNIQUE REFERENCES public.applications(id),
  employer_user_id UUID NOT NULL REFERENCES public.profiles(id),
  worker_Or_leader_user_id UUID NOT NULL REFERENCES public.profiles(id),
  team_id UUID REFERENCES public.teams(id),
  status engagement_status_type NOT NULL DEFAULT 'CONFIRMED',
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.engagement_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  worker_user_id UUID NOT NULL REFERENCES public.profiles(id),
  role_in_work TEXT NOT NULL CHECK (role_in_work IN ('MASTER', 'HELPER')),
  agreed_daily_wage_krw INTEGER NOT NULL,
  member_consented BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (engagement_id, worker_user_id)
);

-- 합의 내용 불변 사본 및 조건 변경 시 재동의 교부 기록
CREATE TABLE public.terms_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  version_no SMALLINT NOT NULL DEFAULT 1,
  snapshot_payload JSONB NOT NULL, -- 임금, 시간, 취소보상, 지급주체 등 불변 박제
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (engagement_id, version_no)
);

CREATE TABLE public.terms_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terms_snapshot_id UUID NOT NULL REFERENCES public.terms_snapshots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT,
  UNIQUE (terms_snapshot_id, user_id)
);

-- 일별 작업, 지급자 주장(payer_claimed)과 수령자 확인(recipient_confirmed) 독립 분리
CREATE TABLE public.work_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  work_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE (engagement_id, work_date)
);

CREATE TABLE public.payment_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_day_id UUID NOT NULL UNIQUE REFERENCES public.work_days(id) ON DELETE CASCADE,
  payer_claimed_paid BOOLEAN NOT NULL DEFAULT FALSE,
  payer_claimed_at TIMESTAMPTZ,
  recipient_confirmed_paid BOOLEAN NOT NULL DEFAULT FALSE,
  recipient_confirmed_at TIMESTAMPTZ,
  status payment_claim_status_type NOT NULL DEFAULT 'UNPAID'
);

CREATE TABLE public.cancellation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id),
  requester_user_id UUID NOT NULL REFERENCES public.profiles(id),
  cancel_category TEXT NOT NULL CHECK (cancel_category IN ('WEATHER_FORCE_MAJEURE', 'EMPLOYER_FAULT', 'WORKER_FAULT', 'MUTUAL')),
  reason_detail TEXT NOT NULL,
  weather_snapshot_id UUID,
  penalty_held BOOLEAN NOT NULL DEFAULT TRUE, -- 기상악화 시 노쇼(-15점) 자동 감점 보류
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. 자재/장비 업체 홍보관 (supplier_profiles, supplier_listings)
-- -----------------------------------------------------------------------------
CREATE TABLE public.supplier_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  is_approved BOOLEAN NOT NULL DEFAULT FALSE, -- 미승인 업체는 초안 작성만 가능
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.supplier_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_user_id UUID NOT NULL REFERENCES public.supplier_profiles(user_id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('PANEL', 'FLASHING_SCREW', 'SKY_CRANE', 'TOOLS_ETC')),
  item_condition TEXT NOT NULL CHECK (item_condition IN ('NEW', 'USED', 'SURPLUS', 'RENTAL')),
  trade_status TEXT NOT NULL DEFAULT 'FOR_SALE' CHECK (trade_status IN ('DRAFT', 'FOR_SALE', 'RESERVED', 'SOLD_OUT', 'RENTABLE')),
  title TEXT NOT NULL,
  region_group_code TEXT NOT NULL REFERENCES public.region_groups(code),
  price_krw INTEGER NOT NULL DEFAULT 0,
  price_label TEXT NOT NULL,
  spec_detail TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. 그린 안전모 관심 찜 (favorites - UNIQUE 제약으로 중복 찜 원천 방지)
-- -----------------------------------------------------------------------------
CREATE TABLE public.job_favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, job_id)
);

CREATE TABLE public.worker_favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  worker_user_id UUID NOT NULL REFERENCES public.worker_profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, worker_user_id)
);

CREATE TABLE public.supplier_favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.supplier_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

-- -----------------------------------------------------------------------------
-- 9. 기상청 격자 캐시 및 안전 기준표 (weather_cache, weather_snapshots, weather_rules)
-- -----------------------------------------------------------------------------
CREATE TABLE public.weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_nx SMALLINT NOT NULL,
  grid_ny SMALLINT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('ULTRA_NOWCAST', 'SHORT_FORECAST', 'WEATHER_ALERT')),
  announced_at TIMESTAMPTZ NOT NULL,
  target_at TIMESTAMPTZ NOT NULL,
  queried_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  temp_c NUMERIC(4,1),
  rain_mm NUMERIC(5,1),
  wind_speed_ms NUMERIC(4,1) NOT NULL,
  wind_type TEXT NOT NULL DEFAULT '10MIN_AVG', -- 순간풍속 임의 치환 금지
  has_gust_data BOOLEAN NOT NULL DEFAULT FALSE,
  is_valid BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (grid_nx, grid_ny, data_type, announced_at, target_at)
);

CREATE TABLE public.weather_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_version TEXT NOT NULL UNIQUE,
  legal_basis TEXT NOT NULL DEFAULT '산업안전보건기준에 관한 규칙 제37조',
  effective_date DATE NOT NULL,
  wind_caution_ms NUMERIC(4,1) NOT NULL DEFAULT 10.0,
  wind_suspend_ms NUMERIC(4,1) NOT NULL DEFAULT 15.0,
  condition_matrix JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. 안전지수 이벤트 원장 및 구제 (score_events, score_summaries, appeals)
-- -----------------------------------------------------------------------------
-- 클라이언트 직접 수정 불가, 취소·정정 이벤트 추가(Append-only) 원장 구조
CREATE TABLE public.score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  metric_category TEXT NOT NULL CHECK (metric_category IN ('SAFETY', 'TRUST')),
  event_type TEXT NOT NULL,
  score_delta NUMERIC(5,2) NOT NULL,
  reference_engagement_id UUID REFERENCES public.engagements(id),
  reverses_event_id UUID REFERENCES public.score_events(id), -- 정정/취소 대상 원장 ID
  reason TEXT NOT NULL,
  created_by_system_or_admin UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.score_summaries (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_score NUMERIC(5,2) NOT NULL DEFAULT 80.00 CHECK (current_score >= 0.00 AND current_score <= 100.00),
  grade_code TEXT NOT NULL DEFAULT 'NORMAL',
  is_temporarily_restricted BOOLEAN NOT NULL DEFAULT FALSE, -- 65점 미만 시 영구정지가 아닌 임시제한
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_score_event_id UUID REFERENCES public.score_events(id),
  appeal_reason TEXT NOT NULL,
  evidence_bucket_path TEXT,
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED_RESTORED', 'REJECTED')),
  reviewed_by_admin_id UUID REFERENCES public.admin_roles(user_id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11. 1:1 채팅, 연락처 공개 동의, 차단, 감사 로그 (contact_grants, blocks, audit_logs)
-- -----------------------------------------------------------------------------
CREATE TABLE public.contact_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  granter_user_id UUID NOT NULL REFERENCES public.profiles(id),
  grantee_user_id UUID NOT NULL REFERENCES public.profiles(id),
  safe_050_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, granter_user_id, grantee_user_id)
);

CREATE TABLE public.blocks (
  blocker_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_user_id, blocked_user_id)
);

CREATE TABLE public.consent_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('COLLECTION', 'THIRD_PARTY_PROVISION', 'MARKETING', 'NIGHT_PUSH_20_08')),
  target_counterparty_id UUID,
  policy_version TEXT NOT NULL,
  is_agreed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id),
  action_name TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_record_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 12. 동시 정원 초과 방지 서버 트랜잭션 (Row-level Lock RPC)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_job_engagement(
  p_job_id UUID,
  p_slot_id UUID,
  p_application_id UUID,
  p_employer_id UUID,
  p_worker_id UUID,
  p_terms_payload JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_filled SMALLINT;
  v_capacity SMALLINT;
  v_engagement_id UUID;
BEGIN
  -- 1. Row-level Lock으로 동시 정원 초과 원천 방지
  SELECT filled_count, capacity
    INTO v_filled, v_capacity
    FROM public.job_recruitment_slots
   WHERE id = p_slot_id AND job_id = p_job_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '존재하지 않는 모집 슬롯입니다.';
  END IF;

  IF v_filled >= v_capacity THEN
    RAISE EXCEPTION '모집 정원이 이미 마감되었습니다.';
  END IF;

  -- 2. 슬롯 인원 증가 및 지원 상태 확정
  UPDATE public.job_recruitment_slots
     SET filled_count = filled_count + 1
   WHERE id = p_slot_id;

  UPDATE public.applications
     SET status = 'CONFIRMED'
   WHERE id = p_application_id;

  -- 3. 확정 작업(engagements) 및 불변 합의 사본(terms_snapshots) 생성
  INSERT INTO public.engagements (
    job_id, slot_id, application_id, employer_user_id, worker_Or_leader_user_id, status
  ) VALUES (
    p_job_id, p_slot_id, p_application_id, p_employer_id, p_worker_id, 'CONFIRMED'
  ) RETURNING id INTO v_engagement_id;

  INSERT INTO public.terms_snapshots (engagement_id, version_no, snapshot_payload)
  VALUES (v_engagement_id, 1, p_terms_payload);

  RETURN v_engagement_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 13. Row-Level Security (RLS) 기본 거부 원칙 및 권한 강제 (7.2절)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_files ENABLE ROW LEVEL SECURITY;

-- 공개 프로필 조회 허용, 본인 프로필만 닉네임/지역 수정 허용
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 비공개 연락처(private_profiles)는 본인 또는 contact_grants가 활성화된 합의 상대방만 조회 가능
CREATE POLICY "private_profiles_select_authorized" ON public.private_profiles
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.contact_grants cg
       WHERE cg.granter_user_id = private_profiles.user_id
         AND cg.grantee_user_id = auth.uid()
         AND cg.is_active = TRUE
    )
  );

-- 점수 원장(score_events)은 본인 조회만 가능하며 클라이언트 INSERT/UPDATE/DELETE 전면 차단
CREATE POLICY "score_events_select_self" ON public.score_events
  FOR SELECT USING (auth.uid() = user_id);

-- 공고 마감·삭제·숨김 이후에도 확정 작업 당사자는 기록 조회 유지 (5.1.4절)
CREATE POLICY "jobs_select_open_or_participant" ON public.jobs
  FOR SELECT USING (
    status = 'OPEN'
    OR author_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.engagements eg
       WHERE eg.job_id = jobs.id
         AND (eg.employer_user_id = auth.uid() OR eg.worker_Or_leader_user_id = auth.uid())
    )
  );
