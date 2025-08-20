// server.js
import express from 'express';
import fetch from 'node-fetch'; // or native fetch in Node 18+
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/gemini', async (req, res) => {
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
