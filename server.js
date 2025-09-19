// server.js
import express from 'express';
import fetch from 'node-fetch'; // or native fetch in Node 18+
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import { createClient as createRedisClient } from 'redis';

const app = express();
app.use(cors());
app.use(express.json());

// Demo limiter config
const DEMO_MAX = parseInt(process.env.DEMO_MAX || '5', 10);
const DEMO_WINDOW_HOURS = parseFloat(process.env.DEMO_WINDOW_HOURS || '24');
const demoWindowMs = DEMO_WINDOW_HOURS * 3600 * 1000;

// Optional Redis-backed limiter if REDIS_URL is provided
let redisClient = null;
const REDIS_URL = process.env.REDIS_URL;
if (REDIS_URL) {
  redisClient = createRedisClient({ url: REDIS_URL });
  redisClient.on('error', err => console.error('Redis error:', err));
  redisClient.connect().then(() => console.log('Connected to Redis for demo limiter')).catch(err => console.error('Redis connect failed:', err));
}

// In-memory fallback
const ipDemoMap = new Map();

function cleanupExpired() {
  const now = Date.now();
  for (const [ip, entry] of ipDemoMap.entries()) {
    if (now - entry.firstSeen > demoWindowMs) ipDemoMap.delete(ip);
  }
}
setInterval(cleanupExpired, Math.min(60_000, demoWindowMs));

async function demoLimitMiddleware(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();

  if (redisClient) {
    // Redis key per IP with TTL equal to window
    const key = `demo:${ip}`;
    try {
      const tx = redisClient.multi();
      tx.incr(key);
      tx.pttl(key);
      const [count, pttl] = await tx.exec();
      let current = parseInt(count, 10);
      let ttlMs = parseInt(pttl, 10);
      if (ttlMs === -1 || ttlMs === -2) {
        // set expiry
        await redisClient.pexpire(key, demoWindowMs);
        ttlMs = demoWindowMs;
      }
      if (current > DEMO_MAX) {
        const retryAfterSec = Math.ceil(ttlMs / 1000);
        res.set('X-Demo-Limit', DEMO_MAX.toString());
        res.set('X-Demo-Remaining', '0');
        res.set('X-Demo-Reset-Seconds', retryAfterSec.toString());
        return res.status(429).json({ text: `Demo limit reached. Try again in ${Math.ceil(retryAfterSec/60)} minutes or contact us for full access.` });
      }
      res.set('X-Demo-Limit', DEMO_MAX.toString());
      res.set('X-Demo-Remaining', Math.max(0, DEMO_MAX - current).toString());
      res.set('X-Demo-Reset-Seconds', Math.ceil(ttlMs / 1000).toString());
      return next();
    } catch (err) {
      console.error('Redis limiter error, falling back to memory:', err);
      // fall through to memory
    }
  }

  // In-memory fallback
  const entry = ipDemoMap.get(ip) || { count: 0, firstSeen: now };
  if (!entry.firstSeen) entry.firstSeen = now;
  if (now - entry.firstSeen > demoWindowMs) { entry.count = 0; entry.firstSeen = now; }

  if (entry.count >= DEMO_MAX) {
    const retryAfterSec = Math.ceil((entry.firstSeen + demoWindowMs - now) / 1000);
    res.set('X-Demo-Limit', DEMO_MAX.toString());
    res.set('X-Demo-Remaining', '0');
    res.set('X-Demo-Reset-Seconds', retryAfterSec.toString());
    return res.status(429).json({ text: `Demo limit reached. Try again in ${Math.ceil(retryAfterSec/60)} minutes or contact us for full access.` });
  }

  entry.count += 1;
  ipDemoMap.set(ip, entry);
  res.set('X-Demo-Limit', DEMO_MAX.toString());
  res.set('X-Demo-Remaining', Math.max(0, DEMO_MAX - entry.count).toString());
  res.set('X-Demo-Reset-Seconds', Math.ceil((entry.firstSeen + demoWindowMs - now) / 1000).toString());
  next();
}

app.post('/api/gemini', demoLimitMiddleware, async (req, res) => {
  try {
    const { prompt } = req.body;

    const geminiUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    const response = await fetch(`${geminiUrl}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = await response.json();
    console.log('Gemini API raw response:', JSON.stringify(data, null, 2));
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ text: "Error generating response" });
  }
});

// Health check and browser root route
app.get("/", (req, res) => {
  res.send("🚀 Backend is running! Use POST /api/gemini");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
