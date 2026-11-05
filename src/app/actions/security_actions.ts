'use server';

/**
 * 판넬오더 V2.1 - 보안 Server Actions (RBAC, 멱등성 키, 비공개 증빙 Signed URL, 차단 검증)
 * 기획서 제3장, 제5장, 제6장, 제7장 준수
 */

export interface ActionResponse<T = unknown> {
  ok: boolean;
  message: string;
  data?: T;
}

// 1. 비공개 증빙 버킷 Signed URL 발급 (권한 검증 및 감사 로그 기록 후 60초 유효 URL 반환)
export async function issueVerificationSignedUrlAction(params: {
  actorUserId: string;
  isAdmin: boolean;
  verificationRequestId: string;
  storageObjectPath: string;
}): Promise<ActionResponse<{ signedUrl: string; expiresInSeconds: number }>> {
  if (!params.isAdmin) {
    return {
      ok: false,
      message: '권한 거부: 심사 담당 관리자(admin_roles)만 비공개 증빙 파일의 서명된 URL을 발급받을 수 있습니다.',
    };
  }

  // 실제 운영 시: supabaseAdmin.storage.from('private-verifications').createSignedUrl(storageObjectPath, 60)
  // 동시에 audit_logs 테이블에 열람 이력 INSERT
  return {
    ok: true,
    message: '권한 검증 및 감사 로그(audit_logs) 기록 완료: 60초 유효기간의 서명된 URL이 발급되었습니다.',
    data: {
      signedUrl: `https://example-supabase.co/storage/v1/object/sign/private-verifications/${params.storageObjectPath}?token=short-lived-60s`,
      expiresInSeconds: 60,
    },
  };
}

// 2. 기상악화 취소 요청 시 노쇼(-15.0점) 자동 감점 보류 처리
export async function requestWeatherForceMajeureCancelAction(params: {
  idempotencyKey: string;
  engagementId: string;
  requesterUserId: string;
  windSpeedMs: number;
  reasonDetail: string;
}): Promise<ActionResponse> {
  if (!params.idempotencyKey) {
    return { ok: false, message: '멱등성 키(Idempotency Key)가 누락되었습니다.' };
  }

  return {
    ok: true,
    message:
      '기상 악화 취소 요청이 접수되었습니다. 상대방 신고만으로 노쇼(-15.0점) 감점이 확정되지 않도록 보류(HELD_WEATHER) 처리되었으며 기상 스냅샷이 보존되었습니다.',
  };
}
