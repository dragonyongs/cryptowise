// api/upbit/ticker.js
import crypto from 'crypto';

export default async function handler(req, res) {
  // 환경변수에서 API 키 가져오기
  const accessKey = process.env.UPBIT_ACCESS_KEY;
  const secretKey = process.env.UPBIT_SECRET_KEY;
  
  if (!accessKey || !secretKey) {
    return res.status(500).json({ 
      error: 'API 키가 설정되지 않았습니다' 
    });
  }
  
  // 업비트 API 호출 로직
  // ...
}
