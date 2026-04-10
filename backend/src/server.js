const path = require('path');
const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = process.env.PORT || 3001;
const QURAN_CLIENT_ID = process.env.QURAN_CLIENT_ID || process.env.QURAN_PRELIVE_CLIENT_ID;
const QURAN_CLIENT_SECRET = process.env.QURAN_CLIENT_SECRET || process.env.QURAN_PRELIVE_CLIENT_SECRET;
const QURAN_AUTH_URL = (process.env.QURAN_AUTH_URL || process.env.QURAN_PRELIVE_AUTH_URL || '').replace(/\/$/, '');
const QURAN_API_URL = (process.env.QURAN_API_URL || process.env.QURAN_PRELIVE_API_URL || '').replace(/\/$/, '');
const QURAN_PUBLIC_API_URL = (process.env.QURAN_PUBLIC_API_URL || 'https://api.quran.com').replace(/\/$/, '');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isGeminiBusyError(error) {
  const status = Number(error?.status || error?.response?.status || 0);
  const statusText = String(error?.statusText || error?.response?.statusText || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  return (
    status === 503 ||
    statusText.includes('service unavailable') ||
    message.includes('[503') ||
    message.includes('service unavailable') ||
    message.includes('model is overloaded')
  );
}

async function callGeminiWithRetry(model, prompt, generationConfig = {}, retries = 2) {
  let lastError = null;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });
      return result.response.text();
    } catch (error) {
      lastError = error;
      if (!isGeminiBusyError(error) || attempt === retries - 1) {
        throw error;
      }
      await sleep(1000);
    }
  }

  throw lastError || new Error('Gemini request failed');
}

async function generateWithGemini(prompt, generationConfig = {}) {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL }, { apiVersion: 'v1' });
  return callGeminiWithRetry(model, prompt, generationConfig, 2);
}

function buildFallbackReflectionQuestion(verseKey, translation) {
  const cleanedTranslation = String(translation || '').replace(/\s+/g, ' ').trim();
  const preview = cleanedTranslation.length > 120 ? `${cleanedTranslation.slice(0, 117)}...` : cleanedTranslation;

  if (preview) {
    return `In ${verseKey}, what part of "${preview}" feels most personal to what you are carrying today? How might you respond to that gently in one small action?`;
  }

  return `What does verse ${verseKey} stir in your heart right now? What is one small, sincere response you can make today?`;
}

if (!QURAN_CLIENT_ID || !QURAN_CLIENT_SECRET || !QURAN_AUTH_URL || !QURAN_API_URL) {
  throw new Error(
    'Missing required env vars. Set QURAN_CLIENT_ID, QURAN_CLIENT_SECRET, QURAN_AUTH_URL, and QURAN_API_URL in .env'
  );
}

const tokenEndpoint = `${QURAN_AUTH_URL}/oauth2/token`;
const proxyBaseUrl = `${QURAN_API_URL}/content/api/v4`;
const publicProxyBaseUrl = `${QURAN_PUBLIC_API_URL}/api/v4`;

const tokenCache = {
  accessToken: null,
  expiresAt: 0,
  pendingFetch: null,
  refreshTimer: null,
};

function scheduleRefresh(expiresInSeconds) {
  if (tokenCache.refreshTimer) {
    clearTimeout(tokenCache.refreshTimer);
  }

  const refreshInMs = Math.max((expiresInSeconds - 300) * 1000, 5000);
  tokenCache.refreshTimer = setTimeout(async () => {
    try {
      await getAccessToken({ forceRefresh: true });
    } catch (error) {
      console.error('[token] Scheduled refresh failed:', error.message);
    }
  }, refreshInMs);
}

function clearCachedToken() {
  tokenCache.accessToken = null;
  tokenCache.expiresAt = 0;
}

async function fetchNewAccessToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'content',
  });

  const response = await axios.post(tokenEndpoint, body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    auth: {
      username: QURAN_CLIENT_ID,
      password: QURAN_CLIENT_SECRET,
    },
    timeout: 15000,
  });

  const accessToken = response.data?.access_token;
  const expiresIn = Number(response.data?.expires_in || 3600);

  if (!accessToken) {
    throw new Error('Token endpoint response did not include access_token');
  }

  tokenCache.accessToken = accessToken;
  tokenCache.expiresAt = Date.now() + expiresIn * 1000;
  scheduleRefresh(expiresIn);

  console.log(`[token] Access token fetched. Expires in ${expiresIn} seconds.`);

  return accessToken;
}

async function getAccessToken({ forceRefresh = false } = {}) {
  const tokenStillValid = tokenCache.accessToken && Date.now() < tokenCache.expiresAt - 1000;

  if (!forceRefresh && tokenStillValid) {
    return tokenCache.accessToken;
  }

  if (tokenCache.pendingFetch) {
    return tokenCache.pendingFetch;
  }

  tokenCache.pendingFetch = fetchNewAccessToken().finally(() => {
    tokenCache.pendingFetch = null;
  });

  return tokenCache.pendingFetch;
}

async function forwardToQuranApi(upstreamPath, query, token) {
  const url = `${proxyBaseUrl}/${upstreamPath}`;

  return axios.get(url, {
    params: query,
    headers: {
      'x-auth-token': token,
      'x-client-id': QURAN_CLIENT_ID,
    },
    timeout: 20000,
    validateStatus: () => true,
  });
}

function supportsPublicFallback(upstreamPath) {
  return (
    upstreamPath === 'chapters' ||
    upstreamPath === 'search' ||
    upstreamPath.startsWith('verses/by_chapter/') ||
    upstreamPath.startsWith('recitations/')
  );
}

function normalizeArabicText(text) {
  return String(text || '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/[^\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeArabicText(text) {
  return normalizeArabicText(text)
    .split(' ')
    .map((word) => word.trim())
    .filter(Boolean);
}

function extractSearchResults(payload) {
  const directResults = payload?.search?.results;
  if (Array.isArray(directResults)) {
    return directResults;
  }

  const fallbackResults = payload?.results;
  if (Array.isArray(fallbackResults)) {
    return fallbackResults;
  }

  return [];
}

function getVerseTextFromResult(result) {
  return String(
    result?.text_uthmani ||
      result?.text_uthmani_simple ||
      result?.text ||
      result?.verse_text ||
      ''
  ).trim();
}

function computeWordMatchScore(transcribedWords, verseWords) {
  if (!verseWords.length) {
    return { matchedWords: 0, totalWords: 0, ratio: 0 };
  }

  let matchedWords = 0;
  for (let i = 0; i < Math.min(transcribedWords.length, verseWords.length); i += 1) {
    if (transcribedWords[i] === verseWords[i]) {
      matchedWords += 1;
    }
  }

  return {
    matchedWords,
    totalWords: verseWords.length,
    ratio: matchedWords / verseWords.length,
  };
}

async function forwardToPublicQuranApi(upstreamPath, query) {
  const url = `${publicProxyBaseUrl}/${upstreamPath}`;

  return axios.get(url, {
    params: query,
    timeout: 20000,
    validateStatus: () => true,
  });
}

const app = express();
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/ai/reflect', (_req, res) => {
  return res.status(405).json({
    message: 'Method not allowed. Use POST /api/ai/reflect with JSON body: { verseKey, verseText, translation }',
  });
});

app.post('/api/ai/reflect', async (req, res) => {
  const verseKey = String(req.body?.verseKey || '').trim();
  const verseText = String(req.body?.verseText || '').trim();
  const translation = String(req.body?.translation || '').trim();

  if (!verseKey || !verseText || !translation) {
    return res.status(400).json({ message: 'Missing required fields: verseKey, verseText, translation' });
  }

  const prompt = `You are a gentle, warm Quran companion. When given a verse, generate exactly one short personal reflection question (2 sentences max) that helps the reader connect the verse to their own life. Never be preachy. Never quote other verses. Never give a lecture. Just one human, warm, personal question. Verse ${verseKey}: ${verseText} — Translation: ${translation}`;

  try {
    console.log('Calling Gemini with prompt:', prompt);
    const rawQuestion = await generateWithGemini(prompt);
    const cleaned = String(rawQuestion || '').replace(/\s+/g, ' ').trim();
    const sentenceParts = cleaned.match(/[^.!?]+[.!?]?/g) || [cleaned];
    const question = sentenceParts.slice(0, 2).join(' ').trim() || 'How does this verse speak to your life today?';

    return res.status(200).json({ question });
  } catch (err) {
    console.error('Gemini error full:', JSON.stringify(err, null, 2));
    if (isGeminiBusyError(err)) {
      return res.status(503).json({ message: 'The AI is temporarily busy. Please try again in a moment.' });
    }
    return res.status(500).json({ error: err.message || 'AI request failed' });
  }
});

app.get('/api/ai/companion', (_req, res) => {
  return res.status(405).json({
    message: 'Method not allowed. Use POST /api/ai/companion with JSON body: { messages, currentVerse, currentSurah }',
  });
});

app.post('/api/ai/match-verse', async (req, res) => {
  const { transcribedText } = req.body || {};
  console.log('match-verse received:', transcribedText);

  if (!String(transcribedText || '').trim()) {
    return res.status(400).json({ error: 'Missing required field: transcribedText' });
  }

  try {
    const token = await getAccessToken();
    const apiBase = proxyBaseUrl;
    const cleanText = String(transcribedText || '').replace(/[\u200F\u200E\u202A-\u202E]/g, '').trim();
    const normalized = normalizeArabicText(cleanText);
    const words = normalized.split(' ').filter(Boolean);
    const queryCandidates = Array.from(
      new Set([
        cleanText,
        normalized,
        words.slice(0, 8).join(' '),
        words.slice(0, 6).join(' '),
        words.slice(0, 4).join(' '),
        words.slice(0, 2).join(' '),
      ].filter(Boolean))
    );

    let results = [];
    for (const candidate of queryCandidates) {
      const url = `${apiBase}/search?q=${encodeURIComponent(candidate)}&language=ar&size=8`;
      console.log('Searching:', url);

      let searchRes = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-auth-token': token,
          'x-client-id': QURAN_CLIENT_ID,
        },
      });

      console.log('Search status:', searchRes.status);
      let searchData = {};
      try {
        searchData = await searchRes.json();
      } catch {
        searchData = {};
      }
      console.log('Search result:', JSON.stringify(searchData, null, 2));

      if (searchRes.status >= 400) {
        const fallback = await forwardToPublicQuranApi('search', {
          q: candidate,
          language: 'ar',
          size: 8,
          page: 1,
        });
        console.log('Fallback search status:', fallback.status);
        console.log('Fallback search result:', JSON.stringify(fallback.data || {}, null, 2));
        if (fallback.status < 400) {
          searchData = fallback.data || {};
          searchRes = { status: fallback.status };
        }
      }

      const candidateResults = extractSearchResults(searchData);
      if (candidateResults.length > 0) {
        results = candidateResults;
        break;
      }
    }

    if (!results.length) {
      return res.status(200).json({
        noMatch: true,
        message: 'No matching verse found',
      });
    }

    const top = results[0];
    const verseKey = String(top?.verse_key || top?.verseKey || '').trim();
    const verseText = getVerseTextFromResult(top);
    const transcribedWords = tokenizeArabicText(cleanText);
    const verseWords = tokenizeArabicText(verseText);
    const score = computeWordMatchScore(transcribedWords, verseWords);

    return res.json({
      verseKey,
      verseText,
      surahName: String(top?.chapter_name || top?.surah_name || verseKey.split(':')[0] || '').trim(),
      verseNumber: Number.parseInt(String(top?.verse_number || verseKey.split(':')[1] || '0'), 10) || 0,
      chapterId: Number.parseInt(String(top?.chapter_id || verseKey.split(':')[0] || '0'), 10) || 0,
      matchedWords: score.matchedWords,
      totalWords: score.totalWords,
      matchedText: cleanText,
    });
  } catch (err) {
    console.error('match-verse full error:', err.message, err.stack);
    return res.status(500).json({ error: err.message || 'Failed to match verse' });
  }
});

app.post('/api/ai/companion', async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const currentVerse = String(req.body?.currentVerse || '').trim();
  const currentSurah = String(req.body?.currentSurah || '').trim();
  const journalEntriesForCurrentSurah = String(req.body?.journalEntriesForCurrentSurah || '').trim();

  if (!messages.length) {
    return res.status(400).json({ message: 'Missing required field: messages' });
  }

  const normalizedMessages = messages
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      role: String(entry.role || '').trim().toLowerCase(),
      content: String(entry.content || '').trim(),
    }))
    .filter((entry) => (entry.role === 'user' || entry.role === 'assistant') && entry.content);

  if (!normalizedMessages.length) {
    return res.status(400).json({ message: 'messages must contain role/content entries' });
  }

  const recentMessages = normalizedMessages.slice(-6);
  const latestMessage = recentMessages[recentMessages.length - 1];
  if (!latestMessage || latestMessage.role !== 'user') {
    return res.status(400).json({ message: 'The latest message must be from the user' });
  }

  const historyWithoutLatest = recentMessages.slice(0, -1);
  const formattedHistory = historyWithoutLatest
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const journalContext = journalEntriesForCurrentSurah
    ? `\nThe user has written these personal reflections: ${journalEntriesForCurrentSurah}\n`
    : '';

  const fullPrompt = `You are a knowledgeable, warm Quran companion. The user is currently reading ${currentSurah || 'this surah'}, verse ${currentVerse || 'this verse'}. Answer questions about the Quran conversationally, humbly, and concisely. Never make up hadith or verses. Keep responses under 150 words.
${journalContext}

Conversation history:
${formattedHistory}

User: ${latestMessage.content}
Assistant:`;

  try {
    console.log('Calling Gemini with prompt:', fullPrompt);
    const rawReply = await generateWithGemini(fullPrompt, { maxOutputTokens: 800, temperature: 0.7 });
    const reply = String(rawReply || '').replace(/\s+/g, ' ').trim();
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Gemini error full:', JSON.stringify(err, null, 2));
    if (isGeminiBusyError(err)) {
      return res.status(503).json({ message: 'The AI is temporarily busy. Please try again in a moment.' });
    }
    return res.status(500).json({ error: err.message || 'AI request failed' });
  }
});

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/api/quran/*', async (req, res) => {
  const upstreamPath = req.params[0];

  if (!upstreamPath) {
    return res.status(400).json({ message: 'Missing Quran API path' });
  }

  try {
    const token = await getAccessToken();
    let upstreamResponse = await forwardToQuranApi(upstreamPath, req.query, token);

    if (upstreamResponse.status === 401) {
      clearCachedToken();
      const refreshedToken = await getAccessToken({ forceRefresh: true });
      upstreamResponse = await forwardToQuranApi(upstreamPath, req.query, refreshedToken);
    }

    if (upstreamResponse.status === 404 && supportsPublicFallback(upstreamPath)) {
      const fallbackResponse = await forwardToPublicQuranApi(upstreamPath, req.query);
      if (fallbackResponse.status < 500) {
        upstreamResponse = fallbackResponse;
      }
    }

    if (upstreamResponse.headers['content-type']) {
      res.setHeader('content-type', upstreamResponse.headers['content-type']);
    }

    return res.status(upstreamResponse.status).send(upstreamResponse.data);
  } catch (error) {
    const status = error.response?.status || 502;
    const payload = error.response?.data || { message: 'Failed to proxy request to Quran API' };

    return res.status(status).json(payload);
  }
});

(async function startServer() {
  try {
    await getAccessToken();
    app.listen(PORT, () => {
      console.log(`Backend server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[startup] Failed to fetch initial access token:', error.message);
    process.exit(1);
  }
})();
