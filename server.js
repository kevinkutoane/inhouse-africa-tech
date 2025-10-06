// server.js
import express from 'express';
import fetch from 'node-fetch'; // or native fetch in Node 18+
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import { createClient as createRedisClient } from 'redis';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Static hosting so frontend and API share origin
app.use(express.static(process.cwd()));

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
  redisClient.connect().then(() => {
    console.log('Connected to Redis for demo limiter');
    // Clear all demo limits for testing
    redisClient.flushDb().then(() => console.log('Cleared Redis demo limits')).catch(err => console.error('Redis flush failed:', err));
  }).catch(err => console.error('Redis connect failed:', err));
}

// In-memory fallback - cleared for testing
const ipDemoMap = new Map();
ipDemoMap.clear(); // Clear any existing limits

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

// Provide a lightweight OPTIONS handler so the browser can probe demo headers without affecting usage
app.options('/api/gemini', (req, res) => {
  res.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  return res.sendStatus(200);
});

app.post('/api/gemini', demoLimitMiddleware, async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'unknown';
    const { prompt } = req.body || {};
    console.log(`[gemini] incoming request from ${ip} - prompt (first 120 chars):`, String(prompt || '').slice(0, 120));

    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('[gemini] GEMINI_API_KEY not found in environment');
      return res.status(500).json({ text: "API key not configured" });
    }

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      console.error('[gemini] Invalid prompt:', prompt);
      return res.status(400).json({ text: "Invalid prompt provided" });
    }

    const geminiUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    console.log('[gemini] Using URL:', geminiUrl);
    console.log('[gemini] API Key present:', !!process.env.GEMINI_API_KEY);
    
    const requestBody = {
      contents: [{
        parts: [{ text: prompt.trim() }]
      }]
    };
    console.log('[gemini] Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${geminiUrl}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    console.log('[gemini] external API raw response status:', response.status);
    console.log('[gemini] external API raw response body:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.error('[gemini] API Error:', response.status, data);
      return res.status(500).json({ text: `AI service error: ${data.error?.message || 'Unknown error'}` });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response available";
    res.json({ text });
  } catch (err) {
    console.error('[gemini] handler error:', err);
    res.status(500).json({ text: "Unable to reach AI service. Please try again." });
  }
});

// ------------------ Lead Capture Endpoint ------------------
// Simple file-based storage (upgrade later to DB / CRM)
const leadsFile = path.join(process.cwd(), 'leads.json');

function readLeads() {
  try {
    if (!fs.existsSync(leadsFile)) return [];
    const raw = fs.readFileSync(leadsFile, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    console.error('Failed reading leads:', e);
    return [];
  }
}

function writeLeads(leads) {
  try {
    fs.writeFileSync(leadsFile, JSON.stringify(leads, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed writing leads:', e);
  }
}

// Basic in-memory anti-spam (same email cooldown)
const recentEmails = new Map(); // email -> timestamp
const EMAIL_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

app.post('/api/lead', (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  const {
    name = '',
    email = '',
    phone = '',
    company = '',
    projectType = '',
    budget = '',
    timeline = '',
    details = '',
    _hp = '' // honeypot
  } = req.body || {};

  // Honeypot trap
  if (_hp) {
    console.warn('[lead] honeypot triggered', { ip, email });
    return res.status(400).json({ ok: false, error: 'Spam detected' });
  }

  // Basic validation
  if (!name.trim() || !email.trim() || !projectType.trim() || !details.trim()) {
    console.warn('[lead] missing required', { ip, name, email, projectType, detailsLength: details.length });
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.warn('[lead] invalid email format', { ip, email });
    return res.status(400).json({ ok: false, error: 'Invalid email' });
  }
  if (details.length < 15) {
    console.warn('[lead] details too short', { ip, email, detailsLength: details.length });
    return res.status(400).json({ ok: false, error: 'Please provide more project detail (min 15 chars)' });
  }

  const now = Date.now();
  const last = recentEmails.get(email) || 0;
  if (now - last < EMAIL_COOLDOWN_MS) {
    console.warn('[lead] cooldown hit', { ip, email, msRemaining: EMAIL_COOLDOWN_MS - (now - last) });
    return res.status(429).json({ ok: false, error: 'Please wait before submitting again' });
  }
  recentEmails.set(email, now);

  const leads = readLeads();
  const lead = {
    id: `${now}-${Math.random().toString(36).slice(2,8)}`,
    ts: new Date().toISOString(),
    ip,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    company: company.trim(),
    projectType: projectType.trim(),
    budget: budget.trim(),
    timeline: timeline.trim(),
    details: details.trim(),
    userAgent: req.headers['user-agent'] || ''
  };
  leads.push(lead);
  writeLeads(leads);
  console.log('[lead] stored', { id: lead.id, email: lead.email, projectType: lead.projectType });

  // Fire and forget email notification if SMTP configured
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, LEAD_NOTIFY_TO, LEAD_NOTIFY_FROM } = process.env;
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && (LEAD_NOTIFY_TO || LEAD_NOTIFY_FROM)) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10) || 587,
        secure: Number(SMTP_PORT) === 465, // true for 465, false otherwise
        auth: { user: SMTP_USER, pass: SMTP_PASS }
      });
      const fromAddr = LEAD_NOTIFY_FROM || SMTP_USER;
      const toAddr = LEAD_NOTIFY_TO || SMTP_USER;
      const subject = `New Lead: ${lead.name} (${lead.projectType || 'Project'})`;
      const textBody = `New lead captured\n\n` +
        `Name: ${lead.name}\n` +
        `Email: ${lead.email}\n` +
        `Phone: ${lead.phone}\n` +
        `Company: ${lead.company}\n` +
        `Project Type: ${lead.projectType}\n` +
        `Budget: ${lead.budget}\n` +
        `Timeline: ${lead.timeline}\n` +
        `Details: ${lead.details}\n` +
        `IP: ${lead.ip}\n` +
        `User-Agent: ${lead.userAgent}\n` +
        `Captured: ${lead.ts}`;
      const htmlBody = `<h2>New Lead Captured</h2><ul>` +
        `<li><strong>Name:</strong> ${lead.name}</li>` +
        `<li><strong>Email:</strong> ${lead.email}</li>` +
        `<li><strong>Phone:</strong> ${lead.phone || ''}</li>` +
        `<li><strong>Company:</strong> ${lead.company || ''}</li>` +
        `<li><strong>Project Type:</strong> ${lead.projectType}</li>` +
        `<li><strong>Budget:</strong> ${lead.budget || ''}</li>` +
        `<li><strong>Timeline:</strong> ${lead.timeline || ''}</li>` +
        `<li><strong>Details:</strong><br/><pre style="white-space:pre-wrap;font-family:inherit">${lead.details}</pre></li>` +
        `<li><strong>IP:</strong> ${lead.ip}</li>` +
        `<li><strong>User-Agent:</strong> ${lead.userAgent}</li>` +
        `<li><strong>Captured:</strong> ${lead.ts}</li>` +
        `</ul>`;
      transporter.sendMail({ from: fromAddr, to: toAddr, subject, text: textBody, html: htmlBody })
        .then(info => console.log('Lead notification email sent:', info.messageId))
        .catch(err => console.error('Lead notification email failed:', err));
    } catch (e) {
      console.error('Email notification setup error:', e);
    }
  }

  res.json({ ok: true, leadId: lead.id });
});

// Get leads endpoint (for admin access)
app.get('/api/leads', (req, res) => {
  const leads = readLeads();
  res.json({ 
    count: leads.length,
    leads: leads.sort((a, b) => new Date(b.ts) - new Date(a.ts)) // newest first
  });
});

// Health check and browser root route
app.get("/", (req, res) => {
  res.send("🚀 Backend is running! Use POST /api/gemini");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
