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
const AZURE_SPEECH_KEY = String(process.env.AZURE_SPEECH_KEY || '').trim();
const AZURE_SPEECH_REGION = String(process.env.AZURE_SPEECH_REGION || '').trim();

ffmpeg.setFfmpegPath(ffmpegPath);

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const GROUPS_FILE_PATH = path.resolve(__dirname, '../data/groups.json');

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

app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
