// src/utils/network.js
export const getClientIP = async () => {
  try {
    // 외부 API를 통해 IP 주소 가져오기
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error("IP 주소 가져오기 실패:", error);
    return null; // 실패시 null 반환
  }
};

// 추가로 다른 네트워크 관련 함수들도 함께 관리
export const getUserAgent = () => {
  return navigator.userAgent;
};

export const getTimestamp = () => {
  return new Date().toISOString();
};

// 로그 데이터 생성 헬퍼 함수
export const createLogData = async (
  userId,
  action,
  resourceType = null,
  resourceId = null,
  changes = null
) => {
  const clientIP = await getClientIP();

  return {
    user_id: userId,
    action: action,
    resource_type: resourceType,
    resource_id: resourceId,
    changes: changes,
    ip_address: clientIP,
    user_agent: getUserAgent(),
    created_at: getTimestamp(),
  };
};
