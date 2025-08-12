// api/get-server-ip.js
export default function handler(req, res) {
  // Vercel에서 실제 서버 IP 확인
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress ||
             req.socket.remoteAddress ||
             '알 수 없음';
  
  console.log('Vercel Server IP:', ip);
  console.log('모든 헤더:', req.headers);
  
  res.json({ 
    serverIP: ip,
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
}
