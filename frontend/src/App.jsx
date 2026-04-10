import { useEffect, useMemo, useRef, useState } from 'react';

const COIN_STORAGE_KEY = 'tilawah_coins_total';
const BOOKMARK_STORAGE_KEY = 'tilawah_bookmarks';
const BOOKMARK_DETAILS_STORAGE_KEY = 'tilawah_bookmark_details';
const JOURNAL_ENTRIES_STORAGE_KEY = 'journal_entries';
const ACTION_LOG_STORAGE_KEY = 'tilawah_action_log';
const STREAK_STORAGE_KEY = 'tilawah_streak';
const DAILY_GOAL_STORAGE_KEY = 'tilawah_daily_goal';
const DAILY_COINS_STORAGE_KEY = 'tilawah_daily_coins';
const LIFETIME_COINS_STORAGE_KEY = 'tilawah_lifetime_coins';
const SHOW_TRANSLATION_STORAGE_KEY = 'tilawah_show_translation';
const RECITER_ID_STORAGE_KEY = 'tilawah_reciter_id';
const READER_THEME_STORAGE_KEY = 'tilawah_reader_theme';
const AUDIO_HOST = 'https://verses.quran.foundation';
const READ_AWARD_DELAY_MS = 1500;

const DEFAULT_RECITER_OPTIONS = [
  { id: 7, label: 'Mishary Rashid Al-Afasy' },
  { id: 6, label: 'Abdul Basit Abdus Samad' },
];

const READER_THEME_OPTIONS = [
  { id: 'black', label: 'Black (Dark Mode)' },
  { id: 'white', label: 'White' },
  { id: 'cream', label: 'Cream' },
  { id: 'rose', label: 'Rose' },
  { id: 'developer', label: 'Developer' },
];

const DAILY_GOAL_OPTIONS = [
  { id: '5-verses', label: '5 verses', targetVerses: 5 },
  { id: '10-verses', label: '10 verses', targetVerses: 10 },
  { id: '20-verses', label: '20 verses', targetVerses: 20 },
  { id: '1-page', label: '1 page', targetVerses: 15 },
  { id: '1-rub', label: "1 Rub'", targetVerses: 40 },
  { id: '1-hizb', label: '1 Hizb', targetVerses: 80 },
  { id: '1-juz', label: '1 Juz', targetVerses: 604 },
];

function extractReciterName(reciter) {
  const translatedName = reciter?.translated_name;
  const translatedLabel =
    typeof translatedName === 'string'
      ? translatedName.trim()
      : typeof translatedName?.name === 'string'
        ? translatedName.name.trim()
        : '';

  return (
    String(reciter?.reciter_name || '').trim() ||
    String(reciter?.name || '').trim() ||
    translatedLabel ||
    ''
  );
}

function parseReciterOptions(payload) {
  const listCandidates = [payload?.recitations, payload?.reciters, payload?.audio_recitations, payload];
  const list = listCandidates.find((candidate) => Array.isArray(candidate));

  if (!Array.isArray(list)) {
    return [];
  }

  const options = list
    .map((reciter) => {
      const id = Number.parseInt(String(reciter?.id || ''), 10);
      const label = extractReciterName(reciter);
      if (!Number.isFinite(id) || !label) {
        return null;
      }
      return { id, label };
    })
    .filter(Boolean);

  return Array.from(new Map(options.map((option) => [option.id, option])).values()).sort((a, b) => a.id - b.id);
}

function getVerseId(verse) {
  return String(verse.id ?? verse.verse_key);
}

function readStoredCoins() {
  const raw = localStorage.getItem(COIN_STORAGE_KEY);
  const parsed = Number.parseInt(raw || '0', 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readStoredLifetimeCoins() {
  const raw = localStorage.getItem(LIFETIME_COINS_STORAGE_KEY);
  const parsed = Number.parseInt(raw || '0', 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readStoredBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function readStoredBookmarkDetails() {
  try {
    const raw = localStorage.getItem(BOOKMARK_DETAILS_STORAGE_KEY);
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function readStoredJournalEntries() {
  try {
    const raw = localStorage.getItem(JOURNAL_ENTRIES_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry) => entry && typeof entry === 'object');
  } catch {
    return [];
  }
}

function stripHtmlTags(text) {
  return String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildBookmarkPreview(verse) {
  const arabic = String(verse?.text_uthmani || '').replace(/\s+/g, ' ').trim();
  const translation = stripHtmlTags(
    verse?.translations?.[0]?.text || verse?.translations?.[0]?.translation || verse?.translation?.text || ''
  );
  const source = arabic || translation || 'Saved verse';
  return source.length > 72 ? `${source.slice(0, 69)}...` : source;
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPreviousDateKey(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() - 1);
  return getDateKeyFromDate(date);
}

function formatHijriDate(date) {
  try {
    return new Intl.DateTimeFormat('en-TN-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return '';
  }
}

function readStoredActionLog() {
  try {
    const raw = localStorage.getItem(ACTION_LOG_STORAGE_KEY);
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function readStoredStreak() {
  try {
    const raw = localStorage.getItem(STREAK_STORAGE_KEY);
    const parsed = JSON.parse(raw || '{}');

    const legacyCount = Number.parseInt(parsed?.count || '0', 10);
    const legacyLastEarnDate = typeof parsed?.lastEarnDate === 'string' ? parsed.lastEarnDate : '';
    const currentStreak = Number.parseInt(parsed?.currentStreak || legacyCount || '0', 10);
    const longestStreak = Number.parseInt(parsed?.longestStreak || currentStreak || '0', 10);
    const lastReadDate = typeof parsed?.lastReadDate === 'string' ? parsed.lastReadDate : legacyLastEarnDate;

    const activityLogInput = parsed?.activityLog && typeof parsed.activityLog === 'object' ? parsed.activityLog : {};
    const activityLog = Object.entries(activityLogInput).reduce((acc, [key, value]) => {
      const parsedCount = Number.parseInt(String(value), 10);
      if (Number.isFinite(parsedCount) && parsedCount > 0) {
        acc[key] = parsedCount;
      }
      return acc;
    }, {});

    return {
      lastReadDate,
      currentStreak: Number.isFinite(currentStreak) ? Math.max(currentStreak, 0) : 0,
      longestStreak: Number.isFinite(longestStreak) ? Math.max(longestStreak, 0) : 0,
      activityLog,
    };
  } catch {
    return { lastReadDate: '', currentStreak: 0, longestStreak: 0, activityLog: {} };
  }
}

function normalizeStreakForToday(streakData) {
  const todayKey = getTodayKey();
  const yesterdayKey = getPreviousDateKey(todayKey);
  const current = streakData || { lastReadDate: '', currentStreak: 0, longestStreak: 0, activityLog: {} };
  const activityLog = current.activityLog && typeof current.activityLog === 'object' ? current.activityLog : {};
  const hasReadToday = Number(activityLog[todayKey] || 0) > 0;

  if (hasReadToday) {
    const streakValue = Math.max(1, Number(current.currentStreak || 0));
    return {
      ...current,
      lastReadDate: todayKey,
      currentStreak: streakValue,
      longestStreak: Math.max(Number(current.longestStreak || 0), streakValue),
      activityLog,
    };
  }

  if (current.lastReadDate === todayKey || current.lastReadDate === yesterdayKey) {
    return {
      ...current,
      activityLog,
    };
  }

  return {
    ...current,
    currentStreak: 0,
    activityLog,
  };
}

function readStoredDailyGoal() {
  const raw = localStorage.getItem(DAILY_GOAL_STORAGE_KEY);

  if (!raw) {
    return '10-verses';
  }

  try {
    const parsed = JSON.parse(raw);
    const id = typeof parsed?.id === 'string' ? parsed.id : '';
    if (DAILY_GOAL_OPTIONS.some((option) => option.id === id)) {
      return id;
    }
  } catch {
    if (DAILY_GOAL_OPTIONS.some((option) => option.id === raw)) {
      return raw;
    }
  }

  return '10-verses';
}

function readStoredDailyCoins() {
  try {
    const raw = localStorage.getItem(DAILY_COINS_STORAGE_KEY);
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function buildTafsirMap(verses) {
  const map = {};
  verses.forEach((verse) => {
    const key = getVerseId(verse);
    const text = verse.tafsirs?.[0]?.text || '';
    if (text) {
      map[key] = text;
    }
  });
  return map;
}

function normalizeAudioUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (url.startsWith('/')) {
    return `${AUDIO_HOST}${url}`;
  }

  return `${AUDIO_HOST}/${url}`;
}

function buildAudioMap(audioFiles) {
  const map = {};
  audioFiles.forEach((file) => {
    const verseKey = file.verse_key;
    const url = normalizeAudioUrl(file.url || file.audio_url);
    if (verseKey && url) {
      map[verseKey] = url;
    }
  });
  return map;
}

function buildInteractiveWords(verse) {
  const fullTextWords = String(verse.text_uthmani || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const apiWords = Array.isArray(verse.words)
    ? verse.words.filter((word) => Boolean(word?.text_uthmani || word?.text))
    : [];

  return fullTextWords.map((text, index) => {
    const meta = apiWords[index] || {};
    return {
      id: meta.id || index,
      position: meta.position || index + 1,
      text_uthmani: text,
      audio_url: meta.audio_url || meta.audio?.url || '',
      translation_text:
        meta.translation_text ||
        meta.translation?.text ||
        meta.translation ||
        '',
    };
  });
}

function findClosestWordIndexByCenter(container, clientX, clientY) {
  const wordSpans = Array.from(container.querySelectorAll('.arabic-word-segment'));
  if (!wordSpans.length) {
    return -1;
  }

  let closestWordIndex = -1;
  let closestDistance = Number.POSITIVE_INFINITY;

  wordSpans.forEach((span, fallbackIndex) => {
    const rect = span.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);

    if (distance < closestDistance) {
      const parsedIndex = Number.parseInt(span.getAttribute('data-word-index') || `${fallbackIndex}`, 10);
      closestWordIndex = Number.isFinite(parsedIndex) ? parsedIndex : fallbackIndex;
      closestDistance = distance;
    }
  });

  return closestWordIndex;
}

function stripDiacritics(text) {
  return String(text || '')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D4-\u08FF]/g, '')
    .trim();
}

function normalizeArabicComparisonWord(word) {
  return stripDiacritics(word)
    .replace(/\u0640/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/[^\u0600-\u06FF]/g, '')
    .trim();
}

function normalizeArabicText(text) {
  return stripDiacritics(text)
    .replace(/\u0640/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
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

function computeLooseWordMatchScore(transcribedWords, verseWords) {
  if (!verseWords.length) {
    return { matchedWords: 0, totalWords: 0, score: 0 };
  }

  let matchedWords = 0;
  let i = 0;
  let j = 0;

  // Greedy in-order token matching is tolerant to extra spoken words.
  while (i < transcribedWords.length && j < verseWords.length) {
    if (transcribedWords[i] === verseWords[j]) {
      matchedWords += 1;
      i += 1;
      j += 1;
    } else {
      i += 1;
    }
  }

  const ratioToVerse = matchedWords / verseWords.length;
  const ratioToSpoken = matchedWords / Math.max(transcribedWords.length, 1);

  // Add unordered token overlap so partial/misaligned recognition can still find a likely verse.
  const spokenTokenSet = new Set(transcribedWords);
  let overlapCount = 0;
  for (const verseWord of verseWords) {
    if (spokenTokenSet.has(verseWord)) {
      overlapCount += 1;
    }
  }
  const overlapRatio = overlapCount / verseWords.length;

  return {
    matchedWords,
    totalWords: verseWords.length,
    score: ratioToVerse * 0.55 + ratioToSpoken * 0.15 + overlapRatio * 0.3,
  };
}

export default function App() {
  const audioRef = useRef(null);
  const wordAudioRef = useRef(null);
  const voiceRecognitionRef = useRef(null);
  const voiceMirrorMediaRecorderRef = useRef(null);
  const voiceMirrorMediaStreamRef = useRef(null);
  const voiceMirrorRecordedChunksRef = useRef([]);
  const voiceMirrorShouldMatchRef = useRef(false);
  const voiceMirrorLiveTranscriptRef = useRef('');
  const voiceMirrorScoreAnimationRef = useRef(0);
  const voiceMirrorLeftCanvasRef = useRef(null);
  const voiceMirrorRightCanvasRef = useRef(null);
  const voiceMirrorAnalyserRef = useRef(null);
  const voiceMirrorAudioContextRef = useRef(null);
  const voiceMirrorAnimationFrameRef = useRef(0);
  const nextAudioPrefetchRef = useRef(null);
  const lastPrefetchSourceVerseIdRef = useRef('');
  const verseRefs = useRef(new Map());
  const surahContentRef = useRef(null);
  const readingHeaderRef = useRef(null);
  const activeCenteredVerseIdRef = useRef('');
  const activeReadTimerRef = useRef(null);
  const actionLogRef = useRef(readStoredActionLog());
  const streakRef = useRef(normalizeStreakForToday(readStoredStreak()));
  const dailyCoinsRef = useRef(readStoredDailyCoins());
  const lifetimeCoinsRef = useRef(readStoredLifetimeCoins());
  const [chapters, setChapters] = useState([]);
  const [chapterSearch, setChapterSearch] = useState('');
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [verses, setVerses] = useState([]);
  const [expandedTafsir, setExpandedTafsir] = useState({});
  const [tafsirByChapter, setTafsirByChapter] = useState({});
  const [audioByChapter, setAudioByChapter] = useState({});
  const [coins, setCoins] = useState(() => readStoredCoins());
  const [bookmarks, setBookmarks] = useState(() => readStoredBookmarks());
  const [bookmarkDetails, setBookmarkDetails] = useState(() => readStoredBookmarkDetails());
  const [journalEntries, setJournalEntries] = useState(() => readStoredJournalEntries());
  const [actionLog, setActionLog] = useState(() => readStoredActionLog());
  const [streak, setStreak] = useState(() => normalizeStreakForToday(readStoredStreak()));
  const [dailyGoal, setDailyGoal] = useState(() => readStoredDailyGoal());
  const [profileName, setProfileName] = useState(() => {
    const raw = localStorage.getItem('tilawah_profile_name');
    return raw === 'Sister' ? 'Sister' : 'Brother';
  });
  const [dailyCoins, setDailyCoins] = useState(() => readStoredDailyCoins());
  const [lifetimeCoins, setLifetimeCoins] = useState(() => readStoredLifetimeCoins());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activePage, setActivePage] = useState('reader');
  const [isFullJournalOpen, setIsFullJournalOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('surahs');
  const [pendingBookmarkJump, setPendingBookmarkJump] = useState(null);
  const [isLoadingChapters, setIsLoadingChapters] = useState(true);
  const [isLoadingVerses, setIsLoadingVerses] = useState(false);
  const [isLoadingTafsir, setIsLoadingTafsir] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [error, setError] = useState('');
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [copiedVerseId, setCopiedVerseId] = useState('');
  const [centeredVerseId, setCenteredVerseId] = useState('');
  const [isAudioBarVisible, setIsAudioBarVisible] = useState(false);
  const [wordTooltip, setWordTooltip] = useState(null);
  const [hoveredWord, setHoveredWord] = useState(null);
  const [reflectionModal, setReflectionModal] = useState(null);
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);
  const [companionMessages, setCompanionMessages] = useState([]);
  const [companionInput, setCompanionInput] = useState('');
  const [isCompanionTyping, setIsCompanionTyping] = useState(false);
  const [heatmapTooltip, setHeatmapTooltip] = useState(null);
  const [isVoiceMirrorOpen, setIsVoiceMirrorOpen] = useState(false);
  const [voiceMirrorState, setVoiceMirrorState] = useState('record');
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceMirrorError, setVoiceMirrorError] = useState('');
  const [matchedVerse, setMatchedVerse] = useState(null);
  const [voiceMirrorWordRows, setVoiceMirrorWordRows] = useState([]);
  const [voiceMirrorCorrectWords, setVoiceMirrorCorrectWords] = useState([]);
  const [voiceMirrorScore, setVoiceMirrorScore] = useState({ matched: 0, total: 0, percent: 0 });
  const [isVoiceMirrorReciterPlaying, setIsVoiceMirrorReciterPlaying] = useState(false);
  const [voiceMirrorReciterAudio, setVoiceMirrorReciterAudio] = useState(null);
  const [voiceMirrorReciterProgress, setVoiceMirrorReciterProgress] = useState(0);
  const [voiceMirrorUserAudioUrl, setVoiceMirrorUserAudioUrl] = useState('');
  const [voiceMirrorUserAudio, setVoiceMirrorUserAudio] = useState(null);
  const [isVoiceMirrorUserPlaying, setIsVoiceMirrorUserPlaying] = useState(false);
  const [voiceMirrorUserProgress, setVoiceMirrorUserProgress] = useState(0);
  const [voiceMirrorAnimatedPercent, setVoiceMirrorAnimatedPercent] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('style');
  const [readingProgress, setReadingProgress] = useState(0);
  const [readingHeaderHeight, setReadingHeaderHeight] = useState(0);
  const [readerTheme, setReaderTheme] = useState(() => {
    const raw = localStorage.getItem(READER_THEME_STORAGE_KEY) || 'cream';
    return READER_THEME_OPTIONS.some((option) => option.id === raw) ? raw : 'cream';
  });
  const [reciterOptions, setReciterOptions] = useState(DEFAULT_RECITER_OPTIONS);
  const [showTranslation, setShowTranslation] = useState(() => {
    const raw = localStorage.getItem(SHOW_TRANSLATION_STORAGE_KEY);
    return raw === null ? true : raw === 'true';
  });
  const [selectedReciterId, setSelectedReciterId] = useState(() => {
    const raw = Number.parseInt(localStorage.getItem(RECITER_ID_STORAGE_KEY) || '7', 10);
    return Number.isFinite(raw) ? raw : 7;
  });

  const todayKey = getTodayKey();
  const todaysActions = useMemo(() => {
    const entry = actionLog[todayKey] || {};
    return {
      read: new Set((entry.read || []).map(String)),
      tafsir: new Set((entry.tafsir || []).map(String)),
    };
  }, [actionLog, todayKey]);

  const streakCount = streak.currentStreak || 0;
  const todaysReadCount = Number(streak.activityLog?.[todayKey] || 0);
  const selectedDailyGoal = DAILY_GOAL_OPTIONS.find((option) => option.id === dailyGoal) || DAILY_GOAL_OPTIONS[1];
  const wirdProgress = Math.min(100, (todaysReadCount / selectedDailyGoal.targetVerses) * 100);
  const isWirdComplete = wirdProgress >= 100;
  const totalDaysRead = useMemo(
    () => Object.values(streak.activityLog || {}).filter((count) => Number(count) > 0).length,
    [streak.activityLog]
  );
  const heatmapCalendar = useMemo(() => {
    const CELL = 13;
    const GAP = 3;
    const ROWS = 7;

    const today = new Date(`${todayKey}T00:00:00`);
    const rangeStart = new Date(today);
    rangeStart.setDate(rangeStart.getDate() - 364);

    const gridStart = new Date(rangeStart);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const msPerDay = 24 * 60 * 60 * 1000;
    const totalDays = Math.floor((today - gridStart) / msPerDay) + 1;
    const COLS = Math.ceil(totalDays / ROWS);

    const weeks = Array.from({ length: COLS }, (_, colIndex) => {
      return Array.from({ length: ROWS }, (_, rowIndex) => {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + colIndex * 7 + rowIndex);
        const key = getDateKeyFromDate(date);
        const count = Number(streak.activityLog?.[key] || 0);
        const inRange = date >= rangeStart && date <= today;

        let level = 0;
        if (inRange) {
          if (count >= 31) {
            level = 4;
          } else if (count >= 16) {
            level = 3;
          } else if (count >= 6) {
            level = 2;
          } else if (count >= 1) {
            level = 1;
          }
        }

        return {
          key,
          date,
          count,
          inRange,
          level,
          x: colIndex * (CELL + GAP),
          y: rowIndex * (CELL + GAP),
          tooltip:
            count > 0
              ? `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} — ${count} verse${count === 1 ? '' : 's'} read`
              : `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} — No verses read`,
        };
      });
    });

    const monthLabels = [];
    let lastMonthLabel = '';
    weeks.forEach((week, weekIndex) => {
      const firstInRangeDay = week.find((day) => day.inRange);
      if (!firstInRangeDay) {
        return;
      }
      const monthLabel = firstInRangeDay.date.toLocaleDateString('en-US', { month: 'short' });
      if (monthLabel !== lastMonthLabel) {
        monthLabels.push({ weekIndex, label: monthLabel });
        lastMonthLabel = monthLabel;
      }
    });

    return {
      weeks,
      monthLabels,
      cellSize: CELL,
      gap: GAP,
      cols: COLS,
      rows: ROWS,
      gridWidth: COLS * CELL + (COLS - 1) * GAP,
      gridHeight: ROWS * CELL + (ROWS - 1) * GAP,
    };
  }, [streak.activityLog, todayKey]);
  const todayDate = useMemo(() => new Date(), [todayKey]);
  const gregorianDateLabel = useMemo(
    () =>
      todayDate.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [todayDate]
  );
  const hijriDateLabel = useMemo(() => formatHijriDate(todayDate), [todayDate]);
  const ringRadius = 66;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - wirdProgress / 100);
  const centeredVerseData = useMemo(() => {
    if (!verses.length) {
      return null;
    }

    if (!centeredVerseId) {
      return verses[0];
    }

    return verses.find((verse) => String(getVerseId(verse)) === String(centeredVerseId)) || verses[0];
  }, [verses, centeredVerseId]);

  const currentSurahForCompanion = selectedChapter?.name_simple || 'the Quran';
  const currentVerseForCompanion = centeredVerseData?.verse_key || '';
  const currentTranslationForCompanion = stripHtmlTags(
    centeredVerseData?.translations?.[0]?.text ||
      centeredVerseData?.translations?.[0]?.translation ||
      centeredVerseData?.translation?.text ||
      ''
  );

  useEffect(() => {
    async function loadChapters() {
      setIsLoadingChapters(true);
      setError('');

      try {
        const perPage = 50;
        const allChapters = [];

        for (let page = 1; page <= 4; page += 1) {
          const response = await fetch(`/api/quran/chapters?language=en&per_page=${perPage}&page=${page}`);
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload?.message || 'Failed to fetch chapters');
          }

          const pageChapters = Array.isArray(payload?.chapters) ? payload.chapters : [];
          allChapters.push(...pageChapters);

          if (pageChapters.length < perPage) {
            break;
          }
        }

        const fetchedChapters = Array.from(
          new Map(allChapters.map((chapter) => [chapter.id, chapter])).values()
        ).sort((a, b) => a.id - b.id);

        setChapters(fetchedChapters);
        if (fetchedChapters.length > 0) {
          setSelectedChapter(fetchedChapters[0]);
        }
      } catch (err) {
        setError(err.message || 'Unexpected error while loading chapters');
      } finally {
        setIsLoadingChapters(false);
      }
    }

    loadChapters();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadReciters() {
      const perPage = 50;
      const allReciters = [];

      try {
        for (let page = 1; page <= 20; page += 1) {
          const response = await fetch(`/api/quran/resources/recitations?language=en&per_page=${perPage}&page=${page}`);
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload?.message || 'Failed to fetch reciters');
          }

          const pageReciters = parseReciterOptions(payload);
          allReciters.push(...pageReciters);

          if (pageReciters.length < perPage) {
            break;
          }
        }
      } catch {
        try {
          const response = await fetch('/api/quran/resources/recitations?language=en');
          const payload = await response.json();
          if (response.ok) {
            allReciters.push(...parseReciterOptions(payload));
          }
        } catch {
          // Keep defaults if the API is unavailable.
        }
      }

      const uniqueReciters = Array.from(
        new Map(allReciters.map((option) => [option.id, option])).values()
      ).sort((a, b) => a.id - b.id);

      if (!isCancelled && uniqueReciters.length > 0) {
        setReciterOptions(uniqueReciters);
      }
    }

    loadReciters();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (reciterOptions.some((option) => option.id === selectedReciterId)) {
      return;
    }

    setSelectedReciterId(reciterOptions[0]?.id || 7);
  }, [reciterOptions, selectedReciterId]);

  useEffect(() => {
    let isCancelled = false;

    async function loadVerses() {
      if (!selectedChapter?.id) {
        return;
      }

      setIsLoadingVerses(true);
      setError('');
      setVerses([]);
      setCenteredVerseId('');
      setExpandedTafsir({});
      setAudioProgress(0);
      setCurrentAudio(null);
      setIsAudioBarVisible(false);
      setWordTooltip(null);
      setHoveredWord(null);
      nextAudioPrefetchRef.current = null;
      lastPrefetchSourceVerseIdRef.current = '';

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }

      try {
        const perPage = 50;
        const baseParams = `word_fields=audio_url,translation_text&fields=text_uthmani&words=true&per_page=${perPage}`;

        async function fetchAllVersePages(translationId) {
          const firstResponse = await fetch(
            `/api/quran/verses/by_chapter/${selectedChapter.id}?${baseParams}&translations=${translationId}&page=1`
          );
          const firstPayload = await firstResponse.json();

          if (!firstResponse.ok) {
            throw new Error(firstPayload?.message || 'Failed to fetch verses');
          }

          const totalPages = Number(firstPayload?.pagination?.total_pages || 1);
          const totalRecords = Number(firstPayload?.pagination?.total_records || firstPayload?.verses?.length || 0);
          const currentPage = Number(firstPayload?.pagination?.current_page || 1);

          console.log('[tilawah] verses pagination', {
            chapterId: selectedChapter.id,
            translationId,
            currentPage,
            totalPages,
            totalRecords,
          });

          if (totalPages <= 1) {
            return firstPayload;
          }

          const remainingPagePayloads = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) => index + 2).map(async (page) => {
              const response = await fetch(
                `/api/quran/verses/by_chapter/${selectedChapter.id}?${baseParams}&translations=${translationId}&page=${page}`
              );
              const payload = await response.json();

              if (!response.ok) {
                throw new Error(payload?.message || `Failed to fetch verses page ${page}`);
              }

              return payload;
            })
          );

          return {
            ...firstPayload,
            verses: [
              ...(Array.isArray(firstPayload?.verses) ? firstPayload.verses : []),
              ...remainingPagePayloads.flatMap((payload) => (Array.isArray(payload?.verses) ? payload.verses : [])),
            ],
          };
        }

        let payload = await fetchAllVersePages(131);
        const hasTranslation = (payload?.verses || []).some((verse) =>
          Boolean(verse?.translations?.[0]?.text || verse?.translations?.[0]?.translation)
        );

        if (!hasTranslation) {
          const fallbackPayload = await fetchAllVersePages(85);
          if (Array.isArray(fallbackPayload?.verses) && fallbackPayload.verses.length > 0) {
            payload = fallbackPayload;
          }
        }

        if (!isCancelled) {
          setVerses(payload?.verses || []);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || 'Unexpected error while loading verses');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingVerses(false);
        }
      }
    }

    loadVerses();

    return () => {
      isCancelled = true;
    };
  }, [selectedChapter]);

  useEffect(() => {
    localStorage.setItem(COIN_STORAGE_KEY, String(coins));
  }, [coins]);

  useEffect(() => {
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(Array.from(bookmarks)));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem(BOOKMARK_DETAILS_STORAGE_KEY, JSON.stringify(bookmarkDetails));
  }, [bookmarkDetails]);

  useEffect(() => {
    localStorage.setItem(JOURNAL_ENTRIES_STORAGE_KEY, JSON.stringify(journalEntries));
  }, [journalEntries]);

  useEffect(() => {
    actionLogRef.current = actionLog;
    localStorage.setItem(ACTION_LOG_STORAGE_KEY, JSON.stringify(actionLog));
  }, [actionLog]);

  useEffect(() => {
    if (!selectedChapter?.id || !verses.length) {
      return;
    }

    setBookmarkDetails((current) => {
      let changed = false;
      const next = { ...current };

      verses.forEach((verse) => {
        const verseId = getVerseId(verse);
        if (!bookmarks.has(verseId) || next[verseId]) {
          return;
        }

        changed = true;
        next[verseId] = {
          chapterId: selectedChapter.id,
          verseKey: verse.verse_key || '',
          surahName: selectedChapter.name_simple || '',
          preview: buildBookmarkPreview(verse),
        };
      });

      return changed ? next : current;
    });
  }, [bookmarks, verses, selectedChapter]);

  useEffect(() => {
    streakRef.current = streak;
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streak));
  }, [streak]);

  useEffect(() => {
    setStreak((current) => normalizeStreakForToday(current));
  }, []);

  useEffect(() => {
    dailyCoinsRef.current = dailyCoins;
    localStorage.setItem(DAILY_COINS_STORAGE_KEY, JSON.stringify(dailyCoins));
  }, [dailyCoins]);

  useEffect(() => {
    lifetimeCoinsRef.current = lifetimeCoins;
    localStorage.setItem(LIFETIME_COINS_STORAGE_KEY, String(lifetimeCoins));
  }, [lifetimeCoins]);

  useEffect(() => {
    const selectedGoal = DAILY_GOAL_OPTIONS.find((option) => option.id === dailyGoal) || DAILY_GOAL_OPTIONS[1];
    localStorage.setItem(
      DAILY_GOAL_STORAGE_KEY,
      JSON.stringify({
        id: selectedGoal.id,
        targetVerses: selectedGoal.targetVerses,
        label: selectedGoal.label,
      })
    );
  }, [dailyGoal]);

  useEffect(() => {
    localStorage.setItem('tilawah_profile_name', profileName);
  }, [profileName]);

  useEffect(() => {
    if (activePage !== 'profile') {
      setHeatmapTooltip(null);
    }
  }, [activePage]);

  useEffect(() => {
    localStorage.setItem(SHOW_TRANSLATION_STORAGE_KEY, String(showTranslation));
  }, [showTranslation]);

  useEffect(() => {
    localStorage.setItem(READER_THEME_STORAGE_KEY, readerTheme);
    document.documentElement.setAttribute('data-theme', readerTheme);
    if (document.body) {
      document.body.setAttribute('data-theme', readerTheme);
    }
  }, [readerTheme]);

  useEffect(() => {
    localStorage.setItem(RECITER_ID_STORAGE_KEY, String(selectedReciterId));
    setAudioByChapter({});
    closeAudioBar();
  }, [selectedReciterId]);

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsSettingsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    function updateHeaderHeight() {
      const nextHeight = readingHeaderRef.current?.offsetHeight || 0;
      setReadingHeaderHeight((current) => (current === nextHeight ? current : nextHeight));
    }

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);

    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, [selectedChapter, profileName, activePage]);

  useEffect(() => {
    function updateReadingProgress() {
      if (activePage !== 'reader' || !verses.length || !surahContentRef.current) {
        setReadingProgress(0);
        return;
      }

      const contentNode = surahContentRef.current;
      const rect = contentNode.getBoundingClientRect();
      const sectionTop = window.scrollY + rect.top;
      const sectionHeight = contentNode.scrollHeight;
      const viewportHeight = window.innerHeight;

      const scrollTop = Math.max(0, window.scrollY - sectionTop);
      const maxScroll = Math.max(sectionHeight - viewportHeight, 1);
      const nextProgress = Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));

      setReadingProgress((current) => (Math.abs(current - nextProgress) < 0.1 ? current : nextProgress));
    }

    updateReadingProgress();
    window.addEventListener('scroll', updateReadingProgress, { passive: true });
    window.addEventListener('resize', updateReadingProgress);

    return () => {
      window.removeEventListener('scroll', updateReadingProgress);
      window.removeEventListener('resize', updateReadingProgress);
    };
  }, [activePage, verses, selectedChapter]);

  useEffect(() => {
    return () => {
      if (activeReadTimerRef.current) {
        clearTimeout(activeReadTimerRef.current);
        activeReadTimerRef.current = null;
      }

      if (wordAudioRef.current) {
        wordAudioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    function handleOutsideWordClick(event) {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      if (event.target.closest('.arabic-click-surface') || event.target.closest('.word-tooltip-float')) {
        return;
      }

      setWordTooltip(null);
      setHoveredWord(null);
    }

    document.addEventListener('mousedown', handleOutsideWordClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideWordClick);
    };
  }, []);

  const filteredChapters = useMemo(() => {
    const query = chapterSearch.trim().toLowerCase();
    if (!query) {
      return chapters;
    }

    return chapters.filter((chapter) => {
      const english = `${chapter.name_simple || ''} ${chapter.name_complex || ''}`.toLowerCase();
      const arabic = `${chapter.name_arabic || ''}`.toLowerCase();
      return english.includes(query) || arabic.includes(query);
    });
  }, [chapterSearch, chapters]);

  const bookmarkItems = useMemo(() => {
    const parseVerseNumber = (verseKey) => {
      const parts = String(verseKey || '').split(':');
      const parsed = Number.parseInt(parts[1] || '0', 10);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return Array.from(bookmarks)
      .map((verseId) => {
        const detail = bookmarkDetails[verseId];
        if (detail) {
          return {
            verseId,
            chapterId: Number(detail.chapterId) || null,
            verseKey: detail.verseKey || '',
            surahName: detail.surahName || 'Unknown Surah',
            preview: detail.preview || 'Saved verse',
          };
        }

        return {
          verseId,
          chapterId: null,
          verseKey: '',
          surahName: 'Unknown Surah',
          preview: `Saved verse #${verseId}`,
        };
      })
      .sort((a, b) => {
        if (a.chapterId !== b.chapterId) {
          return (a.chapterId || 9999) - (b.chapterId || 9999);
        }

        return parseVerseNumber(a.verseKey) - parseVerseNumber(b.verseKey);
      });
  }, [bookmarks, bookmarkDetails]);

  const sortedJournalEntries = useMemo(() => {
    return [...journalEntries].sort((a, b) => {
      const aTime = new Date(a.date || 0).getTime();
      const bTime = new Date(b.date || 0).getTime();
      return bTime - aTime;
    });
  }, [journalEntries]);

  const recentReflectionPreview = useMemo(() => sortedJournalEntries.slice(0, 3), [sortedJournalEntries]);

  const journalEntriesForCurrentSurah = useMemo(() => {
    const currentSurahId = Number(selectedChapter?.id);
    if (!Number.isFinite(currentSurahId)) {
      return [];
    }

    return sortedJournalEntries.filter((entry) => {
      const verseKey = String(entry?.verseKey || '');
      const surahPart = Number.parseInt(verseKey.split(':')[0] || '', 10);
      return surahPart === currentSurahId;
    });
  }, [sortedJournalEntries, selectedChapter?.id]);

  const journalEntriesForCurrentSurahText = useMemo(() => {
    if (!journalEntriesForCurrentSurah.length) {
      return '';
    }

    return journalEntriesForCurrentSurah
      .slice(0, 8)
      .map((entry) => {
        const answer = String(entry.answer || '').trim() || 'No reflection written yet.';
        return `${entry.verseKey} (${new Date(entry.date).toLocaleDateString()}): ${answer}`;
      })
      .join('\n');
  }, [journalEntriesForCurrentSurah]);

  function addCoins(amount) {
    setCoins((current) => current + amount);
  }

  function earnCoinsForAction(actionType, verseId, baseAmount) {
    const dateKey = getTodayKey();
    const verseKey = String(verseId);

    const latestActionLog = actionLogRef.current;
    const todayEntry = latestActionLog[dateKey] || { read: [], tafsir: [] };
    const todayActionSet = new Set((todayEntry[actionType] || []).map(String));

    if (todayActionSet.has(verseKey)) {
      return 0;
    }

    todayActionSet.add(verseKey);

    const nextActionLog = {
      ...latestActionLog,
      [dateKey]: {
        ...todayEntry,
        [actionType]: Array.from(todayActionSet),
      },
    };

    actionLogRef.current = nextActionLog;
    setActionLog(nextActionLog);

    let nextStreakCount = Number(streakRef.current.currentStreak || 0);
    if (actionType === 'read') {
      const currentStreakData = streakRef.current;
      const todaysCount = Number(currentStreakData.activityLog?.[dateKey] || 0);
      const isFirstReadToday = todaysCount === 0;
      const previousDate = currentStreakData.lastReadDate;

      let updatedCurrentStreak = Number(currentStreakData.currentStreak || 0);
      let updatedLastReadDate = previousDate;

      if (isFirstReadToday) {
        if (previousDate === getPreviousDateKey(dateKey)) {
          updatedCurrentStreak = Math.max(1, updatedCurrentStreak + 1);
        } else if (previousDate === dateKey) {
          updatedCurrentStreak = Math.max(1, updatedCurrentStreak);
        } else {
          updatedCurrentStreak = 1;
        }
        updatedLastReadDate = dateKey;
      }

      const nextStreakData = {
        lastReadDate: updatedLastReadDate,
        currentStreak: updatedCurrentStreak,
        longestStreak: Math.max(Number(currentStreakData.longestStreak || 0), updatedCurrentStreak),
        activityLog: {
          ...(currentStreakData.activityLog || {}),
          [dateKey]: todaysCount + 1,
        },
      };

      streakRef.current = nextStreakData;
      setStreak(nextStreakData);
      nextStreakCount = updatedCurrentStreak;
    }

    const nextMultiplier = nextStreakCount >= 7 ? 2 : 1;
    const earnedCoins = baseAmount * nextMultiplier;

    const nextDailyCoins = {
      ...dailyCoinsRef.current,
      [dateKey]: Number(dailyCoinsRef.current[dateKey] || 0) + earnedCoins,
    };
    dailyCoinsRef.current = nextDailyCoins;
    setDailyCoins(nextDailyCoins);
    const nextLifetimeCoins = lifetimeCoinsRef.current + earnedCoins;
    lifetimeCoinsRef.current = nextLifetimeCoins;
    setLifetimeCoins(nextLifetimeCoins);

    addCoins(earnedCoins);

    return earnedCoins;
  }

  function assignVerseRef(verseId, node) {
    if (node) {
      verseRefs.current.set(String(verseId), node);
      return;
    }

    verseRefs.current.delete(String(verseId));
  }

  function awardReadCoin(verseId) {
    const key = String(verseId);
    earnCoinsForAction('read', key, 1);
  }

  function clearActiveReadTimer() {
    if (activeReadTimerRef.current) {
      clearTimeout(activeReadTimerRef.current);
      activeReadTimerRef.current = null;
    }
  }

  function getMostCenteredVerseId() {
    if (verseRefs.current.size === 0) {
      return '';
    }

    const viewportCenterY = window.innerHeight / 2;
    let closestVerseId = '';
    let closestDistance = Number.POSITIVE_INFINITY;

    verseRefs.current.forEach((node, verseId) => {
      const rect = node.getBoundingClientRect();

      if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
        return;
      }

      const verseCenterY = rect.top + rect.height / 2;
      const distance = Math.abs(verseCenterY - viewportCenterY);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestVerseId = verseId;
      }
    });

    return closestVerseId;
  }

  function getNextUnreadVerseId() {
    const dateKey = getTodayKey();
    const readSet = new Set((actionLogRef.current[dateKey]?.read || []).map(String));

    for (const verse of verses) {
      const verseId = String(getVerseId(verse));
      if (!readSet.has(verseId)) {
        return verseId;
      }
    }

    return '';
  }

  function updateCenteredVerseTracking() {
    const centeredVerseId = getMostCenteredVerseId();
    const nextUnreadVerseId = getNextUnreadVerseId();

    setCenteredVerseId((current) => (current === centeredVerseId ? current : centeredVerseId));

    if (!nextUnreadVerseId) {
      activeCenteredVerseIdRef.current = '';
      clearActiveReadTimer();
      return;
    }

    if (!centeredVerseId) {
      activeCenteredVerseIdRef.current = '';
      clearActiveReadTimer();
      return;
    }

    if (centeredVerseId !== nextUnreadVerseId) {
      activeCenteredVerseIdRef.current = '';
      clearActiveReadTimer();
      return;
    }

    if (activeCenteredVerseIdRef.current === centeredVerseId) {
      return;
    }

    activeCenteredVerseIdRef.current = centeredVerseId;
    clearActiveReadTimer();

    activeReadTimerRef.current = window.setTimeout(() => {
      const latestCenteredId = getMostCenteredVerseId();
      const latestNextUnreadVerseId = getNextUnreadVerseId();
      if (latestCenteredId !== centeredVerseId || latestNextUnreadVerseId !== centeredVerseId) {
        return;
      }

      awardReadCoin(centeredVerseId);
      activeReadTimerRef.current = null;
    }, READ_AWARD_DELAY_MS);
  }

  async function copyVerseText(verseId, arabicText) {
    try {
      await navigator.clipboard.writeText(arabicText || '');
      const key = String(verseId);
      setCopiedVerseId(key);
      window.setTimeout(() => {
        setCopiedVerseId((current) => (current === key ? '' : current));
      }, 1000);
    } catch {
      setError('Could not copy verse text');
    }
  }

  useEffect(() => {
    activeCenteredVerseIdRef.current = '';
    clearActiveReadTimer();

    const onScrollOrResize = () => {
      updateCenteredVerseTracking();
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    // Initialize centered detection after verse elements are rendered.
    const initTimer = window.setTimeout(() => {
      updateCenteredVerseTracking();
    }, 0);

    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      window.clearTimeout(initTimer);
      clearActiveReadTimer();
    };
  }, [verses, actionLog]);

  useEffect(() => {
    async function ensureChapterTafsirLoaded() {
      const chapterId = selectedChapter?.id;
      if (!chapterId || tafsirByChapter[chapterId]) {
        return;
      }

      setIsLoadingTafsir(true);
      try {
        const response = await fetch(`/api/quran/verses/by_chapter/${chapterId}?tafsirs=169`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message || 'Failed to fetch tafsir');
        }

        setTafsirByChapter((current) => ({
          ...current,
          [chapterId]: buildTafsirMap(payload?.verses || []),
        }));
      } catch (err) {
        setError(err.message || 'Unexpected error while loading tafsir');
      } finally {
        setIsLoadingTafsir(false);
      }
    }

    ensureChapterTafsirLoaded();
  }, [selectedChapter, tafsirByChapter]);

  async function toggleTafsir(verseId) {
    const chapterId = selectedChapter?.id;
    if (!chapterId) {
      return;
    }

    if (expandedTafsir[verseId]) {
      setExpandedTafsir((current) => ({
        ...current,
        [verseId]: false,
      }));
      return;
    }

    if (!tafsirByChapter[chapterId]) {
      setIsLoadingTafsir(true);
      try {
        const response = await fetch(`/api/quran/verses/by_chapter/${chapterId}?tafsirs=169`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message || 'Failed to fetch tafsir');
        }

        setTafsirByChapter((current) => ({
          ...current,
          [chapterId]: buildTafsirMap(payload?.verses || []),
        }));
      } catch (err) {
        setError(err.message || 'Unexpected error while loading tafsir');
        setIsLoadingTafsir(false);
        return;
      }
      setIsLoadingTafsir(false);
    }

    earnCoinsForAction('tafsir', verseId, 3);
    setExpandedTafsir((current) => ({
      ...current,
      [verseId]: true,
    }));
  }

  function toggleBookmark(verse) {
    const verseId = getVerseId(verse);
    const isAlreadyBookmarked = bookmarks.has(verseId);

    setBookmarks((current) => {
      const next = new Set(current);
      if (next.has(verseId)) {
        next.delete(verseId);
      } else {
        next.add(verseId);
      }
      return next;
    });

    if (isAlreadyBookmarked) {
      setBookmarkDetails((current) => {
        if (!current[verseId]) {
          return current;
        }

        const next = { ...current };
        delete next[verseId];
        return next;
      });
      return;
    }

    setBookmarkDetails((current) => ({
      ...current,
      [verseId]: {
        chapterId: selectedChapter?.id || null,
        verseKey: verse.verse_key || '',
        surahName: selectedChapter?.name_simple || '',
        preview: buildBookmarkPreview(verse),
      },
    }));
  }

  function navigateToBookmark(bookmark) {
    if (!bookmark.chapterId) {
      return;
    }

    const targetChapter = chapters.find((chapter) => chapter.id === bookmark.chapterId);
    if (!targetChapter) {
      return;
    }

    setPendingBookmarkJump({
      chapterId: bookmark.chapterId,
      verseId: String(bookmark.verseId),
    });
    setSelectedChapter(targetChapter);
    setIsDrawerOpen(false);
  }

  async function openReflectionForVerse(verse) {
    const verseId = getVerseId(verse);
    const verseKey = String(verse.verse_key || verseId);
    const verseText = String(verse.text_uthmani || '');
    const translation =
      verse.translations?.[0]?.text ||
      verse.translations?.[0]?.translation ||
      verse.translation?.text ||
      '';

    setReflectionModal({
      mode: 'new',
      verseKey,
      verseText,
      translation,
      answer: '',
      date: new Date().toISOString(),
    });
  }

  function openJournalEntry(entry) {
    const entryIndex = journalEntries.findIndex((item) => item === entry);
    setReflectionModal({
      mode: 'saved',
      entryIndex,
      verseKey: String(entry.verseKey || ''),
      verseText: String(entry.verseText || ''),
      translation: String(entry.translation || ''),
      answer: String(entry.answer || ''),
      date: String(entry.date || new Date().toISOString()),
    });
    setIsDrawerOpen(false);
  }

  function saveReflectionEntry() {
    if (!reflectionModal) {
      return;
    }

    const entry = {
      verseKey: reflectionModal.verseKey,
      verseText: reflectionModal.verseText,
      translation: reflectionModal.translation,
      answer: reflectionModal.answer,
      date: reflectionModal.date || new Date().toISOString(),
    };

    setJournalEntries((current) => {
      if (reflectionModal.mode === 'saved' && Number.isInteger(reflectionModal.entryIndex)) {
        return current.map((item, index) => (index === reflectionModal.entryIndex ? entry : item));
      }

      return [entry, ...current];
    });

    setReflectionModal(null);
  }

  function openCompanion() {
    if (!companionMessages.length) {
      setCompanionMessages([
        {
          role: 'assistant',
          content: `As-salamu alaykum! I can see you're reading ${currentSurahForCompanion}. Ask me anything about this verse or surah — its meaning, context, tafsir, or anything else on your mind.`,
        },
      ]);
    }
    setIsCompanionOpen(true);
  }

  async function sendCompanionMessage() {
    const content = companionInput.trim();
    if (!content || isCompanionTyping) {
      return;
    }

    const nextMessages = [...companionMessages, { role: 'user', content }];
    setCompanionMessages(nextMessages);
    setCompanionInput('');
    setIsCompanionTyping(true);

    try {
      const requestBody = JSON.stringify({
        messages: nextMessages,
        currentVerse: currentVerseForCompanion,
        currentSurah: currentSurahForCompanion,
        currentTranslation: currentTranslationForCompanion,
        journalEntriesForCurrentSurah: journalEntriesForCurrentSurahText,
        surahVerses: verses.map((verse) => ({
          verseKey: verse.verse_key,
          verseNumber: verse.verse_number,
          translation: stripHtmlTags(
            verse?.translations?.[0]?.text ||
              verse?.translations?.[0]?.translation ||
              verse?.translation?.text ||
              ''
          ),
        })),
      });

      let response = await fetch('/api/ai/companion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      if (response.status === 503) {
        setError('Gemini is busy, retrying...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        response = await fetch('/api/ai/companion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody,
        });
      }

      const payload = await response.json();

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error('The AI is temporarily busy. Please try again in a moment.');
        }
        throw new Error(payload?.message || payload?.error || 'Failed to get companion reply');
      }

      setError('');

      const reply = String(payload?.reply || '').trim() || 'I am here with you. Could you rephrase that question?';
      setCompanionMessages((current) => [...current, { role: 'assistant', content: reply }]);
    } catch (err) {
      setCompanionMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'The AI is temporarily busy. Please try again in a moment.',
        },
      ]);
      setError(err.message || 'The AI is temporarily busy. Please try again in a moment.');
    } finally {
      setIsCompanionTyping(false);
    }
  }

  useEffect(() => {
    if (!pendingBookmarkJump || selectedChapter?.id !== pendingBookmarkJump.chapterId) {
      return;
    }

    const matchedVerse = verses.find((verse) => verse.verse_key === pendingBookmarkJump.verseKey);
    const targetVerseId = pendingBookmarkJump.verseId
      ? String(pendingBookmarkJump.verseId)
      : matchedVerse
        ? String(getVerseId(matchedVerse))
        : '';
    const targetNode = verseRefs.current.get(targetVerseId);
    if (!targetNode) {
      return;
    }

    targetNode.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    });
    setPendingBookmarkJump(null);
  }, [pendingBookmarkJump, selectedChapter, verses]);

  useEffect(() => {
    if (!isVoiceMirrorOpen || voiceMirrorState !== 'mirror') {
      return;
    }

    drawVoiceMirrorUserCanvas();
  }, [isVoiceMirrorOpen, voiceMirrorState, voiceMirrorWordRows]);

  useEffect(() => {
    if (!isVoiceMirrorOpen || voiceMirrorState !== 'mirror') {
      setVoiceMirrorAnimatedPercent(0);
      return;
    }

    const targetPercent = Math.max(0, Math.min(100, Number(voiceMirrorScore.percent || 0)));
    setVoiceMirrorAnimatedPercent(0);

    const durationMs = 900;
    let startTime = 0;

    const animate = (timestamp) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - progress) * (1 - progress);
      setVoiceMirrorAnimatedPercent(Math.round(targetPercent * eased));

      if (progress < 1) {
        voiceMirrorScoreAnimationRef.current = requestAnimationFrame(animate);
      }
    };

    if (voiceMirrorScoreAnimationRef.current) {
      cancelAnimationFrame(voiceMirrorScoreAnimationRef.current);
    }
    voiceMirrorScoreAnimationRef.current = requestAnimationFrame(animate);

    return () => {
      if (voiceMirrorScoreAnimationRef.current) {
        cancelAnimationFrame(voiceMirrorScoreAnimationRef.current);
        voiceMirrorScoreAnimationRef.current = 0;
      }
    };
  }, [isVoiceMirrorOpen, voiceMirrorState, voiceMirrorScore.percent]);

  useEffect(() => {
    if (!isVoiceMirrorOpen || voiceMirrorState !== 'mirror' || !matchedVerse?.verseKey) {
      return;
    }

    fetchVoiceMirrorVerseAudio(matchedVerse.verseKey);
  }, [isVoiceMirrorOpen, voiceMirrorState, matchedVerse?.verseKey, selectedReciterId]);

  useEffect(() => {
    return () => {
      if (voiceMirrorScoreAnimationRef.current) {
        cancelAnimationFrame(voiceMirrorScoreAnimationRef.current);
      }
      stopVoiceMirrorMediaCapture();
      stopAndReleaseVoiceMirrorUserAudio();
      stopAndReleaseVoiceMirrorReciterAudio();
      stopVoiceMirrorCanvasAnimation();
      if (voiceMirrorAudioContextRef.current) {
        voiceMirrorAudioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  async function loadChapterAudio(chapterId, options = {}) {
    const { silent = false } = options;
    const cacheKey = `${selectedReciterId}:${chapterId}`;
    if (audioByChapter[cacheKey]) {
      return audioByChapter[cacheKey];
    }

    if (!silent) {
      setIsLoadingAudio(true);
    }

    try {
      const response = await fetch(`/api/quran/recitations/${selectedReciterId}/by_chapter/${chapterId}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to fetch audio files');
      }

      const chapterMap = buildAudioMap(payload?.audio_files || []);
      setAudioByChapter((current) => ({
        ...current,
        [cacheKey]: chapterMap,
      }));

      return chapterMap;
    } finally {
      if (!silent) {
        setIsLoadingAudio(false);
      }
    }
  }

  function scrollVerseIntoView(verseId) {
    const targetNode = verseRefs.current.get(String(verseId));
    if (!targetNode) {
      return;
    }

    targetNode.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    });
  }

  async function prefetchNextVerseAudio(currentIndex) {
    const chapterId = selectedChapter?.id;
    if (!chapterId) {
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= verses.length) {
      nextAudioPrefetchRef.current = null;
      return;
    }

    const currentVerse = verses[currentIndex];
    const nextVerse = verses[nextIndex];
    if (!currentVerse || !nextVerse) {
      return;
    }

    const currentVerseId = String(getVerseId(currentVerse));
    const nextVerseId = String(getVerseId(nextVerse));
    const currentPrefetch = nextAudioPrefetchRef.current;
    if (currentPrefetch && currentPrefetch.fromVerseId === currentVerseId && currentPrefetch.toVerseId === nextVerseId) {
      return;
    }

    const chapterAudio = await loadChapterAudio(chapterId, { silent: true });
    const nextVerseKey = nextVerse.verse_key;
    const nextUrl = chapterAudio[nextVerseKey];

    if (!nextUrl) {
      nextAudioPrefetchRef.current = null;
      return;
    }

    const warmupAudio = new Audio();
    warmupAudio.preload = 'auto';
    warmupAudio.src = nextUrl;
    warmupAudio.load();

    nextAudioPrefetchRef.current = {
      fromVerseId: currentVerseId,
      toVerseId: nextVerseId,
      verseKey: nextVerseKey,
      verseNumber: Number(nextVerse.verse_number || String(nextVerseKey).split(':')[1] || 0),
      verseText: String(nextVerse.text_uthmani || ''),
      url: nextUrl,
    };
  }

  async function playVerseAudio(verse) {
    return playVerseAudioWithOptions(verse, { forcePlay: false });
  }

  async function playVerseAudioWithOptions(verse, options = {}) {
    const { forcePlay = false } = options;
    const chapterId = selectedChapter?.id;
    const audioEl = audioRef.current;
    if (!chapterId || !audioEl) {
      return;
    }

    const verseId = getVerseId(verse);
    const verseKey = verse.verse_key;
    const verseNumber = Number(verse.verse_number || String(verseKey).split(':')[1] || 0);

    if (currentAudio?.verseId === verseId) {
      if (forcePlay) {
        try {
          setIsAudioBarVisible(true);
          audioEl.currentTime = 0;
          await audioEl.play();
        } catch {
          setError('Could not resume audio playback');
        }
        return;
      }

      if (isAudioPlaying) {
        audioEl.pause();
      } else {
        try {
          setIsAudioBarVisible(true);
          await audioEl.play();
        } catch {
          setError('Could not resume audio playback');
        }
      }
      return;
    }

    setError('');

    try {
      audioEl.pause();
      const chapterAudio = await loadChapterAudio(chapterId);
      const audioUrl = chapterAudio[verseKey];

      if (!audioUrl) {
        setError('Audio not available for this verse');
        return;
      }

      setCurrentAudio({
        chapterId,
        verseId,
        verseKey,
        verseNumber,
        verseText: String(verse.text_uthmani || ''),
        chapterName: selectedChapter?.name_simple || '',
        url: audioUrl,
      });
      setIsAudioBarVisible(true);
      setAudioProgress(0);
      nextAudioPrefetchRef.current = null;
      lastPrefetchSourceVerseIdRef.current = '';

      if (audioEl.src !== audioUrl) {
        audioEl.src = audioUrl;
      }

      audioEl.currentTime = 0;

      await audioEl.play();
    } catch (err) {
      setError(err.message || 'Failed to start audio playback');
    }
  }

  const currentVerseIndex = useMemo(() => {
    if (!currentAudio?.verseId) {
      return -1;
    }

    return verses.findIndex((verse) => getVerseId(verse) === String(currentAudio.verseId));
  }, [verses, currentAudio]);

  const hasPreviousVerse = currentVerseIndex > 0;
  const hasNextVerse = currentVerseIndex >= 0 && currentVerseIndex < verses.length - 1;

  function stopVoiceMirrorCanvasAnimation() {
    if (voiceMirrorAnimationFrameRef.current) {
      cancelAnimationFrame(voiceMirrorAnimationFrameRef.current);
      voiceMirrorAnimationFrameRef.current = 0;
    }
  }

  function drawVoiceMirrorUserCanvas() {
    const canvas = voiceMirrorLeftCanvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const points = voiceMirrorWordRows.length > 0 ? voiceMirrorWordRows : [{ matched: false }];
    const barWidth = Math.max(6, Math.floor(width / (points.length * 1.5)));
    const gap = Math.max(3, Math.floor(barWidth * 0.35));
    let x = 8;

    points.forEach((point, index) => {
      const variance = (index % 6) * 3;
      const barHeight = Math.min(height - 14, 18 + variance + (point.matched ? 12 : 4));
      const y = height - barHeight - 6;
      ctx.fillStyle = point.matched ? 'rgba(45, 106, 90, 0.6)' : 'rgba(180, 70, 70, 0.65)';
      ctx.fillRect(x, y, barWidth, barHeight);
      x += barWidth + gap;
      if (x >= width - barWidth) {
        x = 8;
      }
    });
  }

  function drawVoiceMirrorReciterCanvas() {
    const canvas = voiceMirrorRightCanvasRef.current;
    const analyser = voiceMirrorAnalyserRef.current;
    if (!canvas || !analyser) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const width = canvas.width;
    const height = canvas.height;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, width, height);

      const barWidth = Math.max(2, (width / bufferLength) * 1.75);
      let x = 0;
      for (let i = 0; i < bufferLength; i += 1) {
        const level = dataArray[i] / 255;
        const barHeight = Math.max(2, level * (height - 8));
        const y = height - barHeight;
        ctx.fillStyle = 'rgba(45, 106, 90, 0.78)';
        ctx.fillRect(x, y, barWidth, barHeight);
        x += barWidth + 1;
        if (x > width) {
          break;
        }
      }

      voiceMirrorAnimationFrameRef.current = requestAnimationFrame(renderFrame);
    };

    stopVoiceMirrorCanvasAnimation();
    renderFrame();
  }

  function computeVoiceMirrorComparison(transcribedText, verseText) {
    function levenshtein(a, b) {
      const dp = Array.from({ length: b.length + 1 }, (_, index) => index);

      for (let i = 1; i <= a.length; i += 1) {
        let prev = i;
        for (let j = 1; j <= b.length; j += 1) {
          const value =
            a[i - 1] === b[j - 1]
              ? dp[j - 1]
              : 1 + Math.min(dp[j - 1], dp[j], prev);
          dp[j - 1] = prev;
          prev = value;
        }
        dp[b.length] = prev;
      }

      return dp[b.length];
    }

    function wordSimilarity(a, b) {
      const na = normalizeArabicComparisonWord(a);
      const nb = normalizeArabicComparisonWord(b);

      if (!na && !nb) {
        return 1;
      }
      if (!na || !nb) {
        return 0;
      }
      if (na === nb) {
        return 1;
      }

      const longer = na.length >= nb.length ? na : nb;
      if (!longer.length) {
        return 1;
      }

      const editDist = levenshtein(na, nb);
      return Math.max(0, (longer.length - editDist) / longer.length);
    }

    const quranWords = String(verseText || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const userWords = String(transcribedText || '')
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const scorableWordCount = quranWords.length;
    const rows = quranWords.map((quranWord, index) => {
      const userWord = userWords[index] || '';
      const normalizedUserWord = normalizeArabicComparisonWord(userWord);
      const normalizedQuranWord = normalizeArabicComparisonWord(quranWord);
      const similarityScore = wordSimilarity(userWord, quranWord);
      const matched = similarityScore >= 0.85;

      console.log('[tilawah] Voice Mirror word score', {
        index,
        userWord,
        quranWord,
        normalizedUserWord,
        normalizedQuranWord,
        similarityScore,
        matched,
      });

      return {
        quranWord,
        userWord,
        similarityScore,
        matched,
      };
    });

    const matched = rows.filter((row) => row.similarityScore >= 0.85).length;
    const similarityAverage =
      rows.length > 0
        ? rows.reduce((sum, row) => sum + row.similarityScore, 0) / rows.length
        : 0;
    const percent = Math.round(similarityAverage * 100);

    return {
      rows,
      correctWords: quranWords,
      matched,
      total: scorableWordCount,
      percent,
    };
  }

  function stopAndReleaseVoiceMirrorReciterAudio() {
    setVoiceMirrorReciterAudio((current) => {
      if (!current) {
        return null;
      }

      current.pause();
      current.currentTime = 0;
      current.removeAttribute('src');
      return null;
    });
    setIsVoiceMirrorReciterPlaying(false);
    setVoiceMirrorReciterProgress(0);
  }

  function stopVoiceMirrorMediaCapture() {
    const recorder = voiceMirrorMediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // Ignore MediaRecorder stop failures.
      }
    }

    const stream = voiceMirrorMediaStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop failures.
        }
      });
      voiceMirrorMediaStreamRef.current = null;
    }
  }

  function stopAndReleaseVoiceMirrorUserAudio() {
    setVoiceMirrorUserAudio((current) => {
      if (!current) {
        return null;
      }

      current.pause();
      current.currentTime = 0;
      current.removeAttribute('src');
      return null;
    });
    setIsVoiceMirrorUserPlaying(false);
    setVoiceMirrorUserProgress(0);

    setVoiceMirrorUserAudioUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return '';
    });
  }

  function findBestLocalVerseMatch(transcribedTextInput, options = {}) {
    const { allowWeak = false } = options;
    const transcribedWords = tokenizeArabicText(transcribedTextInput);
    if (!transcribedWords.length || !verses.length) {
      return null;
    }

    let best = null;
    for (const verse of verses) {
      const verseText = String(verse.text_uthmani || '').trim();
      const verseWords = tokenizeArabicText(verseText);
      const score = computeLooseWordMatchScore(transcribedWords, verseWords);

      if (!best || score.score > best.score.score) {
        best = {
          verse,
          verseText,
          score,
        };
      }
    }

    if (!best) {
      return null;
    }

    // Prefer confidence, but optionally allow weaker fallback to avoid hard dead-end errors.
    const hasStrongSignal = best.score.matchedWords >= 2 || best.score.score >= 0.34;
    const hasWeakSignal = best.score.matchedWords >= 1 || best.score.score >= 0.16;
    if (!hasStrongSignal && !(allowWeak && hasWeakSignal)) {
      return null;
    }

    return {
      verseKey: String(best.verse.verse_key || ''),
      verseText: best.verseText,
      surahName: selectedChapter?.name_simple || '',
      verseNumber: Number(best.verse.verse_number || 0),
      chapterId: Number(selectedChapter?.id || 0),
      matchedWords: best.score.matchedWords,
      totalWords: best.score.totalWords,
    };
  }

  function closeVoiceMirror() {
    const recognition = voiceRecognitionRef.current;
    voiceMirrorShouldMatchRef.current = false;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Ignore stop errors.
      }
    }

    stopAndReleaseVoiceMirrorReciterAudio();
    stopVoiceMirrorMediaCapture();
    stopAndReleaseVoiceMirrorUserAudio();
    setIsVoiceRecording(false);
    setIsVoiceMirrorOpen(false);
  }

  function resetVoiceMirror() {
    const recognition = voiceRecognitionRef.current;
    voiceMirrorShouldMatchRef.current = false;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Ignore stop errors.
      }
    }

    stopAndReleaseVoiceMirrorReciterAudio();
    stopVoiceMirrorMediaCapture();
    stopAndReleaseVoiceMirrorUserAudio();
    setVoiceMirrorState('record');
    setVoiceTranscript('');
    setVoiceMirrorError('');
    setMatchedVerse(null);
    setVoiceMirrorWordRows([]);
    setVoiceMirrorCorrectWords([]);
    setVoiceMirrorScore({ matched: 0, total: 0, percent: 0 });
    setVoiceMirrorUserProgress(0);
    voiceMirrorLiveTranscriptRef.current = '';
    setIsVoiceRecording(false);
  }

  async function runVoiceMirrorMatching(transcribedTextInput) {
    const transcribedText = String(transcribedTextInput || '').trim();
    if (!transcribedText) {
      setVoiceMirrorError('No recitation detected. Please try again.');
      setVoiceMirrorState('record');
      return;
    }

    setVoiceMirrorState('matching');
    setVoiceMirrorError('');

    try {
      const response = await fetch('/api/ai/match-verse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcribedText }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || 'Could not match your recitation to a verse.');
      }

      if (payload?.noMatch) {
        const localFallback =
          findBestLocalVerseMatch(transcribedText) ||
          findBestLocalVerseMatch(transcribedText, { allowWeak: true });
        if (!localFallback) {
          setVoiceMirrorError('No matching verse found. Try reciting a little slower and closer to the verse wording.');
          setVoiceMirrorState('record');
          return;
        }

        setMatchedVerse(localFallback);
        const localComparison = computeVoiceMirrorComparison(transcribedText, localFallback.verseText);
        setVoiceMirrorWordRows(localComparison.rows);
        setVoiceMirrorCorrectWords(localComparison.correctWords);
        setVoiceMirrorScore({
          matched: localComparison.matched,
          total: localComparison.total,
          percent: localComparison.percent,
        });
        setVoiceMirrorState('mirror');
        return;
      }

      const match = {
        verseKey: String(payload?.verseKey || ''),
        verseText: String(payload?.verseText || ''),
        surahName: String(payload?.surahName || ''),
        verseNumber: Number(payload?.verseNumber || 0),
        chapterId: Number(payload?.chapterId || 0),
        matchedWords: Number(payload?.matchedWords || 0),
        totalWords: Number(payload?.totalWords || 0),
      };

      setMatchedVerse(match);

      const comparison = computeVoiceMirrorComparison(transcribedText, match.verseText);
      setVoiceMirrorWordRows(comparison.rows);
      setVoiceMirrorCorrectWords(comparison.correctWords);
      setVoiceMirrorScore({
        matched: comparison.matched,
        total: comparison.total,
        percent: comparison.percent,
      });

      setVoiceMirrorState('mirror');
    } catch (err) {
      setVoiceMirrorError(err.message || 'Could not match your recitation to a verse.');
      setVoiceMirrorState('record');
    }
  }

  async function startVoiceMirrorRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceMirrorError('Speech recognition is not supported in this browser.');
      return;
    }

    setVoiceMirrorError('');
    setVoiceTranscript('');
    setMatchedVerse(null);
    setVoiceMirrorWordRows([]);
    setVoiceMirrorCorrectWords([]);
    setVoiceMirrorScore({ matched: 0, total: 0, percent: 0 });
    stopVoiceMirrorMediaCapture();
    stopAndReleaseVoiceMirrorUserAudio();
    voiceMirrorRecordedChunksRef.current = [];
    voiceMirrorLiveTranscriptRef.current = '';
    voiceMirrorShouldMatchRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceMirrorMediaStreamRef.current = stream;

      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder is not supported in this browser.');
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          voiceMirrorRecordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const chunks = voiceMirrorRecordedChunksRef.current;
        if (!chunks.length) {
          return;
        }

        const blob = new Blob(chunks, { type: mimeType || 'audio/mp4' });
        const objectUrl = URL.createObjectURL(blob);

        setVoiceMirrorUserAudioUrl((currentUrl) => {
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
          }
          return objectUrl;
        });

        const userAudio = new Audio(objectUrl);
        userAudio.preload = 'auto';
        userAudio.onplay = () => setIsVoiceMirrorUserPlaying(true);
        userAudio.onpause = () => setIsVoiceMirrorUserPlaying(false);
        userAudio.onended = () => {
          setIsVoiceMirrorUserPlaying(false);
          setVoiceMirrorUserProgress(100);
        };
        userAudio.ontimeupdate = () => {
          if (!userAudio.duration || Number.isNaN(userAudio.duration)) {
            setVoiceMirrorUserProgress(0);
            return;
          }

          const progress = Math.max(0, Math.min(100, (userAudio.currentTime / userAudio.duration) * 100));
          setVoiceMirrorUserProgress(progress);
        };

        setVoiceMirrorUserAudio((current) => {
          if (current) {
            current.pause();
            current.removeAttribute('src');
          }
          return userAudio;
        });
      };

      voiceMirrorMediaRecorderRef.current = recorder;
      recorder.start();
    } catch {
      setVoiceMirrorError('Could not access microphone recording for playback. Speech matching still works.');
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.interimResults = true;
    recognition.continuous = true;

    let finalizedTranscript = '';

    recognition.onresult = (event) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcriptPart = String(event.results[i][0]?.transcript || '');
        if (event.results[i].isFinal) {
          finalizedTranscript += `${transcriptPart} `;
        } else {
          interimTranscript += transcriptPart;
        }
      }

      const combined = `${finalizedTranscript}${interimTranscript}`.trim();
      voiceMirrorLiveTranscriptRef.current = combined;
      setVoiceTranscript(combined);
    };

    recognition.onerror = (event) => {
      setVoiceMirrorError(`Voice recognition error: ${event.error || 'unknown error'}`);
      setIsVoiceRecording(false);
    };

    recognition.onend = () => {
      setIsVoiceRecording(false);
      const shouldMatch = voiceMirrorShouldMatchRef.current;
      voiceMirrorShouldMatchRef.current = false;
      if (shouldMatch) {
        runVoiceMirrorMatching(voiceMirrorLiveTranscriptRef.current);
      }
    };

    voiceRecognitionRef.current = recognition;
    recognition.start();
    setIsVoiceRecording(true);
  }

  function stopVoiceMirrorRecording({ matchAfterStop = true } = {}) {
    const recorder = voiceMirrorMediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // Ignore MediaRecorder stop failures.
      }
    }

    const stream = voiceMirrorMediaStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop failures.
        }
      });
      voiceMirrorMediaStreamRef.current = null;
    }

    const recognition = voiceRecognitionRef.current;
    if (!recognition) {
      if (matchAfterStop) {
        runVoiceMirrorMatching(voiceMirrorLiveTranscriptRef.current);
      }
      return;
    }

    voiceMirrorShouldMatchRef.current = matchAfterStop;
    try {
      recognition.stop();
    } catch {
      if (matchAfterStop) {
        runVoiceMirrorMatching(voiceMirrorLiveTranscriptRef.current);
      }
    }
  }

  async function fetchVoiceMirrorVerseAudio(verseKey) {
    const [chapter] = String(verseKey || '').split(':');
    if (!chapter) {
      setVoiceMirrorError('Could not determine verse chapter for reciter audio.');
      return;
    }

    const reciterId = localStorage.getItem('selectedReciterId') || localStorage.getItem(RECITER_ID_STORAGE_KEY) || '7';

    try {
      setVoiceMirrorError('');
      stopAndReleaseVoiceMirrorReciterAudio();

      const response = await fetch(`/api/quran/recitations/${reciterId}/by_chapter/${chapter}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Could not fetch reciter audio.');
      }

      console.log('[tilawah] Voice Mirror audio data:', JSON.stringify(payload).substring(0, 500));

      const verseAudio = (payload?.audio_files || []).find((audioFile) => String(audioFile?.verse_key || '') === String(verseKey));
      if (!verseAudio?.url) {
        throw new Error('Reciter audio is unavailable for this verse.');
      }

      const fullUrl = String(verseAudio.url).startsWith('http')
        ? String(verseAudio.url)
        : `https://verses.quran.com/${String(verseAudio.url).replace(/^\/+/, '')}`;

      console.log('[tilawah] Voice Mirror playing:', fullUrl);

      const reciterAudio = new Audio(fullUrl);
      reciterAudio.preload = 'auto';
      reciterAudio.onplay = () => {
        setIsVoiceMirrorReciterPlaying(true);
      };
      reciterAudio.onpause = () => {
        setIsVoiceMirrorReciterPlaying(false);
      };
      reciterAudio.onended = () => {
        setIsVoiceMirrorReciterPlaying(false);
        setVoiceMirrorReciterProgress(100);
      };
      reciterAudio.onloadedmetadata = () => {
        setVoiceMirrorReciterProgress(0);
      };
      reciterAudio.ontimeupdate = () => {
        if (!reciterAudio.duration || Number.isNaN(reciterAudio.duration)) {
          setVoiceMirrorReciterProgress(0);
          return;
        }

        const progress = Math.max(0, Math.min(100, (reciterAudio.currentTime / reciterAudio.duration) * 100));
        setVoiceMirrorReciterProgress(progress);
      };

      setVoiceMirrorReciterAudio(reciterAudio);
      await reciterAudio.play();
    } catch (err) {
      setIsVoiceMirrorReciterPlaying(false);
      setVoiceMirrorReciterProgress(0);
      setVoiceMirrorError(err.message || 'Could not play reciter audio.');
    }
  }

  async function toggleVoiceMirrorReciterAudio() {
    if (!voiceMirrorReciterAudio) {
      if (matchedVerse?.verseKey) {
        await fetchVoiceMirrorVerseAudio(matchedVerse.verseKey);
      }
      return;
    }

    try {
      if (voiceMirrorReciterAudio.paused) {
        await voiceMirrorReciterAudio.play();
      } else {
        voiceMirrorReciterAudio.pause();
      }
    } catch (err) {
      setVoiceMirrorError(err.message || 'Could not play reciter audio.');
    }
  }

  async function toggleVoiceMirrorUserAudio() {
    if (!voiceMirrorUserAudio) {
      return;
    }

    try {
      if (voiceMirrorUserAudio.paused) {
        await voiceMirrorUserAudio.play();
      } else {
        voiceMirrorUserAudio.pause();
      }
    } catch (err) {
      setVoiceMirrorError(err.message || 'Could not play your recording.');
    }
  }

  function openVoiceMirror() {
    resetVoiceMirror();
    setIsVoiceMirrorOpen(true);
  }

  function navigateToMatchedVerse() {
    if (!matchedVerse?.verseKey) {
      return;
    }

    const [chapterPart] = String(matchedVerse.verseKey).split(':');
    const chapterId = Number.parseInt(chapterPart || '', 10);
    const targetChapter = chapters.find((chapter) => chapter.id === chapterId);
    if (targetChapter) {
      setPendingBookmarkJump({
        chapterId,
        verseId: '',
        verseKey: matchedVerse.verseKey,
      });
      setSelectedChapter(targetChapter);
      setActivePage('reader');
      setIsDrawerOpen(false);
      closeVoiceMirror();
    }
  }

  async function transitionToVerseByIndex(nextIndex, options = {}) {
    const { preferPrefetched = false } = options;

    if (nextIndex < 0 || nextIndex >= verses.length) {
      return false;
    }

    const targetVerse = verses[nextIndex];
    const targetVerseId = String(getVerseId(targetVerse));
    scrollVerseIntoView(targetVerseId);

    if (preferPrefetched) {
      const prefetched = nextAudioPrefetchRef.current;
      if (prefetched && prefetched.toVerseId === targetVerseId) {
        const audioEl = audioRef.current;
        const chapterId = selectedChapter?.id;
        if (audioEl && chapterId) {
          try {
            setCurrentAudio({
              chapterId,
              verseId: targetVerseId,
              verseKey: prefetched.verseKey,
              verseNumber: prefetched.verseNumber,
              verseText: prefetched.verseText,
              chapterName: selectedChapter?.name_simple || '',
              url: prefetched.url,
            });
            setIsAudioBarVisible(true);
            setAudioProgress(0);

            audioEl.pause();
            if (audioEl.src !== prefetched.url) {
              audioEl.src = prefetched.url;
            }
            audioEl.currentTime = 0;
            nextAudioPrefetchRef.current = null;
            lastPrefetchSourceVerseIdRef.current = '';
            await audioEl.play();
            return true;
          } catch {
            // Fall through to regular path.
          }
        }
      }
    }

    await playVerseAudioWithOptions(targetVerse, { forcePlay: true });
    return true;
  }

  async function navigateToAdjacentVerse(direction) {
    if (currentVerseIndex < 0) {
      return;
    }

    const nextIndex = currentVerseIndex + direction;
    if (nextIndex < 0 || nextIndex >= verses.length) {
      return;
    }

    await transitionToVerseByIndex(nextIndex, { preferPrefetched: direction === 1 });
  }

  async function toggleGlobalPlayPause() {
    const audioEl = audioRef.current;
    if (!audioEl || !currentAudio) {
      return;
    }

    if (isAudioPlaying) {
      audioEl.pause();
      return;
    }

    try {
      setIsAudioBarVisible(true);
      await audioEl.play();
    } catch {
      setError('Could not resume audio playback');
    }
  }

  useEffect(() => {
    if (!isAudioPlaying || !currentAudio?.verseId) {
      return;
    }

    scrollVerseIntoView(currentAudio.verseId);
  }, [isAudioPlaying, currentAudio?.verseId]);

  function closeAudioBar() {
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.removeAttribute('src');
      audioEl.load();
    }

    setIsAudioPlaying(false);
    setAudioProgress(0);
    setCurrentAudio(null);
    setIsAudioBarVisible(false);
  }

  async function playWordAudio(word, verseId) {
    const audioEl = wordAudioRef.current;
    if (!audioEl) {
      return;
    }

    const key = `${verseId}-${word.id || word.position || word.char_type_name || word.text_uthmani}`;
    const audioUrl = normalizeAudioUrl(word.audio_url || word.audio?.url || '');
    const meaning =
      word.translation_text ||
      word.translation?.text ||
      word.translation ||
      '';

    console.log('[tilawah] word clicked', {
      verseId,
      wordId: word.id,
      position: word.position,
      text: word.text_uthmani || word.text,
      meaning,
      audioUrl,
    });

    if (!audioUrl) {
      return;
    }

    try {
      audioEl.pause();
      if (audioEl.src !== audioUrl) {
        audioEl.src = audioUrl;
      }
      audioEl.currentTime = 0;
      await audioEl.play();
    } catch {
      setError('Could not play word audio');
    }
  }

  async function handleArabicTextClick(verse, event) {
    const container = event.currentTarget;
    const words = buildInteractiveWords(verse);
    if (!words.length) {
      return;
    }

    const wordIndex = findClosestWordIndexByCenter(container, event.clientX, event.clientY);
    const word = words[wordIndex];
    if (!word) {
      return;
    }

    const verseId = getVerseId(verse);
    setWordTooltip({
      verseId,
      wordIndex,
      text: word.translation_text || 'No meaning available.',
      x: event.clientX,
      y: event.clientY,
    });

    await playWordAudio(word, verseId);
  }

  function handleArabicTextMouseMove(verse, event) {
    const container = event.currentTarget;
    const words = buildInteractiveWords(verse);
    if (!words.length) {
      return;
    }

    const wordIndex = findClosestWordIndexByCenter(container, event.clientX, event.clientY);
    if (wordIndex < 0) {
      return;
    }

    const verseId = String(getVerseId(verse));
    setHoveredWord((current) => {
      if (current?.verseId === verseId && current?.wordIndex === wordIndex) {
        return current;
      }

      return { verseId, wordIndex };
    });
  }

  function handleArabicTextMouseLeave() {
    setHoveredWord(null);
  }

  function onAudioTimeUpdate() {
    const audioEl = audioRef.current;
    if (!audioEl || !audioEl.duration) {
      setAudioProgress(0);
      return;
    }

    const progress = (audioEl.currentTime / audioEl.duration) * 100;
    setAudioProgress(progress);

    if (progress >= 50 && currentVerseIndex >= 0 && currentAudio?.verseId) {
      const sourceVerseId = String(currentAudio.verseId);
      if (lastPrefetchSourceVerseIdRef.current !== sourceVerseId) {
        lastPrefetchSourceVerseIdRef.current = sourceVerseId;
        prefetchNextVerseAudio(currentVerseIndex).catch(() => {
          // Prefetch failure should never interrupt active playback.
        });
      }
    }
  }

  function onSeekAudio(event) {
    const audioEl = audioRef.current;
    if (!audioEl || !audioEl.duration) {
      return;
    }

    const nextProgress = Number(event.target.value);
    audioEl.currentTime = (nextProgress / 100) * audioEl.duration;
    setAudioProgress(nextProgress);
  }

  const similarityTone =
    voiceMirrorAnimatedPercent > 70 ? 'high' : voiceMirrorAnimatedPercent >= 50 ? 'mid' : 'low';
  const voiceMirrorMistakes = voiceMirrorWordRows.filter(
    (row) =>
      !row.matched &&
      (String(row.userWord || '').trim() || String(row.quranWord || '').trim())
  );

  return (
    <main className={`reader-layout theme-${readerTheme}`}>
      {activePage === 'reader' && isDrawerOpen ? (
        <button
          type="button"
          className="drawer-backdrop"
          aria-label="Close surah drawer"
          onClick={() => setIsDrawerOpen(false)}
        />
      ) : null}

      {activePage === 'reader' ? <aside className={`surah-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h1>Tilawah</h1>
          <button type="button" className="drawer-close" onClick={() => setIsDrawerOpen(false)}>
            ×
          </button>
        </div>
        <div className="drawer-tabs" role="tablist" aria-label="Drawer tabs">
          <button
            type="button"
            role="tab"
            aria-selected={drawerTab === 'surahs'}
            className={drawerTab === 'surahs' ? 'active' : ''}
            onClick={() => setDrawerTab('surahs')}
          >
            Surahs
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={drawerTab === 'bookmarks'}
            className={drawerTab === 'bookmarks' ? 'active' : ''}
            onClick={() => setDrawerTab('bookmarks')}
          >
            Bookmarks
          </button>
        </div>

        {drawerTab === 'surahs' ? (
          <>
            <input
              className="search-input"
              type="search"
              placeholder="Search surahs..."
              value={chapterSearch}
              onChange={(event) => setChapterSearch(event.target.value)}
            />

            {isLoadingChapters ? <p className="status-text">Loading surahs...</p> : null}

            <div className="surah-list">
              {filteredChapters.map((chapter) => {
                const isActive = selectedChapter?.id === chapter.id;
                return (
                  <button
                    key={chapter.id}
                    className={`surah-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedChapter(chapter);
                      setIsDrawerOpen(false);
                    }}
                    type="button"
                  >
                    <span className="surah-number">{chapter.id}</span>
                    <span className="surah-meta">
                      <strong>{chapter.name_arabic}</strong>
                      <small>{chapter.name_simple}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : drawerTab === 'bookmarks' ? (
          <div className="bookmark-list" role="tabpanel" aria-label="Bookmarks">
            {bookmarkItems.length === 0 ? (
              <p className="bookmark-empty">
                No bookmarks yet — tap the bookmark icon on any verse to save it here.
              </p>
            ) : (
              bookmarkItems.map((bookmark) => (
                <button
                  key={bookmark.verseId}
                  type="button"
                  className="bookmark-item"
                  onClick={() => navigateToBookmark(bookmark)}
                  disabled={!bookmark.chapterId}
                >
                  <strong>{bookmark.surahName}</strong>
                  <span className="bookmark-ref">{bookmark.verseKey || `Verse ${bookmark.verseId}`}</span>
                  <small>{bookmark.preview}</small>
                </button>
              ))
            )}
          </div>
        ) : null}
      </aside> : null}

      <section className="reading-panel">
        {activePage === 'reader' ? <header className="reading-header" ref={readingHeaderRef}>
          <button
            type="button"
            className="surah-menu-trigger"
            onClick={() => {
              setDrawerTab('surahs');
              setIsDrawerOpen(true);
            }}
          >
            {selectedChapter?.name_simple || 'Surahs'} <span aria-hidden="true">▾</span>
          </button>
          <div className="reading-header-info" aria-live="polite">
            Page {centeredVerseData?.page_number || '-'} · Juz {centeredVerseData?.juz_number || '-'} / Hizb {centeredVerseData?.hizb_number || '-'}
          </div>
          <div className="header-right-controls">
            <button
              className="settings-trigger"
              type="button"
              aria-label="Open settings"
              onClick={() => {
                setSettingsTab('style');
                setIsSettingsOpen(true);
              }}
            >
              <span className="settings-icon" aria-hidden="true" />
            </button>
            <button
              className="voice-mirror-trigger"
              type="button"
              aria-label="Open Voice Mirror"
              onClick={openVoiceMirror}
            >
              🎤
            </button>
            <button
              className="user-trigger"
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                setActivePage('profile');
              }}
            >
              {profileName}
            </button>
          </div>
        </header> : null}

        {activePage === 'reader' ? (
          <>
            <div className="reading-progress-track" aria-hidden="true" style={{ top: `${readingHeaderHeight}px` }}>
              <div className="reading-progress-fill" style={{ width: `${readingProgress}%` }} />
            </div>

            <div className="reader-column" ref={surahContentRef}>
            {selectedChapter ? (
              <section className="surah-title-page" aria-label="Surah Header">
                <h1 className="surah-title-ar" lang="ar" dir="rtl" translate="no">
                  {selectedChapter.name_arabic}
                </h1>
                <p className="surah-title-en">{selectedChapter.id}. {selectedChapter.name_simple}</p>
                <p className="surah-title-meaning">{selectedChapter.translated_name?.name || ''}</p>

                {selectedChapter.id !== 9 ? (
                  <>
                    <p className="surah-bismillah" lang="ar" dir="rtl" translate="no">
                      بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                    </p>
                    <p className="surah-bismillah-en">
                      In the Name of Allah - the Most Compassionate, Most Merciful
                    </p>
                  </>
                ) : null}
              </section>
            ) : null}

            {error ? <p className="error-banner">{error}</p> : null}
            {isLoadingVerses ? <p className="status-text">Loading verses...</p> : null}

            <div className="verses-wrap">
              {verses.map((verse) => {
                const verseId = getVerseId(verse);
                const translation =
                  verse.translations?.[0]?.text ||
                  verse.translations?.[0]?.translation ||
                  verse.translation?.text ||
                  '';
                const interactiveWords = buildInteractiveWords(verse);
                const tafsirText = tafsirByChapter[selectedChapter?.id]?.[verseId];
                const isBookmarked = bookmarks.has(verseId);

                return (
                  <article
                    key={verseId}
                    className={`verse-card ${todaysActions.read.has(verseId) ? 'is-read' : ''} ${
                      isAudioPlaying && currentAudio?.verseId === verseId ? 'is-playing' : ''
                    }`}
                    ref={(node) => assignVerseRef(verseId, node)}
                    data-verse-id={verseId}
                  >
                    <div className="verse-top-row">
                      <div className="verse-left-tools">
                        <span className={`verse-key ${todaysActions.read.has(verseId) ? 'read' : ''}`}>{verse.verse_key}</span>
                        <button
                          className="verse-icon-btn"
                          type="button"
                          data-tooltip="Play"
                          onClick={() => playVerseAudio(verse)}
                          disabled={isLoadingAudio}
                          aria-label="Play"
                        >
                          {currentAudio?.verseId === verseId && isAudioPlaying ? '⏸' : '▶'}
                        </button>
                        <button
                          className={`verse-icon-btn ${isBookmarked ? 'active' : ''}`}
                          type="button"
                          data-tooltip="Bookmark"
                          onClick={() => toggleBookmark(verse)}
                          aria-label="Bookmark"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" className="bookmark-svg">
                            <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1z" />
                          </svg>
                        </button>
                      </div>
                      <div className="verse-right-tools">
                        <button
                          className={`verse-icon-btn ${copiedVerseId === verseId ? 'force-tooltip' : ''}`}
                          type="button"
                          data-tooltip={copiedVerseId === verseId ? 'Copied!' : 'Copy'}
                          onClick={() => copyVerseText(verseId, verse.text_uthmani)}
                          aria-label="Copy"
                        >
                          □
                        </button>
                      </div>
                    </div>

                    <div className="arabic-text" dir="rtl" lang="ar" translate="no">
                      <span
                        className="arabic-click-surface"
                        onClick={(event) => handleArabicTextClick(verse, event)}
                        onMouseMove={(event) => handleArabicTextMouseMove(verse, event)}
                        onMouseLeave={handleArabicTextMouseLeave}
                      >
                        {interactiveWords.length > 0
                          ? interactiveWords.map((word, index) => (
                              <span
                                key={`${verseId}-${word.id || index}`}
                                data-word-index={index}
                                className={`arabic-word-segment ${hoveredWord?.verseId === String(verseId) && hoveredWord?.wordIndex === index ? 'hovered' : ''}`}
                              >
                                {word.text_uthmani}
                                {index < interactiveWords.length - 1 ? ' ' : ''}
                              </span>
                            ))
                          : verse.text_uthmani}
                      </span>
                    </div>

                    {showTranslation ? (
                      <div className="translation-box" dangerouslySetInnerHTML={{ __html: translation || 'No translation found.' }} />
                    ) : null}

                    <div className="verse-bottom-row">
                      <button
                        className="tafsir-link-btn"
                        type="button"
                        data-tooltip="Journal"
                        onClick={() => openReflectionForVerse(verse)}
                        aria-label="Open reflection journal"
                      >
                        <span aria-hidden="true">📓</span>
                        <span>Journal</span>
                      </button>
                      <button
                        className={`tafsir-link-btn ${expandedTafsir[verseId] ? 'active' : ''}`}
                        type="button"
                        data-tooltip="Tafsir"
                        onClick={() => toggleTafsir(verseId)}
                        disabled={isLoadingTafsir}
                        aria-label="Tafsir"
                      >
                        <span aria-hidden="true">📖</span>
                        <span>Tafsir</span>
                      </button>
                    </div>

                    {expandedTafsir[verseId] ? (
                      <div className="tafsir-box" dangerouslySetInnerHTML={{ __html: tafsirText || 'No tafsir available for this verse.' }} />
                    ) : null}
                  </article>
                );
              })}
            </div>
            </div>
          </>
        ) : (
          <section className="profile-dashboard">
            <button
              type="button"
              className="profile-back-btn"
              onClick={() => {
                setActivePage('reader');
                setIsFullJournalOpen(false);
              }}
            >
              ← Back to Reading
            </button>

            <header className="profile-hero">
              <h2>As-salamu alaykum, {profileName}</h2>
              <p>
                {gregorianDateLabel}
                {hijriDateLabel ? ` · ${hijriDateLabel} (Hijri)` : ''}
              </p>
            </header>

            <section className="profile-stats-row" aria-label="Reading streak statistics">
              <article className="profile-stat-tile">
                <span>Current Streak</span>
                <strong>🔥 {streakCount}</strong>
              </article>
              <article className="profile-stat-tile">
                <span>Longest Streak</span>
                <strong>{streak.longestStreak || 0}</strong>
              </article>
              <article className="profile-stat-tile">
                <span>Total Days Read</span>
                <strong>{totalDaysRead}</strong>
              </article>
            </section>

            <section className="wird-ring-section" aria-live="polite">
              <h3>Daily Wird Goal</h3>
              <div className="wird-ring-shell">
                <svg viewBox="0 0 160 160" className="wird-ring-svg" aria-hidden="true">
                  <circle className="wird-ring-track" cx="80" cy="80" r={ringRadius} />
                  <circle
                    className="wird-ring-value"
                    cx="80"
                    cy="80"
                    r={ringRadius}
                    style={{
                      strokeDasharray: `${ringCircumference}`,
                      strokeDashoffset: `${ringOffset}`,
                    }}
                  />
                </svg>
                <div className="wird-ring-center">{Math.round(wirdProgress)}%</div>
              </div>

              <p className="wird-ring-caption">
                {todaysReadCount} / {selectedDailyGoal.targetVerses} verses read today
              </p>

              <div className="profile-goal-pills" role="tablist" aria-label="Daily goal options">
                {DAILY_GOAL_OPTIONS.map((option) => {
                  const selected = option.id === dailyGoal;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      className={`profile-goal-pill ${selected ? 'active' : ''}`}
                      onClick={() => setDailyGoal(option.id)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {isWirdComplete ? <p className="wird-complete-banner">Wird complete! 🌙</p> : null}
            </section>

            <section className="journey-section">
              <h3>Your Journey — Last 365 Days</h3>
              <div className="journey-heatmap-shell" role="img" aria-label="Reading activity heatmap">
                <div className="journey-month-labels" style={{ width: `${heatmapCalendar.gridWidth}px` }}>
                  {heatmapCalendar.monthLabels.map((month) => (
                    <span
                      key={`${month.label}-${month.weekIndex}`}
                      className="journey-month-label"
                      style={{ left: `${month.weekIndex * (heatmapCalendar.cellSize + heatmapCalendar.gap)}px` }}
                    >
                      {month.label}
                    </span>
                  ))}
                </div>

                <div className="journey-grid-row">
                  <div className="journey-day-labels" aria-hidden="true">
                    <span className="journey-day-label monday">Mon</span>
                    <span className="journey-day-label wednesday">Wed</span>
                    <span className="journey-day-label friday">Fri</span>
                  </div>

                  <div className="journey-svg-wrap">
                    <svg
                      className="journey-heatmap-svg"
                      width={heatmapCalendar.gridWidth}
                      height={heatmapCalendar.gridHeight}
                      viewBox={`0 0 ${heatmapCalendar.gridWidth} ${heatmapCalendar.gridHeight}`}
                    >
                      {heatmapCalendar.weeks.flatMap((week) =>
                        week.map((day) => (
                          <rect
                            key={day.key}
                            x={day.x}
                            y={day.y}
                            width={heatmapCalendar.cellSize}
                            height={heatmapCalendar.cellSize}
                            rx="2"
                            className={`journey-heatmap-cell-svg level-${day.level} ${day.inRange ? 'in-range' : 'out-range'}`}
                            onMouseEnter={(event) => {
                              if (!day.inRange) {
                                return;
                              }

                              const cellRect = event.currentTarget.getBoundingClientRect();
                              const containerRect = event.currentTarget.ownerSVGElement.getBoundingClientRect();
                              setHeatmapTooltip({
                                text: day.tooltip,
                                left: cellRect.left - containerRect.left + cellRect.width / 2,
                                top: cellRect.top - containerRect.top,
                              });
                            }}
                            onMouseLeave={() => setHeatmapTooltip(null)}
                          />
                        ))
                      )}
                    </svg>

                    {heatmapTooltip ? (
                      <div
                        className="journey-tooltip"
                        style={{ left: `${heatmapTooltip.left}px`, top: `${heatmapTooltip.top}px` }}
                      >
                        {heatmapTooltip.text}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="journey-legend">
                  <span>Less</span>
                  <span className="legend-swatch level-0" aria-hidden="true" />
                  <span className="legend-swatch level-1" aria-hidden="true" />
                  <span className="legend-swatch level-2" aria-hidden="true" />
                  <span className="legend-swatch level-3" aria-hidden="true" />
                  <span className="legend-swatch level-4" aria-hidden="true" />
                  <span>More</span>
                </div>
              </div>
            </section>

            <section className="recent-reflections-section">
              <div className="recent-reflections-header">
                <h3>Recent Reflections</h3>
                <button
                  type="button"
                  className="view-all-btn"
                  onClick={() => setIsFullJournalOpen(true)}
                >
                  View All
                </button>
              </div>
              {recentReflectionPreview.length === 0 ? (
                <p className="recent-reflection-empty">No reflections yet. Your latest journal entries will appear here.</p>
              ) : (
                <div className="recent-reflections-list">
                  {recentReflectionPreview.map((entry) => (
                    <button
                      key={`${entry.verseKey}-${entry.date}`}
                      type="button"
                      className="recent-reflection-item"
                      onClick={() => openJournalEntry(entry)}
                    >
                      <div className="recent-reflection-top">
                        <strong>{entry.verseKey}</strong>
                        <span>{new Date(entry.date).toLocaleDateString()}</span>
                      </div>
                      <p>{entry.answer || 'No reflection written yet.'}</p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}
      </section>

      {activePage === 'reader' ? <div className={`global-audio-bar ${isAudioBarVisible ? 'visible' : ''}`} aria-hidden={!isAudioBarVisible}>
        <div className="audio-meta">
          <strong>{currentAudio ? `${currentAudio.chapterName} · ${currentAudio.verseKey}` : 'No surah selected'}</strong>
          <span>{currentAudio ? currentAudio.verseText || `Verse ${currentAudio.verseNumber}` : 'Choose a verse audio'}</span>
        </div>
        <button
          className="global-nav-btn"
          type="button"
          onClick={() => navigateToAdjacentVerse(-1)}
          disabled={!hasPreviousVerse}
          aria-label="Previous verse"
        >
          ⏮
        </button>
        <button
          className="global-play-btn"
          type="button"
          onClick={toggleGlobalPlayPause}
          disabled={!currentAudio}
        >
          {isAudioPlaying ? '⏸' : '▶'}
        </button>
        <button
          className="global-nav-btn"
          type="button"
          onClick={() => navigateToAdjacentVerse(1)}
          disabled={!hasNextVerse}
          aria-label="Next verse"
        >
          ⏭
        </button>
        <input
          className="audio-progress"
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={audioProgress}
          onChange={onSeekAudio}
          disabled={!currentAudio}
          aria-label="Audio progress"
        />
        <button
          className="global-close-btn"
          type="button"
          aria-label="Close audio player"
          onClick={closeAudioBar}
        >
          ✕
        </button>
        <audio
          ref={audioRef}
          preload="none"
          onPlay={() => setIsAudioPlaying(true)}
          onPause={() => setIsAudioPlaying(false)}
          onEnded={async () => {
            setIsAudioPlaying(false);
            setAudioProgress(100);

            if (hasNextVerse) {
              await transitionToVerseByIndex(currentVerseIndex + 1, { preferPrefetched: true });
            }
          }}
          onTimeUpdate={onAudioTimeUpdate}
        />
        <audio ref={wordAudioRef} preload="none" />
      </div> : null}

      {activePage === 'reader' ? <button
        type="button"
        className="companion-fab"
        aria-label="Open Quran Companion"
        onClick={openCompanion}
      >
        💬
      </button> : null}

      {activePage === 'reader' ? <section className={`companion-panel ${isCompanionOpen ? 'open' : ''}`} aria-hidden={!isCompanionOpen}>
        <header className="companion-header">
          <strong>Quran Companion</strong>
          <button type="button" onClick={() => setIsCompanionOpen(false)} aria-label="Close companion chat">
            ✕
          </button>
        </header>

        <div className="companion-messages">
          {companionMessages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`companion-message ${message.role === 'user' ? 'user' : 'assistant'}`}
            >
              {message.content}
            </div>
          ))}

          {isCompanionTyping ? (
            <div className="companion-message assistant typing" aria-label="Companion is typing">
              <span />
              <span />
              <span />
            </div>
          ) : null}
        </div>

        <div className="companion-input-row">
          <input
            type="text"
            value={companionInput}
            onChange={(event) => setCompanionInput(event.target.value)}
            placeholder="Ask about this verse or surah..."
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                sendCompanionMessage();
              }
            }}
          />
          <button type="button" onClick={sendCompanionMessage} disabled={isCompanionTyping || !companionInput.trim()}>
            Send
          </button>
        </div>
      </section> : null}

      {isFullJournalOpen ? (
        <div className="profile-overlay" onClick={() => setIsFullJournalOpen(false)}>
          <section className="profile-journal-modal" onClick={(event) => event.stopPropagation()}>
            <header className="profile-modal-header">
              <h3>All Reflections</h3>
              <button type="button" className="profile-close" onClick={() => setIsFullJournalOpen(false)}>
                ✕
              </button>
            </header>

            <div className="journal-list" role="list">
              {sortedJournalEntries.length === 0 ? (
                <p className="bookmark-empty">No reflections saved yet.</p>
              ) : (
                sortedJournalEntries.map((entry) => (
                  <button
                    key={`${entry.verseKey}-${entry.date}`}
                    type="button"
                    className="journal-item"
                    onClick={() => {
                      setIsFullJournalOpen(false);
                      openJournalEntry(entry);
                    }}
                  >
                    <div className="journal-item-top">
                      <strong>{entry.verseKey}</strong>
                      <span>{new Date(entry.date).toLocaleDateString()}</span>
                    </div>
                    <p className="journal-answer">{entry.answer || 'No reflection written yet.'}</p>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}

      {isVoiceMirrorOpen ? (
        <div className="voice-mirror-overlay" onClick={closeVoiceMirror}>
          <section className="voice-mirror-modal" onClick={(event) => event.stopPropagation()}>
            <header className="voice-mirror-header">
              <h3>Voice Mirror</h3>
              <button type="button" className="voice-mirror-close" onClick={closeVoiceMirror}>
                ✕
              </button>
            </header>

            {voiceMirrorState === 'record' ? (
              <div className="voice-mirror-record-state">
                <button
                  type="button"
                  className={`voice-mirror-mic ${isVoiceRecording ? 'recording' : ''}`}
                  onClick={() => {
                    if (isVoiceRecording) {
                      stopVoiceMirrorRecording({ matchAfterStop: true });
                    } else {
                      startVoiceMirrorRecording();
                    }
                  }}
                >
                  🎤
                </button>
                <p className="voice-mirror-caption">Recite any verse...</p>
                <p className="voice-mirror-live-text" dir="rtl" lang="ar">
                  {voiceTranscript || '...'}
                </p>
                <button
                  type="button"
                  className="voice-mirror-stop"
                  onClick={() => stopVoiceMirrorRecording({ matchAfterStop: true })}
                  disabled={!isVoiceRecording && !voiceTranscript.trim()}
                >
                  Stop
                </button>
              </div>
            ) : null}

            {voiceMirrorState === 'matching' ? (
              <div className="voice-mirror-matching-state">
                <p className="voice-mirror-live-text" dir="rtl" lang="ar">{voiceTranscript}</p>
                <p className="voice-mirror-caption">Finding your verse...</p>
              </div>
            ) : null}

            {voiceMirrorState === 'mirror' && matchedVerse ? (
              <div className="voice-mirror-result-state">
                <div className="voice-mirror-verse-top">
                  <strong>
                    {matchedVerse.surahName ? `${matchedVerse.surahName} · ` : ''}
                    {matchedVerse.verseKey}
                  </strong>
                  <p dir="rtl" lang="ar">{matchedVerse.verseText}</p>
                </div>

                <div className="voice-mirror-panels">
                  <article className="voice-mirror-panel">
                    <h4>You</h4>
                    <div className="voice-mirror-words voice-mirror-user-pills" dir="rtl" lang="ar">
                      {voiceMirrorWordRows.map((row, index) => (
                        <span key={`spoken-${index}`} className={row.matched ? 'word-match' : 'word-miss'}>
                          {String(row.userWord || '').trim() || '∅'}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="voice-mirror-play-my-recording"
                      onClick={toggleVoiceMirrorUserAudio}
                      disabled={!voiceMirrorUserAudioUrl}
                    >
                      {isVoiceMirrorUserPlaying ? 'Pause My Recording' : 'Play My Recording'}
                    </button>
                    <div className="voice-mirror-user-progress" aria-hidden="true">
                      <div className="voice-mirror-user-progress-fill" style={{ width: `${voiceMirrorUserProgress}%` }} />
                    </div>
                  </article>

                  <article className="voice-mirror-panel">
                    <h4>Reciter</h4>
                    <p className="voice-mirror-reciter-name">Mishary Rashid Al-Afasy</p>
                    <button type="button" className="voice-mirror-play voice-mirror-play-large" onClick={toggleVoiceMirrorReciterAudio}>
                      {isVoiceMirrorReciterPlaying ? 'Pause' : 'Play'}
                    </button>
                    <p className="voice-mirror-reciter-verse-ref">{matchedVerse.verseKey}</p>
                    <div className="voice-mirror-progress" aria-hidden="true">
                      <div className="voice-mirror-progress-fill" style={{ width: `${voiceMirrorReciterProgress}%` }} />
                    </div>
                  </article>
                </div>

                <div className="voice-mirror-similarity">
                  <p className="voice-mirror-similarity-label">Similarity to Reciter</p>
                  <p className={`voice-mirror-similarity-value ${similarityTone}`}>{voiceMirrorAnimatedPercent}%</p>
                  <div className="voice-mirror-similarity-bar" aria-hidden="true">
                    <div className={`voice-mirror-similarity-fill ${similarityTone}`} style={{ width: `${voiceMirrorAnimatedPercent}%` }} />
                  </div>
                </div>

                <section className="voice-mirror-mistakes">
                  {voiceMirrorMistakes.length > 0 ? (
                    <>
                      <h5>Word-by-word mistakes</h5>
                      <div className="voice-mirror-mistake-grid">
                        <strong>You said</strong>
                        <strong>Correct</strong>
                        {voiceMirrorMistakes.map((row, index) => (
                          <div className="voice-mirror-mistake-row" key={`mistake-${index}`}>
                            <span dir="rtl" lang="ar">{row.userWord || '—'}</span>
                            <span dir="rtl" lang="ar">{row.quranWord || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </section>

                <div className="voice-mirror-actions">
                  <button type="button" className="voice-mirror-secondary" onClick={resetVoiceMirror}>
                    Try Again
                  </button>
                  <button type="button" className="voice-mirror-primary" onClick={navigateToMatchedVerse}>
                    Read This Verse
                  </button>
                </div>
              </div>
            ) : null}

            {voiceMirrorError ? <p className="voice-mirror-error">{voiceMirrorError}</p> : null}
          </section>
        </div>
      ) : null}

      {reflectionModal ? (
        <div className="journal-overlay" onClick={() => setReflectionModal(null)}>
          <section className="journal-modal" onClick={(event) => event.stopPropagation()}>
            <header className="journal-modal-header">
              <strong>{reflectionModal.verseKey}</strong>
              <button type="button" className="journal-close" onClick={() => setReflectionModal(null)}>
                ✕
              </button>
            </header>

            <p className="journal-verse-ar" dir="rtl" lang="ar" translate="no">
              {reflectionModal.verseText}
            </p>

            <textarea
              className="journal-answer-input"
              placeholder="Write your reflection here..."
              value={reflectionModal.answer || ''}
              onChange={(event) => {
                const nextAnswer = event.target.value;
                setReflectionModal((current) => {
                  if (!current) {
                    return current;
                  }

                  return {
                    ...current,
                    answer: nextAnswer,
                    date: new Date().toISOString(),
                  };
                });
              }}
            />

            <div className="journal-actions">
              <button type="button" className="journal-save" onClick={saveReflectionEntry}>
                Save
              </button>
              <button type="button" className="journal-cancel" onClick={() => setReflectionModal(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isSettingsOpen ? (
        <div className="settings-overlay" onClick={() => setIsSettingsOpen(false)}>
          <section className="settings-modal" onClick={(event) => event.stopPropagation()}>
            <header className="settings-header">
              <h3>Settings</h3>
              <button type="button" className="settings-close" onClick={() => setIsSettingsOpen(false)}>
                ✕
              </button>
            </header>

            <div className="settings-tabs">
              <button
                type="button"
                className={settingsTab === 'profile' ? 'active' : ''}
                onClick={() => setSettingsTab('profile')}
              >
                Profile
              </button>
              <button
                type="button"
                className={settingsTab === 'style' ? 'active' : ''}
                onClick={() => setSettingsTab('style')}
              >
                Style
              </button>
            </div>

            {settingsTab === 'profile' ? (
              <div className="settings-panel">
                <p>Sign in to sync your progress across devices</p>
                <button type="button" className="signin-placeholder" disabled>
                  Sign In
                </button>
                <label className="setting-row column" htmlFor="profile-name-select">
                  <span>Name</span>
                  <select
                    id="profile-name-select"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                  >
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                  </select>
                </label>
              </div>
            ) : (
              <div className="settings-panel">
                <label className="setting-row" htmlFor="show-translation-toggle">
                  <span>Show Translation</span>
                  <input
                    id="show-translation-toggle"
                    type="checkbox"
                    checked={showTranslation}
                    onChange={(event) => setShowTranslation(event.target.checked)}
                  />
                </label>

                <label className="setting-row column" htmlFor="reciter-select">
                  <span>Reciter</span>
                  <select
                    id="reciter-select"
                    value={selectedReciterId}
                    onChange={(event) => setSelectedReciterId(Number(event.target.value))}
                  >
                    {reciterOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label} (ID: {option.id})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="setting-row column" htmlFor="reader-theme-select">
                  <span>Reader Colour</span>
                  <select
                    id="reader-theme-select"
                    value={readerTheme}
                    onChange={(event) => setReaderTheme(event.target.value)}
                  >
                    {READER_THEME_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="setting-row column">
                  <span>Daily Goal</span>
                  <div className="profile-goal-pills" role="tablist" aria-label="Daily goal options in settings">
                    {DAILY_GOAL_OPTIONS.map((option) => {
                      const selected = option.id === dailyGoal;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          className={`profile-goal-pill ${selected ? 'active' : ''}`}
                          onClick={() => setDailyGoal(option.id)}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {wordTooltip ? (
        <div
          className="word-tooltip-float"
          style={{
            left: `${wordTooltip.x}px`,
            top: `${wordTooltip.y - 32}px`,
          }}
        >
          {wordTooltip.text}
        </div>
      ) : null}
    </main>
  );
}
