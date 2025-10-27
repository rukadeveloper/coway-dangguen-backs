// server.js
const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const cors = require("cors"); // 추가
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json()); // JSON 바디 파싱
app.use(cors()); // 모든 도메인 허용

// HMAC-SHA256 시그니처 생성
function generateSignature(apiSecret, dateTime, salt) {
  const data = dateTime + salt;
  return crypto.createHmac("sha256", apiSecret).update(data).digest("hex");
}

// Authorization 헤더 생성
function createAuthHeader(apiKey, apiSecret) {
  const dateTime = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = generateSignature(apiSecret, dateTime, salt);

  return `HMAC-SHA256 apiKey=${apiKey}, date=${dateTime}, salt=${salt}, signature=${signature}`;
}

// SMS 전송 라우트
app.post("/send-sms", async (req, res) => {
  const { to, message } = req.body;
  const apiKey = process.env.SOLAPI_API_KEY; // 환경변수에 저장
  const apiSecret = process.env.SOLAPI_SECRET_KEY; // 환경변수에 저장
  const from = process.env.SOLAPI_FROM_NUMBER; // 승인된 발신번호

  const body = {
    messages: [
      {
        to,
        from,
        text: message,
        type: "LMS", // "SMS"나 "MMS"도 가능
      },
    ],
  };

  console.log(apiKey, apiSecret, from);

  if (!to || !message) {
    return res.status(400).json({ error: "to와 message는 필수입니다." });
  }

  const url = "https://api.solapi.com/messages/v4/send-many/detail"; // 실제 SMS API URL
  const headers = {
    "Content-Type": "application/json",
    Authorization: createAuthHeader(apiKey, apiSecret),
  };

  try {
    const response = await axios.post(url, body, { headers });
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.status(500).json({
      success: false,
      error: error.response ? error.response.data : error.message,
    });
  }
});

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`SMS API 서버 실행 중: http://localhost:${PORT}`)
);
