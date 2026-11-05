import React, { useState, useMemo, useEffect } from 'react';
import {
  Home,
  HardHat,
  Building2,
  User,
  MapPin,
  Wind,
  CloudRain,
  Sun,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  ChevronRight,
  Lock,
  Unlock,
  FileText,
  Upload,
  Navigation,
  Copy,
  Flag,
  Ban,
  Award,
  RefreshCw,
  LogOut,
  Trash2,
  Bell,
  Moon,
  Settings,
  X,
  Info,
  Wrench,
  Users,
  DollarSign,
  FileCheck,
  History,
  SlidersHorizontal,
  Sparkles,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';

// ==========================================
// 1. 타입 및 상수 정의 (Types & Constants)
// ==========================================
type RoleType = 'manager' | 'worker' | 'supplier' | 'admin';
type TabType = 'home' | 'workers' | 'suppliers' | 'mypage' | 'admin';
type PanelKind = 'ALL' | 'GW' | 'EPS' | 'URETHANE' | 'ZINC' | 'AL' | 'LOUVER';
type TeamUnitType = 'SINGLE_MASTER' | 'PAIR_2' | 'TEAM_3' | 'FULL_TEAM' | 'NEGOTIABLE';
type LifecycleStage = 'APPLIED' | 'OFFERED' | 'CONFIRMED' | 'COMPLETED_PAID' | 'REVIEWED';

interface WeatherSnapshot {
  gridNx: number;
  gridNy: number;
  stationName: string;
  dataType: '실황(초단기)' | '단기예보' | '예보제공전';
  announcedAt: string;
  targetAt: string;
  queriedAt: string;
  tempC: number;
  rainMm: number;
  windSpeedMs: number;
  windType: '10분 평균풍속' | '예보풍속';
  hasGustData: boolean;
  isValid: boolean;
  ruleVersion: string;
}

interface JobPost {
  id: string;
  title: string;
  regionGroup: string;
  regionDetail: string;
  panelKind: Exclude<PanelKind, 'ALL'>;
  healthCheckRequired?: boolean;
  safetyEduRequired?: boolean;
  fireCertStatus: 'VERIFIED' | 'PENDING' | 'NONE';
  fireCertDocNumber?: string;
  teamUnit: TeamUnitType;
  wageMode: 'INDIVIDUAL' | 'TEAM_TOTAL';
  masterWage: number; // 원 단위
  helperWage: number; // 원 단위
  teamTotalWage: number; // 원 단위
  workHours: string;
  breakHours: string;
  overtimeRule: string;
  payerEntity: string;
  payTiming: string;
  cancelCompensation: boolean;
  cancelCompensationAmount?: number;
  cancelCondition: string;
  sitePhotoPreview?: string;
  gateMemo: string;
  address: string;
  workDate: string;
  slotsTotal: number;
  slotsFilled: number;
  helmetLikes: number;
  managerName: string;
  managerOrg: string;
  managerPhoneMasked: string;
  managerPhoneReal: string;
  managerSafetyScore: number;
  industrialAccident3Y: boolean; // 최근 3년 산재 공표 여부 (동일성 확인 완료건만)
  weather: WeatherSnapshot;
  svgTheme: string;
  lifecycleStage: LifecycleStage;
}

interface WorkerProfile {
  id: string;
  type: 'TEAM' | 'INDIVIDUAL';
  name: string;
  teamLeader?: string;
  memberCount: number;
  allMembersConsented: boolean; // team_members 참여 동의 필수화
  regionGroup: string;
  availableDate: string;
  tripAvailable: boolean;
  composition: string;
  careerYears: number;
  specialties: Exclude<PanelKind, 'ALL'>[];
  equipmentList: string[];
  wageType: '일당기준' | '팀단가기준' | '견적문의';
  desiredMasterWage: number;
  desiredHelperWage: number;
  badges: {
    safetyEduCompleted: boolean;
    safetyEduDate?: string;
    skillCertVerified: boolean;
    bizVerified: boolean;
  };
  safetyScore: number;
  helmetLikes: number;
  portfolioSummary: string;
}

interface SupplierListing {
  id: string;
  orgName: string;
  bizRegNumber?: string;
  photoPreview?: string;
  bizVerifiedStatus: 'APPROVED' | 'DRAFT_PENDING' | 'REJECTED';
  rejectReason?: string;
  category: 'PANEL' | 'FLASHING_SCREW' | 'SKY_CRANE' | 'TOOLS_ETC';
  condition: '신품' | '중고' | '잔여자재' | '배차대여';
  tradeStatus: '판매중' | '예약중' | '품절' | '대여가능';
  title: string;
  regionGroup: string;
  priceText: string;
  specDetail: string;
  helmetLikes: number;
  contactMasked: string;
}

interface ScoreLedgerEvent {
  id: string;
  createdAt: string;
  category: 'SAFETY' | 'TRUST';
  eventType: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  status: 'APPLIED' | 'HELD_WEATHER' | 'CORRECTED';
}

const REGIONS_17 = [
  '전국 전체', '서울', '경기 북부', '경기 남부', '인천', '강원',
  '충북', '충남/세종', '대전', '전북', '전남/광주', '경북/대구',
  '경남', '부산', '울산', '제주'
];

const PANEL_LABELS: Record<PanelKind, string> = {
  ALL: '전체 판넬',
  GW: '그라스울(GW)',
  EPS: 'EPS 판넬',
  URETHANE: '우레탄',
  ZINC: '징크 판넬',
  AL: 'AL 복합판넬',
  LOUVER: '루바 판넬',
};

const TEAM_UNIT_LABELS: Record<TeamUnitType, string> = {
  SINGLE_MASTER: '기공 1인',
  PAIR_2: '2인 1조 (기공1+조공1)',
  TEAM_3: '3인 1조 (기공2+조공1)',
  FULL_TEAM: '시공팀 전체 (4인+)',
  NEGOTIABLE: '단가 협의 (인원·단가 현장 조율)',
};

// ==========================================
// 2. 초기 시드 데이터 (Mock Database)
// ==========================================
const INITIAL_JOBS: JobPost[] = [
  {
    id: 'job-101',
    title: '평택 고덕 물류센터 외벽 GW 100T 판넬 시공 2인1조 구인',
    regionGroup: '경기 남부',
    regionDetail: '평택시 고덕면',
    panelKind: 'GW',
    fireCertStatus: 'VERIFIED',
    fireCertDocNumber: '제2026-KFI-0892호 (준불연 시험성적서 검수완료)',
    teamUnit: 'PAIR_2',
    wageMode: 'INDIVIDUAL',
    masterWage: 300000,
    helperWage: 200000,
    teamTotalWage: 500000,
    workHours: '07:00 ~ 17:00',
    breakHours: '12:00~13:00 (오전/오후 참 각 30분)',
    overtimeRule: '연장 시 시간당 45,000원 별도 정산',
    payerEntity: '(주)한울테크건축 (원청 직불 약정)',
    payTiming: '당일 작업 종료 후 18:00 계좌이체',
    healthCheckRequired: true,
    safetyEduRequired: true,
    cancelCompensation: true,
    cancelCompensationAmount: 100000,
    cancelCondition: '현장 자재 미입고 등 고용주 귀책 당일 취소 시 팀당 100,000원 지급 (고용주 측정·재원 부담, 출역 증빙 필수)',
    gateMemo: '북문 3번 게이트 진입 후 우측 가설사무실 앞 하차 (신호수 대기)',
    address: '경기도 평택시 고덕국제대로 112 현장 북문 3번 게이트',
    workDate: '2026-11-03',
    slotsTotal: 2,
    slotsFilled: 1,
    helmetLikes: 18,
    managerName: '김철수 현장소장',
    managerOrg: '(주)한울테크건축',
    managerPhoneMasked: '010-****-4821',
    managerPhoneReal: '010-8912-4821',
    managerSafetyScore: 96.4,
    industrialAccident3Y: false,
    weather: {
      gridNx: 62,
      gridNy: 114,
      stationName: '평택 고덕 격자(62,114)',
      dataType: '단기예보',
      announcedAt: '2026-11-02 08:00',
      targetAt: '2026-11-03 09:00',
      queriedAt: '2026-11-02 10:55',
      tempC: 11.5,
      rainMm: 0,
      windSpeedMs: 11.4,
      windType: '예보풍속',
      hasGustData: false,
      isValid: true,
      ruleVersion: '안전보건규칙 제37조 (2026.06 기준표 v2.1)'
    },
    svgTheme: 'emerald',
    lifecycleStage: 'OFFERED'
  },
  {
    id: 'job-102',
    title: '이천 냉동창고 우레탄 150T 칸막이 시공 베테랑 팀 모집',
    regionGroup: '경기 남부',
    regionDetail: '이천시 마장면',
    panelKind: 'URETHANE',
    fireCertStatus: 'PENDING',
    teamUnit: 'TEAM_3',
    wageMode: 'INDIVIDUAL',
    masterWage: 320000,
    helperWage: 210000,
    teamTotalWage: 850000,
    workHours: '07:30 ~ 17:30',
    breakHours: '중식 1시간 + 휴식 1시간',
    overtimeRule: '야간 작업 없음',
    payerEntity: '대성판넬이엔지 (전문건설업)',
    payTiming: '익일 오전 10시 이내 칼정산',
    healthCheckRequired: false,
    safetyEduRequired: true,
    cancelCompensation: true,
    cancelCompensationAmount: 150000,
    cancelCondition: '고용주 귀책 현장 취소 시 교통비·대기보상금 150,000원 지급 (고용주 측정·직접 지급 약정)',
    gateMemo: '정문 경비실 출입명부 작성 후 B동 내부 하역장 진입',
    address: '경기도 이천시 마장면 덕평로 482번길 30',
    workDate: '2026-11-04',
    slotsTotal: 1,
    slotsFilled: 0,
    helmetLikes: 29,
    managerName: '박상훈 공사부장',
    managerOrg: '대성판넬이엔지',
    managerPhoneMasked: '010-****-7739',
    managerPhoneReal: '010-3341-7739',
    managerSafetyScore: 89.2,
    industrialAccident3Y: false,
    weather: {
      gridNx: 68,
      gridNy: 117,
      stationName: '이천 마장 격자(68,117)',
      dataType: '실황(초단기)',
      announcedAt: '2026-11-02 10:30',
      targetAt: '2026-11-02 11:00',
      queriedAt: '2026-11-02 10:58',
      tempC: 14.2,
      rainMm: 0,
      windSpeedMs: 4.8,
      windType: '10분 평균풍속',
      hasGustData: false,
      isValid: true,
      ruleVersion: '안전보건규칙 제37조 (2026.06 기준표 v2.1)'
    },
    svgTheme: 'amber',
    lifecycleStage: 'APPLIED'
  },
  {
    id: 'job-103',
    title: '천안 아산 산단 공장동 지붕 징크판넬 및 후레싱 마감 기공 1인',
    regionGroup: '충남/세종',
    regionDetail: '천안시 서북구',
    panelKind: 'ZINC',
    fireCertStatus: 'NONE',
    teamUnit: 'SINGLE_MASTER',
    wageMode: 'INDIVIDUAL',
    masterWage: 330000,
    helperWage: 0,
    teamTotalWage: 330000,
    workHours: '07:00 ~ 17:00',
    breakHours: '12:00 ~ 13:00',
    overtimeRule: '조기 마감 시에도 일당 전액 지급',
    payerEntity: '충청스틸하우징',
    payTiming: '당일 현장 직불',
    cancelCompensation: false,
    cancelCondition: '우천 시 전일 18시 이전 상호 일정 연기 협의',
    gateMemo: '제2공장 후문 스카이장비 주차 구역 옆 집결',
    address: '충청남도 천안시 서북구 직산읍 4산단로 55',
    workDate: '2026-11-05',
    slotsTotal: 3,
    slotsFilled: 2,
    helmetLikes: 11,
    managerName: '이정호 반장',
    managerOrg: '충청스틸하우징',
    managerPhoneMasked: '010-****-9012',
    managerPhoneReal: '010-5582-9012',
    managerSafetyScore: 82.0,
    industrialAccident3Y: false,
    weather: {
      gridNx: 63,
      gridNy: 110,
      stationName: '천안 직산 격자(63,110)',
      dataType: '단기예보',
      announcedAt: '2026-11-02 08:00',
      targetAt: '2026-11-05 09:00',
      queriedAt: '2026-11-02 10:55',
      tempC: 9.8,
      rainMm: 12.0,
      windSpeedMs: 15.6,
      windType: '예보풍속',
      hasGustData: false,
      isValid: true,
      ruleVersion: '안전보건규칙 제37조 (2026.06 기준표 v2.1)'
    },
    svgTheme: 'rose',
    lifecycleStage: 'CONFIRMED'
  }
];

const INITIAL_WORKERS: WorkerProfile[] = [
  {
    id: 'wk-201',
    type: 'TEAM',
    name: '번개 판넬시공팀 (김기공 외 2인)',
    teamLeader: '김태호 팀장',
    memberCount: 3,
    allMembersConsented: true,
    regionGroup: '경기 남부',
    availableDate: '즉시 투입 가능 (당일/장기/전국출장)',
    tripAvailable: true,
    composition: '기공 2명 + 조공 1명 (3인 1조)',
    careerYears: 14,
    specialties: ['GW', 'URETHANE', 'ZINC', 'AL'],
    equipmentList: ['충전 임팩/원형톱 풀세트', '레이저 레벨기 2대', '판넬 흡착기(윈도우 리프터)', '1톤 탑차 보유'],
    wageType: '일당기준',
    desiredMasterWage: 300000,
    desiredHelperWage: 200000,
    badges: {
      safetyEduCompleted: true,
      safetyEduDate: '2025-04-12 (건설업 기초안전보건교육 4시간)',
      skillCertVerified: true,
      bizVerified: true
    },
    safetyScore: 96.5,
    helmetLikes: 42,
    portfolioSummary: '평택·이천·용인 대형 물류센터 그라스울(GW) 종/횡판넬 및 냉동창고 우레탄 시공 120건 이상 무사고 완수'
  },
  {
    id: 'wk-202',
    type: 'TEAM',
    name: '백두산 2인1조 기공·조공 호흡팀',
    teamLeader: '최동훈 기공',
    memberCount: 2,
    allMembersConsented: true,
    regionGroup: '충남/세종',
    availableDate: '2026-11-04 이후 가능',
    tripAvailable: true,
    composition: '기공 1명 + 조공 1명 (2인 1조)',
    careerYears: 9,
    specialties: ['EPS', 'GW', 'LOUVER'],
    equipmentList: ['유무선 판넬 컷팅기', '철재 절곡 가위/클램프', '안전그네·2중 안전고리 전원 보유'],
    wageType: '일당기준',
    desiredMasterWage: 290000,
    desiredHelperWage: 190000,
    badges: {
      safetyEduCompleted: true,
      safetyEduDate: '2024-11-08 (건설업 기초안전보건교육)',
      skillCertVerified: true,
      bizVerified: false
    },
    safetyScore: 88.4,
    helmetLikes: 23,
    portfolioSummary: '공장 신축 및 리모델링 EPS·GW 외벽 및 지붕 루바 판넬 정밀 시공 전문'
  },
  {
    id: 'wk-203',
    type: 'INDIVIDUAL',
    name: '정성훈 (징크·후레싱 마감 전문 기공)',
    memberCount: 1,
    allMembersConsented: true,
    regionGroup: '서울',
    availableDate: '상시 조율 가능 (수도권 당일)',
    tripAvailable: false,
    composition: '기공 1인 단독',
    careerYears: 18,
    specialties: ['ZINC', 'AL', 'LOUVER'],
    equipmentList: ['징크 전용 절곡·롤포밍 수공구 일체', '레이저 레벨기'],
    wageType: '일당기준',
    desiredMasterWage: 330000,
    desiredHelperWage: 0,
    badges: {
      safetyEduCompleted: true,
      safetyEduDate: '2023-09-19 (건설업 기초안전보건교육)',
      skillCertVerified: true,
      bizVerified: true
    },
    safetyScore: 95.2,
    helmetLikes: 31,
    portfolioSummary: '사옥·상가 건물 징크/알루미늄 복합판넬 코너 후레싱 및 방수 마감 특화'
  }
];

const INITIAL_SUPPLIERS: SupplierListing[] = [
  {
    id: 'sup-301',
    orgName: '경기그린판넬공장 직영센터',
    bizRegNumber: '135-81-49201',
    bizVerifiedStatus: 'APPROVED',
    category: 'PANEL',
    condition: '신품',
    tradeStatus: '판매중',
    title: '준불연 그라스울(GW) 100T / EPS 50T~150T 공장도가 당일 출고',
    regionGroup: '경기 남부',
    priceText: '회배(㎡)당 24,500원~ (규격별 상이)',
    specDetail: '밀도 48K/64K 성적서 완비, 5톤/추레라 현장 직송 배차 지원',
    helmetLikes: 54,
    contactMasked: '031-****-8800'
  },
  {
    id: 'sup-302',
    orgName: '번개스카이 & 크레인 배차본부',
    bizRegNumber: '214-86-99102',
    bizVerifiedStatus: 'APPROVED',
    category: 'SKY_CRANE',
    condition: '배차대여',
    tradeStatus: '대여가능',
    title: '3.5톤 / 5톤 스카이차 (작업높이 28m~45m) 판넬 전용 윈치 장착',
    regionGroup: '전국 전체',
    priceText: '일대 550,000원 (오전 반나절 가능)',
    specDetail: '풍속계 기본 탑재, 비파괴검사 및 보험 완비, 베테랑 기사 배차',
    helmetLikes: 39,
    contactMasked: '1588-****'
  },
  {
    id: 'sup-303',
    orgName: '정밀절곡 후레싱·부자재 마트',
    bizRegNumber: '312-88-11045',
    bizVerifiedStatus: 'APPROVED',
    category: 'FLASHING_SCREW',
    condition: '신품',
    tradeStatus: '판매중',
    title: '물받이·코너·창문 후레싱 도면 당일 절곡 + 판넬 직결피스 대량할인',
    regionGroup: '충남/세종',
    priceText: '자당 1,800원~ / 피스 박스당 도매가',
    specDetail: '컬러강판 전 색상 보유, 현장 도면 사진 전송 시 2시간 내 절곡 출고',
    helmetLikes: 27,
    contactMasked: '041-****-3312'
  },
  {
    id: 'sup-304',
    orgName: '화성산단 잔여판넬 직거래팀 (심사중 예시)',
    bizRegNumber: '129-42-88120',
    bizVerifiedStatus: 'DRAFT_PENDING',
    category: 'PANEL',
    condition: '잔여자재',
    tradeStatus: '예약중',
    title: '[사업자 검수 대기 초안] 우레탄 100T 미사용 잔여 판넬 45장 일괄',
    regionGroup: '경기 남부',
    priceText: '장당 35,000원',
    specDetail: '사업자등록증 심사 완료 전에는 일반 피드에 공개되지 않으며 인증 배지가 차단됩니다.',
    helmetLikes: 0,
    contactMasked: '010-****-0000'
  }
];

const INITIAL_LEDGER: ScoreLedgerEvent[] = [
  {
    id: 'ev-01',
    createdAt: '2026-09-01 09:00',
    category: 'SAFETY',
    eventType: 'INITIAL_BASE_80',
    delta: 80.0,
    balanceAfter: 80.0,
    reason: '[1. 기본 시작 점수] 신규 가입 기본 안전지수 80.0점 부여 (🟡 보통 등급 시작)',
    status: 'APPLIED'
  },
  {
    id: 'ev-02',
    createdAt: '2026-09-05 14:10',
    category: 'SAFETY',
    eventType: 'DOC_CERT_BONUS_MAX7',
    delta: 7.0,
    balanceAfter: 87.0,
    reason: '[2. 서류 인증 가점 +7.0] 기초안전교육(+3.0) + 건강검진(+2.0) + 사업자확인(+2.0) 완비',
    status: 'APPLIED'
  },
  {
    id: 'ev-03',
    createdAt: '2026-09-18 08:30',
    category: 'TRUST',
    eventType: 'POST_REGISTER_AND_CONFIRM',
    delta: 0.5,
    balanceAfter: 87.5,
    reason: '[3. 건별 활동 누적] 공고/프로필 성실 등록(+0.2점) + 상호 체결 확정(+0.3점)',
    status: 'APPLIED'
  },
  {
    id: 'ev-04',
    createdAt: '2026-09-20 18:05',
    category: 'TRUST',
    eventType: 'WORK_PAID_AND_STAR_5',
    delta: 2.0,
    balanceAfter: 89.5,
    reason: '[3. 건별 활동 누적] 작업 완료 & 당일 정산 확인(+1.0점) + 상호 별점 평가 5점 만점(+1.0점)',
    status: 'APPLIED'
  },
  {
    id: 'ev-05',
    createdAt: '2026-10-12 19:00',
    category: 'TRUST',
    eventType: 'REMATCH_BONUS_AND_CYCLE',
    delta: 6.0,
    balanceAfter: 95.5,
    reason: '[3. 건별 활동 누적] 평택·이천 현장 재매칭 보너스(+2.0점×2회) 및 정산·별점 누적(+2.0점)',
    status: 'APPLIED'
  },
  {
    id: 'ev-06',
    createdAt: '2026-10-25 08:15',
    category: 'SAFETY',
    eventType: 'WEATHER_CANCEL_HOLD',
    delta: 0.0,
    balanceAfter: 95.5,
    reason: '[4. 리스크 차감 보류] 천안 현장 강풍(15.6m/s) 기상악화 취소 (무단 노쇼 -15.0점 감점 자동 보류 0.0점)',
    status: 'HELD_WEATHER'
  }
];

// ==========================================
// 3. 유틸리티 헬퍼 (Helpers)
// ==========================================
function getSafetyGrade(score: number) {
  if (score >= 95) {
    return { label: '👑 명장', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', ring: 'text-emerald-400' };
  }
  if (score >= 85) {
    return { label: '🛡️ 안전 베테랑', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40', ring: 'text-teal-400' };
  }
  if (score >= 75) {
    return { label: '🟡 보통', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', ring: 'text-amber-400' };
  }
  if (score >= 65) {
    return { label: '🔴 주의 필요', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', ring: 'text-rose-400' };
  }
  return { label: '⛔ 임시 제한 (구제 심사 대상)', color: 'bg-red-900/50 text-red-200 border-red-500', ring: 'text-red-400' };
}

function formatKRW(amount: number) {
  return amount.toLocaleString('ko-KR') + '원';
}

// ==========================================
// 4. 메인 애플리케이션 컴포넌트 (Main App)
// ==========================================
export default function App() {
  // 온보딩 및 세션 상태
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [pendingReturnJobId, setPendingReturnJobId] = useState<string | null>(null);

  // 멀티 롤 & 관리자 분리 상태
  const [activeRole, setActiveRole] = useState<RoleType>('manager');
  const [verifiedRoles, setVerifiedRoles] = useState<RoleType[]>(['manager', 'worker', 'supplier']);
  const [isAdminSession, setIsAdminSession] = useState<boolean>(false);
  const [adminSubRole, setAdminSubRole] = useState<'REVIEWER' | 'DISPUTE_MANAGER' | 'SUPER_ADMIN'>('SUPER_ADMIN');

  // 하단 네비게이션 탭 & 지역/필터 상태
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedRegion, setSelectedRegion] = useState<string>('전국 전체');
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);
  const [selectedPanelFilter, setSelectedPanelFilter] = useState<PanelKind>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 데이터 상태
  const [jobs, setJobs] = useState<JobPost[]>(INITIAL_JOBS);
  const [workers, setWorkers] = useState<WorkerProfile[]>(INITIAL_WORKERS);
  const [suppliers, setSuppliers] = useState<SupplierListing[]>(INITIAL_SUPPLIERS);
  const [scoreLedger, setScoreLedger] = useState<ScoreLedgerEvent[]>(INITIAL_LEDGER);
  const [mySafetyScore, setMySafetyScore] = useState<number>(95.5);

  // 그린 안전모(⛑️) 관심 목록 (중복 방지 Set 구조)
  const [likedJobIds, setLikedJobIds] = useState<Record<string, boolean>>({ 'job-101': true });
  const [likedWorkerIds, setLikedWorkerIds] = useState<Record<string, boolean>>({ 'wk-201': true });
  const [likedSupplierIds, setLikedSupplierIds] = useState<Record<string, boolean>>({});

  // 차단한 사용자/공고 목록
  const [blockedTargetIds, setBlockedTargetIds] = useState<Record<string, boolean>>({});

  // 상세 모달 및 기능 모달 상태
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [showJobCreateModal, setShowJobCreateModal] = useState<boolean>(false);
  const [showWorkerCreateModal, setShowWorkerCreateModal] = useState<boolean>(false);
  const [showSupplierCreateModal, setShowSupplierCreateModal] = useState<boolean>(false);

  // Just-in-Time 동의 및 안심번호/채팅 상태
  const [jitConsentModal, setJitConsentModal] = useState<{
    open: boolean;
    purpose: 'APPLY_JOB' | 'SAFE_CALL_CHAT';
    targetJob?: JobPost;
  }>({ open: false, purpose: 'APPLY_JOB' });
  const [jitAgreedItems, setJitAgreedItems] = useState<{
    collection: boolean;
    thirdParty: boolean;
    nightPushOptIn: boolean;
  }>({ collection: true, thirdParty: true, nightPushOptIn: false });

  // 합의된 공고 ID별 연락처 마스킹 해제 상태 (contact_grants)
  const [unlockedContactJobIds, setUnlockedContactJobIds] = useState<Record<string, boolean>>({});

  // 기상악화 취소소명 / 이의제기(Appeal) 모달
  const [weatherCancelModalJob, setWeatherCancelModalJob] = useState<JobPost | null>(null);
  const [weatherCancelReason, setWeatherCancelReason] = useState<string>('현장 체감 돌풍 및 타워크레인/스카이 작업 중지 권고로 인한 안전 취소 요청');
  const [showAppealModal, setShowAppealModal] = useState<boolean>(false);
  const [appealText, setAppealText] = useState<string>('');

  // 야간 방해금지 (20:00~08:00 기본값 ON) 및 탈퇴 모달
  const [nightDndEnabled, setNightDndEnabled] = useState<boolean>(true);
  const [marketingConsent, setMarketingConsent] = useState<boolean>(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState<boolean>(false);
  const [showArchitectureDrawer, setShowArchitectureDrawer, ] = useState<boolean>(false);

  // 회원가입 대한민국 법적 필수 동의 항목 (분쟁 예방 6대 필수 + 마케팅 선택 분리)
  const [signupAgreements, setSignupAgreements] = useState({
    adult18: true,         // [필수] 만 18세 이상 성인 확인 (근로기준법 제65조 연소자 유해·위험작업 금지)
    serviceTerms: true,    // [필수] 서비스 이용약관 및 중개 면책 동의 (직업안정법·전자상거래법 — 고용계약·임금체불 비당사자)
    privacyPolicy: true,   // [필수] 개인정보 처리방침 (수집·이용 필수 동의 — 개인정보보호법)
    locationTerms: true,   // [필수] 위치기반서비스 이용약관 동의 (위치정보법 — GPS 17대 권역 매칭)
    safetyLiability: true, // [필수] 현장 안전관리·산재보험 책임 분리 및 운영정책 동의 (산업안전보건법)
    youthProtection: true, // [필수] 청소년 보호정책 준수 동의 (청소년보호법)
    marketingOptIn: false  // [선택] 마케팅 정보 및 혜택 알림 수신 동의 (정보통신망법 — 미동의 시에도 가입 가능)
  });

  // 마이페이지 신규 4대 항목 모달/뷰 상태 (내 계정, 공지사항, 고객센터 AI 1:1 대화방, 약관 및 정책)
  const [activeMyPageModal, setActiveMyPageModal] = useState<
    'NONE' | 'ACCOUNT' | 'NOTICES' | 'AI_CS_CHAT' | 'TERMS_POLICY'
  >('NONE');
  const [selectedPolicyTab, setSelectedPolicyTab] = useState<
    'SERVICE' | 'PRIVACY' | 'OPERATION' | 'YOUTH' | 'LOCATION' | 'SAFETY_DISCLAIMER'
  >('SERVICE');
  const [myAccountInfo, setMyAccountInfo] = useState({
    email: 'panel_master@kakao.com',
    phone: '010-8912-4821 (통신사 PASS 본인인증 완료)',
    country: '대한민국 (South Korea, +82)',
    address: '경기도 성남시 분당구 판교역로 235 (경기 남부 권역)',
    identityVerified: 'PASS 실명·성인(만 18세 이상) 본인인증 완료 (2026-09-01)',
    loginProvider: '카카오 1초 간편로그인 (Rotating Refresh Token · HttpOnly 보안 쿠키)',
    lastLoginLog: '2026-11-03 13:05 KST · IP 211.34.***.88 (정상 로그인 기록)'
  });
  const [aiChatMessages, setAiChatMessages] = useState<
    { id: string; sender: 'AI' | 'USER'; text: string; time: string }[]
  >([
    {
      id: 'msg-1',
      sender: 'AI',
      text: '안녕하세요! 판넬오더 AI 1:1 고객센터입니다. 공고 등록, 기상악화 노쇼 감점 보류 신청, 자재·장비 사업자 심사(2~3일 소요), 임금·취소보상 약정 등 궁금하신 점을 선택하거나 입력해 주세요.',
      time: '13:05'
    }
  ]);
  const [aiChatInput, setAiChatInput] = useState<string>('');

  // 토스트 알림 메시지
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedStarRating, setSelectedStarRating] = useState<number>(5);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // 판넬오더 V2.1 안전지수 자동 산출 공식 원장(score_events) 기록 헬퍼
  const recordSafetyScoreEvent = (params: {
    category: 'SAFETY' | 'TRUST';
    eventType: string;
    delta: number;
    reason: string;
    status?: 'APPLIED' | 'HELD_WEATHER' | 'CORRECTED';
  }) => {
    setMySafetyScore(prevScore => {
      const nextScore = Math.min(100.0, Math.max(0.0, Number((prevScore + params.delta).toFixed(1))));
      const newEv: ScoreLedgerEvent = {
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: '2026-11-03 실시간',
        category: params.category,
        eventType: params.eventType,
        delta: params.delta,
        balanceAfter: nextScore,
        reason: params.reason,
        status: params.status ?? 'APPLIED'
      };
      setScoreLedger(prev => [newEv, ...prev]);
      return nextScore;
    });
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // 공고 등록 폼 상태
  const [newJobForm, setNewJobForm] = useState({
    title: '',
    regionGroup: '경기 남부',
    regionDetail: '화성시 동탄면',
    panelKind: 'GW' as Exclude<PanelKind, 'ALL'>,
    healthCheckRequired: true,
    safetyEduRequired: true,
    sitePhotoName: '현장_전경_실사진_01.jpg (EXIF 위치정보 자동제거 대기)',
    teamUnit: 'PAIR_2' as TeamUnitType,
    wageMode: 'INDIVIDUAL' as 'INDIVIDUAL' | 'TEAM_TOTAL',
    masterWage: 300000,
    helperWage: 200000,
    workDate: '2026-11-06',
    workHours: '07:00 ~ 17:00',
    payerEntity: '(주)세이프티판넬건설',
    payTiming: '당일 18시 직불',
    cancelCompensation: true,
    cancelCompensationAmount: 100000,
    gateMemo: '남문 1번 게이트 신호수 확인 후 진입',
    address: '경기도 화성시 동탄산단로 88'
  });

  // 기술자 등록 폼 상태
  const [newWorkerForm, setNewWorkerForm] = useState({
    type: 'TEAM' as 'TEAM' | 'INDIVIDUAL',
    name: '',
    regionGroup: '경기 남부',
    composition: '기공 1명 + 조공 1명 (2인 1조)',
    careerYears: 10,
    safetyEduCompleted: true,
    isBusinessEntity: false,
    desiredMasterWage: 300000,
    desiredHelperWage: 200000,
    allMembersConsented: true
  });

  // 업체 홍보 등록 폼 상태
  const [newSupplierForm, setNewSupplierForm] = useState({
    orgName: '',
    bizRegNumber: '134-86-01928',
    photoName: '자재_스카이장비_실사진_01.jpg (EXIF 제거됨)',
    adminPreApproved: false,
    category: 'PANEL' as SupplierListing['category'],
    title: '',
    regionGroup: '경기 남부',
    priceText: '회배당 25,000원',
    specDetail: '준불연 성적서 보유, 당일 배차 가능'
  });

  // ==========================================
  // 5. 핵심 액션 핸들러 (Core Handlers)
  // ==========================================

  // GPS 현위치 1초 자동 설정 시뮬레이션
  const handleGpsAutoDetect = () => {
    setIsGpsLoading(true);
    setTimeout(() => {
      setIsGpsLoading(false);
      setSelectedRegion('경기 남부');
      showToast('📍 GPS 현위치 기반 [경기 남부 (성남/평택/이천)] 권역으로 자동 설정되었습니다.');
    }, 600);
  };

  // 그린 안전모(⛑️) 찜 토글 (UNIQUE 제약 반영)
  const toggleJobHelmetLike = (jobId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentlyLiked = !!likedJobIds[jobId];
    setLikedJobIds(prev => ({ ...prev, [jobId]: !currentlyLiked }));
    setJobs(prev =>
      prev.map(j =>
        j.id === jobId
          ? { ...j, helmetLikes: currentlyLiked ? Math.max(0, j.helmetLikes - 1) : j.helmetLikes + 1 }
          : j
      )
    );
    if (selectedJob && selectedJob.id === jobId) {
      setSelectedJob(prev =>
        prev
          ? { ...prev, helmetLikes: currentlyLiked ? Math.max(0, prev.helmetLikes - 1) : prev.helmetLikes + 1 }
          : null
      );
    }
    showToast(!currentlyLiked ? '⛑️ 그린 안전모 관심 현장에 추가되었습니다.' : '관심 현장에서 해제되었습니다.');
  };

  const toggleWorkerHelmetLike = (workerId: string) => {
    const currentlyLiked = !!likedWorkerIds[workerId];
    setLikedWorkerIds(prev => ({ ...prev, [workerId]: !currentlyLiked }));
    setWorkers(prev =>
      prev.map(w =>
        w.id === workerId
          ? { ...w, helmetLikes: currentlyLiked ? Math.max(0, w.helmetLikes - 1) : w.helmetLikes + 1 }
          : w
      )
    );
    showToast(!currentlyLiked ? '⛑️ 관심 시공팀으로 등록되었습니다.' : '관심 시공팀에서 해제되었습니다.');
  };

  // 클립보드 복사 및 길찾기 폴백
  const handleCopyAddress = (address: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(address);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = address;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast(`📋 현장 주소가 복사되었습니다: ${address}`);
    } catch {
      showToast(`📋 주소 복사 완료: ${address}`);
    }
  };

  // AI 1:1 고객센터 대화방 메시지 전송 핸들러
  const handleSendAiCsMessage = (customQuestion?: string) => {
    const q = (customQuestion ?? aiChatInput).trim();
    if (!q) return;
    const userMsg = { id: `u-${Date.now()}`, sender: 'USER' as const, text: q, time: '방금' };
    let replyText =
      '문의하신 내용이 접수되었습니다. 판넬오더 운영정책 및 직업안정법 기준에 따라 신속히 안내해 드리겠습니다.';
    if (q.includes('강풍') || q.includes('기상') || q.includes('노쇼')) {
      replyText =
        '🌤️ [기상악화 노쇼 감점 보류 안내] 안전보건규칙 제37조에 따라 풍속 10m/s 초과(주의) 또는 15m/s 초과(작업중지 검토) 등 천재지변 취소 요청 시 기상청 격자 스냅샷이 자동 보존되며 노쇼(-15.0점) 감점이 즉시 보류(HELD_WEATHER)됩니다.';
    } else if (q.includes('심사') || q.includes('자재') || q.includes('승인')) {
      replyText =
        '🏗️ [자재·장비 업체 심사 안내] 사업자등록증 제출 후 관리자 검수까지 2~3일이 소요됩니다. 상태 흐름은 [심사 대기(일반 피드 비노출) ➔ 승인 완료(공식 인증 배지·정식 공개) / 반려(사유 안내)]로 진행됩니다.';
    } else if (q.includes('단가') || q.includes('취소보상')) {
      replyText =
        '💵 [단가 협의 및 취소보상 안내] 소장님 공고 등록 시 모집 단위에서 [단가 협의]를 선택하시면 일당 입력란이 자동 숨김 처리됩니다. 현장 귀책 취소보상금은 고용주가 직접 금액을 측정해 약정하며 플랫폼이 대납·보증하지 않습니다.';
    } else if (q.includes('본인인증') || q.includes('계정') || q.includes('약관')) {
      replyText =
        '🔐 [내 계정 및 약관 안내] 마이페이지 > [내 계정]에서 이메일·휴대전화·국가·주소·본인인증 및 로그인 기반 기록을 확인하실 수 있으며, [약관 및 정책]에서 6대 법정 필수 약관 전문을 열람하실 수 있습니다.';
    }
    const aiMsg = { id: `a-${Date.now() + 1}`, sender: 'AI' as const, text: replyText, time: '방금' };
    setAiChatMessages(prev => [...prev, userMsg, aiMsg]);
    if (!customQuestion) setAiChatInput('');
  };

  // 구인구직 라이프사이클 단계 진행
  const advanceJobLifecycle = (jobId: string) => {
    const order: LifecycleStage[] = ['APPLIED', 'OFFERED', 'CONFIRMED', 'COMPLETED_PAID', 'REVIEWED'];
    setJobs(prev =>
      prev.map(j => {
        if (j.id !== jobId) return j;
        const idx = order.indexOf(j.lifecycleStage);
        const nextStage = order[Math.min(order.length - 1, idx + 1)];
        return { ...j, lifecycleStage: nextStage };
      })
    );
    if (selectedJob && selectedJob.id === jobId) {
      const idx = order.indexOf(selectedJob.lifecycleStage);
      const nextStage = order[Math.min(order.length - 1, idx + 1)];
      setSelectedJob({ ...selectedJob, lifecycleStage: nextStage });
      if (nextStage === 'CONFIRMED') {
        setUnlockedContactJobIds(prev => ({ ...prev, [jobId]: true }));
        recordSafetyScoreEvent({
          category: 'TRUST',
          eventType: 'MUTUAL_CONFIRMED',
          delta: 0.3,
          reason: `[상호 체결 확정 +0.3점] ${selectedJob.title} (terms_snapshots 불변 사본 생성)`
        });
        showToast('🤝 상호 체결 확정(+0.3점 자동 가산)! 불변 사본(terms_snapshots)이 생성되고 안심번호가 열렸습니다.');
      } else if (nextStage === 'COMPLETED_PAID') {
        recordSafetyScoreEvent({
          category: 'TRUST',
          eventType: 'WORK_COMPLETED_PAID',
          delta: 1.0,
          reason: `[작업 완료 & 당일 정산 확인 +1.0점] ${selectedJob.title}`
        });
        showToast('💵 작업 완료 & 당일 정산 확인(+1.0점 자동 가산)이 score_events 원장에 기록되었습니다.');
      } else if (nextStage === 'REVIEWED') {
        const starDeltaMap: Record<number, number> = { 5: 1.0, 4: 0.5, 3: 0.0, 2: -0.5, 1: -1.0 };
        const starDelta = starDeltaMap[selectedStarRating] ?? 1.0;
        recordSafetyScoreEvent({
          category: 'TRUST',
          eventType: `STAR_RATING_${selectedStarRating}`,
          delta: starDelta,
          reason: `[상호 별점 평가 ${selectedStarRating}점 (${starDelta >= 0 ? '+' : ''}${starDelta.toFixed(1)}점)] ${selectedJob.title}`
        });
        showToast(`⭐ 상호 별점 ${selectedStarRating}점 평가 완료(${starDelta >= 0 ? '+' : ''}${starDelta.toFixed(1)}점 자동 반영)!`);
      } else {
        showToast(`✅ 진행 단계가 업데이트되었습니다.`);
      }
    }
  };

  // Just-in-Time 동의 완료 처리
  const handleConfirmJitConsent = () => {
    if (!jitAgreedItems.collection || !jitAgreedItems.thirdParty) {
      showToast('⚠️ 필수 동의 항목(개인정보 수집 및 거래 상대방 제공)에 체크해 주세요.');
      return;
    }
    const target = jitConsentModal.targetJob;
    if (target) {
      setUnlockedContactJobIds(prev => ({ ...prev, [target.id]: true }));
      if (jitConsentModal.purpose === 'APPLY_JOB') {
        showToast('✅ 실시간(Just-in-Time) 동의 영수증이 발급되었으며 지원서가 제출되었습니다.');
      } else {
        showToast('📞 1:1 조건 합의 및 안심번호(050) 매핑이 활성화되어 연락처 마스킹이 해제되었습니다.');
      }
    }
    setJitConsentModal({ open: false, purpose: 'APPLY_JOB' });
  };

  // 악성 이용자 차단 처리
  const handleBlockTarget = (targetId: string, label: string) => {
    setBlockedTargetIds(prev => ({ ...prev, [targetId]: true }));
    setSelectedJob(null);
    showToast(`🚫 [${label}] 차단 완료: API 단에서 새 채팅·안심번호 발급·알림이 원천 차단되었습니다. (기존 분쟁 증빙은 보존)`);
  };

  // 기상악화 취소 요청 처리 (노쇼 -15점 감점 보류)
  const handleSubmitWeatherCancel = () => {
    if (!weatherCancelModalJob) return;
    const newEvent: ScoreLedgerEvent = {
      id: `ev-${Date.now()}`,
      createdAt: '2026-11-02 11:00',
      category: 'SAFETY',
      eventType: 'WEATHER_CANCEL_HOLD',
      delta: 0.0,
      balanceAfter: mySafetyScore,
      reason: `[기상악화 소명 접수] ${weatherCancelModalJob.title} - 풍속 ${weatherCancelModalJob.weather.windSpeedMs}m/s 관측 스냅샷 보존 (노쇼 -15.0점 자동 감점 보류)`,
      status: 'HELD_WEATHER'
    };
    setScoreLedger(prev => [newEvent, ...prev]);
    setWeatherCancelModalJob(null);
    showToast('🌤️ 기상청 스냅샷과 현장 취소 사유가 보존되었습니다. 노쇼(-15.0점) 감점이 자동 보류됩니다.');
  };

  // 신규 현장 공고 등록
  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobForm.title.trim()) {
      showToast('⚠️ 현장 공고 제목을 입력해 주세요.');
      return;
    }
    const isNegotiable = newJobForm.teamUnit === 'NEGOTIABLE';
    const totalWage = isNegotiable
      ? 0
      : newJobForm.teamUnit === 'SINGLE_MASTER'
      ? Number(newJobForm.masterWage)
      : newJobForm.teamUnit === 'PAIR_2'
      ? Number(newJobForm.masterWage) + Number(newJobForm.helperWage)
      : Number(newJobForm.masterWage) * 2 + Number(newJobForm.helperWage);

    const compAmt = newJobForm.cancelCompensation ? Number(newJobForm.cancelCompensationAmount) : 0;

    const created: JobPost = {
      id: `job-${Date.now()}`,
      title: newJobForm.title,
      regionGroup: newJobForm.regionGroup,
      regionDetail: newJobForm.regionDetail,
      panelKind: newJobForm.panelKind,
      healthCheckRequired: newJobForm.healthCheckRequired,
      safetyEduRequired: newJobForm.safetyEduRequired,
      fireCertStatus: 'NONE',
      sitePhotoPreview: newJobForm.sitePhotoName,
      teamUnit: newJobForm.teamUnit,
      wageMode: newJobForm.wageMode,
      masterWage: isNegotiable ? 0 : Number(newJobForm.masterWage),
      helperWage: isNegotiable ? 0 : Number(newJobForm.helperWage),
      teamTotalWage: totalWage,
      workHours: newJobForm.workHours,
      breakHours: '12:00 ~ 13:00 (오전/오후 참 각 30분)',
      overtimeRule: '연장 시 시간당 별도 협의 정산',
      payerEntity: newJobForm.payerEntity,
      payTiming: newJobForm.payTiming,
      cancelCompensation: newJobForm.cancelCompensation,
      cancelCompensationAmount: compAmt,
      cancelCondition: `현장 귀책 당일 취소 시 ${compAmt.toLocaleString('ko-KR')}원 보상 (고용주 측정·직접 부담 약정, 플랫폼 보증 아님)`,
      gateMemo: newJobForm.gateMemo,
      address: newJobForm.address,
      workDate: newJobForm.workDate,
      slotsTotal: 2,
      slotsFilled: 0,
      helmetLikes: 1,
      managerName: '나소장 (내 계정)',
      managerOrg: newJobForm.payerEntity,
      managerPhoneMasked: '010-****-1234',
      managerPhoneReal: '010-9988-1234',
      managerSafetyScore: mySafetyScore,
      industrialAccident3Y: false,
      weather: {
        gridNx: 61,
        gridNy: 120,
        stationName: `${newJobForm.regionGroup} 격자(61,120)`,
        dataType: '단기예보',
        announcedAt: '2026-11-02 08:00',
        targetAt: `${newJobForm.workDate} 09:00`,
        queriedAt: '2026-11-02 11:00',
        tempC: 13.0,
        rainMm: 0,
        windSpeedMs: 6.2,
        windType: '예보풍속',
        hasGustData: false,
        isValid: true,
        ruleVersion: '안전보건규칙 제37조 (2026.06 기준표 v2.1)'
      },
      svgTheme: 'emerald',
      lifecycleStage: 'APPLIED'
    };

    setJobs(prev => [created, ...prev]);
    setShowJobCreateModal(false);
    setNewJobForm({ ...newJobForm, title: '' });
    recordSafetyScoreEvent({
      category: 'TRUST',
      eventType: 'JOB_POST_REGISTERED',
      delta: 0.2,
      reason: `[공고 성실 등록 +0.2점] ${created.title}`
    });
    showToast('⚡ 현장 공고 성실 등록(+0.2점 안전지수 자동 가산)! 사진의 GPS EXIF가 자동 삭제되었습니다.');
  };

  // 신규 기술자 등록
  const handleCreateWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerForm.name.trim()) {
      showToast('⚠️ 팀명 또는 기술자 성명을 입력해 주세요.');
      return;
    }
    if (newWorkerForm.type === 'TEAM' && !newWorkerForm.allMembersConsented) {
      showToast('⚠️ 팀 등록 시 모든 구성원(team_members)의 참여 동의가 필수입니다.');
      return;
    }
    const created: WorkerProfile = {
      id: `wk-${Date.now()}`,
      type: newWorkerForm.type,
      name: newWorkerForm.name,
      teamLeader: '내 계정 대표',
      memberCount: newWorkerForm.type === 'TEAM' ? 2 : 1,
      allMembersConsented: newWorkerForm.allMembersConsented,
      regionGroup: newWorkerForm.regionGroup,
      availableDate: '즉시 투입 가능',
      tripAvailable: true,
      composition: newWorkerForm.composition,
      careerYears: Number(newWorkerForm.careerYears),
      specialties: ['GW', 'EPS', 'URETHANE'],
      equipmentList: ['충전 임팩/원형톱 완비', '레이저 레벨기', '안전모·안전대 전원 보유'],
      wageType: '일당기준',
      desiredMasterWage: Number(newWorkerForm.desiredMasterWage),
      desiredHelperWage: Number(newWorkerForm.desiredHelperWage),
      badges: {
        safetyEduCompleted: newWorkerForm.safetyEduCompleted,
        safetyEduDate: newWorkerForm.safetyEduCompleted ? '2026-03-10 (기초안전보건교육 이수)' : undefined,
        skillCertVerified: false,
        bizVerified: newWorkerForm.isBusinessEntity
      },
      safetyScore: mySafetyScore,
      helmetLikes: 1,
      portfolioSummary: '현장 안전수칙 철저 준수 및 정밀 시공 보장'
    };
    setWorkers(prev => [created, ...prev]);
    setShowWorkerCreateModal(false);
    setNewWorkerForm({ ...newWorkerForm, name: '' });
    const certBonus = (newWorkerForm.safetyEduCompleted ? 3.0 : 0.0) + (newWorkerForm.isBusinessEntity ? 2.0 : 0.0);
    const totalWorkerDelta = Number((0.2 + certBonus).toFixed(1));
    recordSafetyScoreEvent({
      category: 'SAFETY',
      eventType: 'WORKER_PROFILE_AND_CERT',
      delta: totalWorkerDelta,
      reason: `[프로필 성실 등록(+0.2)${newWorkerForm.safetyEduCompleted ? ' + 기초안전교육(+3.0)' : ''}${newWorkerForm.isBusinessEntity ? ' + 사업자확인(+2.0)' : ''}] ${created.name}`
    });
    showToast(`🦺 시공 프로필 등록 완료! 안전지수 +${totalWorkerDelta.toFixed(1)}점이 score_events 원장에 자동 합산되었습니다.`);
  };

  // 신규 자재/장비 등록
  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierForm.orgName.trim() || !newSupplierForm.title.trim()) {
      showToast('⚠️ 업체명과 홍보 제목을 모두 입력해 주세요.');
      return;
    }
    const created: SupplierListing = {
      id: `sup-${Date.now()}`,
      orgName: newSupplierForm.orgName,
      bizRegNumber: newSupplierForm.bizRegNumber,
      photoPreview: newSupplierForm.photoName,
      bizVerifiedStatus: 'DRAFT_PENDING',
      category: newSupplierForm.category,
      condition: '신품',
      tradeStatus: '예약중',
      title: newSupplierForm.title,
      regionGroup: newSupplierForm.regionGroup,
      priceText: newSupplierForm.priceText,
      specDetail: newSupplierForm.specDetail,
      helmetLikes: 1,
      contactMasked: ''
    };
    setSuppliers(prev => [created, ...prev]);
    setShowSupplierCreateModal(false);
    setNewSupplierForm({ ...newSupplierForm, orgName: '', title: '' });
    showToast(
      '🏗️ 자재·장비 홍보 게시물 등록 및 심사 요청이 접수되었습니다. (승인 요청 후 2~3일 소요, 관리자 심사 후 정식 공개)'
    );
  };

  // 필터링된 목록 계산
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      if (blockedTargetIds[j.id]) return false;
      const matchRegion = selectedRegion === '전국 전체' || j.regionGroup === selectedRegion;
      const matchPanel = selectedPanelFilter === 'ALL' || j.panelKind === selectedPanelFilter;
      const matchQuery =
        !searchQuery.trim() ||
        j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.regionDetail.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRegion && matchPanel && matchQuery;
    });
  }, [jobs, blockedTargetIds, selectedRegion, selectedPanelFilter, searchQuery]);

  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      const matchRegion = selectedRegion === '전국 전체' || w.regionGroup === selectedRegion || w.tripAvailable;
      const matchQuery =
        !searchQuery.trim() ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.portfolioSummary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRegion && matchQuery;
    });
  }, [workers, selectedRegion, searchQuery]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchRegion = selectedRegion === '전국 전체' || s.regionGroup === '전국 전체' || s.regionGroup === selectedRegion;
      return matchRegion;
    });
  }, [suppliers, selectedRegion]);

  const safetyGrade = getSafetyGrade(mySafetyScore);

  // ==========================================
  // 6. 화면 렌더링 (UI Rendering)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center selection:bg-emerald-500 selection:text-slate-950">
      {/* 상단 고정 시뮬레이션 안내 및 풀스택 코드 뷰어 바 (1.5절 개발/시뮬레이션 고지 준수) */}
      <div className="w-full bg-slate-900 border-b border-slate-800 px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2 max-w-[480px]">
        <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>[연동 시뮬레이션/예시 모드] 기상청 격자·결제·안심번호 안전장치 가동 중</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const nextAdmin = !isAdminSession;
              setIsAdminSession(nextAdmin);
              if (nextAdmin) {
                setActiveRole('admin');
                showToast('🔐 [관리자 계정 로그인됨] 상단 헤더에 🛡️관리자 전용 버튼이 활성화되었습니다.');
              } else {
                setActiveRole('manager');
                if (activeTab === 'admin') setActiveTab('home');
                showToast('👤 [일반 사용자 세션] 실사용 환경에 맞춰 관리자 버튼이 화면에서 완전히 숨김 처리되었습니다.');
              }
            }}
            className={`px-2 py-1 rounded border font-semibold transition ${
              isAdminSession
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
            }`}
          >
            {isAdminSession ? '관리자 로그아웃' : '관리자 로그인(테스트)'}
          </button>
          <button
            onClick={() => setShowOnboarding(true)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            온보딩
          </button>
          <button
            onClick={() => setShowArchitectureDrawer(true)}
            className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-semibold transition"
          >
            DB·RLS
          </button>
        </div>
      </div>

      {/* 모바일 퍼스트 메인 컨테이너 (Max-width 480px 중앙 정렬, 320~390px 대응) */}
      <div className="w-full max-w-[480px] min-h-screen bg-slate-900 border-x border-slate-800 flex flex-col justify-between relative shadow-2xl pb-24">
        {/* 상단 헤더 (초록색 안전모 심볼 + 판넬오더 V2.1 + 멀티 롤 스위처 + 17대 권역 GPS) */}
        <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 pt-3 pb-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            {/* 로고 영역 */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black text-lg">
                ⛑️
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight text-white">판넬오더</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    V2.1
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-none">전국 샌드위치 판넬 1:1 직거래</p>
              </div>
            </div>

            {/* GPS 현위치 & 17대 권역 드롭다운 & 보안 관리자 모드 진입 */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleGpsAutoDetect}
                disabled={isGpsLoading}
                title="GPS 1초 내 동네 자동 설정"
                className="min-h-[38px] px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 flex items-center gap-1 text-xs font-bold transition active:scale-95"
              >
                <MapPin className={`w-3.5 h-3.5 ${isGpsLoading ? 'animate-bounce' : ''}`} />
                <span>{isGpsLoading ? '측위중' : 'GPS'}</span>
              </button>
              <select
                aria-label="대한민국 17대 권역 선택"
                value={selectedRegion}
                onChange={e => setSelectedRegion(e.target.value)}
                className="min-h-[38px] bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500"
              >
                {REGIONS_17.map(reg => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
              {isAdminSession && (
                <button
                  onClick={() => {
                    if (activeTab === 'admin') {
                      setActiveTab('home');
                      showToast('🏠 홈 화면으로 이동했습니다. (관리자 로그인 유지 중)');
                    } else {
                      setActiveRole('admin');
                      setActiveTab('admin');
                      showToast('🔐 보안 관리자 콘솔로 이동했습니다.');
                    }
                  }}
                  className={`min-h-[38px] px-2.5 rounded-lg text-xs font-bold border transition ${
                    activeTab === 'admin'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                  }`}
                >
                  🛡️관리자
                </button>
              )}
            </div>
          </div>
        </header>

        {/* 토스트 피드백 배너 */}
        {toastMessage && (
          <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[440px] bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-2 border border-emerald-300">
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-emerald-600/20 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 메인 컨텐츠 뷰포트 */}
        <main className="flex-1 px-4 py-4 space-y-4">
          {/* ==========================================
              TAB 1: 🏠 홈 (구인구직 피드 + 소장님 공고 올리기)
             ========================================== */}
          {activeTab === 'home' && (
            <div className="space-y-4">
              {/* 상단 [소장님 공고 올리기] 원클릭 배너 (최소 높이 48px 이상 큼직한 버튼) */}
              <div className="bg-gradient-to-br from-emerald-600/30 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full mb-1">
                      ⚡ 원터치 초간편 구인
                    </span>
                    <h2 className="text-base font-extrabold text-white">
                      현장 사진 1장으로 시공팀 바로 구인!
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      기공·조공 단가 분리 표기 & 기상청 현장 격자 풍속 자동 연동
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowJobCreateModal(true)}
                  className="mt-3 w-full min-h-[50px] bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                  <span>소장님 공고 올리기 (원클릭 등록)</span>
                </button>
              </div>

              {/* 검색창 및 판넬 종류 7종 원터치 필터 */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="지역명(평택, 이천, 천안) 또는 현장 키워드 검색..."
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* 판넬 종류 7종 가로 스크롤 버튼 */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {(Object.keys(PANEL_LABELS) as PanelKind[]).map(pk => (
                    <button
                      key={pk}
                      onClick={() => setSelectedPanelFilter(pk)}
                      className={`shrink-0 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        selectedPanelFilter === pk
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {PANEL_LABELS[pk]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 당근마켓 스타일 좌측 정사각 사진(w-24 h-24) 구인 공고 카드 리스트 */}
              <div className="space-y-3">
                {filteredJobs.map(job => {
                  const isHighWind = job.weather.windSpeedMs >= 10.0;
                  const isCriticalWind = job.weather.windSpeedMs >= 15.0;
                  const isLiked = !!likedJobIds[job.id];

                  return (
                    <article
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className="bg-slate-950 hover:bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-3.5 transition cursor-pointer shadow-md"
                    >
                      <div className="flex gap-3.5">
                        {/* 좌측 1:1 둥근 모서리 정사각형 썸네일 (w-24 h-24 고정) */}
                        <div className="w-24 h-24 shrink-0 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
                          <div
                            className={`absolute inset-0 opacity-25 ${
                              job.svgTheme === 'emerald'
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-900'
                                : job.svgTheme === 'amber'
                                ? 'bg-gradient-to-br from-amber-500 to-slate-900'
                                : 'bg-gradient-to-br from-rose-500 to-slate-900'
                            }`}
                          />
                          <Building2 className="w-8 h-8 text-emerald-400 relative z-10 mb-1" />
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-950/90 text-slate-200 border border-slate-700 relative z-10">
                            {PANEL_LABELS[job.panelKind]}
                          </span>
                          <span className="absolute bottom-1 right-1 text-[9px] bg-slate-950/80 text-emerald-400 px-1 rounded">
                            EXIF제거됨
                          </span>
                        </div>

                        {/* 우측 카드 본문 */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[11px] font-bold text-emerald-400 truncate">
                                📍 {job.regionDetail} · {job.workDate}
                              </span>
                              {/* 그린 안전모(⛑️) 찜 버튼 */}
                              <button
                                type="button"
                                onClick={e => toggleJobHelmetLike(job.id, e)}
                                className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border transition ${
                                  isLiked
                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <span>⛑️</span>
                                <span>{job.helmetLikes}</span>
                              </button>
                            </div>

                            <h3 className="text-sm font-extrabold text-white line-clamp-2 leading-snug">
                              {job.title}
                            </h3>
                          </div>

                          {/* 모집 단위, 건강검진/기초안전교육 및 고용주 측정 취소보상 배지 */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-slate-200 border border-slate-700">
                              👥 {TEAM_UNIT_LABELS[job.teamUnit]}
                            </span>
                            {job.safetyEduRequired !== false && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                🪪 기초안전교육이수증
                              </span>
                            )}
                            {job.healthCheckRequired && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/30">
                                🏥 건강검진서류
                              </span>
                            )}
                            {job.cancelCompensation && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                🤝 현장귀책 취소보상 {formatKRW(job.cancelCompensationAmount ?? 100000)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 하단 단가 분리 표기 & 기상청 격자 풍속 바 (5.1.1 & 5.1.2절 핵심 요건) */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-semibold">임금 조건 (단가 분리)</span>
                          <div className="font-extrabold text-emerald-400 text-right">
                            {job.teamUnit === 'NEGOTIABLE' ? (
                              <span>단가 협의 (현장 물량·일정에 따라 상호 조율)</span>
                            ) : job.teamUnit === 'SINGLE_MASTER' ? (
                              <span>기공 1인 일당 {formatKRW(job.masterWage)}</span>
                            ) : (
                              <span>
                                기공 {formatKRW(job.masterWage)} + 조공 {formatKRW(job.helperWage)}{' '}
                                <span className="text-slate-300 font-normal">
                                  (팀합계 {formatKRW(job.teamTotalWage)})
                                </span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 기상청 격자 관측/예보 바 */}
                        <div
                          className={`rounded-xl px-2.5 py-1.5 text-[11px] flex items-center justify-between border ${
                            isCriticalWind
                              ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                              : isHighWind
                              ? 'bg-amber-950/50 border-amber-500/40 text-amber-200'
                              : 'bg-slate-900/90 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <Wind className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-bold">
                              [{job.weather.dataType}] {job.weather.windType} {job.weather.windSpeedMs}m/s · {job.weather.tempC}°C
                            </span>
                          </div>
                          <span className="text-[10px] font-bold shrink-0 ml-2">
                            {isCriticalWind
                              ? '🚨 강풍 위험 (작업중지 검토)'
                              : isHighWind
                              ? '⚠️ 10m/s 초과 주의'
                              : '✅ 기상 양호 (현장계측 병행)'}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 2: 🦺 판넬시공 (기술자 및 시공팀 프로필관)
             ========================================== */}
          {activeTab === 'workers' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-extrabold text-white">전국 판넬 시공 기술자 / 팀 프로필관</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    개인·팀 엄격 구분 및 팀원 전원 참여 동의(team_members) 검증 완료 목록
                  </p>
                </div>
                <button
                  onClick={() => setShowWorkerCreateModal(true)}
                  className="shrink-0 min-h-[48px] px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>기술자 등록</span>
                </button>
              </div>

              <div className="space-y-3">
                {filteredWorkers.map(wk => {
                  const grade = getSafetyGrade(wk.safetyScore);
                  const isLiked = !!likedWorkerIds[wk.id];

                  return (
                    <div
                      key={wk.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-md"
                    >
                      <div className="flex gap-3.5">
                        {/* 좌측 1:1 정사각 프로필 썸네일 (w-24 h-24) */}
                        <div className="w-24 h-24 shrink-0 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center relative">
                          <HardHat className="w-8 h-8 text-emerald-400 mb-1" />
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {wk.type === 'TEAM' ? `${wk.memberCount}인 시공팀` : '1인 전문기공'}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1">경력 {wk.careerYears}년</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${grade.color}`}>
                              {grade.label} ({wk.safetyScore.toFixed(1)}점)
                            </span>
                            <button
                              onClick={() => toggleWorkerHelmetLike(wk.id)}
                              className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border ${
                                isLiked
                                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                  : 'bg-slate-900 border-slate-800 text-slate-400'
                              }`}
                            >
                              <span>⛑️</span>
                              <span>{wk.helmetLikes}</span>
                            </button>
                          </div>

                          <h3 className="text-sm font-extrabold text-white mt-1 truncate">{wk.name}</h3>
                          <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                            📍 {wk.regionGroup} · {wk.availableDate}
                          </p>
                          <p className="text-xs text-slate-300 mt-1">{wk.composition}</p>
                        </div>
                      </div>

                      {/* 팀원 동의 및 분리형 인증 배지 */}
                      <div className="flex flex-wrap gap-1.5">
                        {wk.type === 'TEAM' && wk.allMembersConsented && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            ✅ 팀원 전원 참여동의 완료
                          </span>
                        )}
                        {wk.badges.safetyEduCompleted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-200 border border-slate-700">
                            🪪 기초안전보건교육 이수 확인 ({wk.badges.safetyEduDate?.slice(0, 10)})
                          </span>
                        )}
                        {wk.badges.bizVerified ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-amber-500/30">
                            🏢 사업자확인 완료
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900/50 text-slate-500 border border-slate-800">
                            개인 기술자 (사업자 미등록)
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                        {wk.portfolioSummary}
                      </p>

                      {/* 희망 단가 및 1:1 시공 제안 버튼 */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <div className="text-xs">
                          <span className="text-slate-400">희망 단가 ({wk.wageType}): </span>
                          <span className="font-extrabold text-emerald-400">
                            기공 {formatKRW(wk.desiredMasterWage)}
                            {wk.desiredHelperWage > 0 ? ` / 조공 ${formatKRW(wk.desiredHelperWage)}` : ''}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            showToast(`💬 [${wk.name}]에게 조건 제안(offers) 및 1:1 채팅 요청을 보냈습니다.`)
                          }
                          className="min-h-[42px] px-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl transition"
                        >
                          1:1 시공 제안하기
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 3: 🏗️ 업체홍보 (판넬공장·절곡·스카이 배차)
             ========================================== */}
          {activeTab === 'suppliers' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-white">판넬 공장 · 부자재 절곡 · 스카이 배차 홍보관</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      사업자 심사 완료 업체만 정식 공개 및 인증 배지가 부여됩니다.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSupplierCreateModal(true)}
                    className="shrink-0 min-h-[48px] px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>자재/장비 직접 등록</span>
                  </button>
                </div>

                {/* 홍보글 등록자용 상태 흐름 안내 배너 */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1.5">
                  <p className="font-extrabold text-amber-300">📌 홍보글 등록 상태 흐름 안내 (등록 업체 확인용)</p>
                  <p className="text-slate-300 leading-relaxed">
                    • <strong className="text-amber-300">심사 대기:</strong> 서류를 제출하고 승인을 기다리는 중 (2~3일 소요, 일반 피드 비노출)
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    • <strong className="text-emerald-300">승인 완료:</strong> 관리자 검수가 끝나 공식 인증 배지가 붙고, 홍보관 및 피드에 정식 공개되어 1:1 견적·배차 문의를 받을 수 있는 상태
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    • <strong className="text-rose-300">반려:</strong> 사업자등록번호 불일치나 서류 식별 불가 등으로 승인이 거절된 상태
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {filteredSuppliers.map(sup => {
                  const isApproved = sup.bizVerifiedStatus === 'APPROVED';
                  return (
                    <div
                      key={sup.id}
                      className={`rounded-2xl p-3.5 border space-y-2.5 ${
                        isApproved
                          ? 'bg-slate-950 border-slate-800'
                          : 'bg-slate-950/50 border-amber-500/40 opacity-85'
                      }`}
                    >
                      <div className="flex gap-3.5">
                        {/* 좌측 1:1 정사각형 썸네일 (w-24 h-24) */}
                        <div className="w-24 h-24 shrink-0 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-2 text-center">
                          <Wrench className="w-7 h-7 text-amber-400 mb-1" />
                          <span className="text-[10px] font-bold text-slate-200">{sup.condition}</span>
                          <span className="text-[10px] text-emerald-400 font-extrabold mt-0.5">
                            {sup.tradeStatus}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            {sup.bizVerifiedStatus === 'APPROVED' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                ✅ 승인 완료 (공식 인증 배지 · 정식 공개)
                              </span>
                            ) : sup.bizVerifiedStatus === 'REJECTED' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                ❌ 반려 (사업자등록번호 불일치·서류 재제출 필요)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                ⏳ 심사 대기 (2~3일 소요 · 일반 피드 비노출)
                              </span>
                            )}
                            <span className="text-xs text-slate-400 font-bold">⛑️ {sup.helmetLikes}</span>
                          </div>

                          <h3 className="text-sm font-extrabold text-white mt-1 line-clamp-2">{sup.title}</h3>
                          <p className="text-xs text-amber-400 font-extrabold mt-1">{sup.priceText}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {sup.orgName} · {sup.regionGroup}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                        {sup.specDetail}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                        <span className="text-[11px] text-slate-400 font-semibold">
                          사업자등록번호: <strong className="text-slate-200">{sup.bizRegNumber || '135-81-49201'}</strong>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isAdminSession && (
                            <button
                              type="button"
                              onClick={() => {
                                setSuppliers(prev =>
                                  prev.map(item =>
                                    item.id === sup.id
                                      ? {
                                          ...item,
                                          bizVerifiedStatus: item.bizVerifiedStatus === 'APPROVED' ? 'DRAFT_PENDING' : 'APPROVED',
                                          tradeStatus: item.bizVerifiedStatus === 'APPROVED' ? '예약중' : '판매중'
                                        }
                                      : item
                                  )
                                );
                                showToast(
                                  isApproved
                                    ? `⏳ [${sup.orgName}] 업체가 심사 대기 상태로 전환되었습니다.`
                                    : `✅ [${sup.orgName}] 업체등록 관리자 심사승인이 완료되어 정식 공개되었습니다!`
                                );
                              }}
                              className={`min-h-[38px] px-2.5 rounded-xl text-[11px] font-extrabold border transition ${
                                isApproved
                                  ? 'bg-slate-900 border-emerald-500/40 text-emerald-300 hover:bg-slate-800'
                                  : 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                              }`}
                            >
                              {isApproved ? '✅ 관리자 심사승인됨' : '🛡️ 업체등록 관리자 심사승인'}
                            </button>
                          )}
                          <button
                            disabled={!isApproved}
                            onClick={() =>
                              showToast(`💬 [${sup.orgName}] 견적·배차 1:1 문의 채팅방이 개설되었습니다.`)
                            }
                            className={`min-h-[38px] px-3 rounded-xl text-xs font-extrabold transition ${
                              isApproved
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {isApproved ? '견적·배차 1:1 문의' : '심사 완료 후 공개'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 4: 👤 마이페이지 (안전지수 원장, 찜목록, 야간알림, 탈퇴, 법적고지)
             ========================================== */}
          {activeTab === 'mypage' && (
            <div className="space-y-4">
              {/* 마이페이지 최상단 직업정보제공사업 신고번호 및 법적 면책 상시 고지 배너 */}
              <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-3.5 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>직업정보제공사업 신고번호: 제 J1511020260001 호</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                    상시 공개 고지
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  • 판넬오더는 직업정보제공사업자로서 일자리 정보 중개를 지원하며, <strong>직접적인 고용 계약 및 임금 체불의 당사자가 아닙니다.</strong> (2026.12.10 시행 개정 직업안정법에 따라 고용노동부 공표 체불 사업주 명단과 동일성 검증 완료 후 정보 제공)
                </p>
                <p className="text-slate-400 leading-relaxed">
                  • 현장 보호구 착용 감독과 산재보험 가입 의무는 실채용 당사자(현장소장/원청)에게 있으며, 거래 확정서(<code>terms_snapshots</code>)에 전자 동의 형태로 자동 첨부됩니다.
                </p>
              </div>

              {/* 내 프로필 & 🛡️ 안전지수 카드 */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl">
                      👷
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-base font-extrabold text-white">김판넬 (멀티 롤 인증회원)</h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          만 18세+ 성인인증됨
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        활성 역할: {activeRole === 'manager' ? '현장소장(구인)' : activeRole === 'worker' ? '시공팀(구직)' : '자재·장비업체'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 안전지수 (Safety Index) & 판넬오더 V2.1 자동 산출 공식 작동 엔진 */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      🛡️ 내 안전지수 (score_events 원장 자동 산출)
                    </span>
                    <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${safetyGrade.color}`}>
                      {safetyGrade.label} · {mySafetyScore.toFixed(1)}점
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, mySafetyScore))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>기본 80.0점(🟡보통) · 95+ 명장 / 85+ 베테랑 / 65미만 임시제한</span>
                    <button
                      onClick={() => setShowAppealModal(true)}
                      className="text-emerald-400 underline font-bold"
                    >
                      이의제기(Appeal) 신청
                    </button>
                  </div>

                  {/* 판넬오더 V2.1 안전지수 자동 산출 공식 명세 및 원터치 작동 시뮬레이터 */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-400">
                        ⚡ 판넬오더 V2.1 안전지수 자동 산출 공식 (실시간 작동)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setMySafetyScore(80.0);
                          setScoreLedger([
                            {
                              id: `ev-init-${Date.now()}`,
                              createdAt: '방금 초기화',
                              category: 'SAFETY',
                              eventType: 'INITIAL_BASE_80',
                              delta: 80.0,
                              balanceAfter: 80.0,
                              reason: '[1. 기본 시작 점수] 80.0점 초기화 (🟡 보통 등급에서 시작)',
                              status: 'APPLIED'
                            }
                          ]);
                          showToast('🔄 기본 시작 점수 80.0점(🟡 보통 등급)으로 초기화되었습니다. 아래 버튼으로 자동 산출을 테스트해 보세요!');
                        }}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] border border-slate-700"
                      >
                        80.0점(초기값) 리셋
                      </button>
                    </div>

                    {/* 2. 서류 인증 가점 (최대 +7.0점) */}
                    <div className="space-y-1">
                      <p className="text-slate-300 font-bold">
                        2. 서류 인증 가점 (최대 +7.0점): 기초안전교육(+3) + 건강검진(+2) + 사업자확인(+2)
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            recordSafetyScoreEvent({
                              category: 'SAFETY',
                              eventType: 'CERT_SAFETY_EDU',
                              delta: 3.0,
                              reason: '[서류 인증 가점] 기초안전보건교육 이수증 검수 완료 (+3.0점)'
                            });
                            showToast('🪪 기초안전교육 인증 가점 +3.0점이 원장에 반영되었습니다!');
                          }}
                          className="py-1.5 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-extrabold text-[10px]"
                        >
                          +3.0 기초안전교육
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            recordSafetyScoreEvent({
                              category: 'SAFETY',
                              eventType: 'CERT_HEALTH_CHECK',
                              delta: 2.0,
                              reason: '[서류 인증 가점] 건강검진 서류 검수 완료 (+2.0점)'
                            });
                            showToast('🏥 건강검진 인증 가점 +2.0점이 원장에 반영되었습니다!');
                          }}
                          className="py-1.5 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-extrabold text-[10px]"
                        >
                          +2.0 건강검진
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            recordSafetyScoreEvent({
                              category: 'SAFETY',
                              eventType: 'CERT_BIZ_VERIFIED',
                              delta: 2.0,
                              reason: '[서류 인증 가점] 사업자확인 검수 완료 (+2.0점)'
                            });
                            showToast('🏢 사업자확인 인증 가점 +2.0점이 원장에 반영되었습니다!');
                          }}
                          className="py-1.5 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-extrabold text-[10px]"
                        >
                          +2.0 사업자확인
                        </button>
                      </div>
                    </div>

                    {/* 3. 건별 활동 점수 (자동 누적) */}
                    <div className="space-y-1 pt-1 border-t border-slate-800/80">
                      <p className="text-slate-300 font-bold">
                        3. 건별 활동 점수 (자동 누적): 등록(+0.2) ➔ 확정(+0.3) ➔ 완료·당일정산(+1.0) ➔ 별점(-1.0~+1.0) ➔ 재매칭(+2.0)
                      </p>
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            recordSafetyScoreEvent({
                              category: 'TRUST',
                              eventType: 'ACT_POST_REGISTER',
                              delta: 0.2,
                              reason: '[건별 활동] 공고/프로필 성실 등록 (+0.2점)'
                            });
                            showToast('📝 공고/프로필 성실 등록 +0.2점이 자동 누적되었습니다!');
                          }}
                          className="py-1.5 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-[10px]"
                        >
                          등록 +0.2
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            recordSafetyScoreEvent({
                              category: 'TRUST',
                              eventType: 'ACT_MUTUAL_CONFIRM',
                              delta: 0.3,
                              reason: '[건별 활동] 상호 체결 확정 (+0.3점)'
                            });
                            showToast('🤝 상호 체결 확정 +0.3점이 자동 누적되었습니다!');
                          }}
                          className="py-1.5 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-[10px]"
                        >
                          체결확정 +0.3
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            recordSafetyScoreEvent({
                              category: 'TRUST',
                              eventType: 'ACT_WORK_PAID',
                              delta: 1.0,
                              reason: '[건별 활동] 작업 완료 & 당일 정산 확인 (+1.0점)'
                            });
                            showToast('💵 작업 완료 & 당일 정산 확인 +1.0점이 자동 누적되었습니다!');
                          }}
                          className="py-1.5 px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 font-extrabold text-[10px]"
                        >
                          당일정산 +1.0
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            recordSafetyScoreEvent({
                              category: 'TRUST',
                              eventType: 'ACT_REMATCH_BONUS',
                              delta: 2.0,
                              reason: '[건별 활동] 동일 당사자 재매칭(단골 호흡) 보너스 (+2.0점)'
                            });
                            showToast('🔁 재매칭 보너스 +2.0점이 자동 누적되었습니다!');
                          }}
                          className="py-1.5 px-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-[10px]"
                        >
                          재매칭 +2.0
                        </button>
                      </div>

                      {/* 상호 별점 평가 (5점 만점 기준 -1.0점 ~ +1.0점) */}
                      <div className="grid grid-cols-5 gap-1 pt-1">
                        {(
                          [
                            { star: 5, delta: 1.0, label: '⭐5점(+1.0)' },
                            { star: 4, delta: 0.5, label: '⭐4점(+0.5)' },
                            { star: 3, delta: 0.0, label: '⭐3점(0.0)' },
                            { star: 2, delta: -0.5, label: '⭐2점(-0.5)' },
                            { star: 1, delta: -1.0, label: '⭐1점(-1.0)' }
                          ] as const
                        ).map(item => (
                          <button
                            key={item.star}
                            type="button"
                            onClick={() => {
                              recordSafetyScoreEvent({
                                category: 'TRUST',
                                eventType: `STAR_EVAL_${item.star}`,
                                delta: item.delta,
                                reason: `[상호 별점 평가] ${item.star}점 (${item.delta >= 0 ? '+' : ''}${item.delta.toFixed(1)}점 반영)`
                              });
                              showToast(`⭐ 상호 별점 ${item.star}점 평가(${item.delta >= 0 ? '+' : ''}${item.delta.toFixed(1)}점)가 원장에 자동 계산되었습니다.`);
                            }}
                            className={`py-1 px-1 rounded border text-[10px] font-bold transition ${
                              item.delta > 0
                                ? 'bg-slate-900 border-emerald-500/30 text-emerald-300 hover:bg-slate-800'
                                : item.delta === 0
                                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                                : 'bg-slate-900 border-rose-500/30 text-rose-300 hover:bg-slate-800'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 4. 리스크 차감 (자동 감점 & 구제) */}
                    <div className="space-y-1 pt-1 border-t border-slate-800/80">
                      <p className="text-rose-300 font-bold">
                        4. 리스크 차감 (자동 감점 & 구제): 무단 노쇼(-15.0 / 기상악화 0.0 보류) · 정산지연/취소보상 미지급(-10.0)
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            recordSafetyScoreEvent({
                              category: 'SAFETY',
                              eventType: 'RISK_WEATHER_HOLD',
                              delta: 0.0,
                              reason: '[기상악화 취소] 강풍·우천 천재지변 취소 (노쇼 -15.0점 자동 감점 보류 0.0점)',
                              status: 'HELD_WEATHER'
                            });
                            showToast('🌤️ 강풍·우천 기상악화 취소: 노쇼(-15.0점) 감점이 0.0점으로 자동 보류되었습니다.');
                          }}
                          className="py-1.5 px-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-extrabold text-[10px]"
                        >
                          기상취소(0.0 보류)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            recordSafetyScoreEvent({
                              category: 'TRUST',
                              eventType: 'RISK_DELAY_OR_UNPAID_COMP',
                              delta: -10.0,
                              reason: '[리스크 차감] 정산 지연 / 현장 귀책 취소보상금 미지급 (-10.0점)'
                            });
                            showToast('🚨 정산 지연 / 취소보상금 미지급으로 -10.0점이 자동 차감되었습니다.');
                          }}
                          className="py-1.5 px-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-extrabold text-[10px]"
                        >
                          정산지연 -10.0
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            recordSafetyScoreEvent({
                              category: 'TRUST',
                              eventType: 'RISK_UNEXCUSED_NOSHOW',
                              delta: -15.0,
                              reason: '[리스크 차감] 정당한 사유 없는 당일 무단 노쇼 (-15.0점)'
                            });
                            showToast('🚨 무단 노쇼 페널티 -15.0점이 자동 차감되었습니다.');
                          }}
                          className="py-1.5 px-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-200 font-extrabold text-[10px]"
                        >
                          무단노쇼 -15.0
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 변경 불가능한 점수 이벤트 원장 (score_events) 내역 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-emerald-400" />
                      <span>점수 이벤트 원장 (score_events 불변 기록)</span>
                    </h3>
                    <button
                      onClick={() => {
                        setMySafetyScore(63.5);
                        showToast('⚠️ [시뮬레이션] 65점 미만 임시 제한 상태 및 구제 절차 안내 화면을 테스트합니다.');
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700"
                    >
                      65점 미만 구제절차 테스트
                    </button>
                  </div>

                  {mySafetyScore < 65 && (
                    <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/60 text-xs space-y-2">
                      <div className="font-extrabold text-rose-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>안전지수 65점 미만 임시 이용 제한 안내 (자동 영구정지 아님)</span>
                      </div>
                      <p className="text-rose-200/90 text-[11px]">
                        기상 악화·현장 귀책 등 소명 자료를 제출하시면 관리자 재검토를 통해 점수 정정 이벤트가 발행되어 즉시 복구됩니다.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowAppealModal(true)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500 text-slate-950 font-extrabold text-xs"
                        >
                          증빙 제출 및 이의제기
                        </button>
                        <button
                          onClick={() => {
                            setMySafetyScore(95.5);
                            showToast('✅ 안전지수가 95.5점(명장)으로 복구되었습니다.');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 font-bold text-xs"
                        >
                          정상 점수(95.5점) 복귀
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {scoreLedger.map(ev => (
                      <div
                        key={ev.id}
                        className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {ev.category === 'SAFETY' ? '산업안전' : '거래신뢰'}
                            </span>
                            <span className="text-[11px] text-slate-400">{ev.createdAt}</span>
                          </div>
                          <p className="text-slate-200 font-medium mt-1 truncate">{ev.reason}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`font-extrabold ${
                              ev.status === 'HELD_WEATHER'
                                ? 'text-amber-400'
                                : ev.delta >= 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {ev.status === 'HELD_WEATHER'
                              ? '감점보류(0.0)'
                              : `${ev.delta > 0 ? '+' : ''}${ev.delta.toFixed(1)}점`}
                          </span>
                          <div className="text-[10px] text-slate-400">누적 {ev.balanceAfter.toFixed(1)}점</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 1. 내 계정 (이메일, 휴대전화번호, 국가, 주소, 본인인증 등 로그인 기반 기록) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span>내 계정 (로그인 기반 인증 및 기록)</span>
                  </h3>
                  <button
                    onClick={() => setActiveMyPageModal('ACCOUNT')}
                    className="text-xs font-extrabold text-emerald-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>상세·수정</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400 shrink-0">이메일</span>
                    <span className="font-bold text-slate-200 truncate">{myAccountInfo.email}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400 shrink-0">휴대전화번호</span>
                    <span className="font-bold text-emerald-400 truncate">{myAccountInfo.phone}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400 shrink-0">국가 / 주소</span>
                    <span className="font-bold text-slate-200 truncate">{myAccountInfo.country} · {myAccountInfo.address}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400 shrink-0">본인인증</span>
                    <span className="font-bold text-emerald-300 truncate">{myAccountInfo.identityVerified}</span>
                  </div>
                  <div className="flex justify-between gap-2 pt-1 border-t border-slate-800 text-[11px]">
                    <span className="text-slate-400 shrink-0">로그인 기록</span>
                    <span className="text-slate-300 truncate">{myAccountInfo.lastLoginLog}</span>
                  </div>
                </div>
              </div>

              {/* 2. 마이페이지 지원 센터 (고객센터 AI 1:1 대화방 / 공지사항 / 약관 및 정책) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <h3 className="text-sm font-extrabold text-white">고객지원 · 공지사항 · 약관 및 정책</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setActiveMyPageModal('AI_CS_CHAT')}
                    className="w-full min-h-[48px] p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <MessageSquare className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-extrabold text-emerald-300">고객센터 (AI 1:1 실시간 대화방)</p>
                        <p className="text-[11px] text-slate-300">기상악화 노쇼 보류, 업체 심사, 단가·취소보상 24시간 AI 상담</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
                  </button>

                  <button
                    onClick={() => setActiveMyPageModal('NOTICES')}
                    className="w-full min-h-[48px] p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <Bell className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-xs font-extrabold text-white">공지사항</p>
                        <p className="text-[11px] text-slate-400">[필독] 2026.12.10 개정 직업안정법 시행 안내 및 강풍 안전 기준</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>

                  <button
                    onClick={() => setActiveMyPageModal('TERMS_POLICY')}
                    className="w-full min-h-[48px] p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-2.5 text-left">
                      <FileText className="w-5 h-5 text-teal-400 shrink-0" />
                      <div>
                        <p className="text-xs font-extrabold text-white">약관 및 정책 (대한민국 법정 필수 약관 완비)</p>
                        <p className="text-[11px] text-slate-400">
                          서비스 이용약관 · 개인정보 처리방침 · 운영정책 · 청소년 보호정책 · 위치기반서비스 이용약관
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                </div>
              </div>

              {/* ⛑️ 내 관심 목록 요약 */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <span>⛑️ 내 안전모 관심 목록</span>
                  <span className="text-xs text-emerald-400">
                    ({Object.values(likedJobIds).filter(Boolean).length}건)
                  </span>
                </h3>
                {jobs
                  .filter(j => likedJobIds[j.id])
                  .map(j => (
                    <div
                      key={j.id}
                      onClick={() => setSelectedJob(j)}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-emerald-500/40"
                    >
                      <div className="truncate pr-2">
                        <p className="text-xs font-bold text-white truncate">{j.title}</p>
                        <p className="text-[11px] text-emerald-400">
                          {j.regionDetail} · 팀합계 {formatKRW(j.teamTotalWage)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  ))}
              </div>

              {/* 푸시 방해금지 (20:00~08:00 야간 광고 제한 기본값 준수) & 계정 관리 */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-extrabold text-white">알림 설정 및 개인정보 통제</h3>
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs font-bold text-slate-200">야간 푸시 방해금지 (20:00 ~ 08:00)</p>
                    <p className="text-[11px] text-slate-400">법정 야간 광고성 알림 제한 기본값 ON 준수</p>
                  </div>
                  <button
                    onClick={() => {
                      setNightDndEnabled(!nightDndEnabled);
                      showToast(
                        !nightDndEnabled
                          ? '🌙 야간(20:00~08:00) 방해금지 모드가 활성화되었습니다.'
                          : '야간 방해금지 모드가 해제되었습니다.'
                      );
                    }}
                    className={`w-12 h-7 rounded-full p-1 transition ${
                      nightDndEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-slate-950 transition transform ${
                        nightDndEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-1 border-t border-slate-800/80 pt-2.5">
                  <div>
                    <p className="text-xs font-bold text-slate-200">마케팅·혜택 알림 수신 동의 (선택)</p>
                    <p className="text-[11px] text-slate-400">필수 서비스 동의와 엄격히 분리 운영</p>
                  </div>
                  <button
                    onClick={() => setMarketingConsent(!marketingConsent)}
                    className={`w-12 h-7 rounded-full p-1 transition ${
                      marketingConsent ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-slate-950 transition transform ${
                        marketingConsent ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800 flex gap-2">
                  <button
                    onClick={() => {
                      setIsLoggedIn(false);
                      setShowOnboarding(true);
                      showToast('로그아웃 되었습니다. 회전형 리프레시 토큰 세션이 폐기되었습니다.');
                    }}
                    className="flex-1 min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-800"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>로그아웃</span>
                  </button>
                  <button
                    onClick={() => setShowWithdrawalModal(true)}
                    className="flex-1 min-h-[44px] rounded-xl bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-rose-500/30"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>회원 탈퇴 (즉시 중단)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 5: 🛡️ 보안 관리자 모드 (Admin RBAC Control)
             ========================================== */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>보안 관리자 콘솔 (MFA 인증됨 · 짧은 세션 정책 적용)</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-emerald-500/30">
                    RLS & Server Action 강제
                  </span>
                </div>

                {/* 6.2절 관리자 역할 3단계 분리 */}
                <div className="flex gap-1.5 pt-1">
                  {(
                    [
                      { id: 'REVIEWER', label: '심사 담당' },
                      { id: 'DISPUTE_MANAGER', label: '신고·분쟁 담당' },
                      { id: 'SUPER_ADMIN', label: '최고 관리자' }
                    ] as const
                  ).map(role => (
                    <button
                      key={role.id}
                      onClick={() => setAdminSubRole(role.id)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                        adminSubRole === role.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 비공개 증빙 버킷 & 자재·장비 업체 홍보 게시물 심사 대기열 (관리자 전용) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-extrabold text-white">
                  1. 자재·장비 업체 홍보 게시물 심사 대기열 (관리자 전용 심사 후 승인)
                </h3>
                {suppliers.map(supItem => {
                  const isApproved = supItem.bizVerifiedStatus === 'APPROVED';
                  return (
                    <div key={supItem.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-200 truncate">
                          {supItem.orgName} ({supItem.bizRegNumber || '135-81-49201'})
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ${
                            isApproved
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {isApproved ? 'APPROVED (승인완료)' : 'PENDING (심사대기 · 2~3일 소요)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 truncate">{supItem.title}</p>
                      <p className="text-[10px] text-slate-400">
                        증빙 경로: <code>private-verifications/{supItem.id}/biz_reg.pdf</code> (영구 공개 URL 차단됨)
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <button
                          onClick={() =>
                            showToast('🔐 WebP 압축 증빙(최대 1~2MB)에 대해 60초 유효기간의 서명된 URL(Signed URL)이 발급되었으며 audit_logs에 기록되었습니다.')
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px]"
                        >
                          Signed URL 열람
                        </button>
                        <button
                          onClick={() => {
                            setSuppliers(prev =>
                              prev.map(s =>
                                s.id === supItem.id
                                  ? { ...s, bizVerifiedStatus: 'APPROVED', tradeStatus: '판매중' }
                                  : s
                              )
                            );
                            showToast(`✅ [${supItem.orgName}] 승인 완료: 공식 인증 배지가 부여되고 홍보관에 정식 공개되었습니다.`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-extrabold text-[11px]"
                        >
                          승인 완료 처리
                        </button>
                        <button
                          onClick={() => {
                            setSuppliers(prev =>
                              prev.map(s =>
                                s.id === supItem.id
                                  ? { ...s, bizVerifiedStatus: 'DRAFT_PENDING', tradeStatus: '예약중' }
                                  : s
                              )
                            );
                            showToast(`⏳ [${supItem.orgName}] 심사 대기(2~3일 소요, 일반 피드 비노출) 상태로 전환되었습니다.`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[11px]"
                        >
                          심사 대기
                        </button>
                        <button
                          onClick={() => {
                            setSuppliers(prev =>
                              prev.map(s =>
                                s.id === supItem.id
                                  ? { ...s, bizVerifiedStatus: 'REJECTED', tradeStatus: '예약중' }
                                  : s
                              )
                            );
                            showToast(`❌ [${supItem.orgName}] 반려 처리: 사업자등록번호 불일치 또는 서류 식별 불가 사유가 전달되었습니다.`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-[11px]"
                        >
                          반려 처리
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 감사 로그 (audit_logs) 실시간 모니터 */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <h3 className="text-xs font-extrabold text-white">2. 보안 감사 로그 (audit_logs)</h3>
                <div className="space-y-1.5 text-[11px] font-mono text-slate-300">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    [2026-11-02 10:58:11] ACTOR:admin_01 | ACTION:VERIFY_FIRE_CERT | TARGET:job-101 | IP:211.34.***.12
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    [2026-11-02 10:42:05] ACTOR:system_weather | ACTION:HOLD_NOSHOW_PENALTY | TARGET:ev-04 | WIND:15.2m/s
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ==========================================
            법적 필수 고지 푸터 (3.4절 & 5.5절: 비회원도 즉시 확인 가능한 공개 위치)
           ========================================== */}
        <footer className="px-4 py-5 bg-slate-950 border-t border-slate-800/90 text-[11px] text-slate-400 space-y-2">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-slate-300">
            <p className="font-extrabold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>직업정보제공사업 및 현장 안전관리 법적 필수 고지</span>
            </p>
            <p className="leading-relaxed">
              • <strong>판넬오더는 직업정보제공사업자로서 일자리 정보 중개를 지원하며, 직접적인 고용 계약 및 임금 체불의 당사자가 아닙니다.</strong> (2026.12.10 시행 개정 직업안정법 준수: 구인 신원 검증 및 공표명단 동일성 확인 후 산재·체불 안내)
            </p>
            <p className="leading-relaxed">
              • 현장 내 안전관리 책임, 보호구 착용 감독, 산재보험 가입 의무는 채용 당사자(실제 사업주 및 도급 관계)에게 있습니다. (단, 플랫폼 사업자의 법정 의무는 관련 법령에 따름)
            </p>
          </div>

          <div className="space-y-0.5 text-[10px] text-slate-500 leading-relaxed pt-1">
            <p className="font-bold text-slate-400">
              상호명: (주)판넬오더코리아 | 대표이사: 이안전 | 개인정보보호책임자: 박보안
            </p>
            <p>
              사업자등록번호: 123-88-02941 | <strong>직업정보제공사업 신고번호: 제 J1511020260001 호</strong>
            </p>
            <p>통신판매업 신고번호: 제 2026-성남분당B-0412 호 | 주소: 경기도 성남시 분당구 판교역로 235, 8층</p>
            <p>고객센터 및 권리침해·분쟁신고: 1544-0982 (평일 08:00~18:00)</p>
          </div>
        </footer>

        {/* ==========================================
            당근마켓 스타일 4대 하단 네비게이션 탭 바 (2.4절)
           ========================================== */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 bg-slate-950/95 backdrop-blur border-t border-slate-800 px-2 py-1.5 flex items-center justify-around">
          {(
            [
              { id: 'home', label: '홈(구인구직)', icon: Home },
              { id: 'workers', label: '판넬시공', icon: HardHat },
              { id: 'suppliers', label: '업체홍보', icon: Building2 },
              { id: 'mypage', label: '마이페이지', icon: User }
            ] as const
          ).map(tab => {
            const IconComp = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-h-[52px] rounded-xl flex flex-col items-center justify-center gap-1 transition ${
                  isSelected ? 'text-emerald-400 font-extrabold' : 'text-slate-400 hover:text-slate-200 font-medium'
                }`}
              >
                <IconComp className={`w-5 h-5 ${isSelected ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="text-[11px]">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ==========================================
          MODAL 1: 공고 상세 + 기상청 격자 상세 + 구인구직 5단계 라이프사이클
         ========================================== */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-[480px] max-h-[92vh] bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl overflow-y-auto p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-extrabold text-emerald-400">
                  📍 {selectedJob.regionGroup} ({selectedJob.regionDetail}) · 작업일 {selectedJob.workDate}
                </span>
                <h2 className="text-base font-extrabold text-white mt-1">{selectedJob.title}</h2>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 5.1.4 전면 개편된 구인구직 5단계 라이프사이클 트래커 */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-400">
                  🔄 구인구직 라이프사이클 & 불변 합의 기록(terms_snapshots)
                </span>
                <button
                  onClick={() => advanceJobLifecycle(selectedJob.id)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                >
                  다음 단계 진행 ➔
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1 text-[10px] text-center font-bold">
                {(
                  [
                    { id: 'APPLIED', label: '1.지원제출' },
                    { id: 'OFFERED', label: '2.조건제안' },
                    { id: 'CONFIRMED', label: '3.확정(+0.3)' },
                    { id: 'COMPLETED_PAID', label: '4.정산(+1.0)' },
                    { id: 'REVIEWED', label: '5.별점평가' }
                  ] as { id: LifecycleStage; label: string }[]
                ).map(st => {
                  const active = selectedJob.lifecycleStage === st.id;
                  return (
                    <div
                      key={st.id}
                      className={`py-1.5 px-1 rounded-lg border ${
                        active
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-extrabold'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {st.label}
                    </div>
                  );
                })}
              </div>

              {/* 상호 별점 선택기 (5점 만점 기준 -1.0점 ~ +1.0점) & 재매칭 보너스(+2.0점) */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">상호 별점:</span>
                  <select
                    value={selectedStarRating}
                    onChange={e => setSelectedStarRating(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-emerald-300 font-bold text-[11px]"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ 5점 (+1.0점)</option>
                    <option value={4}>⭐⭐⭐⭐ 4점 (+0.5점)</option>
                    <option value={3}>⭐⭐⭐ 3점 (0.0점)</option>
                    <option value={2}>⭐⭐ 2점 (-0.5점)</option>
                    <option value={1}>⭐ 1점 (-1.0점)</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    recordSafetyScoreEvent({
                      category: 'TRUST',
                      eventType: 'REMATCH_BONUS',
                      delta: 2.0,
                      reason: `[재매칭 보너스 +2.0점] ${selectedJob.managerOrg} 현장 재계약 체결 완수`
                    });
                    showToast('🔁 이 현장과 재매칭 보너스(+2.0점)가 안전지수 원장에 자동 가산되었습니다!');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-[11px]"
                >
                  🔁 재매칭 보너스(+2.0점) 적용
                </button>
              </div>
            </div>

            {/* 상세 임금 및 조건 체계화 (5.1.1절) */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs">
              <h3 className="font-extrabold text-white text-sm">💵 상세 임금 및 근로 조건 (단가 분리 명시)</h3>
              {selectedJob.teamUnit !== 'NEGOTIABLE' ? (
                <>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 text-[11px]">기공 1인 단가</span>
                      <p className="text-sm font-extrabold text-emerald-400 mt-0.5">
                        {formatKRW(selectedJob.masterWage)}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 text-[11px]">조공 1인 단가</span>
                      <p className="text-sm font-extrabold text-emerald-400 mt-0.5">
                        {selectedJob.helperWage > 0 ? formatKRW(selectedJob.helperWage) : '해당없음(기공단독)'}
                      </p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <span className="font-bold text-emerald-200">
                      모집 단위 ({TEAM_UNIT_LABELS[selectedJob.teamUnit]}) 팀 합계
                    </span>
                    <span className="text-sm font-extrabold text-emerald-300">
                      {formatKRW(selectedJob.teamTotalWage)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <span className="font-bold text-emerald-200">모집 및 단가 조건</span>
                  <span className="text-sm font-extrabold text-emerald-300">
                    단가 협의 (현장 물량·일정에 따라 1:1 조율)
                  </span>
                </div>
              )}
              <div className="space-y-1 text-slate-300 pt-1">
                <p>• 근무/휴게시간: {selectedJob.workHours} (휴게: {selectedJob.breakHours})</p>
                <p>• 추가수당 기준: {selectedJob.overtimeRule}</p>
                <p>• 임금 지급 주체 및 시기: {selectedJob.payerEntity} / {selectedJob.payTiming}</p>
              </div>
              {selectedJob.cancelCompensation && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 space-y-1">
                  <p className="font-extrabold">
                    🤝 현장 귀책 취소보상 약정 (고용주 측정 금액: {formatKRW(selectedJob.cancelCompensationAmount ?? 100000)})
                  </p>
                  <p>{selectedJob.cancelCondition}</p>
                  <p className="text-[10px] text-amber-300/80">
                    ※ 본 약정은 구인자(고용주)가 직접 금액을 측정하여 지급하는 당사자 간 약정이며, 판넬오더 플랫폼이 직접 보증·대납하지 않습니다.
                  </p>
                </div>
              )}
            </div>

            {/* 5.1.2 고도화된 기상 관측 및 현장 위험 알림 */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-white flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-emerald-400" />
                  <span>기상청 격자 관측/예보 메타데이터 (weather_cache)</span>
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold">
                  유효상태: 정상
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <div>• 자료 종류: <strong>{selectedJob.weather.dataType}</strong></div>
                <div>• 격자 지점: <strong>{selectedJob.weather.stationName}</strong></div>
                <div>• 발표 시각: {selectedJob.weather.announcedAt}</div>
                <div>• 예보 대상: {selectedJob.weather.targetAt}</div>
                <div>• 풍속 기준: {selectedJob.weather.windType} <strong>{selectedJob.weather.windSpeedMs}m/s</strong></div>
                <div>• 돌풍 자료: {selectedJob.weather.hasGustData ? '있음' : '미제공(임의생성 금지)'}</div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                ※ {selectedJob.weather.ruleVersion} 적용. 기상청 격자 풍속을 현장 고도 순간풍속으로 임의 치환하지 않으며, 날씨 수치만으로 작업 안전을 보증하지 않으므로 반드시 <strong>현장 풍속 계측, 스카이/크레인 장비 제조사 기준, 안전관리 책임자 판단을 병행</strong>하십시오.
              </p>
              <button
                onClick={() => setWeatherCancelModalJob(selectedJob)}
                className="w-full min-h-[42px] rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-extrabold text-xs flex items-center justify-center gap-1.5"
              >
                <CloudRain className="w-4 h-4" />
                <span>기상 악화(천재지변) 작업 취소 요청 (노쇼 -15점 감점 보류)</span>
              </button>
            </div>

            {/* 현장 진입로 게이트 메모 및 길찾기 딥링크 + 폴백 */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 text-xs">
              <h3 className="font-extrabold text-white">📍 현장 진입로 게이트 메모 및 내비게이션</h3>
              <p className="text-emerald-300 font-bold bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                🚧 {selectedJob.gateMemo}
              </p>
              <p className="text-slate-300">주소: {selectedJob.address}</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() =>
                    showToast('🧭 카카오내비 딥링크 호출 시도 후 미설치/인앱 환경 시 웹 지도 및 주소 복사로 자동 전환합니다.')
                  }
                  className="min-h-[44px] rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>카카오내비</span>
                </button>
                <button
                  onClick={() =>
                    showToast('🧭 티맵(Tmap) 딥링크 호출 시도 후 미설치 환경 시 웹 지도로 안전 폴백합니다.')
                  }
                  className="min-h-[44px] rounded-xl bg-sky-500 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>티맵 길찾기</span>
                </button>
                <button
                  onClick={() => handleCopyAddress(selectedJob.address)}
                  className="min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 border border-slate-700"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>주소 복사</span>
                </button>
              </div>
            </div>

            {/* 연락처 마스킹 (3.3.2절) & Just-in-Time 동의 후 안심번호/채팅 연결 */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-white">
                    구인 담당: {selectedJob.managerName} ({selectedJob.managerOrg})
                  </p>
                  <p className="text-slate-400 mt-0.5">
                    연락처:{' '}
                    <strong className="text-emerald-400">
                      {unlockedContactJobIds[selectedJob.id]
                        ? `${selectedJob.managerPhoneReal} (안심번호 050-8812-4821 연결됨)`
                        : `${selectedJob.managerPhoneMasked} (합의 전 API 원문 차단)`}
                    </strong>
                  </p>
                </div>
                {unlockedContactJobIds[selectedJob.id] ? (
                  <Unlock className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Lock className="w-5 h-5 text-amber-400" />
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    if (!isLoggedIn) {
                      setPendingReturnJobId(selectedJob.id);
                      setSelectedJob(null);
                      setShowOnboarding(true);
                      showToast('🔐 로그인 후 원래 보시던 상세 공고로 자동 복귀합니다.');
                      return;
                    }
                    setJitConsentModal({ open: true, purpose: 'APPLY_JOB', targetJob: selectedJob });
                  }}
                  className="flex-1 min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>지원하기 (실시간 동의)</span>
                </button>
                <button
                  onClick={() =>
                    setJitConsentModal({ open: true, purpose: 'SAFE_CALL_CHAT', targetJob: selectedJob })
                  }
                  className="flex-1 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-sm flex items-center justify-center gap-1.5 border border-slate-700"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>1:1 채팅 · 안심번호</span>
                </button>
              </div>

              {/* 신고하기 및 차단하기 (3.5절 UGC 정책) */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-900 text-[11px] text-slate-400">
                <button
                  onClick={() => showToast('🚨 허위·과장 공고 신고가 접수되어 신고·분쟁 담당자에게 전달되었습니다.')}
                  className="flex items-center gap-1 hover:text-amber-400"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>허위공고 신고하기</span>
                </button>
                <button
                  onClick={() => handleBlockTarget(selectedJob.id, selectedJob.managerOrg)}
                  className="flex items-center gap-1 hover:text-rose-400"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>이 구인자 차단하기</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: Just-in-Time 단계별 실시간 개인정보 동의 (3.3.1절)
         ========================================== */}
      {jitConsentModal.open && jitConsentModal.targetJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                🔒 Just-in-Time 시점별 분리 동의
              </span>
              <button
                onClick={() => setJitConsentModal({ open: false, purpose: 'APPLY_JOB' })}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white">
                {jitConsentModal.purpose === 'APPLY_JOB'
                  ? '현장 지원서 제출을 위한 실시간 동의'
                  : '1:1 채팅 및 050 안심번호 연결 동의'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                가입 시 일괄 동의를 강제하지 않으며, 실제 지원·연락 시점에 상대방과 목적을 명확히 고지합니다. (주민등록번호·신분증 원본·정확한 거주지·CI 수집 원천 차단)
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 text-xs">
              <div className="text-[11px] text-emerald-400 font-bold">
                • 제공받는 상대방: {jitConsentModal.targetJob.managerOrg} ({jitConsentModal.targetJob.managerName})
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={jitAgreedItems.collection}
                  onChange={e => setJitAgreedItems({ ...jitAgreedItems, collection: e.target.checked })}
                  className="mt-0.5 accent-emerald-500 w-4 h-4"
                />
                <span className="text-slate-200">
                  <strong>[필수]</strong> 구인 지원 및 시공 매칭을 위한 프로필(경력·공종·안심연락처) 수집·이용 동의
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={jitAgreedItems.thirdParty}
                  onChange={e => setJitAgreedItems({ ...jitAgreedItems, thirdParty: e.target.checked })}
                  className="mt-0.5 accent-emerald-500 w-4 h-4"
                />
                <span className="text-slate-200">
                  <strong>[필수]</strong> 거래 상대방({jitConsentModal.targetJob.managerOrg})에 대한 제3자 정보 제공 동의
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer pt-1 border-t border-slate-800">
                <input
                  type="checkbox"
                  checked={jitAgreedItems.nightPushOptIn}
                  onChange={e => setJitAgreedItems({ ...jitAgreedItems, nightPushOptIn: e.target.checked })}
                  className="mt-0.5 accent-emerald-500 w-4 h-4"
                />
                <span className="text-slate-400">
                  [선택] 야간(20:00~08:00) 긴급 배차 알림 수신 동의 (전체 동의에 강제 포함되지 않음)
                </span>
              </label>
            </div>

            <button
              onClick={handleConfirmJitConsent}
              className="w-full min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm"
            >
              동의 영수증(consent_receipts) 발급 및 진행하기
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3: ⚡ 원클릭 초간편 현장 공고 등록 모달 (5.1.1절)
         ========================================== */}
      {showJobCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={handleCreateJob}
            className="w-full max-w-[480px] max-h-[92vh] bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl overflow-y-auto p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">⚡ 소장님 원클릭 현장 공고 등록</h3>
              <button
                type="button"
                onClick={() => setShowJobCreateModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* 1. 현장 사진 첨부란 (좌측 정사각 썸네일 연동 및 위치 EXIF 자동 제거) */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="block font-bold text-emerald-400">📷 현장 실사진 첨부 (위치 EXIF 자동 제거)</label>
                <div className="flex items-center gap-2">
                  <label className="min-h-[42px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700 shrink-0">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>현장 사진 선택</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setNewJobForm({ ...newJobForm, sitePhotoName: `${file.name} (EXIF 제거완료)` });
                          showToast(`📷 [${file.name}] 현장 사진이 첨부되었습니다.`);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-300 truncate">{newJobForm.sitePhotoName}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">현장 공고 제목</label>
                <input
                  type="text"
                  required
                  value={newJobForm.title}
                  onChange={e => setNewJobForm({ ...newJobForm, title: e.target.value })}
                  placeholder="예: 화성 동탄 물류센터 외벽 그라스울 100T 2인1조 구인"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">권역 선택</label>
                  <select
                    value={newJobForm.regionGroup}
                    onChange={e => setNewJobForm({ ...newJobForm, regionGroup: e.target.value })}
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-2.5 text-slate-100"
                  >
                    {REGIONS_17.filter(r => r !== '전국 전체').map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">판넬 종류 (7종)</label>
                  <select
                    value={newJobForm.panelKind}
                    onChange={e =>
                      setNewJobForm({ ...newJobForm, panelKind: e.target.value as Exclude<PanelKind, 'ALL'> })
                    }
                    className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-2.5 text-slate-100"
                  >
                    {(Object.keys(PANEL_LABELS) as PanelKind[])
                      .filter(k => k !== 'ALL')
                      .map(k => (
                        <option key={k} value={k}>
                          {PANEL_LABELS[k]}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* 2. 건강검진 및 기초안전보건교육 이수증 확인란 (시험성적서 서류제출란 대체) */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="block font-bold text-emerald-400">🪪 현장 투입 필수 서류 조건 (비공개 버킷 검증)</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newJobForm.safetyEduRequired}
                      onChange={e => setNewJobForm({ ...newJobForm, safetyEduRequired: e.target.checked })}
                      className="accent-emerald-500 w-4 h-4"
                    />
                    <span className="font-bold text-slate-200">기초안전교육이수증</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newJobForm.healthCheckRequired}
                      onChange={e => setNewJobForm({ ...newJobForm, healthCheckRequired: e.target.checked })}
                      className="accent-emerald-500 w-4 h-4"
                    />
                    <span className="font-bold text-slate-200">건강검진 서류</span>
                  </label>
                </div>
              </div>

              {/* 3. 모집 단위 필수 선택 ('단가 협의' 목록 추가) */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">모집 단위 필수 선택 (단가 협의 포함)</label>
                <select
                  value={newJobForm.teamUnit}
                  onChange={e => setNewJobForm({ ...newJobForm, teamUnit: e.target.value as TeamUnitType })}
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-slate-100"
                >
                  {(Object.keys(TEAM_UNIT_LABELS) as TeamUnitType[]).map(tu => (
                    <option key={tu} value={tu}>
                      {TEAM_UNIT_LABELS[tu]}
                    </option>
                  ))}
                </select>
              </div>

              {/* 기공 / 조공 단가 분리 입력 ('단가 협의' 선택 시 기공·조공 1인 일당 입력란 숨김 처리) */}
              {newJobForm.teamUnit !== 'NEGOTIABLE' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-emerald-400 mb-1">기공 1인 일당 (원)</label>
                    <input
                      type="number"
                      step={10000}
                      value={newJobForm.masterWage}
                      onChange={e => setNewJobForm({ ...newJobForm, masterWage: Number(e.target.value) })}
                      className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-slate-100 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-emerald-400 mb-1">조공 1인 일당 (원)</label>
                    <input
                      type="number"
                      step={10000}
                      value={newJobForm.helperWage}
                      onChange={e => setNewJobForm({ ...newJobForm, helperWage: Number(e.target.value) })}
                      className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-slate-100 font-bold"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-between">
                  <span>💬 단가 협의 선택됨</span>
                  <span className="text-[11px] text-slate-300 font-normal">
                    기공·조공 1인 일당 입력란이 비활성(숨김) 처리됩니다.
                  </span>
                </div>
              )}

              {/* 4. 고용주 직접 측정 현장 귀책 취소 보상금 설정란 */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-300">
                    <input
                      type="checkbox"
                      checked={newJobForm.cancelCompensation}
                      onChange={e => setNewJobForm({ ...newJobForm, cancelCompensation: e.target.checked })}
                      className="accent-amber-500 w-4 h-4"
                    />
                    <span>🤝 현장 귀책 취소 보상 약정 (고용주 직접 금액 측정)</span>
                  </label>
                </div>
                {newJobForm.cancelCompensation && (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      고용주 측정 취소 보상 금액 (원) — 당일 현장 귀책 취소 시 지급
                    </label>
                    <input
                      type="number"
                      step={10000}
                      min={0}
                      value={newJobForm.cancelCompensationAmount}
                      onChange={e =>
                        setNewJobForm({ ...newJobForm, cancelCompensationAmount: Number(e.target.value) })
                      }
                      className="w-full min-h-[42px] bg-slate-900 border border-amber-500/40 rounded-xl px-3 text-amber-300 font-extrabold"
                    />
                  </div>
                )}
              </div>

              {/* 5. 현장 상세 주소란 (카카오내비 · 티맵 연동 주소) 및 게이트 메모 */}
              <div>
                <label className="block font-bold text-emerald-400 mb-1">
                  📍 현장 상세 주소 (카카오내비 · 티맵 길찾기 연동 주소)
                </label>
                <input
                  type="text"
                  required
                  value={newJobForm.address}
                  onChange={e => setNewJobForm({ ...newJobForm, address: e.target.value })}
                  placeholder="예: 경기도 화성시 동탄산단로 88 (카카오내비/티맵 연동)"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">현장 진입로 게이트 메모</label>
                <input
                  type="text"
                  value={newJobForm.gateMemo}
                  onChange={e => setNewJobForm({ ...newJobForm, gateMemo: e.target.value })}
                  placeholder="예: 남문 1번 게이트 신호수 확인 후 하차장 진입"
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-slate-100"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[50px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg"
            >
              공고 등록 완료 (EXIF 위치정보 자동제거)
            </button>
          </form>
        </div>
      )}

      {/* ==========================================
          MODAL 4: 🦺 기술자/시공팀 프로필 등록 모달 (5.2절)
         ========================================== */}
      {showWorkerCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateWorker}
            className="w-full max-w-[440px] max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">🦺 판넬 시공팀 / 기술자 등록</h3>
              <button
                type="button"
                onClick={() => setShowWorkerCreateModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">활동 단위 구분 (개인 / 시공팀)</label>
                <select
                  value={newWorkerForm.type}
                  onChange={e => setNewWorkerForm({ ...newWorkerForm, type: e.target.value as 'TEAM' | 'INDIVIDUAL' })}
                  className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-white"
                >
                  <option value="TEAM">시공팀 (2인 1조 이상)</option>
                  <option value="INDIVIDUAL">개인 기술자 (기공/조공 단독)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">팀명 또는 성명</label>
                <input
                  type="text"
                  required
                  value={newWorkerForm.name}
                  onChange={e => setNewWorkerForm({ ...newWorkerForm, name: e.target.value })}
                  placeholder="예: 태백 판넬시공 2인1조팀"
                  className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-white"
                />
              </div>

              {/* 1. 기초안전보건교육 이수 여부 & 2. 개인 또는 사업자 여부 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-emerald-400 mb-1">🪪 기초안전보건교육 이수 여부</label>
                  <select
                    value={newWorkerForm.safetyEduCompleted ? 'YES' : 'NO'}
                    onChange={e =>
                      setNewWorkerForm({ ...newWorkerForm, safetyEduCompleted: e.target.value === 'YES' })
                    }
                    className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-2.5 text-white font-bold"
                  >
                    <option value="YES">이수 완료 (증빙보유)</option>
                    <option value="NO">미이수 (추후제출)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-amber-300 mb-1">🏢 개인 또는 사업자 여부</label>
                  <select
                    value={newWorkerForm.isBusinessEntity ? 'BIZ' : 'PERSONAL'}
                    onChange={e =>
                      setNewWorkerForm({ ...newWorkerForm, isBusinessEntity: e.target.value === 'BIZ' })
                    }
                    className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-2.5 text-white font-bold"
                  >
                    <option value="PERSONAL">개인 기술자</option>
                    <option value="BIZ">사업자 보유 (세금계산서 가능)</option>
                  </select>
                </div>
              </div>

              {/* 3. 희망 단가 (기공 / 조공 단가 기입란) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-emerald-400 mb-1">희망 기공 단가 (일당/원)</label>
                  <input
                    type="number"
                    step={10000}
                    value={newWorkerForm.desiredMasterWage}
                    onChange={e =>
                      setNewWorkerForm({ ...newWorkerForm, desiredMasterWage: Number(e.target.value) })
                    }
                    className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-400 mb-1">희망 조공 단가 (일당/원)</label>
                  <input
                    type="number"
                    step={10000}
                    value={newWorkerForm.desiredHelperWage}
                    onChange={e =>
                      setNewWorkerForm({ ...newWorkerForm, desiredHelperWage: Number(e.target.value) })
                    }
                    className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-white font-bold"
                  />
                </div>
              </div>

              {newWorkerForm.type === 'TEAM' && (
                <label className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newWorkerForm.allMembersConsented}
                    onChange={e => setNewWorkerForm({ ...newWorkerForm, allMembersConsented: e.target.checked })}
                    className="mt-0.5 accent-emerald-500 w-4 h-4"
                  />
                  <span className="text-emerald-200 leading-relaxed">
                    <strong>[필수] 팀 구성원(team_members) 전원 참여 동의 확인:</strong> 팀 대표의 단독 수락만으로 미동의 팀원의 일정이 임의 확정되지 않도록 팀원 전원 동의를 완료했습니다.
                  </span>
                </label>
              )}
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm"
            >
              프로필 등록하기
            </button>
          </form>
        </div>
      )}

      {/* ==========================================
          MODAL 5: 🏗️ 자재/장비 업체 직접 등록 모달 (5.3절)
         ========================================== */}
      {showSupplierCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSupplier}
            className="w-full max-w-[440px] max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4 shadow-2xl text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">🏗️ 자재 · 장비 직접 등록</h3>
              <button
                type="button"
                onClick={() => setShowSupplierCreateModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* 1. 자재/장비 사진 첨부란 */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="block font-bold text-amber-400">📷 자재/장비 대표 사진 첨부 (좌측 1:1 썸네일)</label>
                <div className="flex items-center gap-2">
                  <label className="min-h-[40px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700 shrink-0">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>사진 첨부</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setNewSupplierForm({ ...newSupplierForm, photoName: `${file.name} (EXIF 제거완료)` });
                          showToast(`📷 [${file.name}] 자재/장비 사진이 첨부되었습니다.`);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-300 truncate">{newSupplierForm.photoName}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">업체명</label>
                <input
                  type="text"
                  required
                  value={newSupplierForm.orgName}
                  onChange={e => setNewSupplierForm({ ...newSupplierForm, orgName: e.target.value })}
                  placeholder="예: 중부판넬 & 절곡센터"
                  className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-white"
                />
              </div>

              {/* 2. 사업자등록란 (비공개 버킷 심사 연동) */}
              <div>
                <label className="block font-bold text-amber-300 mb-1">🏢 사업자등록번호 및 등록증 첨부</label>
                <input
                  type="text"
                  required
                  value={newSupplierForm.bizRegNumber}
                  onChange={e => setNewSupplierForm({ ...newSupplierForm, bizRegNumber: e.target.value })}
                  placeholder="예: 134-86-01928"
                  className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">홍보 제목</label>
                <input
                  type="text"
                  required
                  value={newSupplierForm.title}
                  onChange={e => setNewSupplierForm({ ...newSupplierForm, title: e.target.value })}
                  placeholder="예: 그라스울/EPS 판넬 공장 직출고 및 후레싱 당일 절곡"
                  className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-300 mb-1">단가 안내</label>
                <input
                  type="text"
                  value={newSupplierForm.priceText}
                  onChange={e => setNewSupplierForm({ ...newSupplierForm, priceText: e.target.value })}
                  className="w-full min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-white"
                />
              </div>

              {/* 3. 홍보글 등록자 확인용 상태 흐름 안내 (심사 대기 / 승인 완료 / 반려) */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-amber-300">🛡️ 업체등록 심사 상태 흐름 안내 (등록자 확인용)</p>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    승인요청 후 2~3일 소요
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-200 leading-relaxed">
                  <div className="p-2 rounded-lg bg-slate-900 border border-amber-500/30">
                    <strong className="text-amber-300">① 심사 대기:</strong> 서류를 제출하고 승인을 기다리는 중 (2~3일 소요, 일반 피드 비노출)
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-emerald-500/30">
                    <strong className="text-emerald-300">② 승인 완료:</strong> 관리자 검수가 끝나 공식 인증 배지가 붙고, 홍보관 및 피드에 정식 공개되어 1:1 견적·배차 문의를 받을 수 있는 상태
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-rose-500/30">
                    <strong className="text-rose-300">③ 반려:</strong> 사업자등록번호 불일치나 서류 식별 불가 등으로 승인이 거절된 상태
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  ※ 사업자등록증 증빙은 WebP 압축(최대 1~2MB) 변환 후 비공개 버킷(<code>private-verifications</code>)에 안전 보관되며, 관리자만 심사 후 승인을 클릭할 수 있습니다.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm"
            >
              홍보 게시물 등록하기
            </button>
          </form>
        </div>
      )}

      {/* ==========================================
          MODAL 6: 기상 악화 작업 취소 요청 (노쇼 감점 보류, 5.1.2절)
         ========================================== */}
      {weatherCancelModalJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] bg-slate-900 border border-amber-500/50 rounded-3xl p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-300">🌤️ 기상 악화(강풍/강우) 안전 작업 취소 요청</span>
              <button
                onClick={() => setWeatherCancelModalJob(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-300 leading-relaxed">
              기상 악화(천재지변)로 인한 위험 작업 취소 요청 시 상대방의 일방 신고만으로 <strong>노쇼(-15.0점) 감점이 자동 확정되지 않도록 즉시 보류(HELD_WEATHER)</strong>하며, 현재 기상청 스냅샷({weatherCancelModalJob.weather.windSpeedMs}m/s)과 현장 증빙을 함께 보존합니다.
            </p>
            <textarea
              rows={3}
              value={weatherCancelReason}
              onChange={e => setWeatherCancelReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white"
            />
            <button
              onClick={handleSubmitWeatherCancel}
              className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm"
            >
              기상 스냅샷 보존 및 취소 요청 제출
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 7: 안전지수 이의제기(Appeal) 및 구제 신청 (5.4.4절)
         ========================================== */}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">🛡️ 안전지수 페널티 구제 · 이의제기(Appeal)</h3>
              <button
                onClick={() => setShowAppealModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-300 leading-relaxed">
              점수는 직접 덮어쓰지 않고 <strong>정정 이벤트(score_events)</strong>를 발행하여 투명하게 복구됩니다. 현장 사진, 기상 계측 기록, 대화 내역 등 소명 사유를 입력해 주세요.
            </p>
            <textarea
              rows={3}
              value={appealText}
              onChange={e => setAppealText(e.target.value)}
              placeholder="예: 당일 현장 크레인 장비 고장으로 인한 대기 후 상호 합의 철수였음을 증명합니다."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white"
            />
            <button
              onClick={() => {
                const recoveryEvent: ScoreLedgerEvent = {
                  id: `ev-${Date.now()}`,
                  createdAt: '2026-11-02 11:02',
                  category: 'TRUST',
                  eventType: 'APPEAL_CORRECTION',
                  delta: mySafetyScore < 65 ? 32.0 : 1.5,
                  balanceAfter: mySafetyScore < 65 ? 95.5 : Math.min(100, mySafetyScore + 1.5),
                  reason: `[이의제기 정정 승인] ${appealText || '현장 귀책 증빙 확인 완료'}`,
                  status: 'CORRECTED'
                };
                setScoreLedger(prev => [recoveryEvent, ...prev]);
                setMySafetyScore(recoveryEvent.balanceAfter);
                setShowAppealModal(false);
                setAppealText('');
                showToast('✅ 이의제기가 접수 및 정정 이벤트로 원장에 반영되었습니다.');
              }}
              className="w-full min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm"
            >
              이의제기 제출 및 원장 정정 이벤트 발행
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 8: 회원 탈퇴 및 법정 보존 의무 분리 고지 (3.1.4절)
         ========================================== */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] bg-slate-900 border border-rose-500/50 rounded-3xl p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-rose-300">⚠️ 회원 탈퇴 및 법정 분리보관 안내</h3>
              <button
                onClick={() => setShowWithdrawalModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-slate-300 leading-relaxed">
              <p>• <strong>즉시 중단 및 파기:</strong> 공개 프로필, 050 안심번호 매핑, 회전형 리프레시 토큰, 소셜 연결은 탈퇴 즉시 파기됩니다.</p>
              <p>• <strong>법정 보존 의무 분리 보관 (무기한 보관 금지):</strong></p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                <li>계약·청약철회 및 작업 확정 기록: <strong>5년</strong> (전자상거래법 시행령 제6조)</li>
                <li>대금결제 및 정산 확인에 관한 기록: <strong>5년</strong> (전자상거래법)</li>
                <li>소비자 불만 또는 분쟁처리에 관한 기록: <strong>3년</strong> (전자상거래법 / 상대방 권리 보호)</li>
                <li>직업정보제공 및 구인·구직 대장: <strong>3년</strong> (직업안정법 시행규칙)</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowWithdrawalModal(false)}
                className="flex-1 min-h-[46px] rounded-xl bg-slate-800 text-slate-200 font-bold"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowWithdrawalModal(false);
                  showToast('본인 확인 후 탈퇴 요청(deletion_requests)이 등록되어 공개 프로필이 즉시 비활성화되었습니다.');
                }}
                className="flex-1 min-h-[46px] rounded-xl bg-rose-500 text-slate-950 font-extrabold"
              >
                본인확인 후 탈퇴 실행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 9: 가입 배경화면 & 대한민국 법적 필수 약관 동의 회원가입 (로그인 없이 둘러보기 제거됨)
         ========================================== */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 text-center shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                ⛑️ 판넬오더 V2.1 회원가입 · 로그인
              </span>
              {isLoggedIn && (
                <button
                  onClick={() => setShowOnboarding(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {onboardingStep === 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-extrabold text-emerald-400">SLIDE 1 / 3 · 당근마켓 스타일 원터치</span>
                <h2 className="text-base font-extrabold text-white">장갑 낀 손으로도 1초 만에 판넬 구인·구직</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  기공·조공 단가 분리 표기로 임금 혼동을 원천 차단하고, 전국 17대 권역 현장을 1:1로 즉시 연결합니다.
                </p>
              </div>
            )}
            {onboardingStep === 1 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-extrabold text-emerald-400">SLIDE 2 / 3 · 기상청 격자 & 안전지수</span>
                <h2 className="text-base font-extrabold text-white">현장 격자 풍속 연동 & 억울한 노쇼 방지</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  안전보건규칙 제37조 기준 풍속 알림과 기상 악화 취소 시 노쇼(-15점) 감점 보류 안전장치를 제공합니다.
                </p>
              </div>
            )}
            {onboardingStep === 2 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-extrabold text-emerald-400">SLIDE 3 / 3 · 대한민국 법령 및 성인 인증</span>
                <h2 className="text-base font-extrabold text-white">만 18세 이상 성인 전용 & 무분쟁 법적 보호</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  근로기준법 제65조·직업안정법·개인정보보호법·위치정보법을 철저히 준수하여 안전한 직거래를 지원합니다.
                </p>
              </div>
            )}

            <div className="flex justify-center gap-2">
              {[0, 1, 2].map(idx => (
                <button
                  key={idx}
                  onClick={() => setOnboardingStep(idx)}
                  className={`h-2 rounded-full transition-all ${
                    onboardingStep === idx ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* 회원가입 시 대한민국 법적 필수 동의 항목 (분쟁 예방 6대 필수 + 마케팅 선택 분리) */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="font-extrabold text-emerald-400">
                  ⚖️ 대한민국 법령 준수 및 분쟁 예방 약관 동의
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const allChecked =
                      signupAgreements.adult18 &&
                      signupAgreements.serviceTerms &&
                      signupAgreements.privacyPolicy &&
                      signupAgreements.locationTerms &&
                      signupAgreements.safetyLiability &&
                      signupAgreements.youthProtection;
                    setSignupAgreements(prev => ({
                      ...prev,
                      adult18: !allChecked,
                      serviceTerms: !allChecked,
                      privacyPolicy: !allChecked,
                      locationTerms: !allChecked,
                      safetyLiability: !allChecked,
                      youthProtection: !allChecked
                    }));
                  }}
                  className="text-[11px] font-bold text-emerald-300 underline"
                >
                  필수항목 전체동의
                </button>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signupAgreements.adult18}
                  onChange={e => setSignupAgreements({ ...signupAgreements, adult18: e.target.checked })}
                  className="mt-0.5 accent-emerald-500 w-4 h-4 shrink-0"
                />
                <span className="text-slate-200 leading-snug">
                  <strong className="text-emerald-400">[필수]</strong> 만 18세 이상 성인 확인 (근로기준법 제65조 연소자 유해·위험 건설작업 금지 준수)
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signupAgreements.serviceTerms}
                  onChange={e => setSignupAgreements({ ...signupAgreements, serviceTerms: e.target.checked })}
                  className="mt-0.5 accent-emerald-500 w-4 h-4 shrink-0"
                />
                <span className="text-slate-200 leading-snug">
                  <strong className="text-emerald-400">[필수]</strong> 서비스 이용약관 및 직업정보제공 중개 면책 동의 (직업안정법·전자상거래법 — 고용계약·임금체불 비당사자 확인)
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signupAgreements.privacyPolicy}
                  onChange={e => setSignupAgreements({ ...signupAgreements, privacyPolicy: e.target.checked })}
                  className="mt-0.5 accent-emerald-500 w-4 h-4 shrink-0"
                />
                <span className="text-slate-200 leading-snug">
                  <strong className="text-emerald-400">[필수]</strong> 개인정보 처리방침 동의 (개인정보보호법 — 최소 수집 및 탈퇴 시 법정 보존기간 분리보관)
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signupAgreements.locationTerms}
                  onChange={e => setSignupAgreements({ ...signupAgreements, locationTerms: e.target.checked })}
                  className="mt-0.5 accent-emerald-500 w-4 h-4 shrink-0"
                />
                <span className="text-slate-200 leading-snug">
                  <strong className="text-emerald-400">[필수]</strong> 위치기반서비스 이용약관 동의 (위치정보법 — 전국 17대 권역 GPS 매칭 및 내비게이션 연동)
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signupAgreements.safetyLiability}
                  onChange={e => setSignupAgreements({ ...signupAgreements, safetyLiability: e.target.checked })}
                  className="mt-0.5 accent-emerald-500 w-4 h-4 shrink-0"
                />
                <span className="text-slate-200 leading-snug">
                  <strong className="text-emerald-400">[필수]</strong> 운영정책 및 현장 안전관리·산재보험 책임 분리 동의 (산업안전보건법 — 실채용 사업주 책임 원칙)
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signupAgreements.youthProtection}
                  onChange={e => setSignupAgreements({ ...signupAgreements, youthProtection: e.target.checked })}
                  className="mt-0.5 accent-emerald-500 w-4 h-4 shrink-0"
                />
                <span className="text-slate-200 leading-snug">
                  <strong className="text-emerald-400">[필수]</strong> 청소년 보호정책 준수 동의 (청소년보호법)
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer pt-1.5 border-t border-slate-800">
                <input
                  type="checkbox"
                  checked={signupAgreements.marketingOptIn}
                  onChange={e => {
                    setSignupAgreements({ ...signupAgreements, marketingOptIn: e.target.checked });
                    setMarketingConsent(e.target.checked);
                  }}
                  className="mt-0.5 accent-emerald-500 w-4 h-4 shrink-0"
                />
                <span className="text-slate-400 leading-snug">
                  <strong className="text-amber-300">[선택]</strong> 마케팅 정보 및 혜택 알림 수신 동의 (정보통신망법 — 야간 20:00~08:00 발송 제한 준수, 미동의 시에도 가입 가능)
                </span>
              </label>
            </div>

            {/* 로그인 없이 둘러보기 버튼 완전 제거 — 필수 약관 동의 후 카카오/네이버 로그인만 허용 */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  const requiredAll =
                    signupAgreements.adult18 &&
                    signupAgreements.serviceTerms &&
                    signupAgreements.privacyPolicy &&
                    signupAgreements.locationTerms &&
                    signupAgreements.safetyLiability &&
                    signupAgreements.youthProtection;
                  if (!requiredAll) {
                    showToast('⚠️ 대한민국 법적 필수 동의 항목(6종)에 모두 체크하셔야 가입 및 로그인이 가능합니다.');
                    return;
                  }
                  setIsLoggedIn(true);
                  setShowOnboarding(false);
                  if (pendingReturnJobId) {
                    const target = jobs.find(j => j.id === pendingReturnJobId);
                    if (target) setSelectedJob(target);
                    setPendingReturnJobId(null);
                    showToast('⚡ 법정 필수 약관 동의 및 카카오 1초 간편로그인 완료!');
                  } else {
                    showToast('⚡ 법정 필수 약관 동의 영수증(consent_receipts) 발급 및 카카오 로그인 완료!');
                  }
                }}
                className="w-full min-h-[48px] rounded-xl bg-[#FEE500] text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg"
              >
                <span>💬 필수약관 동의 후 카카오로 1초 시작하기</span>
              </button>
              <button
                onClick={() => {
                  const requiredAll =
                    signupAgreements.adult18 &&
                    signupAgreements.serviceTerms &&
                    signupAgreements.privacyPolicy &&
                    signupAgreements.locationTerms &&
                    signupAgreements.safetyLiability &&
                    signupAgreements.youthProtection;
                  if (!requiredAll) {
                    showToast('⚠️ 대한민국 법적 필수 동의 항목(6종)에 모두 체크하셔야 가입 및 로그인이 가능합니다.');
                    return;
                  }
                  setIsLoggedIn(true);
                  setShowOnboarding(false);
                  showToast('⚡ 법정 필수 약관 동의 영수증(consent_receipts) 발급 및 네이버 로그인 완료!');
                }}
                className="w-full min-h-[48px] rounded-xl bg-[#03C75A] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg"
              >
                <span>N 필수약관 동의 후 네이버로 1초 시작하기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 11: 마이페이지 [내 계정] (이메일, 휴대전화번호, 국가, 주소, 본인인증, 로그인 기록)
         ========================================== */}
      {activeMyPageModal === 'ACCOUNT' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] max-h-[90vh] overflow-y-auto bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-400" />
                <span>내 계정 (로그인 기반 인증 및 기록 관리)</span>
              </h3>
              <button
                onClick={() => setActiveMyPageModal('NONE')}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">이메일 (로그인 ID 연동)</label>
                <input
                  type="email"
                  value={myAccountInfo.email}
                  onChange={e => setMyAccountInfo({ ...myAccountInfo, email: e.target.value })}
                  className="w-full min-h-[40px] bg-slate-900 border border-slate-800 rounded-xl px-3 text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">휴대전화번호 (안심번호 매핑 기준)</label>
                <input
                  type="text"
                  value={myAccountInfo.phone}
                  onChange={e => setMyAccountInfo({ ...myAccountInfo, phone: e.target.value })}
                  className="w-full min-h-[40px] bg-slate-900 border border-slate-800 rounded-xl px-3 text-emerald-400 font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">국가</label>
                  <input
                    type="text"
                    value={myAccountInfo.country}
                    onChange={e => setMyAccountInfo({ ...myAccountInfo, country: e.target.value })}
                    className="w-full min-h-[40px] bg-slate-900 border border-slate-800 rounded-xl px-3 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">본인인증 상태</label>
                  <div className="min-h-[40px] bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-2.5 flex items-center text-emerald-300 font-extrabold text-[11px]">
                    ✅ 성인·본인인증됨
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">기본 주소 (권역 매칭 기준)</label>
                <input
                  type="text"
                  value={myAccountInfo.address}
                  onChange={e => setMyAccountInfo({ ...myAccountInfo, address: e.target.value })}
                  className="w-full min-h-[40px] bg-slate-900 border border-slate-800 rounded-xl px-3 text-white"
                />
              </div>
              <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px] text-slate-300">
                <p>• <strong>본인인증 상세:</strong> {myAccountInfo.identityVerified}</p>
                <p>• <strong>로그인 연동 방식:</strong> {myAccountInfo.loginProvider}</p>
                <p>• <strong>최근 로그인 기록:</strong> {myAccountInfo.lastLoginLog}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveMyPageModal('NONE');
                showToast('✅ 내 계정 정보 및 로그인 기반 기록이 안전하게 저장되었습니다.');
              }}
              className="w-full min-h-[46px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs"
            >
              내 계정 정보 저장하기
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 12: 마이페이지 [고객센터 - AI 1:1 대화방]
         ========================================== */}
      {activeMyPageModal === 'AI_CS_CHAT' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] max-h-[90vh] bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 flex flex-col justify-between shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>고객센터 AI 1:1 대화방</span>
                </h3>
                <p className="text-[11px] text-emerald-400">24시간 현장 분쟁·심사·기상 취소 소명 즉시 응답</p>
              </div>
              <button
                onClick={() => setActiveMyPageModal('NONE')}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 빠른 질문 원터치 버튼 */}
            <div className="flex flex-wrap gap-1.5 py-2.5 border-b border-slate-800">
              {[
                '강풍 기상악화 노쇼 감점 보류 방법',
                '자재·장비 사업자 심사 기간(2~3일)',
                '단가 협의 및 취소보상금 기준',
                '내 계정 본인인증 및 약관 확인'
              ].map(q => (
                <button
                  key={q}
                  onClick={() => handleSendAiCsMessage(q)}
                  className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-[11px] border border-slate-700"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* 대화 내역 */}
            <div className="my-3 flex-1 overflow-y-auto space-y-2.5 max-h-64 pr-1">
              {aiChatMessages.map(m => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'USER' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                      m.sender === 'USER'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-950 border border-slate-800 text-slate-200'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 px-1">{m.time}</span>
                </div>
              ))}
            </div>

            {/* 메시지 입력창 */}
            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                value={aiChatInput}
                onChange={e => setAiChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendAiCsMessage();
                  }
                }}
                placeholder="궁금하신 내용을 입력해 주세요..."
                className="flex-1 min-h-[42px] bg-slate-950 border border-slate-800 rounded-xl px-3 text-white"
              />
              <button
                onClick={() => handleSendAiCsMessage()}
                className="px-4 min-h-[42px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 13: 마이페이지 [공지사항]
         ========================================== */}
      {activeMyPageModal === 'NOTICES' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>판넬오더 공식 공지사항</span>
              </h3>
              <button
                onClick={() => setActiveMyPageModal('NONE')}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    [법령 필독]
                  </span>
                  <span className="text-[11px] text-slate-400">2026-11-01</span>
                </div>
                <p className="font-extrabold text-white text-sm pt-1">
                  2026년 12월 10일 시행 개정 직업안정법 준수 및 사업주 신원·체불 검증 안내
                </p>
                <p className="text-slate-300 leading-relaxed">
                  판넬오더는 직업정보제공사업자로서 구인 사업주의 신원 검증 및 고용노동부 공표 체불·산재 명단 동일성 확인 절차를 철저히 준수합니다.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    [안전 기준]
                  </span>
                  <span className="text-[11px] text-slate-400">2026-10-25</span>
                </div>
                <p className="font-extrabold text-white text-sm pt-1">
                  동절기 강풍(10m/s·15m/s 초과) 시 작업 중지 검토 및 노쇼 감점 자동 보류 안내
                </p>
                <p className="text-slate-300 leading-relaxed">
                  안전보건규칙 제37조에 따라 강풍 등 기상 악화로 인한 안전 작업 취소 요청 시 기상청 격자 스냅샷이 보존되며 노쇼(-15.0점) 감점이 자동 보류됩니다.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    [서비스 안내]
                  </span>
                  <span className="text-[11px] text-slate-400">2026-10-15</span>
                </div>
                <p className="font-extrabold text-white text-sm pt-1">
                  자재·장비 업체 직접 등록 시 심사 기간(2~3일 소요) 및 3단계 상태 표시 안내
                </p>
                <p className="text-slate-300 leading-relaxed">
                  사업자등록증(WebP 보안 압축 보관) 제출 후 관리자 검수까지 영업일 기준 2~3일이 소요되며, 심사 대기 ➔ 승인 완료 / 반려 상태를 실시간으로 확인하실 수 있습니다.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveMyPageModal('NONE')}
              className="w-full min-h-[46px] rounded-xl bg-slate-800 text-slate-200 font-bold"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 14: 마이페이지 [약관 및 정책] (6대 법정 필수 약관 전문 탑재)
         ========================================== */}
      {activeMyPageModal === 'TERMS_POLICY' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[460px] max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl p-5 flex flex-col justify-between shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-white">📜 약관 및 정책 (대한민국 법정 필수 약관)</h3>
                <p className="text-[11px] text-emerald-400">분쟁 예방을 위한 6대 핵심 약관 및 정책 원문</p>
              </div>
              <button
                onClick={() => setActiveMyPageModal('NONE')}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 py-2.5 border-b border-slate-800">
              {(
                [
                  { id: 'SERVICE', label: '서비스 이용약관' },
                  { id: 'PRIVACY', label: '개인정보 처리방침' },
                  { id: 'OPERATION', label: '운영정책' },
                  { id: 'YOUTH', label: '청소년 보호정책' },
                  { id: 'LOCATION', label: '위치기반서비스 이용약관' },
                  { id: 'SAFETY_DISCLAIMER', label: '직업안정법·산재 책임분리' }
                ] as const
              ).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedPolicyTab(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg font-extrabold text-[11px] border transition ${
                    selectedPolicyTab === tab.id
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="my-3 flex-1 overflow-y-auto bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-slate-300 leading-relaxed max-h-72">
              {selectedPolicyTab === 'SERVICE' && (
                <>
                  <h4 className="font-extrabold text-emerald-400 text-sm">제1조 (서비스 이용약관 및 중개 플랫폼의 지위)</h4>
                  <p>1. 판넬오더(이하 &quot;회사&quot;)는 직업안정법상 직업정보제공사업자로서 구인자(현장소장·원청), 구직자(판넬 시공팀·기술자), 자재·장비 공급업체 간의 정보 탐색 및 1:1 연결을 지원하는 온라인 플랫폼을 제공합니다.</p>
                  <p>2. 회사는 직접적인 근로계약, 도급계약 또는 자재 매매계약의 당사자가 아니며, 임금 정산, 현장 귀책 취소보상금 지급, 하자 보수 책임은 각 거래 당사자(고용주 및 시공팀/공급업체)에게 귀속됩니다.</p>
                  <p>3. 상호 조건 확정 시 생성되는 불변 합의 사본(<code>terms_snapshots</code>)은 당사자 간 합의 증빙으로 보존되며 임의 변조가 불가능합니다.</p>
                </>
              )}
              {selectedPolicyTab === 'PRIVACY' && (
                <>
                  <h4 className="font-extrabold text-emerald-400 text-sm">개인정보 처리방침 (개인정보보호법 준수)</h4>
                  <p>1. <strong>최소 수집 및 시점별 분리 동의(Just-in-Time Consent):</strong> 회사는 가입 시 불필요한 주민등록번호, 신분증 원본, 정확한 거주지, CI 수집을 원천 차단하며, 실제 구인 지원 및 1:1 안심번호 연결 시점에 상대방과 목적을 고지하고 동의를 받습니다.</p>
                  <p>2. <strong>비공개 증빙 보호:</strong> 사업자등록증·기초안전교육이수증·건강검진 서류는 WebP 압축(1~2MB) 후 비공개 버킷(<code>private-verifications</code>)에 분리 보관하며 60초 유효기간의 서명된 URL(Signed URL)로만 열람합니다.</p>
                  <p>3. <strong>탈퇴 시 파기 및 법정 분리보관:</strong> 회원 탈퇴 즉시 공개 프로필과 인증 토큰은 파기하되, 전자상거래법(계약·대금정산 5년, 분쟁처리 3년) 및 직업안정법(직업정보제공 대장 3년) 의무 항목은 분리 보관 후 기간 만료 시 영구 파기합니다.</p>
                </>
              )}
              {selectedPolicyTab === 'OPERATION' && (
                <>
                  <h4 className="font-extrabold text-emerald-400 text-sm">플랫폼 운영정책 (안전지수 원장 및 어뷰징 통제)</h4>
                  <p>1. <strong>안전지수(Safety Index) 운영:</strong> 초기 80.0점이 부여되며 변경 불가능한 이벤트 원장(<code>score_events</code>)을 통해 산출됩니다. 65점 미만 시 자동 영구정지가 아닌 임시 제한 후 소명 및 이의제기(Appeal) 구제 절차를 보장합니다.</p>
                  <p>2. <strong>기상악화 노쇼 감점 보류:</strong> 안전보건규칙 제37조에 따른 강풍(10m/s·15m/s 초과) 등 천재지변 취소 요청 시 기상청 격자 스냅샷을 함께 보존하며 노쇼(-15.0점) 자동 감점을 보류합니다.</p>
                  <p>3. <strong>자재·장비 업체 심사:</strong> 사업자등록증 제출 후 영업일 2~3일 내 관리자 검수를 거쳐 승인 완료 시에만 정식 공개 및 인증 배지가 부여됩니다.</p>
                </>
              )}
              {selectedPolicyTab === 'YOUTH' && (
                <>
                  <h4 className="font-extrabold text-emerald-400 text-sm">청소년 보호정책 (근로기준법 제65조 및 청소년보호법)</h4>
                  <p>1. 건설 현장 샌드위치 판넬 양중·절단·고소 시공 작업은 근로기준법 제65조 및 산업안전보건법상 연소자(만 18세 미만)의 유해·위험 작업에 해당하므로, 판넬오더는 <strong>만 18세 이상 성인 본인인증 완료자만 가입을 허용</strong>합니다.</p>
                  <p>2. 미성년자의 명의 도용이나 불법 현장 투입 시도가 적발될 경우 즉시 계정 이용이 중단되며 관련 법령에 따라 조치됩니다.</p>
                </>
              )}
              {selectedPolicyTab === 'LOCATION' && (
                <>
                  <h4 className="font-extrabold text-emerald-400 text-sm">위치기반서비스 이용약관 (위치정보의 보호 및 이용 등에 관한 법률)</h4>
                  <p>1. 회사는 이용자의 현재 위치(HTML5 Geolocation GPS)를 활용하여 대한민국 17대 권역 자동 설정, 주변 현장 공고 추천, 카카오내비·티맵 길찾기 연동 서비스를 제공합니다.</p>
                  <p>2. 이용자가 업로드하는 현장 사진 및 자재 사진에 포함된 GPS EXIF 메타데이터는 서버 업로드 즉시 자동 삭제되어 개인 위치 노출을 방지합니다.</p>
                  <p>3. 이용자는 언제든지 위치정보 이용 동의를 거부하거나 철회할 수 있으며, 거부 시에도 17대 권역 수동 드롭다운 선택으로 모든 서비스를 정상 이용할 수 있습니다.</p>
                </>
              )}
              {selectedPolicyTab === 'SAFETY_DISCLAIMER' && (
                <>
                  <h4 className="font-extrabold text-emerald-400 text-sm">직업안정법 준수 및 현장 산재·안전관리 책임 분리 고지</h4>
                  <p>1. <strong>직업정보제공사업 신고번호:</strong> 제 J1511020260001 호 (2026.12.10 시행 개정 직업안정법에 따라 고용노동부 공표 체불 사업주 명단과 동일성 확인 절차 이행)</p>
                  <p>2. <strong>현장 안전관리 및 산재보험 의무:</strong> 산업안전보건법상 현장 내 안전모·안전대 등 보호구 착용 감독, 현장 풍속 실측에 따른 작업 중지 결정, 산재보험 가입 의무는 실제 채용 당사자(현장소장·원청 사업주)에게 있으며 본 조항은 거래 확정서(<code>terms_snapshots</code>)에 전자 동의로 자동 첨부됩니다.</p>
                </>
              )}
            </div>

            <button
              onClick={() => setActiveMyPageModal('NONE')}
              className="w-full min-h-[46px] rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs"
            >
              약관 내용 확인 완료
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 10: Supabase PostgreSQL DDL & RLS 보안 아키텍처 코드 뷰어
         ========================================== */}
      {showArchitectureDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-[480px] max-h-[88vh] bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 flex flex-col justify-between shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-white">📦 풀스택 아키텍처 & Supabase SQL 요약</h3>
                <p className="text-[11px] text-emerald-400">
                  전체 SQL 마이그레이션과 Next.js 서버 코드는 함께 제공된 ZIP 패키지에 수록되어 있습니다.
                </p>
              </div>
              <button
                onClick={() => setShowArchitectureDrawer(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-3 flex-1 overflow-y-auto space-y-3 text-[11px] font-mono bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-slate-300">
              <p className="text-emerald-400 font-bold">-- 1. 동시 정원 초과 방지 Row-level Lock 트랜잭션 (4.2절)</p>
              <pre className="whitespace-pre-wrap text-[10px] text-slate-300">
{`CREATE OR REPLACE FUNCTION confirm_job_engagement(
  p_job_id UUID, p_slot_id UUID, p_worker_id UUID, p_terms JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_filled INT; v_cap INT; v_eng_id UUID;
BEGIN
  SELECT filled_count, capacity INTO v_filled, v_cap
  FROM job_recruitment_slots WHERE id = p_slot_id FOR UPDATE;
  IF v_filled >= v_cap THEN
    RAISE EXCEPTION '모집 정원이 초과되었습니다.';
  END IF;
  UPDATE job_recruitment_slots SET filled_count = filled_count + 1 WHERE id = p_slot_id;
  INSERT INTO engagements (job_id, slot_id, status) VALUES (p_job_id, p_slot_id, 'CONFIRMED')
  RETURNING id INTO v_eng_id;
  INSERT INTO terms_snapshots (engagement_id, snapshot_payload) VALUES (v_eng_id, p_terms);
  RETURN v_eng_id;
END; $$;`}
              </pre>
              <p className="text-emerald-400 font-bold pt-2">-- 2. 클라이언트 임의 점수/권한 변조 차단 RLS (7.2절)</p>
              <pre className="whitespace-pre-wrap text-[10px] text-slate-300">
{`ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_events ENABLE ROW LEVEL SECURITY;
-- score_events는 클라이언트 INSERT/UPDATE/DELETE 전면 거부 (서버 트랜잭션 전용)`}
              </pre>
            </div>

            <button
              onClick={() => setShowArchitectureDrawer(false)}
              className="w-full min-h-[46px] rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
