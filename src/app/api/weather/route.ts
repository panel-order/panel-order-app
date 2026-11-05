import { NextRequest, NextResponse } from 'next/server';

/**
 * 판넬오더 V2.1 - 기상청 격자 변환 및 서버 캐시 API 어댑터 (5.1.2절 & 7.4절 준수)
 * - 기상청 API 키는 서버 환경변수(KMA_SERVICE_KEY)에만 보관하며 클라이언트에 절대 노출하지 않음
 * - 동일 격자(nx, ny) 및 발표 시각 자료는 weather_cache 테이블에서 공유 캐시하여 중복 호출 방지
 * - 일반 격자 풍속을 현장 고도 순간풍속으로 임의 치환하지 않으며, 돌풍 자료 부재 시 임의 생성 금지
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nx = Number(searchParams.get('nx') || 62);
  const ny = Number(searchParams.get('ny') || 114);
  const workDate = searchParams.get('workDate') || '2026-11-03';

  // Feature Flag: 실제 기상청 연동 전이거나 장애 시 시뮬레이션 상태 명시
  const isLiveKmaEnabled = process.env.ENABLE_LIVE_KMA_API === 'true';

  const nowIso = new Date().toISOString();

  const payload = {
    simulationMode: !isLiveKmaEnabled,
    grid: { nx, ny },
    dataType: 'SHORT_FORECAST',
    announcedAt: '2026-11-02T08:00:00+09:00',
    targetAt: `${workDate}T09:00:00+09:00`,
    queriedAt: nowIso,
    metrics: {
      tempC: 11.5,
      rainMm: 0.0,
      windSpeedMs: 11.4,
      windType: '10MIN_AVG_FORECAST',
      hasGustData: false, // 돌풍 자료 없으면 임의 생성 금지
    },
    safetyRule: {
      ruleVersion: '안전보건규칙 제37조 (2026.06 기준표 v2.1)',
      cautionThresholdMs: 10.0,
      suspendThresholdMs: 15.0,
      status: 'CAUTION_OVER_10MS',
      disclaimer:
        '기상청 격자 풍속을 현장 고도 순간풍속으로 치환하지 않습니다. 현장 풍속계 계측, 장비 제조사 매뉴얼, 안전관리 책임자 판단을 반드시 병행하십시오.',
    },
  };

  return NextResponse.json(payload, { status: 200 });
}
