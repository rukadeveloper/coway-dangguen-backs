// /api/send-sms.js
const crypto = require("crypto");
const axios = require("axios");

export default async function handler(req, res) {
  // ✅ CORS 설정
  res.setHeader("Access-Control-Allow-Origin", "*"); // 필요 시 도메인 제한 가능: "https://example.com"
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // ✅ OPTIONS 사전 요청 (CORS preflight) 처리
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { to, message } = req.body;
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_SECRET_KEY;
  const from = process.env.SOLAPI_FROM_NUMBER;

  if (!to || !message) {
    return res.status(400).json({ error: "to와 message는 필수입니다." });
  }

  // ✅ 환경 변수 유효성 검사
  if (!apiKey || !apiSecret || !from) {
    console.error("Missing environment variables");
    return res
      .status(500)
      .json({ error: "서버 환경 변수(SOLAPI_API_KEY 등)가 누락되었습니다." });
  }

  function generateSignature(apiSecret, dateTime, salt) {
    const data = dateTime + salt;
    return crypto.createHmac("sha256", apiSecret).update(data).digest("hex");
  }

  function createAuthHeader(apiKey, apiSecret) {
    const dateTime = new Date().toISOString();
    const salt = crypto.randomBytes(16).toString("hex");
    const signature = generateSignature(apiSecret, dateTime, salt);
    return `HMAC-SHA256 apiKey=${apiKey}, date=${dateTime}, salt=${salt}, signature=${signature}`;
  }

  const url = "https://api.solapi.com/messages/v4/send-many/detail";
  const headers = {
    "Content-Type": "application/json",
    Authorization: createAuthHeader(apiKey, apiSecret),
  };

  const body = {
    messages: [
      {
        to,
        from,
        text: message,
        type: "LMS",
      },
    ],
  };

  try {
    const response = await axios.post(url, body, { headers });
    return res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error(
      "SOLAPI Error:",
      error.response ? error.response.data : error.message
    );
    return res.status(500).json({
      success: false,
      error: error.response ? error.response.data : error.message,
    });
  }
}
