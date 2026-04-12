const path = require('path');
const os = require('os');
const crypto = require('crypto');
const fs = require('fs/promises');
const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const session = require('express-session');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const { stripDiacritics, unsealedWords } = require('./unsealedWords');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = process.env.PORT || 3000;
const QURAN_CLIENT_ID = process.env.QURAN_CLIENT_ID || process.env.QURAN_PRELIVE_CLIENT_ID;
const QURAN_CLIENT_SECRET = process.env.QURAN_CLIENT_SECRET || process.env.QURAN_PRELIVE_CLIENT_SECRET;
const QURAN_AUTH_URL = (process.env.QURAN_AUTH_URL || process.env.QURAN_PRELIVE_AUTH_URL || '').replace(/\/$/, '');
const QURAN_API_URL = (process.env.QURAN_API_URL || process.env.QURAN_PRELIVE_API_URL || '').replace(/\/$/, '');
const QURAN_PUBLIC_API_URL = (process.env.QURAN_PUBLIC_API_URL || 'https://api.quran.com').replace(/\/$/, '');
const OAUTH_BASE_URL = (process.env.QURAN_OAUTH_BASE_URL || 'https://oauth2.quran.foundation').replace(/\/$/, '');
const USER_API_BASE_URL = (process.env.QURAN_USER_API_BASE_URL || 'https://apis.quran.foundation').replace(/\/$/, '');
const OAUTH_REDIRECT_URI = process.env.QURAN_OAUTH_REDIRECT_URI || 'http://localhost:3000/callback';
const OAUTH_LOGOUT_URI = process.env.QURAN_OAUTH_LOGOUT_URI || 'http://localhost:3000/logout';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const OAUTH_SCOPES =
  process.env.QURAN_OAUTH_SCOPES ||
  'offline_access';
const SESSION_SECRET = process.env.SESSION_SECRET || 'tilawah-session-secret-2026';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GROQ_API_KEY = String(process.env.GROQ_API_KEY || '').trim();
const AZURE_SPEECH_KEY = String(process.env.AZURE_SPEECH_KEY || '').trim();
const AZURE_SPEECH_REGION = String(process.env.AZURE_SPEECH_REGION || '').trim();

ffmpeg.setFfmpegPath(ffmpegPath);

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;
const GROUPS_FILE_PATH = path.resolve(__dirname, '../data/groups.json');
const REFLECTIONS_FILE_PATH = path.resolve(__dirname, '../data/reflections.json');
const unsealedWordAnalysisCache = new Map();

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

async function ensureGroupsFile() {
  await fs.mkdir(path.dirname(GROUPS_FILE_PATH), { recursive: true });
  try {
    await fs.access(GROUPS_FILE_PATH);
  } catch {
    await fs.writeFile(GROUPS_FILE_PATH, '[]\n', 'utf8');
  }
}

async function ensureReflectionsFile() {
  await fs.mkdir(path.dirname(REFLECTIONS_FILE_PATH), { recursive: true });
  try {
    await fs.access(REFLECTIONS_FILE_PATH);
  } catch {
    await fs.writeFile(REFLECTIONS_FILE_PATH, '[]\n', 'utf8');
  }
}

async function readGroups() {
  await ensureGroupsFile();
  try {
    const raw = await fs.readFile(GROUPS_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeGroups(groups) {
  await ensureGroupsFile();
  await fs.writeFile(GROUPS_FILE_PATH, `${JSON.stringify(groups, null, 2)}\n`, 'utf8');
}

async function readReflections() {
  await ensureReflectionsFile();
  try {
    const raw = await fs.readFile(REFLECTIONS_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeReflections(reflections) {
  await ensureReflectionsFile();
  await fs.writeFile(REFLECTIONS_FILE_PATH, `${JSON.stringify(reflections, null, 2)}\n`, 'utf8');
}

function generateGroupCode(existingCodes) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const existing = new Set((existingCodes || []).map((item) => String(item || '').toUpperCase()));

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const nextCode = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    if (!existing.has(nextCode)) {
      return nextCode;
    }
  }

  throw new Error('Could not generate unique group code');
}

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

function isGeminiQuotaError(error) {
  const status = Number(error?.status || error?.response?.status || 0);
  const message = String(error?.message || '').toLowerCase();
  return (
    status === 429 ||
    message.includes('quota exceeded') ||
    message.includes('too many requests') ||
    message.includes('billing') ||
    message.includes('rate-limit')
  );
}

function isGroqRateLimitError(error) {
  const status = Number(error?.status || error?.response?.status || 0);
  const message = String(error?.message || '').toLowerCase();
  return status === 429 || message.includes('rate limit') || message.includes('too many requests');
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

async function generateWithGroq(prompt, { maxTokens = 900, temperature = 0.35 } = {}) {
  if (!groq) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: maxTokens,
    temperature,
    messages: [
      {
        role: 'system',
        content:
          'You are a Quran Arabic linguistics guide. Return strict JSON only. Do not include markdown, commentary, or code fences.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  return String(completion?.choices?.[0]?.message?.content || '').trim();
}

function buildFallbackReflectionQuestion(verseKey, translation) {
  const cleanedTranslation = String(translation || '').replace(/\s+/g, ' ').trim();
  const preview = cleanedTranslation.length > 120 ? `${cleanedTranslation.slice(0, 117)}...` : cleanedTranslation;

  if (preview) {
    return `In ${verseKey}, what part of "${preview}" feels most personal to what you are carrying today? How might you respond to that gently in one small action?`;
  }

  return `What does verse ${verseKey} stir in your heart right now? What is one small, sincere response you can make today?`;
}

function normalizeSurahName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isRevelationTimingQuestion(text) {
  const normalized = String(text || '').toLowerCase();
  return (
    /(when|what time|which period).*(surah|sura|chapter|this surah|it).*(revealed|sent|came|descend)/.test(normalized) ||
    /(surah|sura|chapter|this surah|it).*(revealed|sent|came|descend).*(when|to the prophet)/.test(normalized) ||
    /(makki|makkan|meccan|madani|medinan|asbab|occasion of revelation|nuzul|revelation context)/.test(normalized)
  );
}

function getRevelationTimingReply(currentSurah) {
  const surah = String(currentSurah || '').trim();
  const normalized = normalizeSurahName(surah);

  const known = [
    {
      aliases: ['alfatihah', 'fatiha', 'fatihah'],
      reply:
        'Most scholars classify Al-Fatihah as Makki (revealed in Makkah, early period). Some narrations mention Madani transmission, but the common view is Makki. Its role as the opening surah made it central in worship from the earliest phase.',
    },
    {
      aliases: ['albaqarah', 'baqarah'],
      reply:
        'Al-Baqarah is Madani, revealed after the Hijrah in Madinah across an extended period. It addresses building a Muslim community with law, worship, ethics, and social guidance.',
    },
    {
      aliases: ['aliimran', 'alimran', 'imran'],
      reply:
        'Ali Imran is generally classified as Madani. It came in the Madinah period and speaks to faith, steadfastness, and engagement with People of the Book in that community context.',
    },
  ];

  const match = known.find((entry) => entry.aliases.some((alias) => normalized.includes(alias)));
  if (match) {
    return match.reply;
  }

  return `Good question. I don't want to guess about revelation timing for ${surah || 'this surah'}. If you tell me the exact surah name, I can give you a concise Makki/Madani answer with brief context.`;
}

function buildDeterministicCompanionReply({ currentSurah, userMessage }) {
  const question = String(userMessage || '').trim().toLowerCase();
  const contextLabel = currentSurah || 'this surah';
  if (!question) {
    return '';
  }

  const compact = question.replace(/\s+/g, ' ').trim();
  const greetingPatterns = [/^hi\b/, /^hello\b/, /^hey\b/, /salaam|salam|as[-\s]*salamu/];
  if (greetingPatterns.some((pattern) => pattern.test(compact))) {
    return `Wa alaykum as-salam. I'm glad you're here. You're in ${contextLabel} right now, so if you want I can give a quick meaning, context, or one gentle action from the verse.`;
  }

  if (/how are you|how r u|how's it going/.test(compact)) {
    return `Alhamdulillah, I'm here with you. How are you feeling with ${contextLabel} so far — would you like meaning, context, or one practical takeaway for today?`;
  }

  if (/^thanks\b|^thank you\b|jazak|جزاك/.test(compact)) {
    return `You're most welcome. If you want, send me a short question from ${contextLabel} and I'll keep the answer simple and useful.`;
  }

  if (isRevelationTimingQuestion(question)) {
    return getRevelationTimingReply(currentSurah);
  }

  return '';
}

function buildFallbackCompanionReply({ currentSurah, currentVerse, userMessage, surahVerses = [] }) {
  const contextLabel = `${currentSurah || 'this surah'}${currentVerse ? ` (${currentVerse})` : ''}`;
  const question = String(userMessage || '').trim().toLowerCase();
  const compact = question.replace(/\s+/g, ' ').trim();

  function extractRequestedVerseNumber(inputText) {
    const patterns = [
      /verse\s*number\s*(\d+)/i,
      /verse\s*(\d+)/i,
      /ayah\s*number\s*(\d+)/i,
      /ayah\s*(\d+)/i,
      /ayat\s*number\s*(\d+)/i,
      /ayat\s*(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = String(inputText || '').match(pattern);
      const parsed = Number.parseInt(match?.[1] || '', 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return 0;
  }

  function pickByText(text, options) {
    if (!options.length) {
      return '';
    }
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    return options[hash % options.length];
  }

  const greetingPatterns = [/^hi\b/, /^hello\b/, /^hey\b/, /salaam|salam|as[-\s]*salamu/];
  if (greetingPatterns.some((pattern) => pattern.test(compact))) {
    return pickByText(compact, [
      `Wa alaykum as-salam. Beautiful to have you here. Since you're in ${contextLabel}, would you like a short meaning overview or a practical life reflection from this verse?`,
      `Wa alaykum as-salam. I'm with you in ${contextLabel}. Ask for tafsir context, key themes, or one action point from the verse and I'll keep it concise.`,
      `As-salamu alaykum. You're reading ${contextLabel}. If you want, I can summarize the verse in simple language and then give one gentle step to apply it today.`,
    ]);
  }

  if (compact.length <= 8) {
    return `I'm here with you in ${contextLabel}. Ask me about meaning, tafsir context, or how to apply this verse today, and I'll answer briefly.`;
  }

  if (question.includes('how are you')) {
    return `Alhamdulillah, I'm here and ready to help. You're in ${contextLabel} - ask for the meaning, context, or one practical action from the verse.`;
  }

  if (isRevelationTimingQuestion(compact)) {
    return getRevelationTimingReply(currentSurah);
  }

  const verseNumber = extractRequestedVerseNumber(compact);
  if (question.includes('context') && verseNumber) {
    if (Number.isFinite(verseNumber) && verseNumber > 0) {
      const surahLower = String(currentSurah || '').toLowerCase();
      if (surahLower.includes('fatihah') || surahLower.includes('fatiha')) {
        const fatihahContext = {
          1: 'Verse 1 opens with basmalah and frames the surah with Allah\'s mercy. Context: begin every major act with dependence on and remembrance of Allah.',
          2: 'Verse 2 anchors faith in praise and lordship: all praise belongs to Allah, Lord of all worlds. Context: it grounds worship in gratitude and recognition of His authority.',
          3: 'Verse 3 repeats mercy (Al-Rahman, Al-Raheem) to shape the believer\'s view of Allah with hope and trust, not despair.',
          4: 'Verse 4 (Master of the Day of Judgment) places accountability at the center. Context: after mercy comes responsibility, so faith is lived with sincerity, justice, and awareness of return to Allah.',
          5: 'Verse 5 is the covenant of worship and reliance: only You we worship and only You we ask for help. Context: it corrects intention and dependence.',
          6: 'Verse 6 asks for ongoing guidance, showing that guidance is a daily need, not a one-time event.',
          7: 'Verse 7 defines the straight path by contrast: seek the path of those favored by Allah and avoid paths of rebellion or misguidance.',
        };

        if (fatihahContext[verseNumber]) {
          return fatihahContext[verseNumber];
        }
      }

      const matchedVerse = Array.isArray(surahVerses)
        ? surahVerses.find((verse) => Number(verse?.verseNumber || 0) === verseNumber)
        : null;
      const matchedTranslation = String(matchedVerse?.translation || '').trim();

      if (matchedTranslation) {
        return `For verse ${verseNumber} in ${currentSurah || 'this surah'}, the immediate context is: "${matchedTranslation}". Read it in this flow: what it says about Allah, what it asks from you, and one concrete behavior to apply today.`;
      }

      return `For verse ${verseNumber} in ${currentSurah || 'this surah'}, read the context in three layers: the verse meaning itself, how it connects to the verses before/after it, and what action it asks from you today. If you want, I can break those three layers down briefly.`;
    }
  }

  if (question.includes('meaning') || question.includes('mean') || question.includes('tafsir') || question.includes('context')) {
    return `In ${contextLabel}, start by identifying what the verse says about Allah, guidance, or your relationship with Him. Then ask: what belief or behavior should change in me because of this verse today? That turns meaning into transformation.`;
  }

  if (question.includes('trust') || question.includes('tawakkul')) {
    return `This verse in ${contextLabel} reminds us that Allah's knowledge and care are complete, while ours are limited. Trust grows when we act responsibly, then place outcomes with Him. Choose one concrete step today, and pair it with a short dua.`;
  }

  if (question.includes('practical') || question.includes('apply') || question.includes('life')) {
    return `A practical way to apply ${contextLabel} is to pick one small, repeatable action linked to its meaning today. Keep it specific, sincere, and realistic for your current routine. Consistency matters more than intensity.`;
  }

  return `A helpful reflection from ${contextLabel}: identify one attribute of Allah or one guidance point in the verse, then ask how it changes your next decision today. Write one sentence and one action so the verse moves from reading into lived practice.`;
}

function buildFallbackActionChallenge(verses) {
  const firstKey = String(verses?.[0]?.verseKey || '1:1');
  const lastKey = String(verses?.[verses.length - 1]?.verseKey || firstKey);
  const combined = (verses || []).map((v) => String(v?.translation || '').trim()).join(' ').toLowerCase();

  let theme = 'Mindful obedience';
  let title = 'Practice mindful restraint';
  let body =
    'Choose one conversation today where you slow down before speaking and aim for truth and gentleness. Let these verses shape both your words and your tone in that moment.';

  if (combined.includes('mercy') || combined.includes('compassion')) {
    theme = 'Mercy in daily conduct';
    title = 'Give one intentional mercy';
    body =
      'Identify one person you usually rush with and respond today with visible patience and kindness. Let your mercy be concrete: a gentle reply, extra listening, or forgiving a small mistake.';
  } else if (combined.includes('prayer') || combined.includes('worship')) {
    theme = 'Consistency in worship';
    title = 'Protect one prayer today';
    body =
      'Choose one prayer and prepare for it 10 minutes early with calm focus. Remove one distraction so this prayer becomes deliberate rather than rushed.';
  } else if (combined.includes('tongue') || combined.includes('backbit') || combined.includes('speak')) {
    theme = 'Guarding speech';
    title = 'Guard your tongue today';
    body =
      'Before discussing anyone not present, pause and ask if your words are necessary and fair. If not, redirect the conversation toward something beneficial.';
  }

  const challenges = [{ title, body }];
  if ((combined.includes('mercy') || combined.includes('compassion')) && (combined.includes('prayer') || combined.includes('worship'))) {
    challenges.push({
      title: 'Protect one prayer today',
      body: 'Choose one prayer and prepare for it 10 minutes early with calm focus. Remove one distraction so this prayer becomes deliberate rather than rushed.',
    });
  }

  return {
    theme,
    challenges: challenges.slice(0, 2),
    verseRange: `${firstKey} - ${lastKey}`,
  };
}

function buildFallbackUnsealedWordAnalysis({ arabicWord, wordRoot, verseKey, verseText, translation }) {
  const cleanedWord = String(arabicWord || '').trim() || 'this word';
  const cleanedRoot = String(wordRoot || '').trim();
  const cleanedVerseKey = String(verseKey || '').trim() || 'this verse';
  const cleanedVerseText = String(verseText || '').replace(/\s+/g, ' ').trim();
  const cleanedTranslation = String(translation || '').replace(/\s+/g, ' ').trim();

  const opening = cleanedVerseText ? `In ${cleanedVerseKey}, this word appears in the phrase "${cleanedVerseText.slice(0, 120)}${cleanedVerseText.length > 120 ? '...' : ''}".` : `In ${cleanedVerseKey}, this word carries the line's emotional center.`;

  const rootLine = cleanedRoot
    ? `Its root (${cleanedRoot}) signals a stable semantic field that shapes how the listener feels the sentence.`
    : 'Its form and placement suggest emphasis, precision, and tone rather than a random synonym choice.';

  const translationLine = cleanedTranslation
    ? `Compared with the translation "${cleanedTranslation.slice(0, 110)}${cleanedTranslation.length > 110 ? '...' : ''}", this Arabic choice preserves a stronger rhetorical texture.`
    : 'Even in translation, this choice keeps a tighter rhythm and stronger rhetorical contrast.';

  return {
    totalOccurrences: 0,
    mostCommonSurah: 'Unknown',
    makkiOrMadani: 'Unknown',
    whyThisWord: `${opening} ${rootLine} ${translationLine}`,
    coreMeaning: cleanedRoot
      ? `The root ${cleanedRoot} carries a cluster of meanings that usually combine literal sense with emotional force. In this verse, the dominant shade points to clarity, immediacy, and moral direction in the flow of meaning.`
      : `This word belongs to a semantic family that layers literal meaning with emotional force. In this verse, the dominant shade supports clarity, immediacy, and moral direction in the flow of meaning.`,
    acrossQuran: [],
    whatChanges: `If this word were replaced with a flatter alternative, the verse would lose precision and emotional weight. Keeping ${cleanedWord} preserves the intended balance between meaning, rhythm, and spiritual impact in ${cleanedVerseKey}.`,
  };
}

function toBase64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createPkcePair() {
  const codeVerifier = toBase64Url(crypto.randomBytes(48));
  const codeChallenge = toBase64Url(crypto.createHash('sha256').update(codeVerifier).digest());
  const state = toBase64Url(crypto.randomBytes(24));
  return { codeVerifier, codeChallenge, state };
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function normalizeUserFromIdToken(idToken) {
  const payload = decodeJwtPayload(idToken) || {};
  const name = String(payload.name || payload.preferred_username || payload.nickname || '').trim();
  const email = String(payload.email || '').trim();

  if (!name && !email) {
    return null;
  }

  return {
    name: name || email,
    email,
    sub: String(payload.sub || '').trim(),
  };
}

async function exchangeOAuthToken(params) {
  const tokenParams = { ...params };
  delete tokenParams.client_id;
  delete tokenParams.client_secret;

  const tokenBody = new URLSearchParams(tokenParams);
  const credentials = Buffer.from(`${QURAN_CLIENT_ID}:${QURAN_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${OAUTH_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: tokenBody.toString(),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || 'OAuth token exchange failed');
  }

  if (!payload?.access_token) {
    throw new Error('OAuth response missing access_token');
  }

  return payload;
}

async function fetchUserProfile(accessToken) {
  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(`${USER_API_BASE_URL}/auth/v1/profile`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-auth-token': accessToken,
        'x-client-id': QURAN_CLIENT_ID,
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json().catch(() => ({}));
    const profile = payload?.profile || payload?.user || payload?.data || payload;
    const name = String(profile?.name || profile?.full_name || profile?.username || '').trim();
    const email = String(profile?.email || '').trim();
    const id = String(profile?.id || profile?.user_id || '').trim();

    if (!name && !email && !id) {
      return null;
    }

    return {
      name: name || email || 'User',
      email,
      sub: id,
    };
  } catch {
    return null;
  }
}

async function getUserSessionToken(req) {
  const auth = req.session?.auth;
  if (!auth?.accessToken) {
    return null;
  }

  if (Date.now() < Number(auth.expiresAt || 0) - 5000) {
    return auth.accessToken;
  }

  if (!auth.refreshToken) {
    return null;
  }

  const refreshed = await exchangeOAuthToken({
    grant_type: 'refresh_token',
    refresh_token: auth.refreshToken,
  });

  const expiresIn = Number(refreshed.expires_in || 3600);
  req.session.auth = {
    ...auth,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || auth.refreshToken,
    idToken: refreshed.id_token || auth.idToken,
    user: refreshed.id_token ? normalizeUserFromIdToken(refreshed.id_token) || auth.user : auth.user,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return req.session.auth.accessToken;
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

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      console.log('[token] Request', {
        attempt,
        url: tokenEndpoint,
        grant_type: 'client_credentials',
        scope: 'content',
        client_id: QURAN_CLIENT_ID,
        client_secret_masked: QURAN_CLIENT_SECRET ? `${QURAN_CLIENT_SECRET.slice(0, 4)}***` : '',
      });

      const response = await axios.post(tokenEndpoint, body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        auth: {
          username: QURAN_CLIENT_ID,
          password: QURAN_CLIENT_SECRET,
        },
        timeout: 30000,
      });

      console.log('[token] Response', {
        attempt,
        status: response.status,
        has_access_token: Boolean(response.data?.access_token),
        expires_in: Number(response.data?.expires_in || 0),
        scope: String(response.data?.scope || ''),
        token_type: String(response.data?.token_type || ''),
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
    } catch (error) {
      lastError = error;
      const message = String(error?.message || 'Unknown token fetch error');
      console.error(`[token] Access token fetch attempt ${attempt}/3 failed: ${message}`, {
        status: Number(error?.response?.status || 0),
        data: error?.response?.data || null,
      });

      if (attempt < 3) {
        await sleep(2000);
      }
    }
  }

  throw lastError || new Error('Failed to fetch access token after retries');
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
      Authorization: `Bearer ${token}`,
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

function stripArabicDiacritics(text) {
  return String(text || '')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectAudioExtension(buffer) {
  if (!buffer || buffer.length < 12) {
    return 'webm';
  }

  // RIFF....WAVE
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WAVE') {
    return 'wav';
  }

  // ftyp (mp4/m4a)
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    return 'mp4';
  }

  // Matroska/WebM
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return 'webm';
  }

  // OGG
  if (buffer.subarray(0, 4).toString('ascii') === 'OggS') {
    return 'ogg';
  }

  return 'webm';
}

async function convertAudioBufferToPcmWav(inputBuffer) {
  const id = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const extension = detectAudioExtension(inputBuffer);
  const inputPath = path.join(os.tmpdir(), `tilawah-voice-input-${id}.${extension}`);
  const outputPath = path.join(os.tmpdir(), `tilawah-voice-output-${id}.wav`);

  await fs.writeFile(inputPath, inputBuffer);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFrequency(16000)
        .audioChannels(1)
        .audioBitrate('16k')
        .audioCodec('pcm_s16le')
        .format('wav')
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });

    return await fs.readFile(outputPath);
  } finally {
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
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
app.use(express.json({ limit: '15mb' }));
app.use(
  session({
    name: 'tilawah.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
    },
  })
);

app.get('/api/auth/login', (req, res) => {
  const { codeVerifier, codeChallenge, state } = createPkcePair();
  req.session.codeVerifier = codeVerifier;
  req.session.oauthState = state;
  req.session.oauth = {
    codeVerifier,
    state,
    createdAt: Date.now(),
  };

  const authUrl = new URL(`${OAUTH_BASE_URL}/oauth2/auth`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', QURAN_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI);
  authUrl.searchParams.set('scope', OAUTH_SCOPES);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);

  req.session.save((error) => {
    if (error) {
      console.error('[oauth] Session save error before redirect:', error);
      return res.status(500).json({ message: 'Could not persist OAuth session state' });
    }

    console.log('[oauth] Login redirect session saved', {
      state,
      hasCodeVerifier: Boolean(codeVerifier),
      sessionId: req.sessionID,
    });
    res.redirect(authUrl.toString());
  });
});

app.get('/callback', async (req, res) => {
  console.log('[oauth] Callback URL received:', req.originalUrl);
  if (req.query?.error) {
    console.log('[oauth] Callback error params:', {
      error: req.query.error,
      error_description: req.query.error_description,
      error_uri: req.query.error_uri,
    });

    return res.status(400).json({
      error: String(req.query.error || 'oauth_error'),
      message: String(req.query.error_description || 'OAuth provider returned an error'),
    });
  }

  const code = String(req.query?.code || '').trim();
  const returnedState = String(req.query?.state || '').trim();
  const storedState = String(req.session?.oauthState || req.session?.oauth?.state || '').trim();
  const codeVerifier = String(req.session?.codeVerifier || req.session?.oauth?.codeVerifier || '').trim();

  console.log('[oauth] Callback received', {
    queryState: returnedState,
    sessionState: storedState,
    hasCodeVerifier: Boolean(codeVerifier),
    sessionId: req.sessionID,
  });

  if (!code || !returnedState || !storedState || returnedState !== storedState || !codeVerifier) {
    return res.status(400).json({ message: 'Invalid OAuth callback state or code verifier' });
  }

  try {
    const tokenPayload = await exchangeOAuthToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: OAUTH_REDIRECT_URI,
      code_verifier: codeVerifier,
    });

    const expiresIn = Number(tokenPayload.expires_in || 3600);
    const profileUser = await fetchUserProfile(tokenPayload.access_token);
    req.session.auth = {
      accessToken: tokenPayload.access_token,
      refreshToken: tokenPayload.refresh_token || '',
      idToken: tokenPayload.id_token || '',
      user: profileUser || normalizeUserFromIdToken(tokenPayload.id_token),
      expiresAt: Date.now() + expiresIn * 1000,
    };
    delete req.session.codeVerifier;
    delete req.session.oauthState;
    delete req.session.oauth;

    return req.session.save(() => {
      res.redirect(`${FRONTEND_ORIGIN}?loggedIn=true`);
    });
  } catch (error) {
    console.error('[oauth] Callback exchange failed:', error.message);
    return res.status(500).json({ message: error.message || 'OAuth callback failed' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect(FRONTEND_ORIGIN);
  });
});

app.get('/api/auth/session', (req, res) => {
  const auth = req.session?.auth;
  if (!auth?.accessToken) {
    return res.status(200).json({ loggedIn: false, accessToken: '', user: null });
  }

  return res.status(200).json({
    loggedIn: true,
    accessToken: auth.accessToken,
    user: auth.user || null,
  });
});

async function forwardToUserApi(req, res, { method, path: upstreamPath }) {
  let accessToken;
  try {
    accessToken = await getUserSessionToken(req);
  } catch (error) {
    console.error('[oauth] Failed to refresh session token:', error.message);
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }

  if (!accessToken) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const url = new URL(`${USER_API_BASE_URL}/auth/v1/${upstreamPath}`);
  if (method === 'GET') {
    Object.entries(req.query || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, String(item)));
      } else if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-auth-token': accessToken,
    'x-client-id': QURAN_CLIENT_ID,
  };

  try {
    const upstreamResponse = await fetch(url.toString(), {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
    });

    const contentType = upstreamResponse.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await upstreamResponse.json().catch(() => ({}))
      : await upstreamResponse.text();

    return res.status(upstreamResponse.status).send(payload);
  } catch (error) {
    return res.status(502).json({ message: error.message || 'Failed to reach Quran user API' });
  }
}

app.get('/api/user/bookmarks', (req, res) => forwardToUserApi(req, res, { method: 'GET', path: 'bookmarks' }));
app.post('/api/user/bookmarks', (req, res) => forwardToUserApi(req, res, { method: 'POST', path: 'bookmarks' }));
app.get('/api/user/streaks', (req, res) => forwardToUserApi(req, res, { method: 'GET', path: 'streaks' }));
app.post('/api/user/streaks', (req, res) => forwardToUserApi(req, res, { method: 'POST', path: 'streaks' }));
app.post('/api/user/reading-sessions', (req, res) =>
  forwardToUserApi(req, res, { method: 'POST', path: 'reading-sessions' })
);
app.get('/api/user/goals', (req, res) => forwardToUserApi(req, res, { method: 'GET', path: 'goals' }));
app.post('/api/user/goals', (req, res) => forwardToUserApi(req, res, { method: 'POST', path: 'goals' }));

app.post('/api/groups/create', async (req, res) => {
  const userId = String(req.body?.userId || '').trim();
  const name = String(req.body?.memberName || req.body?.name || '').trim() || 'Member';
  const groupName = String(req.body?.groupName || req.body?.name || '').trim();

  if (!userId || !groupName) {
    return res.status(400).json({ message: 'userId and group name are required' });
  }

  try {
    const groups = await readGroups();
    const code = generateGroupCode(groups.map((group) => group?.code));
    const today = getTodayDateKey();

    const group = {
      id: code,
      name: groupName,
      code,
      createdBy: userId,
      members: [
        {
          userId,
          name,
          versesToday: 0,
          totalVerses: 0,
          lastActive: today,
        },
      ],
      wirdGoal: 10,
      wirdVotes: {
        [userId]: 10,
      },
      createdAt: today,
    };

    groups.push(group);
    await writeGroups(groups);
    return res.status(201).json(group);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create group' });
  }
});

app.post('/api/groups/join', async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const userId = String(req.body?.userId || '').trim();
  const name = String(req.body?.name || '').trim() || 'Member';

  if (!code || !userId) {
    return res.status(400).json({ message: 'code and userId are required' });
  }

  try {
    const groups = await readGroups();
    const groupIndex = groups.findIndex((group) => String(group?.code || '').toUpperCase() === code);

    if (groupIndex < 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const group = groups[groupIndex];
    const members = Array.isArray(group.members) ? group.members : [];
    const existingMember = members.find((member) => String(member?.userId || '') === userId);

    if (!existingMember) {
      members.push({
        userId,
        name,
        versesToday: 0,
        totalVerses: 0,
        lastActive: getTodayDateKey(),
      });
      group.members = members;
      groups[groupIndex] = group;
      await writeGroups(groups);
    }

    return res.json(group);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to join group' });
  }
});

app.get('/api/groups/:code', async (req, res) => {
  const code = String(req.params?.code || '').trim().toUpperCase();
  if (!code) {
    return res.status(400).json({ message: 'Group code is required' });
  }

  try {
    const groups = await readGroups();
    const group = groups.find((item) => String(item?.code || '').toUpperCase() === code);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    return res.json(group);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load group' });
  }
});

app.post('/api/groups/:code/progress', async (req, res) => {
  const code = String(req.params?.code || '').trim().toUpperCase();
  const userId = String(req.body?.userId || '').trim();
  const versesToday = Math.max(0, Number(req.body?.versesToday || 0));
  const totalVerses = Math.max(0, Number(req.body?.totalVerses || 0));

  if (!code || !userId) {
    return res.status(400).json({ message: 'Group code and userId are required' });
  }

  try {
    const groups = await readGroups();
    const groupIndex = groups.findIndex((group) => String(group?.code || '').toUpperCase() === code);
    if (groupIndex < 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const group = groups[groupIndex];
    const members = Array.isArray(group.members) ? group.members : [];
    const memberIndex = members.findIndex((member) => String(member?.userId || '') === userId);
    if (memberIndex < 0) {
      return res.status(404).json({ message: 'Member not found in group' });
    }

    members[memberIndex] = {
      ...members[memberIndex],
      versesToday,
      totalVerses,
      lastActive: getTodayDateKey(),
    };

    group.members = members;
    groups[groupIndex] = group;
    await writeGroups(groups);
    return res.json(group);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update progress' });
  }
});

app.post('/api/groups/:code/vote', async (req, res) => {
  const code = String(req.params?.code || '').trim().toUpperCase();
  const userId = String(req.body?.userId || '').trim();
  const wirdAmount = Math.max(0, Number(req.body?.wirdAmount || 0));

  if (!code || !userId || !Number.isFinite(wirdAmount) || wirdAmount <= 0) {
    return res.status(400).json({ message: 'Group code, userId, and valid wirdAmount are required' });
  }

  try {
    const groups = await readGroups();
    const groupIndex = groups.findIndex((group) => String(group?.code || '').toUpperCase() === code);
    if (groupIndex < 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const group = groups[groupIndex];
    const nextVotes = {
      ...(group.wirdVotes && typeof group.wirdVotes === 'object' ? group.wirdVotes : {}),
      [userId]: wirdAmount,
    };

    const voteValues = Object.values(nextVotes)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);
    const average = voteValues.length
      ? voteValues.reduce((sum, value) => sum + value, 0) / voteValues.length
      : 10;
    const roundedGoal = Math.max(5, Math.round(average / 5) * 5);

    group.wirdVotes = nextVotes;
    group.wirdGoal = roundedGoal;
    groups[groupIndex] = group;
    await writeGroups(groups);

    return res.json(group);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to record vote' });
  }
});

app.get('/api/reflections/public', async (req, res) => {
  const verseKeyFilter = String(req.query?.verseKey || '').trim();

  try {
    const reflections = await readReflections();
    const result = reflections
      .filter((item) => {
        if (!item?.isPublic) {
          return false;
        }

        if (!verseKeyFilter) {
          return true;
        }

        return String(item?.verseKey || '').trim() === verseKeyFilter;
      })
      .sort((a, b) => {
        const aTime = new Date(a?.date || 0).getTime();
        const bTime = new Date(b?.date || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 50);

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load public reflections' });
  }
});

app.post('/api/reflections/publish', async (req, res) => {
  const privacy = String(req.body?.accountPrivacy || '').trim().toLowerCase();
  if (privacy !== 'public') {
    return res.status(403).json({ message: 'Public account is required to share reflections' });
  }

  const userId = String(req.body?.userId || '').trim();
  const verseKey = String(req.body?.verseKey || '').trim();
  const verseText = String(req.body?.verseText || '').trim();
  const translation = String(req.body?.translation || '').trim();
  const answer = String(req.body?.answer || '').trim();
  const date = String(req.body?.date || new Date().toISOString()).trim();
  const userName = String(req.body?.userName || '').trim() || 'Anonymous Brother/Sister';

  if (!userId || !verseKey || !verseText || !answer) {
    return res.status(400).json({ message: 'userId, verseKey, verseText, and answer are required' });
  }

  try {
    const reflections = await readReflections();
    const createdReflection = {
      id: crypto.randomUUID(),
      userId,
      userName,
      verseKey,
      verseText,
      translation,
      answer,
      date,
      likes: 0,
      likedBy: [],
      isPublic: true,
    };

    reflections.unshift(createdReflection);
    await writeReflections(reflections);
    return res.status(201).json(createdReflection);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to publish reflection' });
  }
});

app.post('/api/reflections/:id/like', async (req, res) => {
  const reflectionId = String(req.params?.id || '').trim();
  const userId = String(req.body?.userId || '').trim();

  if (!reflectionId || !userId) {
    return res.status(400).json({ message: 'Reflection id and userId are required' });
  }

  try {
    const reflections = await readReflections();
    const index = reflections.findIndex((item) => String(item?.id || '') === reflectionId);
    if (index < 0) {
      return res.status(404).json({ message: 'Reflection not found' });
    }

    const reflection = reflections[index];
    const likedBySet = new Set(
      Array.isArray(reflection?.likedBy)
        ? reflection.likedBy.map((item) => String(item || '').trim()).filter(Boolean)
        : []
    );

    if (likedBySet.has(userId)) {
      likedBySet.delete(userId);
    } else {
      likedBySet.add(userId);
    }

    const likedBy = Array.from(likedBySet);
    const likes = likedBy.length;

    reflections[index] = {
      ...reflection,
      likedBy,
      likes,
    };

    await writeReflections(reflections);
    return res.json({ id: reflectionId, likes, likedBy, liked: likedBySet.has(userId) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to toggle like' });
  }
});

app.post('/api/ai/action-challenge', async (req, res) => {
  const verses = Array.isArray(req.body?.verses) ? req.body.verses : [];
  const normalizedVerses = verses
    .map((verse) => ({
      verseKey: String(verse?.verseKey || '').trim(),
      translation: String(verse?.translation || '').trim() || 'Translation unavailable for this verse.',
    }))
    .filter((verse) => verse.verseKey);

  if (!normalizedVerses.length) {
    return res.status(400).json({ message: 'Missing required field: verses with verseKey' });
  }

  const versesText = normalizedVerses.map((verse) => `${verse.verseKey}: ${verse.translation}`).join('\n');
  const prompt = `You are a wise, warm Islamic scholar. Given these Quranic verses, identify their central theme in 5 words or less, then write practical real-world action challenges (2-3 sentences each) that a modern Muslim can implement TODAY based on these verses. The challenge must be specific, human, and practical - not vague advice like be kind or pray more. Ground it in the exact content of the verses. Never be preachy. If these verses contain more than one distinct actionable theme, return up to 2 challenges. Return JSON only: { theme: string, challenges: [{ title: string, body: string }] }\n\nVerses:\n${versesText}`;

  function parseJsonFromModelText(text) {
    const trimmed = String(text || '').trim();
    const cleaned = trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const slice = firstBrace >= 0 && lastBrace >= 0 ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;
    return JSON.parse(slice);
  }

  try {
    const raw = await generateWithGemini(prompt, { maxOutputTokens: 600, temperature: 0.7 });
    const parsed = parseJsonFromModelText(raw);
    const theme = String(parsed?.theme || '').trim();
    const challenges = (Array.isArray(parsed?.challenges) ? parsed.challenges : [])
      .map((item) => ({
        title: String(item?.title || '').trim(),
        body: String(item?.body || '').trim(),
      }))
      .filter((item) => item.title && item.body)
      .slice(0, 2);

    if (!theme || !challenges.length) {
      throw new Error('Model response missing required fields');
    }

    return res.status(200).json({
      theme,
      challenges,
    });
  } catch (error) {
    const fallback = buildFallbackActionChallenge(normalizedVerses);
    if (isGeminiBusyError(error) || isGeminiQuotaError(error) || String(error?.message || '').toLowerCase().includes('json')) {
      return res.status(200).json({
        theme: fallback.theme,
        challenges: fallback.challenges,
        fallback: true,
      });
    }

    return res.status(500).json({ message: error.message || 'Failed to generate action challenge' });
  }
});

app.post('/api/ai/unseal-word', async (req, res) => {
  const arabicWord = String(req.body?.arabicWord || '').trim();
  const wordRoot = String(req.body?.wordRoot || '').trim();
  const verseKey = String(req.body?.verseKey || '').trim();
  const verseText = String(req.body?.verseText || '').trim();
  const translation = String(req.body?.translation || '').trim();

  if (!arabicWord || !verseKey || !verseText) {
    return res.status(400).json({ message: 'Missing required fields: arabicWord, verseKey, verseText' });
  }

  const strippedInputWord = stripDiacritics(arabicWord);
  const dePrefixedInputWord = strippedInputWord.replace(/^ال/, '');
  const normalizedRoot = String(wordRoot || '').replace(/\s+/g, '');
  const rootAliasToKey = {
    رحم: strippedInputWord.includes('رحمن') ? 'رحمن' : 'رحيم',
    ملك: 'ملك',
    دين: 'دين',
    حيي: 'حياة',
    حيا: 'حياة',
  };
  console.log('Raw word received:', arabicWord);
  console.log('After stripping:', strippedInputWord);
  console.log('Map has key:', !!unsealedWords[strippedInputWord]);
  console.log('Stripped input:', strippedInputWord);
  console.log('De-prefixed input:', dePrefixedInputWord);

  // First try direct lookup
  let result =
    unsealedWords[strippedInputWord] ||
    unsealedWords[dePrefixedInputWord] ||
    unsealedWords[`ال${dePrefixedInputWord}`];

  if (!result && rootAliasToKey[normalizedRoot] && unsealedWords[rootAliasToKey[normalizedRoot]]) {
    result = unsealedWords[rootAliasToKey[normalizedRoot]];
    console.log('Matched via root alias:', normalizedRoot, '->', rootAliasToKey[normalizedRoot]);
  }

  // If not found, try matching against stripped map keys
  if (!result) {
    for (const key of Object.keys(unsealedWords)) {
      const strippedKey = stripDiacritics(key);
      const dePrefixedKey = strippedKey.replace(/^ال/, '');
      if (
        strippedKey === strippedInputWord ||
        strippedKey === dePrefixedInputWord ||
        dePrefixedKey === strippedInputWord ||
        dePrefixedKey === dePrefixedInputWord
      ) {
        result = unsealedWords[key];
        console.log('Matched via key stripping:', key);
        break;
      }
    }
  }

  if (result) {
    console.log('Returning hardcoded result');
    return res.json(result);
  }

  const cacheKey = arabicWord.toLowerCase();
  const [currentSurahRaw] = verseKey.split(':');
  const currentSurah = Number.parseInt(String(currentSurahRaw || ''), 10);
  const cached = unsealedWordAnalysisCache.get(cacheKey);
  if (cached && !cached.fallback) {
    return res.status(200).json({
      totalOccurrences: Number.parseInt(String(cached?.totalOccurrences || 0), 10) || 0,
      mostCommonSurah: String(cached?.mostCommonSurah || 'Unknown').trim(),
      makkiOrMadani: String(cached?.makkiOrMadani || 'Unknown').trim(),
      whyThisWord: String(cached?.whyThisWord || '').trim(),
      coreMeaning: String(cached?.coreMeaning || '').trim(),
      acrossQuran: Array.isArray(cached?.acrossQuran) ? cached.acrossQuran : [],
      whatChanges: String(cached?.whatChanges || '').trim(),
      fallback: Boolean(cached?.fallback),
    });
  }

  if (cached?.fallback) {
    unsealedWordAnalysisCache.delete(cacheKey);
  }

  function parseSurahNumberFromVerseKey(key) {
    const [surahRaw] = String(key || '').split(':');
    const surah = Number.parseInt(String(surahRaw || ''), 10);
    return Number.isFinite(surah) ? surah : 0;
  }

  function parseJsonFromModelText(text) {
    const trimmed = String(text || '').trim();
    const cleaned = trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const slice = firstBrace >= 0 && lastBrace >= 0 ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;
    return JSON.parse(slice);
  }

  const prompt = [
    'You are a Quran Arabic linguistics guide.',
    'Analyze one exact Arabic word from a verse and return STRICT JSON only. No markdown, no explanation outside JSON.',
    'Use concise, clear wording for non-specialists while staying textually accurate.',
    '',
    `Arabic word: ${arabicWord}`,
    `Root (if known): ${wordRoot || 'Unknown'}`,
    `Verse key: ${verseKey}`,
    `Verse text: ${verseText}`,
    `Verse translation: ${translation || 'N/A'}`,
    '',
    'Return exactly this schema:',
    '{',
    '  "totalOccurrences": number,',
    '  "mostCommonSurah": "string",',
    '  "makkiOrMadani": "string",',
    '  "whyThisWord": "string",',
    '  "coreMeaning": "string",',
    '  "acrossQuran": [',
    '    { "verseKey": "string", "quote": "string", "context": "string" }',
    '  ],',
    '  "whatChanges": "string"',
    '}',
    '',
    'Rules:',
    '- whyThisWord: 2-4 concise sentences explaining why this exact lexical choice fits this verse better than close alternatives.',
    '- coreMeaning: one short paragraph describing semantic range of the root and major shade used here.',
    '- For the acrossQuran array, you MUST return 3 DIFFERENT verse keys from 3 DIFFERENT surahs — never repeat the same verse key, never use the verse the user is currently reading, never use verses from the same surah as the current verse. Each must show the root being used in a genuinely different semantic context — for example if the root means worship in one place, show it meaning servitude in another, and devotion in a third. If you are not certain a verse exists with that exact root, do not include it.',
    '- For each acrossQuran entry write one sentence that explicitly contrasts how the root is used there versus how it is used in the current verse. Use the format: Here the root means [X] — unlike in [current verse] where it means [Y]. Make the contrast specific and illuminating.',
    '- each acrossQuran quote should be a short Arabic excerpt only.',
    '- totalOccurrences: integer > 0.',
    '- mostCommonSurah: short surah name label, e.g. Al-Baqarah.',
    '- makkiOrMadani: exactly one of: Mostly Makki, Mostly Madani, Balanced.',
    '- whatChanges: 2-3 sentences on emotional/rhetorical shift caused by this word in this verse.',
    '- Use valid JSON with double quotes.',
  ].join('\n');

  try {
    let raw = '';
    try {
      raw = await generateWithGroq(prompt, { maxTokens: 900, temperature: 0.35 });
    } catch (groqError) {
      const canFallbackToGemini = Boolean(genAI) && !isGroqRateLimitError(groqError);
      if (!canFallbackToGemini) {
        throw groqError;
      }

      raw = await generateWithGemini(prompt, { maxOutputTokens: 900, temperature: 0.35 });
    }

    const parsed = parseJsonFromModelText(raw);

    const acrossQuranCandidates = (Array.isArray(parsed?.acrossQuran) ? parsed.acrossQuran : [])
      .map((entry) => ({
        verseKey: String(entry?.verseKey || '').trim(),
        quote: String(entry?.quote || '').trim(),
        context: String(entry?.context || '').trim(),
      }))
      .filter((entry) => {
        if (!entry.verseKey || !entry.quote || !entry.context) {
          return false;
        }

        if (entry.verseKey === verseKey) {
          return false;
        }

        const entrySurah = parseSurahNumberFromVerseKey(entry.verseKey);
        if (!entrySurah || (Number.isFinite(currentSurah) && entrySurah === currentSurah)) {
          return false;
        }

        return true;
      });

    const seenVerseKeys = new Set();
    const seenSurahs = new Set();
    const acrossQuran = [];
    acrossQuranCandidates.forEach((entry) => {
      const entrySurah = parseSurahNumberFromVerseKey(entry.verseKey);
      if (seenVerseKeys.has(entry.verseKey) || seenSurahs.has(entrySurah)) {
        return;
      }

      seenVerseKeys.add(entry.verseKey);
      seenSurahs.add(entrySurah);
      acrossQuran.push(entry);
    });

    const normalizedMakkiMadani = String(parsed?.makkiOrMadani || '').trim();
    const totalOccurrences = Number.parseInt(String(parsed?.totalOccurrences || ''), 10);
    const mostCommonSurah = String(parsed?.mostCommonSurah || '').trim();

    const payload = {
      totalOccurrences: Number.isFinite(totalOccurrences) ? totalOccurrences : 0,
      mostCommonSurah,
      makkiOrMadani: normalizedMakkiMadani,
      whyThisWord: String(parsed?.whyThisWord || '').trim(),
      coreMeaning: String(parsed?.coreMeaning || parsed?.coreМeaning || '').trim(),
      acrossQuran: acrossQuran.slice(0, 3),
      whatChanges: String(parsed?.whatChanges || '').trim(),
    };

    const hasContrastContexts = payload.acrossQuran.every((entry) => /unlike in/i.test(String(entry.context || '')));
    if (
      !payload.whyThisWord ||
      !payload.coreMeaning ||
      !payload.whatChanges ||
      !Number.isFinite(payload.totalOccurrences) ||
      payload.totalOccurrences <= 0 ||
      !payload.mostCommonSurah ||
      !payload.makkiOrMadani ||
      payload.acrossQuran.length !== 3 ||
      !hasContrastContexts
    ) {
      throw new Error('Model response missing required fields');
    }

    unsealedWordAnalysisCache.set(cacheKey, payload);
    return res.status(200).json(payload);
  } catch (error) {
    const shouldFallback =
      isGeminiBusyError(error) ||
      isGeminiQuotaError(error) ||
      isGroqRateLimitError(error) ||
      String(error?.message || '').toLowerCase().includes('groq_api_key') ||
      String(error?.message || '').toLowerCase().includes('gemini_api_key') ||
      String(error?.message || '').toLowerCase().includes('json') ||
      String(error?.message || '').toLowerCase().includes('quota') ||
      String(error?.message || '').toLowerCase().includes('rate-limit');

    if (shouldFallback) {
      const fallback = buildFallbackUnsealedWordAnalysis({
        arabicWord,
        wordRoot,
        verseKey,
        verseText,
        translation,
      });
      return res.status(200).json({
        ...fallback,
        fallback: true,
      });
    }

    return res.status(500).json({ message: 'Failed to unseal this word right now. Please try again shortly.' });
  }
});

app.delete('/api/reflections/:id', async (req, res) => {
  const reflectionId = String(req.params?.id || '').trim();
  const userId = String(req.body?.userId || '').trim();

  if (!reflectionId || !userId) {
    return res.status(400).json({ message: 'Reflection id and userId are required' });
  }

  try {
    const reflections = await readReflections();
    const index = reflections.findIndex((item) => String(item?.id || '') === reflectionId);
    if (index < 0) {
      return res.status(404).json({ message: 'Reflection not found' });
    }

    if (String(reflections[index]?.userId || '') !== userId) {
      return res.status(403).json({ message: 'You can only delete your own reflections' });
    }

    reflections.splice(index, 1);
    await writeReflections(reflections);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete reflection' });
  }
});

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
    if (isGeminiQuotaError(err)) {
      return res.status(200).json({ question: buildFallbackReflectionQuestion(verseKey, translation) });
    }
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

app.post('/api/voice/assess', async (req, res) => {
  const audioBase64 = String(req.body?.audioBase64 || '').trim();
  const referenceText = stripArabicDiacritics(req.body?.referenceText || '');

  if (!audioBase64 || !referenceText) {
    return res.status(400).json({ message: 'Missing required fields: audioBase64, referenceText' });
  }

  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    return res.status(500).json({ message: 'Azure Speech credentials are not configured on the server.' });
  }

  try {
    const inputBuffer = Buffer.from(audioBase64, 'base64');
    const wavBuffer = await convertAudioBufferToPcmWav(inputBuffer);

    console.log('[voice-assess] referenceText:', referenceText);
    console.log('[voice-assess] input bytes:', inputBuffer.length, 'wav bytes:', wavBuffer.length);

    const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
    speechConfig.speechRecognitionLanguage = 'ar-SA';

    const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
      referenceText,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Word,
      true
    );

    const pushStream = sdk.AudioInputStream.createPushStream();
    pushStream.write(wavBuffer);
    pushStream.close();

    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    pronunciationConfig.applyTo(recognizer);

    recognizer.recognizeOnceAsync(
      (result) => {
        try {
          const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);
          const rawWords = pronunciationResult?.detailResult?.Words || [];
          const words = Array.isArray(rawWords)
            ? rawWords.map((w) => ({
                word: String(w?.Word || '').trim(),
                accuracyScore: Number(w?.PronunciationAssessment?.AccuracyScore || 0),
                errorType: String(w?.PronunciationAssessment?.ErrorType || 'None'),
              }))
            : [];

          recognizer.close();
          return res.status(200).json({
            accuracyScore: Number(pronunciationResult?.accuracyScore || 0),
            fluencyScore: Number(pronunciationResult?.fluencyScore || 0),
            completenessScore: Number(pronunciationResult?.completenessScore || 0),
            pronunciationScore: Number(pronunciationResult?.pronunciationScore || 0),
            words,
          });
        } catch (error) {
          recognizer.close();
          return res.status(500).json({ message: error.message || 'Failed to parse pronunciation assessment result.' });
        }
      },
      (error) => {
        recognizer.close();
        return res.status(500).json({ message: error?.message || 'Pronunciation assessment failed.' });
      }
    );
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not run pronunciation assessment.' });
  }
});

app.post('/api/ai/companion', async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const currentVerse = String(req.body?.currentVerse || '').trim();
  const currentSurah = String(req.body?.currentSurah || '').trim();
  const currentTranslation = String(req.body?.currentTranslation || '').trim();
  const currentArabicText = String(req.body?.currentArabicText || '').trim();
  const journalEntriesForCurrentSurah = String(req.body?.journalEntriesForCurrentSurah || '').trim();
  const surahVerses = Array.isArray(req.body?.surahVerses) ? req.body.surahVerses : [];

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
  const deterministicReply = buildDeterministicCompanionReply({
    currentSurah,
    userMessage: latestMessage.content,
  });
  if (deterministicReply) {
    return res.status(200).json({ reply: deterministicReply, deterministic: true });
  }

  if (!groq) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
  }

  const systemPrompt = 'You are a warm, human Quran companion. Keep answers natural and concise. If the user gives a greeting or small-talk message, respond warmly and invite a verse-focused question without forcing advice. If the user asks about meaning, context, or application, give one practical suggestion grounded in the current verse in at most 3 sentences. Never fabricate hadith or verse references — if unsure of a fact, say so clearly.';

  const verseContext = [
    `Current surah: ${currentSurah || 'Unknown surah'}`,
    `Current verse: ${currentVerse || 'Unknown verse'}`,
    `Arabic text: ${currentArabicText || 'Not provided'}`,
    `English translation: ${currentTranslation || 'Not provided'}`,
  ].join('\n');

  const formattedHistory = historyWithoutLatest
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const userPrompt = [
    verseContext,
    journalEntriesForCurrentSurah ? `Recent journal reflections from user:\n${journalEntriesForCurrentSurah}` : '',
    formattedHistory ? `Conversation history:\n${formattedHistory}` : '',
    `User question: ${latestMessage.content}`,
    'Respond naturally to the user intent and keep it concise.',
  ].filter(Boolean).join('\n\n');

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 200,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const rawReply = String(completion?.choices?.[0]?.message?.content || '').trim();
    const reply = rawReply.replace(/\s+/g, ' ').trim();
    return res.status(200).json({ reply });
  } catch (err) {
    const status = Number(err?.status || err?.response?.status || 0);
    if (status === 429) {
      return res.status(200).json({ response: 'Please try again in a moment.' });
    }

    return res.status(500).json({ error: err.message || 'AI request failed' });
  }
});

app.post('/api/ai/live-this', async (req, res) => {
  const currentVerse = String(req.body?.currentVerse || '').trim();
  const currentSurah = String(req.body?.currentSurah || '').trim();
  const currentTranslation = String(req.body?.currentTranslation || '').trim();
  const currentArabicText = String(req.body?.currentArabicText || '').trim();

  if (!currentVerse || (!currentArabicText && !currentTranslation)) {
    return res.status(400).json({ message: 'Missing required fields: currentVerse and verse text context' });
  }

  if (!groq) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
  }

  const systemPrompt = 'You are a Quran action guide. Give exactly ONE specific practical thing the user can do today that directly applies this verse to modern life. Format your response in exactly this structure — Action: [one sentence] Why: [one sentence connecting directly to the verse] Example: [one concrete real-world example]. Never exceed 3 sentences total. Never fabricate Islamic references — if unsure of a fact say so.';

  const userPrompt = [
    `Current surah: ${currentSurah || 'Unknown surah'}`,
    `Current verse: ${currentVerse}`,
    `Arabic text: ${currentArabicText || 'Not provided'}`,
    `English translation: ${currentTranslation || 'Not provided'}`,
    'Return exactly 3 lines starting with Action:, Why:, and Example:.',
  ].join('\n');

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 170,
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = String(completion?.choices?.[0]?.message?.content || '').trim();
    const lines = raw
      .split(/\r?\n+/)
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const findLine = (label) => lines.find((line) => new RegExp(`^${label}:`, 'i').test(line));
    const actionLine = findLine('Action');
    const whyLine = findLine('Why');
    const exampleLine = findLine('Example');

    if (!actionLine || !whyLine || !exampleLine) {
      return res.status(200).json({
        response: 'Action: Read this verse once before your next decision today.\nWhy: It grounds your choice in the guidance of this exact ayah.\nExample: Before sending a difficult message, pause for 10 seconds, recall this verse, then write with its tone in mind.',
        fallback: true,
      });
    }

    const response = [actionLine, whyLine, exampleLine].join('\n');
    return res.status(200).json({ response });
  } catch (err) {
    const status = Number(err?.status || err?.response?.status || 0);
    if (status === 429) {
      return res.status(200).json({ response: 'Please try again in a moment.' });
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

app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
