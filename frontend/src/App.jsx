import { useEffect, useMemo, useRef, useState } from 'react';
import surahHooks from './forgottenSurahHooks';

const COIN_STORAGE_KEY = 'tilawah_coins_total';
const BOOKMARK_STORAGE_KEY = 'tilawah_bookmarks';
const BOOKMARK_DETAILS_STORAGE_KEY = 'tilawah_bookmark_details';
const JOURNAL_ENTRIES_STORAGE_KEY = 'journal_entries';
const ACTION_LOG_STORAGE_KEY = 'tilawah_action_log';
const STREAK_STORAGE_KEY = 'tilawah_streak';
const DAILY_GOAL_STORAGE_KEY = 'tilawah_daily_goal';
const DAILY_PAGE_GOAL_STORAGE_KEY = 'dailyPageGoal';
const DAILY_COINS_STORAGE_KEY = 'tilawah_daily_coins';
const LIFETIME_COINS_STORAGE_KEY = 'tilawah_lifetime_coins';
const SHOW_TRANSLATION_STORAGE_KEY = 'tilawah_show_translation';
const TAJWEED_ENABLED_STORAGE_KEY = 'tajweedEnabled';
const MUSHAF_LOG_HISTORY_STORAGE_KEY = 'tilawah_mushaf_log_history';
const VERSE_COLLECTIONS_STORAGE_KEY = 'tilawah_verse_collections';
const FAMILY_MODE_ENABLED_STORAGE_KEY = 'familyModeEnabled';
const FAMILY_MODE_PIN_STORAGE_KEY = 'familyModePin';
const CHILD_MODE_ACTIVE_STORAGE_KEY = 'childModeActive';
const CHILD_MODE_DAILY_GOAL_STORAGE_KEY = 'childModeDailyGoal';
const CHILD_MODE_ACTIVITY_STORAGE_KEY = 'childModeActivity';
const RECITER_ID_STORAGE_KEY = 'tilawah_reciter_id';
const AUDIO_PLAYBACK_RATE_STORAGE_KEY = 'preferredPlaybackSpeed';
const AUDIO_VOLUME_STORAGE_KEY = 'tilawah_audio_volume';
const READER_THEME_STORAGE_KEY = 'tilawah_reader_theme';
const USER_GROUP_CODE_STORAGE_KEY = 'userGroupCode';
const ACCOUNT_PRIVACY_STORAGE_KEY = 'accountPrivacy';
const SHARED_REFLECTIONS_STORAGE_KEY = 'sharedReflections';
const GUEST_REFLECTION_ACTOR_ID_STORAGE_KEY = 'communityGuestId';
const KHATMAH_PROGRESS_STORAGE_KEY = 'khatmahProgress';
const KHATMAH_PROGRESS_VERSE_ID_STORAGE_KEY = 'khatmahProgressVerseId';
const LIVING_QURAN_LOG_STORAGE_KEY = 'livingQuranLog';
const KHATMAH_INTERVAL_STORAGE_KEY = 'khatmahInterval';
const FORGOTTEN_SURAH_DATE_STORAGE_KEY = 'lastForgottenSurahDate';
const FORGOTTEN_SURAH_ID_STORAGE_KEY = 'lastForgottenSurahId';
const FORGOTTEN_SURAH_HOOK_STORAGE_KEY = 'lastForgottenSurahHook';
const FORGOTTEN_SURAH_DISMISSED_DATE_STORAGE_KEY = 'forgottenSurahDismissedDate';
const SURAH_READING_HISTORY_STORAGE_KEY = 'tilawah_surah_reading_history';
const FIRST_VISIT_TOUR_DONE_STORAGE_KEY = 'firstVisitTourDone';
const LAST_WIRD_CELEBRATION_STORAGE_KEY = 'lastWirdCelebration';
const AUDIO_HOST = 'https://verses.quran.foundation';
const READ_AWARD_DELAY_MS = 1500;
const FORGOTTEN_SURAH_WINDOW_DAYS = 7;
const FORGOTTEN_SURAH_LONG_GAP_DAYS = 30;
const OVERLOOKED_SURAH_IDS = [38, 40, 41, 42, 43, 44, 45, 46, 29, 30, 31, 32, 34, 35, 36, 57, 58, 59, 64, 67, 68, 69, 70, 72, 76, 77, 78, 79];
const GROUP_VOTE_OPTIONS = [5, 10, 20, 40, 80];
const VERSES_PER_PAGE = 15;
const TOTAL_QURAN_PAGES = 604;
const TOTAL_QURAN_VERSES = 6236;

const ISLAMIC_OCCASIONS = [
  { name: 'Ramadan', month: 9, day: 1 },
  { name: 'Eid al-Fitr', month: 10, day: 1 },
  { name: 'Day of Arafah', month: 12, day: 9 },
  { name: 'Eid al-Adha', month: 12, day: 10 },
  { name: 'Ashura', month: 1, day: 10 },
];

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
  { id: '1-rub', label: "1 Rub'", targetVerses: 60 },
  { id: '1-hizb', label: '1 Hizb', targetVerses: 120 },
  { id: '1-juz', label: '1 Juz', targetVerses: 300 },
];

const KHATMAH_INTERVAL_OPTIONS = [
  { id: '5-verses', label: '5 verses', targetVerses: 5 },
  { id: '10-verses', label: '10 verses', targetVerses: 10 },
  { id: '20-verses', label: '20 verses', targetVerses: 20 },
  { id: '1-page', label: '1 page (~15 verses)', targetVerses: 15 },
];

const FIRST_VISIT_TOUR_STEPS = [
  {
    id: 'arabic-word',
    message: 'Tap any Arabic word to discover its meaning and hear its pronunciation',
  },
  {
    id: 'tafsir-button',
    message: 'Go deeper with Tafsir — classical scholarly commentary on every verse',
  },
  {
    id: 'user-dropdown',
    message: 'Enter Khatmah Mode to read the Quran the way the Sahaba did — one action at a time',
  },
  {
    id: 'surah-dropdown',
    message: 'Every week a forgotten surah is waiting for you — one you have never read with a reason you cannot ignore',
  },
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

function getHijriMonthDay(date) {
  try {
    const parts = new Intl.DateTimeFormat('en-TN-u-ca-islamic-nu-latn', {
      day: 'numeric',
      month: 'numeric',
    }).formatToParts(date);
    const monthPart = parts.find((part) => part.type === 'month')?.value;
    const dayPart = parts.find((part) => part.type === 'day')?.value;
    const month = Number.parseInt(String(monthPart || ''), 10);
    const day = Number.parseInt(String(dayPart || ''), 10);

    if (!Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }

    return { month, day };
  } catch {
    return null;
  }
}

function getClosestIslamicOccasion(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  let closest = null;

  for (let offset = -10; offset <= 10; offset += 1) {
    const cursor = new Date(date);
    cursor.setDate(cursor.getDate() + offset);
    const hijriMonthDay = getHijriMonthDay(cursor);
    if (!hijriMonthDay) {
      continue;
    }

    ISLAMIC_OCCASIONS.forEach((occasion) => {
      if (occasion.month !== hijriMonthDay.month || occasion.day !== hijriMonthDay.day) {
        return;
      }

      const distance = Math.abs(offset);
      const shouldReplace =
        !closest ||
        distance < closest.distance ||
        (distance === closest.distance && offset >= 0 && closest.offset < 0);

      if (shouldReplace) {
        closest = {
          ...occasion,
          offset,
          distance,
        };
      }
    });
  }

  return closest;
}

function formatOccasionProximity(occasion) {
  if (!occasion) {
    return '';
  }

  if (occasion.offset === 0) {
    return `Projected completion aligns with ${occasion.name}.`;
  }

  const dayDistance = Math.abs(occasion.offset);
  const dayLabel = dayDistance === 1 ? 'day' : 'days';
  const direction = occasion.offset > 0 ? 'after' : 'before';
  return `Projected completion is ${dayDistance} ${dayLabel} ${direction} ${occasion.name}.`;
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

function readStoredDailyPageGoal() {
  const raw = String(localStorage.getItem(DAILY_PAGE_GOAL_STORAGE_KEY) || '').trim();
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function readStoredAccountPrivacy() {
  const value = String(localStorage.getItem(ACCOUNT_PRIVACY_STORAGE_KEY) || 'private').trim().toLowerCase();
  return value === 'public' ? 'public' : 'private';
}

function readStoredSharedReflections() {
  try {
    const raw = localStorage.getItem(SHARED_REFLECTIONS_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => String(item || '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function getOrCreateGuestReflectionActorId() {
  const existing = String(localStorage.getItem(GUEST_REFLECTION_ACTOR_ID_STORAGE_KEY) || '').trim();
  if (existing) {
    return existing;
  }

  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `guest-${crypto.randomUUID()}`
      : `guest-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  localStorage.setItem(GUEST_REFLECTION_ACTOR_ID_STORAGE_KEY, generated);
  return generated;
}

function getReflectionShareKey(entry) {
  return `${String(entry?.verseKey || '').trim()}|${String(entry?.date || '').trim()}`;
}

function readStoredKhatmahProgress() {
  const key = String(localStorage.getItem(KHATMAH_PROGRESS_STORAGE_KEY) || '').trim();
  const verseId = Number.parseInt(String(localStorage.getItem(KHATMAH_PROGRESS_VERSE_ID_STORAGE_KEY) || ''), 10);
  return {
    verseKey: key || '1:1',
    verseId: Number.isFinite(verseId) && verseId > 0 ? verseId : null,
  };
}

function readStoredLivingQuranLog() {
  try {
    const raw = localStorage.getItem(LIVING_QURAN_LOG_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => item && typeof item === 'object');
  } catch {
    return [];
  }
}

function readStoredKhatmahInterval() {
  const raw = String(localStorage.getItem(KHATMAH_INTERVAL_STORAGE_KEY) || '').trim();
  if (KHATMAH_INTERVAL_OPTIONS.some((option) => option.id === raw)) {
    return raw;
  }

  return '10-verses';
}

function readStoredSurahReadingHistory() {
  try {
    const raw = localStorage.getItem(SURAH_READING_HISTORY_STORAGE_KEY);
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce((acc, [key, value]) => {
      const surahId = Number.parseInt(String(key || ''), 10);
      if (!Number.isFinite(surahId) || surahId <= 0 || surahId > 114 || !value || typeof value !== 'object') {
        return acc;
      }

      const sessions = Number.parseInt(String(value.sessions || 0), 10);
      const lastReadDate = String(value.lastReadDate || '').trim();
      const lastSessionDate = String(value.lastSessionDate || '').trim();

      acc[surahId] = {
        sessions: Number.isFinite(sessions) && sessions > 0 ? sessions : 0,
        lastReadDate,
        lastSessionDate,
      };
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function readStoredMushafLogHistory() {
  try {
    const raw = localStorage.getItem(MUSHAF_LOG_HISTORY_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => ({
        id: String(entry.id || '').trim(),
        dateKey: String(entry.dateKey || '').trim(),
        surahId: Number.parseInt(String(entry.surahId || ''), 10) || 0,
        surahName: String(entry.surahName || '').trim(),
        fromVerse: Number.parseInt(String(entry.fromVerse || ''), 10) || 0,
        toVerse: Number.parseInt(String(entry.toVerse || ''), 10) || 0,
        versesLogged: Number.parseInt(String(entry.versesLogged || ''), 10) || 0,
        createdAt: String(entry.createdAt || '').trim(),
      }))
      .filter((entry) => entry.id && entry.dateKey && entry.surahId > 0 && entry.fromVerse > 0 && entry.toVerse >= entry.fromVerse);
  } catch {
    return [];
  }
}

function readStoredFamilyModeEnabled() {
  return localStorage.getItem(FAMILY_MODE_ENABLED_STORAGE_KEY) === 'true';
}

function readStoredFamilyModePin() {
  const value = String(localStorage.getItem(FAMILY_MODE_PIN_STORAGE_KEY) || '').trim();
  return /^\d{4}$/.test(value) ? value : '';
}

function readStoredChildModeActive() {
  return localStorage.getItem(CHILD_MODE_ACTIVE_STORAGE_KEY) === 'true';
}

function readStoredChildModeDailyGoal() {
  const raw = Number.parseInt(String(localStorage.getItem(CHILD_MODE_DAILY_GOAL_STORAGE_KEY) || ''), 10);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 5;
  }
  return Math.min(300, raw);
}

function readStoredChildModeActivity() {
  try {
    const raw = localStorage.getItem(CHILD_MODE_ACTIVITY_STORAGE_KEY);
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { dateKey: '', lastSurahName: '', versesCompletedToday: 0, updatedAt: '' };
    }

    const versesCompletedToday = Number.parseInt(String(parsed.versesCompletedToday || 0), 10);
    return {
      dateKey: String(parsed.dateKey || '').trim(),
      lastSurahName: String(parsed.lastSurahName || '').trim(),
      versesCompletedToday: Number.isFinite(versesCompletedToday) && versesCompletedToday > 0 ? versesCompletedToday : 0,
      updatedAt: String(parsed.updatedAt || '').trim(),
    };
  } catch {
    return { dateKey: '', lastSurahName: '', versesCompletedToday: 0, updatedAt: '' };
  }
}

function sanitizeCollectionName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30);
}

function readStoredVerseCollections() {
  try {
    const raw = localStorage.getItem(VERSE_COLLECTIONS_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((collection) => collection && typeof collection === 'object')
      .map((collection) => {
        const verses = Array.isArray(collection.verses)
          ? collection.verses
              .filter((verse) => verse && typeof verse === 'object')
              .map((verse) => ({
                verseKey: String(verse.verseKey || '').trim(),
                verseId: String(verse.verseId || '').trim(),
                chapterId: Number.parseInt(String(verse.chapterId || ''), 10) || 0,
                surahName: String(verse.surahName || '').trim(),
                arabicText: String(verse.arabicText || '').trim(),
                translationText: String(verse.translationText || '').trim(),
                note: String(verse.note || ''),
                addedAt: String(verse.addedAt || '').trim(),
              }))
              .filter((verse) => verse.verseKey)
          : [];

        return {
          id: String(collection.id || '').trim(),
          name: sanitizeCollectionName(collection.name),
          createdAt: String(collection.createdAt || '').trim(),
          verses,
        };
      })
      .filter((collection) => collection.id && collection.name)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  } catch {
    return [];
  }
}

function getDaysBetweenDateKeys(startDateKey, endDateKey) {
  const start = new Date(`${String(startDateKey || '').trim()}T00:00:00`);
  const end = new Date(`${String(endDateKey || '').trim()}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / dayMs));
}

function recordSurahReadingSession(history, surahId, dateKey) {
  const normalizedSurahId = Number.parseInt(String(surahId || ''), 10);
  if (!Number.isFinite(normalizedSurahId) || normalizedSurahId <= 0) {
    return history;
  }

  const current = history?.[normalizedSurahId] || { sessions: 0, lastReadDate: '', lastSessionDate: '' };
  const sameSessionDay = current.lastSessionDate === dateKey;
  const nextSessions = sameSessionDay ? Number(current.sessions || 0) : Number(current.sessions || 0) + 1;

  return {
    ...(history || {}),
    [normalizedSurahId]: {
      sessions: Math.max(0, nextSessions),
      lastReadDate: dateKey,
      lastSessionDate: dateKey,
    },
  };
}

function formatStaleReadDuration(daysSinceLastRead) {
  const normalizedDays = Number.isFinite(daysSinceLastRead) ? Math.max(0, Math.floor(daysSinceLastRead)) : 0;
  if (normalizedDays >= 60) {
    const months = Math.round(normalizedDays / 30);
    return `${months} month${months === 1 ? '' : 's'}`;
  }

  return `${normalizedDays} day${normalizedDays === 1 ? '' : 's'}`;
}

function parseVerseKeyParts(verseKey) {
  const [surahRaw, ayahRaw] = String(verseKey || '').split(':');
  const surah = Number.parseInt(surahRaw || '', 10);
  const ayah = Number.parseInt(ayahRaw || '', 10);
  return {
    surah: Number.isFinite(surah) ? surah : 0,
    ayah: Number.isFinite(ayah) ? ayah : 0,
  };
}

function toArabicIndicNumber(value) {
  const normalized = Math.max(0, Number.parseInt(String(value || '0'), 10) || 0);
  return String(normalized).replace(/\d/g, (digit) => String.fromCharCode(0x0660 + Number(digit)));
}

function buildKhatmahVerseEnding(verse) {
  const directNumber = Number.parseInt(String(verse?.verse_number || ''), 10);
  if (Number.isFinite(directNumber) && directNumber > 0) {
    return `۝${toArabicIndicNumber(directNumber)}`;
  }

  const keyParts = parseVerseKeyParts(String(verse?.verse_key || ''));
  return `۝${toArabicIndicNumber(keyParts.ayah || 0)}`;
}

function getFirstName(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.split(/\s+/)[0] || '';
}

function readStoredGroupCode() {
  return String(localStorage.getItem(USER_GROUP_CODE_STORAGE_KEY) || '').trim().toUpperCase();
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

function normalizeWordTimingIndex(rawIndex, fallbackIndex) {
  const parsed = Number.parseInt(String(rawIndex), 10);
  if (!Number.isFinite(parsed)) {
    return fallbackIndex;
  }

  if (parsed <= 0) {
    return 0;
  }

  // Quran API word indexes are usually 1-based.
  return parsed - 1;
}

function extractWordTimingsFromAudioFile(audioFile) {
  const rows = [];

  const pushTiming = (rawStart, rawEnd, rawIndex, fallbackIndex) => {
    const startMs = Number(rawStart);
    const endMs = Number(rawEnd);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs < 0 || endMs < startMs) {
      return;
    }

    rows.push({
      startMs,
      endMs,
      wordIndex: normalizeWordTimingIndex(rawIndex, fallbackIndex),
    });
  };

  const words = Array.isArray(audioFile?.words) ? audioFile.words : [];
  if (words.length) {
    words.forEach((word, index) => {
      pushTiming(word?.start_time, word?.end_time, word?.position ?? word?.word_index ?? word?.index, index);
    });
  }

  if (!rows.length) {
    const timestamps = Array.isArray(audioFile?.timestamps) ? audioFile.timestamps : [];
    timestamps.forEach((entry, index) => {
      if (Array.isArray(entry)) {
        pushTiming(entry[0], entry[1], entry[2] ?? index, index);
        return;
      }

      pushTiming(
        entry?.start_time ?? entry?.start,
        entry?.end_time ?? entry?.end,
        entry?.position ?? entry?.word_index ?? entry?.index,
        index
      );
    });
  }

  if (!rows.length) {
    const segments = Array.isArray(audioFile?.segments) ? audioFile.segments : [];
    segments.forEach((entry, index) => {
      if (Array.isArray(entry)) {
        pushTiming(entry[0], entry[1], entry[2] ?? index, index);
        return;
      }

      pushTiming(
        entry?.start_time ?? entry?.start,
        entry?.end_time ?? entry?.end,
        entry?.position ?? entry?.word_index ?? entry?.index,
        index
      );
    });
  }

  return rows.sort((a, b) => a.startMs - b.startMs);
}

function buildWordTimingMap(audioFiles) {
  const map = {};
  (Array.isArray(audioFiles) ? audioFiles : []).forEach((file) => {
    const verseKey = String(file?.verse_key || '').trim();
    if (!verseKey) {
      return;
    }

    const rows = extractWordTimingsFromAudioFile(file);
    if (rows.length) {
      map[verseKey] = rows;
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
      root: String(meta.root || meta.lemma?.text || meta.lemma || meta.stem || '').trim(),
      transliteration: String(meta.transliteration?.text || meta.transliteration || '').trim(),
      audio_url: meta.audio_url || meta.audio?.url || '',
      translation_text:
        meta.translation_text ||
        meta.translation?.text ||
        meta.translation ||
        '',
    };
  });
}

const TAJWEED_RULE_COLORS = {
  qalqalah: '#E74C3C',
  ghunnah: '#27AE60',
  madd: '#2980B9',
  lamShamsiyyah: '#8E44AD',
};

const QALQALAH_LETTERS = new Set(['ق', 'ط', 'ب', 'ج', 'د']);
const MADD_LETTERS = new Set(['ا', 'و', 'ي']);
const GHUNNAH_LETTERS = new Set(['ن', 'م']);
const SUN_LETTERS = new Set(['ت', 'ث', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ل', 'ن']);
const ALIF_LIKE_LETTERS = new Set(['ا', 'أ', 'إ', 'آ', 'ٱ']);
const ARABIC_COMBINING_MARK_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D4-\u08FF]/;

function splitArabicClusters(text) {
  const chars = Array.from(String(text || ''));
  const clusters = [];
  let current = '';

  chars.forEach((char) => {
    if (!current) {
      current = char;
      return;
    }

    if (ARABIC_COMBINING_MARK_REGEX.test(char)) {
      current += char;
      return;
    }

    clusters.push(current);
    current = char;
  });

  if (current) {
    clusters.push(current);
  }

  return clusters;
}

function getClusterBaseCharacter(cluster) {
  return Array.from(String(cluster || ''))[0] || '';
}

function isLamShamsiyyahLam(clusters, index) {
  const currentBase = getClusterBaseCharacter(clusters[index]);
  if (currentBase !== 'ل') {
    return false;
  }

  const previousBase = getClusterBaseCharacter(clusters[index - 1]);
  const nextBase = getClusterBaseCharacter(clusters[index + 1]);
  return ALIF_LIKE_LETTERS.has(previousBase) && SUN_LETTERS.has(nextBase);
}

function getTajweedColorForCluster(clusters, index) {
  const cluster = String(clusters[index] || '');
  const baseChar = getClusterBaseCharacter(cluster);
  if (!baseChar) {
    return '';
  }

  if (isLamShamsiyyahLam(clusters, index) || isLamShamsiyyahLam(clusters, index - 1)) {
    return TAJWEED_RULE_COLORS.lamShamsiyyah;
  }

  if (GHUNNAH_LETTERS.has(baseChar) && cluster.includes('\u0651')) {
    return TAJWEED_RULE_COLORS.ghunnah;
  }

  if (QALQALAH_LETTERS.has(baseChar)) {
    return TAJWEED_RULE_COLORS.qalqalah;
  }

  if (MADD_LETTERS.has(baseChar)) {
    return TAJWEED_RULE_COLORS.madd;
  }

  return '';
}

function renderTajweedText(text, keyPrefix) {
  const clusters = splitArabicClusters(text);
  return clusters.map((cluster, index) => {
    const color = getTajweedColorForCluster(clusters, index);
    return (
      <span key={`${keyPrefix}-${index}`} style={color ? { color } : undefined}>
        {cluster}
      </span>
    );
  });
}

function formatWordRootDisplay(rootValue) {
  const compact = String(rootValue || '')
    .replace(/[\s-]+/g, '')
    .trim();

  if (!compact) {
    return '';
  }

  return compact.split('').join('-');
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractAlternativeTerms(text) {
  const source = String(text || '');
  if (!source) {
    return [];
  }

  const termSet = new Set();
  const quotedMatches = source.match(/["'“”]([^"'“”]{1,30})["'“”]/g) || [];
  quotedMatches.forEach((match) => {
    const term = match.replace(/["'“”]/g, '').trim();
    if (term) {
      termSet.add(term);
    }
  });

  const patterns = [
    /instead of\s+([A-Za-z\u0600-\u06FF\-]+)/gi,
    /allah chose\s+([A-Za-z\u0600-\u06FF\-]+)/gi,
  ];
  patterns.forEach((pattern) => {
    let match = pattern.exec(source);
    while (match) {
      const term = String(match[1] || '').trim();
      if (term) {
        termSet.add(term);
      }
      match = pattern.exec(source);
    }
  });

  return Array.from(termSet).sort((a, b) => b.length - a.length);
}

function findClosestWordIndexByCenter(container, clientX, clientY, maxDistance = 60) {
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

  if (closestDistance > maxDistance) {
    return -1;
  }

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
  const voiceMirrorRecordedBlobRef = useRef(null);
  const voiceMirrorShouldMatchRef = useRef(false);
  const voiceMirrorLiveTranscriptRef = useRef('');
  const voiceMirrorScoreAnimationRef = useRef(0);
  const voiceMirrorLeftCanvasRef = useRef(null);
  const voiceMirrorRightCanvasRef = useRef(null);
  const voiceMirrorAnalyserRef = useRef(null);
  const voiceMirrorAudioContextRef = useRef(null);
  const voiceMirrorAnimationFrameRef = useRef(0);
  const audioBarMenuRef = useRef(null);
  const userMenuRef = useRef(null);
  const surahMenuTriggerRef = useRef(null);
  const userTriggerRef = useRef(null);
  const firstVerseArabicRef = useRef(null);
  const firstVerseTafsirRef = useRef(null);
  const collectionMenuRef = useRef(null);
  const wordHighlightIntervalRef = useRef(null);
  const nextAudioPrefetchRef = useRef(null);
  const lastPrefetchSourceVerseIdRef = useRef('');
  const verseRefs = useRef(new Map());
  const surahContentRef = useRef(null);
  const readingHeaderRef = useRef(null);
  const activeCenteredVerseIdRef = useRef('');
  const activeReadTimerRef = useRef(null);
  const verseGlowTimerRef = useRef(null);
  const actionLogRef = useRef(readStoredActionLog());
  const streakRef = useRef(normalizeStreakForToday(readStoredStreak()));
  const authSessionRef = useRef({ loggedIn: false, user: null, accessToken: '' });
  const dailyCoinsRef = useRef(readStoredDailyCoins());
  const lifetimeCoinsRef = useRef(readStoredLifetimeCoins());
  const khatmahObserverRef = useRef(null);
  const khatmahVisibleTimersRef = useRef(new Map());
  const khatmahReadVerseKeysRef = useRef(new Set());
  const khatmahCheckpointReadIndicesRef = useRef(new Set());
  const khatmahGateTriggeringRef = useRef(false);
  const [chapters, setChapters] = useState([]);
  const [chapterSearch, setChapterSearch] = useState('');
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [verses, setVerses] = useState([]);
  const [expandedTafsir, setExpandedTafsir] = useState({});
  const [liveThisByVerse, setLiveThisByVerse] = useState({});
  const [isFirstVisitTourActive, setIsFirstVisitTourActive] = useState(false);
  const [firstVisitTourStepIndex, setFirstVisitTourStepIndex] = useState(0);
  const [firstVisitTourRect, setFirstVisitTourRect] = useState(null);
  const [tafsirByChapter, setTafsirByChapter] = useState({});
  const [audioByChapter, setAudioByChapter] = useState({});
  const [wordTimingsByChapter, setWordTimingsByChapter] = useState({});
  const [coins, setCoins] = useState(() => readStoredCoins());
  const [bookmarks, setBookmarks] = useState(() => readStoredBookmarks());
  const [bookmarkDetails, setBookmarkDetails] = useState(() => readStoredBookmarkDetails());
  const [verseCollections, setVerseCollections] = useState(() => readStoredVerseCollections());
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [collectionMenuVerseId, setCollectionMenuVerseId] = useState('');
  const [journalEntries, setJournalEntries] = useState(() => readStoredJournalEntries());
  const [actionLog, setActionLog] = useState(() => readStoredActionLog());
  const [streak, setStreak] = useState(() => normalizeStreakForToday(readStoredStreak()));
  const [dailyGoal, setDailyGoal] = useState(() => readStoredDailyGoal());
  const [dailyPageGoal, setDailyPageGoal] = useState(() => readStoredDailyPageGoal());
  const [dailyPageGoalInput, setDailyPageGoalInput] = useState(() => {
    const stored = readStoredDailyPageGoal();
    return stored ? String(stored) : '';
  });
  const [profileName, setProfileName] = useState(() => {
    const raw = localStorage.getItem('tilawah_profile_name');
    return raw === 'Sister' ? 'Sister' : 'Brother';
  });
  const [dailyCoins, setDailyCoins] = useState(() => readStoredDailyCoins());
  const [lifetimeCoins, setLifetimeCoins] = useState(() => readStoredLifetimeCoins());
  const [surahReadingHistory, setSurahReadingHistory] = useState(() => readStoredSurahReadingHistory());
  const [forgottenSurah, setForgottenSurah] = useState(null);
  const [isForgottenSurahLoading, setIsForgottenSurahLoading] = useState(false);
  const [forgottenSurahDismissedDate, setForgottenSurahDismissedDate] = useState(() =>
    String(localStorage.getItem(FORGOTTEN_SURAH_DISMISSED_DATE_STORAGE_KEY) || '').trim()
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activePage, setActivePage] = useState('reader');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('stats');
  const [isFullJournalOpen, setIsFullJournalOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('surahs');
  const [groupCode, setGroupCode] = useState(() => readStoredGroupCode());
  const [joinGroupCode, setJoinGroupCode] = useState(() => readStoredGroupCode());
  const [groupData, setGroupData] = useState(null);
  const [groupError, setGroupError] = useState('');
  const [isGroupLoading, setIsGroupLoading] = useState(false);
  const [groupLastUpdatedAt, setGroupLastUpdatedAt] = useState('');
  const [pendingBookmarkJump, setPendingBookmarkJump] = useState(null);
  const [isLoadingChapters, setIsLoadingChapters] = useState(true);
  const [isLoadingVerses, setIsLoadingVerses] = useState(false);
  const [isLoadingTafsir, setIsLoadingTafsir] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [error, setError] = useState('');
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioVolume, setAudioVolume] = useState(() => {
    const raw = Number.parseFloat(localStorage.getItem(AUDIO_VOLUME_STORAGE_KEY) || '1');
    if (!Number.isFinite(raw)) {
      return 1;
    }
    return Math.max(0, Math.min(1, raw));
  });
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState(() => {
    const raw = Number.parseFloat(
      localStorage.getItem(AUDIO_PLAYBACK_RATE_STORAGE_KEY) ||
      localStorage.getItem('tilawah_audio_playback_rate') ||
      '1'
    );
    if (!Number.isFinite(raw)) {
      return 1;
    }
    return Math.max(0.5, Math.min(2, raw));
  });
  const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
  const [copiedVerseId, setCopiedVerseId] = useState('');
  const [centeredVerseId, setCenteredVerseId] = useState('');
  const [isAudioBarVisible, setIsAudioBarVisible] = useState(false);
  const [wordTooltip, setWordTooltip] = useState(null);
  const [unsealedWordPanel, setUnsealedWordPanel] = useState(null);
  const [hoveredWord, setHoveredWord] = useState(null);
  const [activeAudioWord, setActiveAudioWord] = useState(null);
  const [glowingVerseId, setGlowingVerseId] = useState('');
  const [hoveredOrnamentVerseId, setHoveredOrnamentVerseId] = useState('');
  const [ornamentVersePreview, setOrnamentVersePreview] = useState(null);
  const [reflectionModal, setReflectionModal] = useState(null);
  const [journalViewTab, setJournalViewTab] = useState('mine');
  const [accountPrivacy, setAccountPrivacy] = useState(() => readStoredAccountPrivacy());
  const [sharedReflections, setSharedReflections] = useState(() => readStoredSharedReflections());
  const [isSharingReflection, setIsSharingReflection] = useState(false);
  const [reflectionShareNotice, setReflectionShareNotice] = useState('');
  const [communityReflections, setCommunityReflections] = useState([]);
  const [isCommunityLoading, setIsCommunityLoading] = useState(false);
  const [communityFeedError, setCommunityFeedError] = useState('');
  const [expandedCommunityItems, setExpandedCommunityItems] = useState({});
  const [khatmahProgressState, setKhatmahProgressState] = useState(() => readStoredKhatmahProgress());
  const [khatmahInterval, setKhatmahInterval] = useState(() => readStoredKhatmahInterval());
  const [livingQuranLog, setLivingQuranLog] = useState(() => readStoredLivingQuranLog());
  const [khatmahSurahId, setKhatmahSurahId] = useState(null);
  const [khatmahVerses, setKhatmahVerses] = useState([]);
  const [isKhatmahLoading, setIsKhatmahLoading] = useState(false);
  const [khatmahError, setKhatmahError] = useState('');
  const [khatmahBlockStartIndex, setKhatmahBlockStartIndex] = useState(0);
  const [khatmahGateEndIndex, setKhatmahGateEndIndex] = useState(-1);
  const [versesSinceLastCheckpoint, setVersesSinceLastCheckpoint] = useState(0);
  const [khatmahWindowStartIndex, setKhatmahWindowStartIndex] = useState(0);
  const [khatmahCurrentReadIndex, setKhatmahCurrentReadIndex] = useState(-1);
  const [khatmahTransition, setKhatmahTransition] = useState(null);
  const [khatmahGate, setKhatmahGate] = useState({
    open: false,
    verseRange: '',
    verses: [],
    loading: false,
    theme: '',
    challenges: [],
    acceptedIndexes: [],
    error: '',
  });
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
  const [voiceMirrorDetailedScores, setVoiceMirrorDetailedScores] = useState({
    pronunciationScore: 0,
    accuracyScore: 0,
    fluencyScore: 0,
    completenessScore: 0,
  });
  const [isVoiceMirrorReciterPlaying, setIsVoiceMirrorReciterPlaying] = useState(false);
  const [voiceMirrorReciterAudio, setVoiceMirrorReciterAudio] = useState(null);
  const [voiceMirrorReciterProgress, setVoiceMirrorReciterProgress] = useState(0);
  const [voiceMirrorUserAudioUrl, setVoiceMirrorUserAudioUrl] = useState('');
  const [voiceMirrorUserAudio, setVoiceMirrorUserAudio] = useState(null);
  const [isVoiceMirrorUserPlaying, setIsVoiceMirrorUserPlaying] = useState(false);
  const [voiceMirrorUserProgress, setVoiceMirrorUserProgress] = useState(0);
  const [voiceMirrorAnimatedPercent, setVoiceMirrorAnimatedPercent] = useState(0);
  const [isWirdCelebrationOpen, setIsWirdCelebrationOpen] = useState(false);
  const [isMushafLogOpen, setIsMushafLogOpen] = useState(false);
  const [mushafLogForm, setMushafLogForm] = useState({ surahId: 1, fromVerse: 1, toVerse: 1 });
  const [mushafLogHistory, setMushafLogHistory] = useState(() => readStoredMushafLogHistory());
  const [mushafLogStatus, setMushafLogStatus] = useState('');
  const [mushafLogError, setMushafLogError] = useState('');
  const [familyModeEnabled, setFamilyModeEnabled] = useState(() => readStoredFamilyModeEnabled());
  const [familyModePin, setFamilyModePin] = useState(() => readStoredFamilyModePin());
  const [isChildModeActive, setIsChildModeActive] = useState(() => readStoredChildModeActive());
  const [childModeDailyGoal, setChildModeDailyGoal] = useState(() => readStoredChildModeDailyGoal());
  const [childModeActivity, setChildModeActivity] = useState(() => readStoredChildModeActivity());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('style');
  const [readingStatsPeriod, setReadingStatsPeriod] = useState('day');
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
  const [tajweedEnabled, setTajweedEnabled] = useState(() => localStorage.getItem(TAJWEED_ENABLED_STORAGE_KEY) === 'true');
  const [selectedReciterId, setSelectedReciterId] = useState(() => {
    const raw = Number.parseInt(localStorage.getItem(RECITER_ID_STORAGE_KEY) || '7', 10);
    return Number.isFinite(raw) ? raw : 7;
  });
  const [authSession, setAuthSession] = useState({ checked: false, loggedIn: false, accessToken: '', user: null });
  const [serverStreak, setServerStreak] = useState(null);
  const [entryMode, setEntryMode] = useState('');

  useEffect(() => {
    localStorage.removeItem('lastForgottenSurahHook');
    localStorage.removeItem('lastForgottenSurahDate');
    localStorage.removeItem('lastForgottenSurahId');
  }, []);

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
  const normalizedChildModeGoal = Math.max(1, Number(childModeDailyGoal || 5));
  const childGoalProgress = Math.min(100, (todaysReadCount / normalizedChildModeGoal) * 100);
  const childModeVersesToday = childModeActivity.dateKey === todayKey ? Number(childModeActivity.versesCompletedToday || 0) : 0;
  const childModeLastSurah = String(childModeActivity.lastSurahName || '').trim();
  const totalVersesReadAllTime = useMemo(
    () => Object.values(streak.activityLog || {}).reduce((sum, count) => sum + Number(count || 0), 0),
    [streak.activityLog]
  );
  const pagesReadToday = useMemo(() => todaysReadCount / VERSES_PER_PAGE, [todaysReadCount]);
  const goalVerseTarget = Number.isFinite(Number(dailyPageGoal)) && Number(dailyPageGoal) > 0
    ? Number(dailyPageGoal) * VERSES_PER_PAGE
    : 0;
  const hasDailyPageGoal = goalVerseTarget > 0;
  const readingStatsVerses = useMemo(() => {
    if (readingStatsPeriod === 'day') {
      return todaysReadCount;
    }

    const dayCount = readingStatsPeriod === 'week' ? 7 : 30;
    const todayDate = new Date(`${todayKey}T00:00:00`);
    let total = 0;

    for (let offset = 0; offset < dayCount; offset += 1) {
      const cursor = new Date(todayDate);
      cursor.setDate(todayDate.getDate() - offset);
      const key = getDateKeyFromDate(cursor);
      total += Number(streak.activityLog?.[key] || 0);
    }

    return total;
  }, [readingStatsPeriod, streak.activityLog, todayKey, todaysReadCount]);
  const readingStatsRows = useMemo(
    () => [
      { icon: '📖', label: 'Pages', value: (readingStatsVerses / VERSES_PER_PAGE).toFixed(1) },
      { icon: '📜', label: 'Verses', value: String(readingStatsVerses) },
      { icon: '🔤', label: 'Words', value: String(readingStatsVerses * 25) },
      { icon: '🔡', label: 'Letters', value: String(readingStatsVerses * 120) },
      { icon: '🕌', label: "Juz'", value: (readingStatsVerses / 300).toFixed(2) },
    ],
    [readingStatsVerses]
  );
  const wirdProgress = hasDailyPageGoal ? Math.min(100, (todaysReadCount / goalVerseTarget) * 100) : 0;
  const isWirdComplete = hasDailyPageGoal && wirdProgress >= 100;
  const totalDaysRead = useMemo(
    () => Object.values(streak.activityLog || {}).filter((count) => Number(count) > 0).length,
    [streak.activityLog]
  );
  const khatmProjection = useMemo(() => {
    const activityEntries = Object.values(streak.activityLog || {})
      .map((count) => Number(count || 0))
      .filter((count) => Number.isFinite(count) && count > 0);

    const activeDays = activityEntries.length;
    const totalVersesRead = activityEntries.reduce((sum, count) => sum + count, 0);
    const totalPagesRead = totalVersesRead / VERSES_PER_PAGE;
    const remainingPages = Math.max(0, TOTAL_QURAN_PAGES - totalPagesRead);
    const avgDailyPages = activeDays > 0 ? totalPagesRead / Math.max(activeDays, 1) : 0;
    const daysToComplete = avgDailyPages > 0 ? Math.ceil(remainingPages / avgDailyPages) : null;

    let projectedDate = null;
    if (totalVersesRead > 0 && remainingPages > 0 && daysToComplete !== null) {
      projectedDate = new Date(`${todayKey}T00:00:00`);
      projectedDate.setDate(projectedDate.getDate() + daysToComplete);
    }

    const nearestOccasion = projectedDate ? getClosestIslamicOccasion(projectedDate) : null;

    return {
      activeDays,
      totalVersesRead,
      totalPagesRead,
      remainingPages,
      avgDailyPages,
      daysToComplete,
      projectedDate,
      projectedDateLabel: projectedDate
        ? projectedDate.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '',
      occasionMessage: formatOccasionProximity(nearestOccasion),
    };
  }, [streak.activityLog, todayKey]);
  const lastGlobalReadDateKey = useMemo(() => {
    return Object.entries(streak.activityLog || {}).reduce((latestKey, [dateKey, count]) => {
      if (Number(count || 0) <= 0) {
        return latestKey;
      }

      if (!latestKey) {
        return dateKey;
      }

      return dateKey > latestKey ? dateKey : latestKey;
    }, '');
  }, [streak.activityLog]);
  const quranMapSquares = useMemo(() => {
    return Array.from({ length: 114 }, (_, index) => {
      const surahId = index + 1;
      const history = surahReadingHistory?.[surahId];
      const sessions = Number(history?.sessions || 0);
      const lastReadDate = String(history?.lastReadDate || '').trim();

      if (sessions <= 0 || !lastReadDate) {
        return { surahId, level: 'never' };
      }

      const daysSince = getDaysBetweenDateKeys(lastReadDate, todayKey);
      return { surahId, level: daysSince <= FORGOTTEN_SURAH_LONG_GAP_DAYS ? 'recent' : 'stale' };
    });
  }, [surahReadingHistory, todayKey]);
  const quranMapReadCount = useMemo(
    () => quranMapSquares.filter((item) => item.level !== 'never').length,
    [quranMapSquares]
  );
  const isForgottenSurahDismissedToday = forgottenSurahDismissedDate === todayKey;
  const shouldShowForgottenSurahCard = !isForgottenSurahDismissedToday && (isForgottenSurahLoading || Boolean(forgottenSurah));
  const hasForgottenSurahSignal = Boolean(forgottenSurah?.surahNumber) && !isForgottenSurahDismissedToday;

  async function fetchAuthSession() {
    try {
      const response = await fetch('/api/auth/session');
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to fetch auth session');
      }

      const nextSession = {
        checked: true,
        loggedIn: Boolean(payload?.loggedIn),
        accessToken: String(payload?.accessToken || ''),
        user: payload?.user || null,
      };
      setAuthSession(nextSession);
      authSessionRef.current = {
        loggedIn: nextSession.loggedIn,
        user: nextSession.user,
        accessToken: nextSession.accessToken,
      };
    } catch {
      setAuthSession({ checked: true, loggedIn: false, accessToken: '', user: null });
      authSessionRef.current = { loggedIn: false, user: null, accessToken: '' };
    }
  }

  function startQuranFoundationLogin() {
    window.location.href = '/api/auth/login';
  }

  function continueAsGuest() {
    const today = getTodayKey();

    setActionLog((current) => ({
      ...current,
      [today]: {
        ...(current[today] || {}),
        read: [],
        tafsir: [],
      },
    }));

    setCenteredVerseId('');
    setReadingProgress(0);
    setPendingBookmarkJump(null);
    setIsDrawerOpen(false);
    setActivePage('reader');
    setEntryMode('guest');

    if (chapters.length > 0) {
      const firstChapter = chapters[0];
      setSelectedChapter((current) => (current?.id === firstChapter.id ? { ...firstChapter } : firstChapter));
    }

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }

  function signOutQuranFoundation() {
    window.location.href = 'http://localhost:3000/logout';
  }

  async function syncBookmarksFromServer() {
    if (!authSessionRef.current.loggedIn) {
      return;
    }

    try {
      const response = await fetch('/api/user/bookmarks');
      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      const listCandidates = [payload?.bookmarks, payload?.data, payload?.results, payload];
      const rawList = listCandidates.find((candidate) => Array.isArray(candidate)) || [];

      const parsed = rawList
        .map((item) => {
          const verseKey = String(item?.verse_key || item?.verseKey || item?.key || '').trim();
          if (!verseKey) {
            return null;
          }

          const [chapterPart, versePart] = verseKey.split(':');
          const verseId = String(Number.parseInt(versePart || '0', 10) || versePart || verseKey);

          return {
            verseId,
            detail: {
              chapterId: Number.parseInt(chapterPart || '0', 10) || null,
              verseKey,
              surahName: String(item?.chapter_name || item?.surah_name || '').trim(),
              preview: String(item?.note || item?.text || item?.verse_text || '').trim() || `Saved verse ${verseKey}`,
            },
          };
        })
        .filter(Boolean);

      if (!parsed.length) {
        return;
      }

      setBookmarks(new Set(parsed.map((entry) => entry.verseId)));
      setBookmarkDetails(
        parsed.reduce((acc, entry) => {
          acc[entry.verseId] = entry.detail;
          return acc;
        }, {})
      );
    } catch {
      // Keep local bookmark state if server sync fails.
    }
  }

  async function syncStreakFromServer() {
    if (!authSessionRef.current.loggedIn) {
      setServerStreak(null);
      return;
    }

    try {
      const response = await fetch('/api/user/streaks');
      if (!response.ok) {
        setServerStreak(null);
        return;
      }

      const payload = await response.json();
      const valueCandidates = [
        payload?.current_streak,
        payload?.currentStreak,
        payload?.streak,
        payload?.data?.current_streak,
        payload?.data?.currentStreak,
      ];
      const nextValue = valueCandidates.find((value) => Number.isFinite(Number(value)));
      setServerStreak(Number.isFinite(Number(nextValue)) ? Number(nextValue) : null);
    } catch {
      setServerStreak(null);
    }
  }

  function resolveGoalIdFromPayload(payload) {
    const record =
      payload?.goal ||
      payload?.data?.goal ||
      (Array.isArray(payload?.goals) ? payload.goals[0] : null) ||
      (Array.isArray(payload?.data) ? payload.data[0] : null) ||
      payload?.data ||
      payload;

    if (!record || typeof record !== 'object') {
      return '';
    }

    const directIdCandidates = [
      record?.id,
      record?.goal_id,
      record?.daily_goal_id,
      record?.goalId,
      record?.dailyGoalId,
      record?.slug,
      record?.name,
      record?.label,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    const directGoal = DAILY_GOAL_OPTIONS.find((option) =>
      directIdCandidates.some((candidate) => candidate === option.id || candidate === option.label)
    );
    if (directGoal) {
      return directGoal.id;
    }

    const targetCandidates = [record?.target_verses, record?.targetVerses, record?.verses, record?.daily_target]
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    const targetGoal = DAILY_GOAL_OPTIONS.find((option) => targetCandidates.some((target) => target === option.targetVerses));
    return targetGoal?.id || '';
  }

  async function syncGoalFromServer() {
    if (!authSessionRef.current.loggedIn) {
      setDailyGoal(readStoredDailyGoal());
      return;
    }

    try {
      const response = await fetch('/api/user/goals');
      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      const resolvedGoalId = resolveGoalIdFromPayload(payload);
      if (resolvedGoalId) {
        setDailyGoal(resolvedGoalId);
      }
    } catch {
      // Keep local fallback when server goal sync fails.
    }
  }

  async function postGoalToServer(goalId) {
    if (!authSessionRef.current.loggedIn) {
      return;
    }

    const selectedGoal = DAILY_GOAL_OPTIONS.find((option) => option.id === goalId);
    if (!selectedGoal) {
      return;
    }

    try {
      await fetch('/api/user/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_id: selectedGoal.id,
          daily_goal_id: selectedGoal.id,
          target_verses: selectedGoal.targetVerses,
          label: selectedGoal.label,
        }),
      });
    } catch {
      // Do not block local goal updates if server sync fails.
    }
  }

  function handleDailyGoalSelection(goalId) {
    setDailyGoal(goalId);
    postGoalToServer(goalId);
  }

  function handleSetDailyPageGoal() {
    const parsed = Number.parseFloat(String(dailyPageGoalInput || '').trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    setDailyPageGoal(parsed);
    setDailyPageGoalInput(String(parsed));
    localStorage.setItem(DAILY_PAGE_GOAL_STORAGE_KEY, String(parsed));
  }

  async function postStreakToServer(nextStreakData) {
    if (!authSessionRef.current.loggedIn || !nextStreakData) {
      return;
    }

    try {
      await fetch('/api/user/streaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_streak: Number(nextStreakData.currentStreak || 0),
          longest_streak: Number(nextStreakData.longestStreak || 0),
          last_read_date: String(nextStreakData.lastReadDate || ''),
          activity_count_today: Number(nextStreakData.activityLog?.[getTodayKey()] || 0),
        }),
      });

      setServerStreak(Number(nextStreakData.currentStreak || 0));
    } catch {
      // Keep local streak updates if server sync fails.
    }
  }

  async function postBookmarkToServer(verse, isBookmarked) {
    if (!authSessionRef.current.loggedIn) {
      return;
    }

    const verseKey = String(verse?.verse_key || '').trim();
    if (!verseKey) {
      return;
    }

    try {
      await fetch('/api/user/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verse_key: verseKey,
          chapter_id: Number(selectedChapter?.id || 0) || undefined,
          bookmarked: isBookmarked,
        }),
      });
    } catch {
      // Keep local bookmark behavior even if server sync fails.
    }
  }

  async function logReadingSessionToServer(verseId) {
    if (!authSessionRef.current.loggedIn) {
      return;
    }

    const verse = verses.find((item) => getVerseId(item) === String(verseId));
    const verseKey = String(verse?.verse_key || '').trim();
    if (!verseKey) {
      return;
    }

    try {
      await fetch('/api/user/reading-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verse_key: verseKey,
          chapter_id: Number(selectedChapter?.id || 0) || undefined,
          read_at: new Date().toISOString(),
        }),
      });
    } catch {
      // Do not block local progress updates if sync fails.
    }
  }

  function getCurrentUserIdentity() {
    const fallbackName = String(profileName || 'Member').trim() || 'Member';
    const sessionName = String(authSessionRef.current.user?.name || authSessionRef.current.user?.email || '').trim();
    const userId =
      String(authSessionRef.current.user?.sub || authSessionRef.current.user?.email || sessionName || '').trim();

    return {
      userId,
      name: sessionName || fallbackName,
    };
  }

  function persistGroupCode(nextCode) {
    const normalizedCode = String(nextCode || '').trim().toUpperCase();
    setGroupCode(normalizedCode);
    setJoinGroupCode(normalizedCode);
    if (normalizedCode) {
      localStorage.setItem(USER_GROUP_CODE_STORAGE_KEY, normalizedCode);
      return;
    }

    localStorage.removeItem(USER_GROUP_CODE_STORAGE_KEY);
  }

  async function loadGroupByCode(codeToLoad, { silent = false } = {}) {
    const normalizedCode = String(codeToLoad || '').trim().toUpperCase();
    if (!normalizedCode) {
      setGroupData(null);
      setGroupError('');
      persistGroupCode('');
      return null;
    }

    if (!silent) {
      setIsGroupLoading(true);
    }

    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(normalizedCode)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Could not load group');
      }

      setGroupData(payload || null);
      setGroupError('');
      setGroupLastUpdatedAt(new Date().toISOString());
      persistGroupCode(payload?.code || normalizedCode);
      return payload || null;
    } catch (error) {
      if (!silent) {
        setGroupData(null);
        setGroupError(error.message || 'Could not load group');
      }
      return null;
    } finally {
      if (!silent) {
        setIsGroupLoading(false);
      }
    }
  }

  async function createGroup() {
    const identity = getCurrentUserIdentity();
    if (!identity.userId) {
      setGroupError('Could not identify current user. Please sign in again.');
      return;
    }

    const groupName = window.prompt('Enter a group name');
    const normalizedName = String(groupName || '').trim();
    if (!normalizedName) {
      return;
    }

    setIsGroupLoading(true);
    setGroupError('');
    try {
      const response = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: identity.userId,
          memberName: identity.name,
          groupName: normalizedName,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Could not create group');
      }

      setGroupData(payload || null);
      setGroupLastUpdatedAt(new Date().toISOString());
      persistGroupCode(payload?.code || '');
      setProfileTab('groups');
      if (payload?.code) {
        window.alert(`Share this code with your circle: ${payload.code}`);
      }
    } catch (error) {
      setGroupError(error.message || 'Could not create group');
    } finally {
      setIsGroupLoading(false);
    }
  }

  async function joinGroup() {
    const identity = getCurrentUserIdentity();
    const normalizedCode = String(joinGroupCode || '').trim().toUpperCase();
    if (!identity.userId) {
      setGroupError('Could not identify current user. Please sign in again.');
      return;
    }
    if (!normalizedCode || normalizedCode.length !== 6) {
      setGroupError('Enter a valid 6-character group code.');
      return;
    }

    setIsGroupLoading(true);
    setGroupError('');
    try {
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: normalizedCode,
          userId: identity.userId,
          name: identity.name,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Could not join group');
      }

      setGroupData(payload || null);
      setGroupLastUpdatedAt(new Date().toISOString());
      persistGroupCode(payload?.code || normalizedCode);
      setProfileTab('groups');
    } catch (error) {
      setGroupError(error.message || 'Could not join group');
    } finally {
      setIsGroupLoading(false);
    }
  }

  async function voteOnGroupWird(wirdAmount) {
    const identity = getCurrentUserIdentity();
    const codeToVote = String(groupData?.code || groupCode || '').trim().toUpperCase();
    if (!identity.userId || !codeToVote) {
      return;
    }

    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(codeToVote)}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: identity.userId, wirdAmount }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Could not save vote');
      }

      setGroupData(payload || null);
      setGroupLastUpdatedAt(new Date().toISOString());
      setGroupError('');
    } catch (error) {
      setGroupError(error.message || 'Could not save vote');
    }
  }

  async function syncGroupProgress(versesToday, totalVerses) {
    const identity = getCurrentUserIdentity();
    const codeToSync = String(groupData?.code || groupCode || '').trim().toUpperCase();
    if (!authSessionRef.current.loggedIn || !identity.userId || !codeToSync) {
      return;
    }

    try {
      const response = await fetch(`/api/groups/${encodeURIComponent(codeToSync)}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: identity.userId,
          versesToday,
          totalVerses,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Could not sync group progress');
      }

      setGroupData(payload || null);
      setGroupLastUpdatedAt(new Date().toISOString());
    } catch {
      // Keep reading flow uninterrupted when group sync fails.
    }
  }

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
  const currentArabicTextForCompanion = String(centeredVerseData?.text_uthmani || '').trim();
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
      const perPage = 100;
      const allReciters = [];
      const seenIds = new Set();

      try {
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
          const response = await fetch(`/api/quran/resources/recitations?language=en&per_page=${perPage}&page=${page}`);
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload?.message || 'Failed to fetch reciters');
          }

          const pageReciters = parseReciterOptions(payload);
          pageReciters.forEach((option) => {
            if (!seenIds.has(option.id)) {
              seenIds.add(option.id);
              allReciters.push(option);
            }
          });

          const paginationTotal = Number.parseInt(String(payload?.pagination?.total_pages || ''), 10);
          if (Number.isFinite(paginationTotal) && paginationTotal > 0) {
            totalPages = paginationTotal;
          } else if (pageReciters.length < perPage) {
            totalPages = page;
          } else {
            totalPages = Math.max(totalPages, page + 1);
          }

          page += 1;

          if (page > 40) {
            break;
          }
        }
      } catch {
        try {
          const response = await fetch('/api/quran/resources/recitations?language=en');
          const payload = await response.json();
          if (response.ok) {
            parseReciterOptions(payload).forEach((option) => {
              if (!seenIds.has(option.id)) {
                seenIds.add(option.id);
                allReciters.push(option);
              }
            });
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
    const url = new URL(window.location.href);
    const hasLoginFlag = url.searchParams.get('loggedIn') === 'true';
    if (hasLoginFlag) {
      url.searchParams.delete('loggedIn');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }

    fetchAuthSession();
  }, []);

  useEffect(() => {
    authSessionRef.current = {
      loggedIn: authSession.loggedIn,
      accessToken: authSession.accessToken,
      user: authSession.user,
    };

    if (!authSession.loggedIn) {
      setServerStreak(null);
      setDailyGoal(readStoredDailyGoal());
      return;
    }

    syncBookmarksFromServer();
    syncStreakFromServer();
    syncGoalFromServer();
  }, [authSession.loggedIn, authSession.accessToken, authSession.user]);

  useEffect(() => {
    if (!authSession.loggedIn) {
      setGroupData(null);
      setGroupError('');
      return;
    }

    if (groupCode) {
      loadGroupByCode(groupCode, { silent: true });
    }
  }, [authSession.loggedIn, groupCode]);

  useEffect(() => {
    if (!authSession.loggedIn || !groupCode) {
      return;
    }

    syncGroupProgress(todaysReadCount, totalVersesReadAllTime);
  }, [authSession.loggedIn, groupCode, todaysReadCount, totalVersesReadAllTime]);

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
      setLiveThisByVerse({});
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
    localStorage.setItem(VERSE_COLLECTIONS_STORAGE_KEY, JSON.stringify(verseCollections));
  }, [verseCollections]);

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
    localStorage.setItem(ACCOUNT_PRIVACY_STORAGE_KEY, accountPrivacy);
  }, [accountPrivacy]);

  useEffect(() => {
    localStorage.setItem(SHARED_REFLECTIONS_STORAGE_KEY, JSON.stringify(Array.from(new Set(sharedReflections))));
  }, [sharedReflections]);

  useEffect(() => {
    localStorage.setItem(KHATMAH_PROGRESS_STORAGE_KEY, String(khatmahProgressState.verseKey || '1:1'));
    if (Number.isFinite(Number(khatmahProgressState.verseId || 0)) && Number(khatmahProgressState.verseId || 0) > 0) {
      localStorage.setItem(KHATMAH_PROGRESS_VERSE_ID_STORAGE_KEY, String(khatmahProgressState.verseId));
    }
  }, [khatmahProgressState]);

  useEffect(() => {
    localStorage.setItem(LIVING_QURAN_LOG_STORAGE_KEY, JSON.stringify(livingQuranLog));
  }, [livingQuranLog]);

  useEffect(() => {
    localStorage.setItem(KHATMAH_INTERVAL_STORAGE_KEY, khatmahInterval);
  }, [khatmahInterval]);

  useEffect(() => {
    localStorage.setItem(MUSHAF_LOG_HISTORY_STORAGE_KEY, JSON.stringify(mushafLogHistory));
  }, [mushafLogHistory]);

  useEffect(() => {
    localStorage.setItem(FAMILY_MODE_ENABLED_STORAGE_KEY, String(familyModeEnabled));
  }, [familyModeEnabled]);

  useEffect(() => {
    if (familyModePin) {
      localStorage.setItem(FAMILY_MODE_PIN_STORAGE_KEY, familyModePin);
      return;
    }

    localStorage.removeItem(FAMILY_MODE_PIN_STORAGE_KEY);
  }, [familyModePin]);

  useEffect(() => {
    localStorage.setItem(CHILD_MODE_ACTIVE_STORAGE_KEY, String(isChildModeActive));
  }, [isChildModeActive]);

  useEffect(() => {
    localStorage.setItem(CHILD_MODE_DAILY_GOAL_STORAGE_KEY, String(Math.max(1, Number(childModeDailyGoal || 5))));
  }, [childModeDailyGoal]);

  useEffect(() => {
    localStorage.setItem(CHILD_MODE_ACTIVITY_STORAGE_KEY, JSON.stringify(childModeActivity));
  }, [childModeActivity]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== CHILD_MODE_ACTIVITY_STORAGE_KEY) {
        return;
      }
      setChildModeActivity(readStoredChildModeActivity());
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (familyModeEnabled && /^\d{4}$/.test(familyModePin)) {
      return;
    }

    if (isChildModeActive) {
      setIsChildModeActive(false);
    }
  }, [familyModeEnabled, familyModePin, isChildModeActive]);

  useEffect(() => {
    if (!isChildModeActive) {
      return;
    }

    if (activePage !== 'reader') {
      setActivePage('reader');
    }
    setIsSettingsOpen(false);
    setIsUserMenuOpen(false);
    setIsDrawerOpen(false);
    setIsVoiceMirrorOpen(false);
    setIsCompanionOpen(false);
    setIsFullJournalOpen(false);
    setReflectionModal(null);
  }, [isChildModeActive, activePage]);

  useEffect(() => {
    if (!mushafLogStatus) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMushafLogStatus('');
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mushafLogStatus]);

  function checkAndTriggerWirdCelebration(versesTodayCount) {
    const goalPages = Number(dailyPageGoal || 0);
    if (!Number.isFinite(goalPages) || goalPages <= 0) {
      return;
    }

    const todaysVerses = Number(versesTodayCount || 0);
    const threshold = goalPages * VERSES_PER_PAGE;
    if (todaysVerses < threshold) {
      return;
    }

    if (localStorage.getItem(LAST_WIRD_CELEBRATION_STORAGE_KEY) === todayKey) {
      return;
    }

    localStorage.setItem(LAST_WIRD_CELEBRATION_STORAGE_KEY, todayKey);
    setIsWirdCelebrationOpen(true);
  }

  useEffect(() => {
    checkAndTriggerWirdCelebration(todaysReadCount);
  }, [todaysReadCount, dailyPageGoal, todayKey]);

  useEffect(() => {
    if (!isWirdCelebrationOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsWirdCelebrationOpen(false);
    }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isWirdCelebrationOpen]);

  useEffect(() => {
    if (!reflectionModal) {
      setReflectionShareNotice('');
      setJournalViewTab('mine');
    }
  }, [reflectionModal]);

  useEffect(() => {
    if (!selectedCollectionId) {
      return;
    }

    const exists = verseCollections.some((collection) => collection.id === selectedCollectionId);
    if (!exists) {
      setSelectedCollectionId('');
    }
  }, [selectedCollectionId, verseCollections]);

  useEffect(() => {
    setIsUserMenuOpen(false);
    setCollectionMenuVerseId('');
  }, [activePage]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!userMenuRef.current) {
        return;
      }
      if (!userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    function handleCollectionMenuOutsideClick(event) {
      if (!collectionMenuRef.current) {
        return;
      }

      if (!collectionMenuRef.current.contains(event.target)) {
        setCollectionMenuVerseId('');
      }
    }

    document.addEventListener('mousedown', handleCollectionMenuOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleCollectionMenuOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (activePage !== 'profile') {
      setHeatmapTooltip(null);
    }
  }, [activePage]);

  useEffect(() => {
    localStorage.setItem(SHOW_TRANSLATION_STORAGE_KEY, String(showTranslation));
  }, [showTranslation]);

  useEffect(() => {
    localStorage.setItem(TAJWEED_ENABLED_STORAGE_KEY, String(tajweedEnabled));
  }, [tajweedEnabled]);

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
    setWordTimingsByChapter({});
    setActiveAudioWord(null);

    if (!currentAudio?.verseId || !selectedChapter?.id) {
      return;
    }

    const nextVerse = verses.find((verse) => String(getVerseId(verse)) === String(currentAudio.verseId));
    if (!nextVerse) {
      return;
    }

    playVerseAudioWithOptions(nextVerse, { forcePlay: true }).catch(() => {
      closeAudioBar();
    });
  }, [selectedReciterId]);

  useEffect(() => {
    if (authSession.checked && authSession.loggedIn && !entryMode) {
      setEntryMode('signed-in');
    }
  }, [authSession.checked, authSession.loggedIn, entryMode]);

  useEffect(() => {
    if (!entryMode || selectedChapter?.id || !chapters.length) {
      return;
    }

    setSelectedChapter(chapters[0]);
  }, [entryMode, selectedChapter?.id, chapters]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) {
      return;
    }

    audioEl.volume = isAudioMuted ? 0 : audioVolume;
  }, [audioVolume, isAudioMuted, currentAudio?.url]);

  useEffect(() => {
    localStorage.setItem(AUDIO_VOLUME_STORAGE_KEY, String(audioVolume));
  }, [audioVolume]);

  useEffect(() => {
    localStorage.setItem(AUDIO_PLAYBACK_RATE_STORAGE_KEY, String(audioPlaybackRate));
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.playbackRate = audioPlaybackRate;
    }
  }, [audioPlaybackRate, currentAudio?.url]);

  useEffect(() => {
    if (!isAudioMenuOpen) {
      return;
    }

    function handleOutside(event) {
      if (!audioBarMenuRef.current?.contains(event.target)) {
        setIsAudioMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsAudioMenuOpen(false);
      }
    }

    document.addEventListener('click', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isAudioMenuOpen]);

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
      if (!entryMode || activePage !== 'reader' || !verses.length || !surahContentRef.current) {
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
  }, [entryMode, activePage, verses, selectedChapter]);

  useEffect(() => {
    return () => {
      if (activeReadTimerRef.current) {
        clearTimeout(activeReadTimerRef.current);
        activeReadTimerRef.current = null;
      }

      if (verseGlowTimerRef.current) {
        clearTimeout(verseGlowTimerRef.current);
        verseGlowTimerRef.current = null;
      }

      if (wordAudioRef.current) {
        wordAudioRef.current.pause();
      }

      if (wordHighlightIntervalRef.current) {
        clearInterval(wordHighlightIntervalRef.current);
        wordHighlightIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isAudioPlaying || !currentAudio?.verseKey) {
      if (wordHighlightIntervalRef.current) {
        clearInterval(wordHighlightIntervalRef.current);
        wordHighlightIntervalRef.current = null;
      }
      setActiveAudioWord(null);
      return;
    }

    const chapterId = Number(currentAudio?.chapterId || selectedChapter?.id || 0);
    const cacheKey = `${selectedReciterId}:${chapterId}`;
    const verseTimings = wordTimingsByChapter?.[cacheKey]?.[String(currentAudio.verseKey || '')] || [];
    if (!verseTimings.length) {
      setActiveAudioWord(null);
      return;
    }

    const audioEl = audioRef.current;
    if (!audioEl) {
      return;
    }

    const verseId = String(currentAudio.verseId || '');
    const tick = () => {
      if (!audioEl || audioEl.paused || audioEl.ended) {
        setActiveAudioWord(null);
        return;
      }

      const currentTimeMs = Math.max(0, Math.floor(audioEl.currentTime * 1000));
      const activeTiming = verseTimings.find((timing) => currentTimeMs >= timing.startMs && currentTimeMs <= timing.endMs);

      if (!activeTiming) {
        setActiveAudioWord((current) => (current ? null : current));
        return;
      }

      const nextWord = {
        verseId,
        wordIndex: Number(activeTiming.wordIndex || 0),
      };

      setActiveAudioWord((current) => {
        if (current?.verseId === nextWord.verseId && current?.wordIndex === nextWord.wordIndex) {
          return current;
        }
        return nextWord;
      });
    };

    tick();
    wordHighlightIntervalRef.current = window.setInterval(tick, 50);

    return () => {
      if (wordHighlightIntervalRef.current) {
        clearInterval(wordHighlightIntervalRef.current);
        wordHighlightIntervalRef.current = null;
      }
    };
  }, [
    isAudioPlaying,
    currentAudio?.verseId,
    currentAudio?.verseKey,
    currentAudio?.chapterId,
    selectedChapter?.id,
    selectedReciterId,
    wordTimingsByChapter,
  ]);

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

  useEffect(() => {
    if (!entryMode || activePage !== 'reader' || !verses.length) {
      return;
    }

    const hasCompletedTour = localStorage.getItem(FIRST_VISIT_TOUR_DONE_STORAGE_KEY) === 'true';
    if (hasCompletedTour) {
      return;
    }

    setIsFirstVisitTourActive(true);
    setFirstVisitTourStepIndex(0);
  }, [entryMode, activePage, verses.length]);

  useEffect(() => {
    const activeStep = FIRST_VISIT_TOUR_STEPS[firstVisitTourStepIndex] || null;
    if (!isFirstVisitTourActive || !activeStep) {
      setFirstVisitTourRect(null);
      return;
    }

    const updateRect = () => {
      const target = getFirstVisitTourTargetElement(activeStep.id);
      if (!target) {
        setFirstVisitTourRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      setFirstVisitTourRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    updateRect();
    const rafId = window.requestAnimationFrame(updateRect);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isFirstVisitTourActive, firstVisitTourStepIndex, verses.length, isDrawerOpen, isUserMenuOpen, activePage]);

  function completeFirstVisitTour() {
    localStorage.setItem(FIRST_VISIT_TOUR_DONE_STORAGE_KEY, 'true');
    setIsFirstVisitTourActive(false);
    setFirstVisitTourStepIndex(0);
    setFirstVisitTourRect(null);
  }

  function goToNextFirstVisitTourStep() {
    const isFinalStep = firstVisitTourStepIndex >= FIRST_VISIT_TOUR_STEPS.length - 1;
    if (isFinalStep) {
      completeFirstVisitTour();
      return;
    }

    setFirstVisitTourStepIndex((current) => current + 1);
  }

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

  function getForgottenSurahHookText(surahNumber) {
    const normalizedSurahNumber = Number.parseInt(String(surahNumber || ''), 10);
    const hook = String(surahHooks?.[normalizedSurahNumber] || '').trim();
    if (hook) {
      return hook;
    }

    return 'This surah carries one of the Quran\'s most specific historical and spiritual lessons, and reading it fully can change how you understand revelation.';
  }

  async function resolveForgottenSurahForWeek() {
    const todayDateKey = getTodayKey();
    const storedDate = String(localStorage.getItem(FORGOTTEN_SURAH_DATE_STORAGE_KEY) || '').trim();
    const storedId = Number.parseInt(String(localStorage.getItem(FORGOTTEN_SURAH_ID_STORAGE_KEY) || ''), 10);
    const storedHook = String(localStorage.getItem(FORGOTTEN_SURAH_HOOK_STORAGE_KEY) || '').trim();
    const hasStoredSurah = Number.isFinite(storedId) && storedId > 0;
    const daysSinceStored = storedDate ? getDaysBetweenDateKeys(storedDate, todayDateKey) : Number.POSITIVE_INFINITY;
    const shouldRotate = !hasStoredSurah || !storedDate || daysSinceStored >= FORGOTTEN_SURAH_WINDOW_DAYS;

    const journalSurahSet = new Set(
      journalEntries
        .map((entry) => Number.parseInt(String(entry?.verseKey || '').split(':')[0] || '', 10))
        .filter((value) => Number.isFinite(value) && value > 0)
    );
    const bookmarkSurahSet = new Set(
      Object.values(bookmarkDetails || {})
        .map((detail) => Number.parseInt(String(detail?.chapterId || ''), 10))
        .filter((value) => Number.isFinite(value) && value > 0)
    );

    const buildCandidate = (chapter) => {
      const chapterId = Number(chapter?.id || 0);
      if (!chapterId) {
        return null;
      }

      const history = surahReadingHistory?.[chapterId] || null;
      const directSessions = Number(history?.sessions || 0);
      const inferredSessions = journalSurahSet.has(chapterId) || bookmarkSurahSet.has(chapterId) ? 1 : 0;
      const totalSessions = Math.max(directSessions, inferredSessions);
      const lastReadDate = String(history?.lastReadDate || '').trim() || (totalSessions > 0 ? lastGlobalReadDateKey : '');
      const daysSinceLastRead = lastReadDate ? getDaysBetweenDateKeys(lastReadDate, todayDateKey) : Number.POSITIVE_INFINITY;
      const neverRead = totalSessions === 0;

      if (neverRead) {
        return {
          surahNumber: chapterId,
          surahName: String(chapter?.name_simple || `Surah ${chapterId}`),
          surahNameArabic: String(chapter?.name_arabic || ''),
          tier: 1,
          neverRead: true,
          daysSinceLastRead: 0,
          tierMessage: 'You have never read this surah',
        };
      }

      if (daysSinceLastRead > FORGOTTEN_SURAH_LONG_GAP_DAYS && totalSessions < 2) {
        return {
          surahNumber: chapterId,
          surahName: String(chapter?.name_simple || `Surah ${chapterId}`),
          surahNameArabic: String(chapter?.name_arabic || ''),
          tier: 2,
          neverRead: false,
          daysSinceLastRead,
          tierMessage: `You haven't read this in ${formatStaleReadDuration(daysSinceLastRead)}`,
        };
      }

      if (OVERLOOKED_SURAH_IDS.includes(chapterId)) {
        return {
          surahNumber: chapterId,
          surahName: String(chapter?.name_simple || `Surah ${chapterId}`),
          surahNameArabic: String(chapter?.name_arabic || ''),
          tier: 3,
          neverRead: false,
          daysSinceLastRead: Number.isFinite(daysSinceLastRead) ? daysSinceLastRead : 0,
          tierMessage: 'One of the most overlooked surahs in the Quran',
        };
      }

      return null;
    };

    const candidates = chapters.map(buildCandidate).filter(Boolean);
    const candidateBySurahId = new Map(candidates.map((item) => [item.surahNumber, item]));

    let chosenCandidate = null;
    if (!shouldRotate && hasStoredSurah) {
      chosenCandidate = candidateBySurahId.get(storedId) || {
        surahNumber: storedId,
        surahName: String(chapters.find((chapter) => Number(chapter?.id || 0) === storedId)?.name_simple || `Surah ${storedId}`),
        surahNameArabic: String(chapters.find((chapter) => Number(chapter?.id || 0) === storedId)?.name_arabic || ''),
        tier: 3,
        neverRead: false,
        daysSinceLastRead: 0,
        tierMessage: 'One of the most overlooked surahs in the Quran',
      };
    } else {
      const tierBuckets = [1, 2, 3].map((tier) => candidates.filter((candidate) => candidate.tier === tier));
      const firstNonEmptyTier = tierBuckets.find((bucket) => bucket.length > 0) || [];
      const previousSurahId = hasStoredSurah ? storedId : null;
      const pool =
        previousSurahId && firstNonEmptyTier.length > 1
          ? firstNonEmptyTier.filter((candidate) => candidate.surahNumber !== previousSurahId)
          : firstNonEmptyTier;
      const randomPool = pool.length ? pool : firstNonEmptyTier;

      if (randomPool.length > 0) {
        chosenCandidate = randomPool[Math.floor(Math.random() * randomPool.length)];
      } else if (chapters.length > 0) {
        const fallbackChapter = chapters[0];
        chosenCandidate = {
          surahNumber: Number(fallbackChapter.id || 1),
          surahName: String(fallbackChapter.name_simple || 'Al-Fatihah'),
          surahNameArabic: String(fallbackChapter.name_arabic || ''),
          tier: 3,
          neverRead: false,
          daysSinceLastRead: 0,
          tierMessage: 'One of the most overlooked surahs in the Quran',
        };
      }

      if (chosenCandidate) {
        localStorage.setItem(FORGOTTEN_SURAH_ID_STORAGE_KEY, String(chosenCandidate.surahNumber));
        localStorage.setItem(FORGOTTEN_SURAH_DATE_STORAGE_KEY, todayDateKey);
        localStorage.removeItem(FORGOTTEN_SURAH_HOOK_STORAGE_KEY);
      }
    }

    if (!chosenCandidate) {
      return null;
    }

    let hook = storedHook;
    const selectedIsStored = hasStoredSurah && storedId === chosenCandidate.surahNumber;
    if (!selectedIsStored || shouldRotate || !hook) {
      hook = getForgottenSurahHookText(chosenCandidate.surahNumber);
      localStorage.setItem(FORGOTTEN_SURAH_HOOK_STORAGE_KEY, hook);
    }

    return {
      ...chosenCandidate,
      hook,
    };
  }

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

  const activeCollection = useMemo(
    () => verseCollections.find((collection) => collection.id === selectedCollectionId) || null,
    [verseCollections, selectedCollectionId]
  );
  const activeCollectionVerses = useMemo(() => {
    if (!activeCollection) {
      return [];
    }

    return [...(activeCollection.verses || [])].sort((a, b) => {
      const left = String(a.addedAt || '');
      const right = String(b.addedAt || '');
      return left.localeCompare(right);
    });
  }, [activeCollection]);

  function createCollectionByName(rawName) {
    const normalizedName = sanitizeCollectionName(rawName);
    if (!normalizedName) {
      return '';
    }

    const existing = verseCollections.find((collection) => collection.name.toLowerCase() === normalizedName.toLowerCase());
    if (existing) {
      return existing.id;
    }

    const createdAt = new Date().toISOString();
    const nextCollection = {
      id: `collection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: normalizedName,
      createdAt,
      verses: [],
    };

    setVerseCollections((current) => [nextCollection, ...current]);
    return nextCollection.id;
  }

  function promptCreateCollection() {
    const input = window.prompt('Collection name (max 30 characters):', '');
    if (input === null) {
      return '';
    }

    const normalizedName = sanitizeCollectionName(input);
    if (!normalizedName) {
      window.alert('Please enter a valid collection name.');
      return '';
    }

    return createCollectionByName(normalizedName);
  }

  function saveVerseToCollection(collectionId, verse, translationSource = '') {
    const normalizedCollectionId = String(collectionId || '').trim();
    if (!normalizedCollectionId || !verse) {
      return;
    }

    const verseKey = String(verse?.verse_key || '').trim();
    if (!verseKey) {
      return;
    }

    const parsedVerseParts = parseVerseKeyParts(verseKey);
    const verseEntry = {
      verseKey,
      verseId: String(getVerseId(verse)),
      chapterId: Number(selectedChapter?.id || parsedVerseParts.surah || 0),
      surahName: String(selectedChapter?.name_simple || `Surah ${parsedVerseParts.surah || ''}`).trim(),
      arabicText: String(verse?.text_uthmani || '').trim(),
      translationText: stripHtmlTags(
        translationSource ||
          verse?.translations?.[0]?.text ||
          verse?.translations?.[0]?.translation ||
          verse?.translation?.text ||
          ''
      ),
      note: '',
      addedAt: new Date().toISOString(),
    };

    let didAdd = false;
    setVerseCollections((current) =>
      current.map((collection) => {
        if (collection.id !== normalizedCollectionId) {
          return collection;
        }

        if ((collection.verses || []).some((item) => String(item.verseKey || '') === verseKey)) {
          return collection;
        }

        didAdd = true;
        return {
          ...collection,
          verses: [...(collection.verses || []), verseEntry],
        };
      })
    );

    if (didAdd) {
      postBookmarkToServer(verse, true);
    }
  }

  function removeVerseFromCollection(collectionId, verseKey) {
    const normalizedCollectionId = String(collectionId || '').trim();
    const normalizedVerseKey = String(verseKey || '').trim();
    if (!normalizedCollectionId || !normalizedVerseKey) {
      return;
    }

    setVerseCollections((current) =>
      current.map((collection) => {
        if (collection.id !== normalizedCollectionId) {
          return collection;
        }

        return {
          ...collection,
          verses: (collection.verses || []).filter((item) => String(item.verseKey || '') !== normalizedVerseKey),
        };
      })
    );
  }

  function updateCollectionVerseNote(collectionId, verseKey, noteValue) {
    const normalizedCollectionId = String(collectionId || '').trim();
    const normalizedVerseKey = String(verseKey || '').trim();
    if (!normalizedCollectionId || !normalizedVerseKey) {
      return;
    }

    setVerseCollections((current) =>
      current.map((collection) => {
        if (collection.id !== normalizedCollectionId) {
          return collection;
        }

        return {
          ...collection,
          verses: (collection.verses || []).map((item) =>
            String(item.verseKey || '') === normalizedVerseKey
              ? {
                  ...item,
                  note: String(noteValue || ''),
                }
              : item
          ),
        };
      })
    );
  }

  function deleteCollection(collectionId) {
    const normalizedCollectionId = String(collectionId || '').trim();
    if (!normalizedCollectionId) {
      return;
    }

    const collection = verseCollections.find((item) => item.id === normalizedCollectionId);
    const label = collection?.name || 'this collection';
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) {
      return;
    }

    setVerseCollections((current) => current.filter((item) => item.id !== normalizedCollectionId));
    setSelectedCollectionId((current) => (current === normalizedCollectionId ? '' : current));
  }

  function handleCollectionMenuPick(targetCollectionId, verse, translationSource) {
    let nextCollectionId = String(targetCollectionId || '').trim();
    if (nextCollectionId === '__create__') {
      nextCollectionId = promptCreateCollection();
    }

    if (!nextCollectionId) {
      return;
    }

    saveVerseToCollection(nextCollectionId, verse, translationSource);
    setCollectionMenuVerseId('');
  }

  useEffect(() => {
    localStorage.setItem(SURAH_READING_HISTORY_STORAGE_KEY, JSON.stringify(surahReadingHistory));
  }, [surahReadingHistory]);

  useEffect(() => {
    const currentSurahId = Number(selectedChapter?.id || 0);
    if (!currentSurahId) {
      return;
    }

    setSurahReadingHistory((current) => recordSurahReadingSession(current, currentSurahId, getTodayKey()));
  }, [selectedChapter?.id]);

  useEffect(() => {
    if (!chapters.length) {
      return;
    }

    let isCancelled = false;

    async function loadForgottenSurah() {
      if (!isCancelled) {
        setIsForgottenSurahLoading(true);
      }

      try {
        const resolved = await resolveForgottenSurahForWeek();
        if (!isCancelled) {
          setForgottenSurah(resolved);
        }
      } catch {
        if (!isCancelled) {
          setForgottenSurah(null);
        }
      } finally {
        if (!isCancelled) {
          setIsForgottenSurahLoading(false);
        }
      }
    }

    loadForgottenSurah();

    return () => {
      isCancelled = true;
    };
  }, [chapters, surahReadingHistory, journalEntries, bookmarkDetails, lastGlobalReadDateKey]);

  useEffect(() => {
    if (!isDrawerOpen || drawerTab !== 'surahs') {
      return;
    }

    setForgottenSurahDismissedDate(String(localStorage.getItem(FORGOTTEN_SURAH_DISMISSED_DATE_STORAGE_KEY) || '').trim());
  }, [isDrawerOpen, drawerTab]);

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

  const sharedReflectionsSet = useMemo(() => new Set(sharedReflections), [sharedReflections]);
  const sharedReflectionCount = sharedReflectionsSet.size;
  const isPublicAccount = accountPrivacy === 'public';

  const reflectionActor = useMemo(() => {
    const identity = getCurrentUserIdentity();
    const loggedIn = Boolean(authSession.loggedIn && identity.userId);
    const userId = loggedIn ? identity.userId : getOrCreateGuestReflectionActorId();
    const userName = loggedIn
      ? identity.name
      : `Anonymous ${profileName === 'Sister' ? 'Sister' : 'Brother'}`;

    return {
      userId,
      userName,
      loggedIn,
    };
  }, [authSession.loggedIn, profileName]);

  const khatmahCurrentVerseId = Number(khatmahProgressState.verseId || 1);
  const khatmahProgressCount = Math.max(0, Math.min(TOTAL_QURAN_VERSES, khatmahCurrentVerseId));
  const khatmahProgressPercent = (khatmahProgressCount / TOTAL_QURAN_VERSES) * 100;
  const khatmahAcceptedCount = livingQuranLog.filter((entry) => String(entry?.status || '') !== 'skipped').length;
  const khatmahSkippedCount = livingQuranLog.filter((entry) => String(entry?.status || '') === 'skipped').length;
  const khatmahDoneCount = livingQuranLog.filter((entry) => String(entry?.status || '') === 'done').length;
  const khatmahStoredVerseParts = parseVerseKeyParts(khatmahProgressState.verseKey || '1:1');
  const khatmahStoredSurah = chapters.find((chapter) => Number(chapter?.id || 0) === khatmahStoredVerseParts.surah);
  const hasKhatmahResumePoint = Boolean(khatmahProgressState.verseKey && khatmahProgressState.verseKey !== '1:1');
  const khatmahResumeLabel = hasKhatmahResumePoint
    ? `${khatmahStoredSurah?.name_simple || `Surah ${khatmahStoredVerseParts.surah || 1}`}, Verse ${khatmahStoredVerseParts.ayah || 1}`
    : '';
  const mushafSurahOptions = useMemo(
    () =>
      Array.from({ length: 114 }, (_, index) => {
        const surahId = index + 1;
        const chapter = chapters.find((item) => Number(item?.id || 0) === surahId);
        return {
          id: surahId,
          name: String(chapter?.name_simple || `Surah ${surahId}`),
          versesCount: Number(chapter?.verses_count || chapter?.versesCount || 0),
        };
      }),
    [chapters]
  );
  const selectedMushafSurah = mushafSurahOptions.find((option) => option.id === Number(mushafLogForm.surahId || 0)) || null;
  const selectedMushafSurahMaxVerse = Number(selectedMushafSurah?.versesCount || 0);
  const selectedKhatmahIntervalTarget =
    KHATMAH_INTERVAL_OPTIONS.find((option) => option.id === khatmahInterval)?.targetVerses || 10;

  function addCoins(amount) {
    setCoins((current) => current + amount);
  }

  function applyManualReadProgress(verseCount) {
    const normalizedVerseCount = Number.parseInt(String(verseCount || 0), 10);
    if (!Number.isFinite(normalizedVerseCount) || normalizedVerseCount <= 0) {
      return { versesLogged: 0, earnedCoins: 0, todaysCountAfter: Number(streakRef.current?.activityLog?.[getTodayKey()] || 0) };
    }

    const dateKey = getTodayKey();
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

    const nextTodaysCount = todaysCount + normalizedVerseCount;
    const nextStreakData = {
      lastReadDate: updatedLastReadDate,
      currentStreak: updatedCurrentStreak,
      longestStreak: Math.max(Number(currentStreakData.longestStreak || 0), updatedCurrentStreak),
      activityLog: {
        ...(currentStreakData.activityLog || {}),
        [dateKey]: nextTodaysCount,
      },
    };

    streakRef.current = nextStreakData;
    setStreak(nextStreakData);

    if (updatedCurrentStreak !== Number(currentStreakData.currentStreak || 0)) {
      postStreakToServer(nextStreakData);
    }

    const nextMultiplier = updatedCurrentStreak >= 7 ? 2 : 1;
    const earnedCoins = normalizedVerseCount * nextMultiplier;

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

    checkAndTriggerWirdCelebration(nextTodaysCount);

    return {
      versesLogged: normalizedVerseCount,
      earnedCoins,
      todaysCountAfter: nextTodaysCount,
    };
  }

  function openMushafLogModal() {
    setMushafLogForm((current) => ({
      surahId: Number(current?.surahId || selectedChapter?.id || 1),
      fromVerse: Number(current?.fromVerse || 1),
      toVerse: Number(current?.toVerse || 1),
    }));
    setMushafLogError('');
    setIsMushafLogOpen(true);
  }

  function closeMushafLogModal() {
    setIsMushafLogOpen(false);
    setMushafLogError('');
  }

  function submitMushafLogReading() {
    const surahId = Number.parseInt(String(mushafLogForm.surahId || ''), 10);
    const fromVerse = Number.parseInt(String(mushafLogForm.fromVerse || ''), 10);
    const toVerse = Number.parseInt(String(mushafLogForm.toVerse || ''), 10);

    if (!Number.isFinite(surahId) || surahId < 1 || surahId > 114) {
      setMushafLogError('Please select a valid surah.');
      return;
    }

    if (!Number.isFinite(fromVerse) || !Number.isFinite(toVerse) || fromVerse <= 0 || toVerse <= 0) {
      setMushafLogError('Please enter a valid verse range.');
      return;
    }

    if (toVerse < fromVerse) {
      setMushafLogError('To verse must be greater than or equal to from verse.');
      return;
    }

    const surahOption = mushafSurahOptions.find((option) => option.id === surahId);
    const maxVerse = Number(surahOption?.versesCount || 0);

    if (maxVerse > 0 && toVerse > maxVerse) {
      setMushafLogError(`Surah ${surahOption?.name || surahId} has ${maxVerse} verses.`);
      return;
    }

    const versesLogged = toVerse - fromVerse + 1;
    const result = applyManualReadProgress(versesLogged);
    const dateKey = getTodayKey();

    setSurahReadingHistory((current) => recordSurahReadingSession(current, surahId, dateKey));

    const entry = {
      id: `mushaf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      dateKey,
      surahId,
      surahName: String(surahOption?.name || `Surah ${surahId}`),
      fromVerse,
      toVerse,
      versesLogged,
      createdAt: new Date().toISOString(),
    };

    setMushafLogHistory((current) => [entry, ...current].slice(0, 300));
    setMushafLogStatus(`Logged ${result.versesLogged} verses — Barakallahu feek`);
    setMushafLogError('');
    setIsMushafLogOpen(false);
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

      if (updatedCurrentStreak !== Number(currentStreakData.currentStreak || 0)) {
        postStreakToServer(nextStreakData);
      }

      checkAndTriggerWirdCelebration(todaysCount + 1);
    } else {
      const currentReadCount = Number(streakRef.current?.activityLog?.[dateKey] || 0);
      checkAndTriggerWirdCelebration(currentReadCount);
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
    const earnedCoins = earnCoinsForAction('read', key, 1);

    if (earnedCoins > 0 && isChildModeActive) {
      const matchingVerse = verses.find((verse) => String(getVerseId(verse)) === key);
      const verseKeyParts = parseVerseKeyParts(String(matchingVerse?.verse_key || ''));
      const surahFromVerse = chapters.find((chapter) => Number(chapter?.id || 0) === Number(verseKeyParts.surah || 0));
      const surahName =
        String(selectedChapter?.name_simple || '').trim() ||
        String(surahFromVerse?.name_simple || '').trim() ||
        'Current Surah';

      setChildModeActivity((current) => {
        const dateKey = getTodayKey();
        const currentToday = String(current?.dateKey || '') === dateKey;
        const currentCount = Number(current?.versesCompletedToday || 0);

        return {
          dateKey,
          lastSurahName: surahName,
          versesCompletedToday: (currentToday ? currentCount : 0) + 1,
          updatedAt: new Date().toISOString(),
        };
      });
    }

    logReadingSessionToServer(key);
  }

  function promptForFamilyPin(promptText) {
    const response = window.prompt(promptText, '');
    if (response === null) {
      return null;
    }

    const cleaned = String(response || '').trim();
    if (!/^\d{4}$/.test(cleaned)) {
      window.alert('PIN must be exactly 4 digits.');
      return null;
    }

    return cleaned;
  }

  function handleFamilyModeToggle(nextEnabled) {
    if (nextEnabled) {
      const pin = promptForFamilyPin('Set a 4-digit PIN for Family Mode');
      if (!pin) {
        return;
      }

      setFamilyModePin(pin);
      setFamilyModeEnabled(true);
      setIsChildModeActive(false);
      return;
    }

    if (familyModeEnabled && familyModePin) {
      const verify = promptForFamilyPin('Enter your Family Mode PIN to disable Family Mode');
      if (!verify) {
        return;
      }

      if (verify !== familyModePin) {
        window.alert('Incorrect PIN. Family Mode remains enabled.');
        return;
      }
    }

    setFamilyModeEnabled(false);
    setIsChildModeActive(false);
  }

  function switchToChildMode() {
    if (!familyModeEnabled || !/^\d{4}$/.test(familyModePin)) {
      return;
    }

    const pin = promptForFamilyPin('Enter Family Mode PIN to switch to Child Mode');
    if (!pin) {
      return;
    }

    if (pin !== familyModePin) {
      window.alert('Incorrect PIN.');
      return;
    }

    setIsChildModeActive(true);
    setActivePage('reader');
  }

  function backToParentMode() {
    const pin = promptForFamilyPin('Enter Family Mode PIN to return to Parent Mode');
    if (!pin) {
      return;
    }

    if (pin !== familyModePin) {
      window.alert('Incorrect PIN.');
      return;
    }

    setIsChildModeActive(false);
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
    if (!entryMode || activePage !== 'reader') {
      activeCenteredVerseIdRef.current = '';
      clearActiveReadTimer();
      return;
    }

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
  }, [entryMode, activePage, verses, actionLog]);

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

  function parseLiveThisResponse(rawText) {
    const lines = String(rawText || '')
      .split(/\r?\n+/)
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const fallback = { action: '', why: '', example: '' };

    lines.forEach((line) => {
      if (/^action:/i.test(line)) {
        fallback.action = line.replace(/^action:\s*/i, '').trim();
      } else if (/^why:/i.test(line)) {
        fallback.why = line.replace(/^why:\s*/i, '').trim();
      } else if (/^example:/i.test(line)) {
        fallback.example = line.replace(/^example:\s*/i, '').trim();
      }
    });

    if (fallback.action || fallback.why || fallback.example) {
      return fallback;
    }

    return {
      action: lines[0] || '',
      why: lines[1] || '',
      example: lines[2] || '',
    };
  }

  async function toggleLiveThis(verse) {
    const verseId = getVerseId(verse);
    const currentState = liveThisByVerse[verseId] || {};

    if (currentState.expanded) {
      setLiveThisByVerse((current) => ({
        ...current,
        [verseId]: {
          ...(current[verseId] || {}),
          expanded: false,
        },
      }));
      return;
    }

    if (currentState.response && !currentState.loading) {
      setLiveThisByVerse((current) => ({
        ...current,
        [verseId]: {
          ...(current[verseId] || {}),
          expanded: true,
          error: '',
        },
      }));
      return;
    }

    const translation =
      verse.translations?.[0]?.text ||
      verse.translations?.[0]?.translation ||
      verse.translation?.text ||
      '';

    setLiveThisByVerse((current) => ({
      ...current,
      [verseId]: {
        ...(current[verseId] || {}),
        expanded: true,
        loading: true,
        error: '',
      },
    }));

    try {
      const response = await fetch('/api/ai/live-this', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSurah: selectedChapter?.name_simple || '',
          currentVerse: String(verse.verse_key || verseId),
          currentArabicText: String(verse.text_uthmani || ''),
          currentTranslation: String(translation || ''),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || 'Failed to generate Live this action');
      }

      const nextResponse = String(payload?.response || '').trim();
      if (!nextResponse) {
        throw new Error('No action returned for this verse yet');
      }

      setLiveThisByVerse((current) => ({
        ...current,
        [verseId]: {
          expanded: true,
          loading: false,
          error: '',
          response: nextResponse,
        },
      }));
    } catch (err) {
      setLiveThisByVerse((current) => ({
        ...current,
        [verseId]: {
          ...(current[verseId] || {}),
          expanded: true,
          loading: false,
          error: err.message || 'Failed to generate Live this action',
        },
      }));
    }
  }

  function toggleBookmark(verse) {
    const verseId = getVerseId(verse);
    const isAlreadyBookmarked = bookmarks.has(verseId);
    const nextBookmarkState = !isAlreadyBookmarked;

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
      postBookmarkToServer(verse, nextBookmarkState);
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
    postBookmarkToServer(verse, nextBookmarkState);
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

    setReflectionShareNotice('');
    setJournalViewTab('mine');
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
    setReflectionShareNotice('');
    setJournalViewTab('mine');
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

  async function publishReflectionEntry(entry, { showNotice = false } = {}) {
    if (!entry || accountPrivacy !== 'public') {
      return { published: false, reason: 'privacy' };
    }

    const answer = String(entry.answer || '').trim();
    if (!answer) {
      return { published: false, reason: 'empty' };
    }

    const shareKey = getReflectionShareKey(entry);
    if (sharedReflectionsSet.has(shareKey)) {
      return { published: false, reason: 'already-shared' };
    }

    const response = await fetch('/api/reflections/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: reflectionActor.userId,
        userName: reflectionActor.loggedIn ? reflectionActor.userName : 'Anonymous Brother/Sister',
        verseKey: entry.verseKey,
        verseText: entry.verseText,
        translation: entry.translation,
        answer,
        date: entry.date,
        accountPrivacy,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || 'Could not share reflection');
    }

    setSharedReflections((current) => Array.from(new Set([...current, shareKey])));
    if (showNotice) {
      setReflectionShareNotice('Your reflection has been shared to the community');
    }
    fetchCommunityReflections({
      silent: true,
      verseKey: String(entry.verseKey || '').trim(),
    });

    return { published: true };
  }

  async function saveReflectionEntry() {
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

    try {
      await publishReflectionEntry(entry, { showNotice: false });
    } catch (error) {
      setError(error.message || 'Saved locally, but could not share to community');
    }

    setReflectionModal(null);
  }

  async function fetchCommunityReflections({ silent = false, verseKey = '' } = {}) {
    if (!silent) {
      setIsCommunityLoading(true);
    }
    setCommunityFeedError('');

    try {
      const normalizedVerseKey = String(verseKey || reflectionModal?.verseKey || '').trim();
      const query = normalizedVerseKey ? `?verseKey=${encodeURIComponent(normalizedVerseKey)}` : '';
      const response = await fetch(`/api/reflections/public${query}`);
      const payload = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(payload?.message || 'Could not load community reflections');
      }

      setCommunityReflections(Array.isArray(payload) ? payload : []);
    } catch (error) {
      setCommunityFeedError(error.message || 'Could not load community reflections');
    } finally {
      if (!silent) {
        setIsCommunityLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!reflectionModal || journalViewTab !== 'community') {
      return;
    }

    fetchCommunityReflections({ verseKey: String(reflectionModal.verseKey || '').trim() });
  }, [reflectionModal, journalViewTab]);

  function toggleCommunityReflectionExpanded(reflectionId) {
    const key = String(reflectionId || '');
    if (!key) {
      return;
    }

    setExpandedCommunityItems((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  async function handleShareReflectionToCommunity() {
    if (!reflectionModal || reflectionModal.mode !== 'saved') {
      return;
    }

    setIsSharingReflection(true);
    setReflectionShareNotice('');

    try {
      await publishReflectionEntry(reflectionModal, { showNotice: true });
    } catch (error) {
      setReflectionShareNotice(error.message || 'Could not share reflection');
    } finally {
      setIsSharingReflection(false);
    }
  }

  async function toggleCommunityLike(reflectionId) {
    const id = String(reflectionId || '').trim();
    if (!id) {
      return;
    }

    try {
      const response = await fetch(`/api/reflections/${encodeURIComponent(id)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: reflectionActor.userId }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Could not update like');
      }

      setCommunityReflections((current) =>
        current.map((item) => {
          if (String(item?.id || '') !== id) {
            return item;
          }

          return {
            ...item,
            likes: Number(payload?.likes || 0),
            likedBy: Array.isArray(payload?.likedBy) ? payload.likedBy : item.likedBy,
          };
        })
      );
    } catch (error) {
      setCommunityFeedError(error.message || 'Could not update like');
    }
  }

  async function deleteCommunityReflection(reflectionId) {
    const id = String(reflectionId || '').trim();
    if (!id) {
      return;
    }

    try {
      const response = await fetch(`/api/reflections/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: reflectionActor.userId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 204) {
        throw new Error(payload?.message || 'Could not delete reflection');
      }

      setCommunityReflections((current) => current.filter((item) => String(item?.id || '') !== id));
    } catch (error) {
      setCommunityFeedError(error.message || 'Could not delete reflection');
    }
  }

  function getKhatmahVerseTranslation(verse) {
    return String(
      verse?.translations?.[0]?.text ||
      verse?.translations?.[0]?.translation ||
      verse?.translation?.text ||
      ''
    ).trim();
  }

  async function fetchKhatmahSurahVerses(chapterId) {
    const perPage = 50;
    const baseParams = `word_fields=audio_url,translation_text&fields=text_uthmani&words=true&per_page=${perPage}`;

    async function fetchAllVersePages(translationId) {
      const firstResponse = await fetch(
        `/api/quran/verses/by_chapter/${chapterId}?${baseParams}&translations=${translationId}&page=1`
      );
      const firstPayload = await firstResponse.json();

      if (!firstResponse.ok) {
        throw new Error(firstPayload?.message || 'Failed to fetch verses');
      }

      const totalPages = Number(firstPayload?.pagination?.total_pages || 1);
      if (totalPages <= 1) {
        return firstPayload;
      }

      const remainingPagePayloads = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) => index + 2).map(async (page) => {
          const response = await fetch(
            `/api/quran/verses/by_chapter/${chapterId}?${baseParams}&translations=${translationId}&page=${page}`
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
    const hasTranslation = (payload?.verses || []).some((verse) => Boolean(getKhatmahVerseTranslation(verse)));
    if (!hasTranslation) {
      const fallbackPayload = await fetchAllVersePages(85);
      if (Array.isArray(fallbackPayload?.verses) && fallbackPayload.verses.length > 0) {
        payload = fallbackPayload;
      }
    }

    return Array.isArray(payload?.verses) ? payload.verses : [];
  }

  async function loadKhatmahSurah(chapterId, { resumeVerseKey = '', resetCheckpoint = false } = {}) {
    const numericChapterId = Number.parseInt(String(chapterId || ''), 10);
    if (!Number.isFinite(numericChapterId) || numericChapterId <= 0) {
      throw new Error('Invalid surah for Khatmah Mode');
    }

    setKhatmahError('');
    setIsKhatmahLoading(true);
    try {
      const versesForSurah = await fetchKhatmahSurahVerses(numericChapterId);
      if (!versesForSurah.length) {
        throw new Error('Could not load Khatmah verses');
      }

      const resumeIndex = Math.max(
        0,
        versesForSurah.findIndex((verse) => String(verse?.verse_key || '') === String(resumeVerseKey || '').trim())
      );
      const checkpointStart = resetCheckpoint ? 0 : resumeIndex;
      const resumeVerse = versesForSurah[resumeIndex] || versesForSurah[0];

      setKhatmahSurahId(numericChapterId);
      setKhatmahVerses(versesForSurah);
      setKhatmahBlockStartIndex(checkpointStart);
      setKhatmahGateEndIndex(-1);
      setVersesSinceLastCheckpoint(0);
      setKhatmahWindowStartIndex(Math.floor(Math.max(0, resumeIndex) / 10) * 10);
      setKhatmahCurrentReadIndex(Math.max(0, resumeIndex));
      khatmahReadVerseKeysRef.current = new Set();
      khatmahCheckpointReadIndicesRef.current = new Set();
      khatmahGateTriggeringRef.current = false;
      setKhatmahGate({
        open: false,
        verseRange: '',
        verses: [],
        loading: false,
        theme: '',
        challenges: [],
        acceptedIndexes: [],
        error: '',
      });
      setKhatmahProgressState({
        verseKey: String(resumeVerse?.verse_key || `${numericChapterId}:1`),
        verseId: Number(resumeVerse?.id || khatmahProgressState.verseId || 1),
      });

      window.setTimeout(() => {
        const safeKey = String(resumeVerse?.verse_key || '').replace(/"/g, '\\"');
        const node = safeKey
          ? document.querySelector(`[data-khatmah-verse-key="${safeKey}"]`)
          : null;
        if (node && typeof node.scrollIntoView === 'function') {
          node.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 0);
    } finally {
      setIsKhatmahLoading(false);
    }
  }

  async function loadKhatmahFromProgress() {
    const stored = readStoredKhatmahProgress();
    const { surah } = parseVerseKeyParts(stored.verseKey || '1:1');
    const targetSurah = surah || 1;
    await loadKhatmahSurah(targetSurah, {
      resumeVerseKey: stored.verseKey || `${targetSurah}:1`,
      resetCheckpoint: false,
    });
  }

  async function openKhatmahMode({ directStart = false } = {}) {
    setIsDrawerOpen(false);
    setIsUserMenuOpen(false);
    setActivePage('khatmah');
    setKhatmahTransition(null);
    if (!directStart) {
      setKhatmahSurahId(null);
      setKhatmahVerses([]);
      setKhatmahBlockStartIndex(0);
      setKhatmahGateEndIndex(-1);
      setVersesSinceLastCheckpoint(0);
      setKhatmahWindowStartIndex(0);
      setKhatmahCurrentReadIndex(-1);
      khatmahReadVerseKeysRef.current = new Set();
      khatmahCheckpointReadIndicesRef.current = new Set();
      setKhatmahGate((current) => ({ ...current, open: false }));
      return;
    }

    await loadKhatmahFromProgress();
  }

  async function beginKhatmah() {
    await loadKhatmahFromProgress();
  }

  function upsertLivingLogEntry(entry) {
    setLivingQuranLog((current) => {
      const id = String(entry?.id || '');
      if (!id) {
        return current;
      }
      const index = current.findIndex((item) => String(item?.id || '') === id);
      if (index < 0) {
        return [entry, ...current];
      }
      const next = [...current];
      next[index] = { ...next[index], ...entry };
      return next;
    });
  }

  async function buildActionGateForRange(blockVerses, gateEndIndex) {
    const verses = (Array.isArray(blockVerses) ? blockVerses : [])
      .filter(Boolean)
      .map((verse) => ({
        verseKey: String(verse?.verse_key || ''),
        translation: stripHtmlTags(getKhatmahVerseTranslation(verse)),
      }))
      .filter((verse) => verse.verseKey);

    const verseRange = verses.length ? `${verses[0].verseKey} - ${verses[verses.length - 1].verseKey}` : '';

    setKhatmahGate({
      open: true,
      verseRange,
      verses,
      loading: true,
      theme: '',
      challenges: [],
      acceptedIndexes: [],
      error: '',
    });
    setKhatmahGateEndIndex(Number.isFinite(gateEndIndex) ? gateEndIndex : -1);

    try {
      const response = await fetch('/api/ai/action-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verses }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Could not generate action challenge');
      }

      setKhatmahGate((current) => ({
        ...current,
        loading: false,
        theme: String(payload?.theme || 'Intentional Quran living'),
        challenges: (Array.isArray(payload?.challenges) ? payload.challenges : [])
          .slice(0, 2)
          .map((item) => ({
            title: String(item?.title || 'Live one verse today'),
            body: String(item?.body || 'Take one practical action from these verses today.'),
          })),
        acceptedIndexes: [],
        error: '',
      }));
    } catch (error) {
      setKhatmahGate((current) => ({
        ...current,
        loading: false,
        theme: current.theme || 'Intentional Quran living',
        challenges:
          current.challenges?.length
            ? current.challenges
            : [{ title: 'Live one verse today', body: 'Choose one practical action from these verses and complete it today.' }],
        acceptedIndexes: [],
        error: error.message || 'Could not generate challenge',
      }));
    }
  }

  function toggleGateChallengeAccepted(index) {
    const target = Number.parseInt(String(index || 0), 10);
    if (!Number.isFinite(target) || target < 0) {
      return;
    }

    setKhatmahGate((current) => {
      const existing = Array.isArray(current.acceptedIndexes) ? current.acceptedIndexes : [];
      const hasTarget = existing.includes(target);
      const acceptedIndexes = hasTarget ? existing.filter((item) => item !== target) : [...existing, target];
      return {
        ...current,
        acceptedIndexes,
      };
    });
  }

  async function onKhatmahVerseRead(index) {
    if (khatmahGate.open || khatmahTransition || khatmahGateTriggeringRef.current || isKhatmahLoading) {
      return;
    }

    const numericIndex = Number.parseInt(String(index || ''), 10);
    if (!Number.isFinite(numericIndex) || numericIndex < khatmahBlockStartIndex || numericIndex >= khatmahVerses.length) {
      return;
    }

    const verse = khatmahVerses[numericIndex];
    const verseKey = String(verse?.verse_key || '');
    if (!verseKey || khatmahReadVerseKeysRef.current.has(verseKey)) {
      return;
    }

    khatmahReadVerseKeysRef.current.add(verseKey);
    khatmahCheckpointReadIndicesRef.current.add(numericIndex);
    setKhatmahCurrentReadIndex(numericIndex);

    setKhatmahProgressState({
      verseKey,
      verseId: Number(verse?.id || khatmahProgressState.verseId || 1),
    });

    const currentCount = khatmahCheckpointReadIndicesRef.current.size;
    setVersesSinceLastCheckpoint(currentCount);

    const lastIndex = khatmahVerses.length - 1;
    const reachedInterval = currentCount >= selectedKhatmahIntervalTarget;
    const reachedSurahEndWithPending = numericIndex >= lastIndex && currentCount > 0;
    if (!reachedInterval && !reachedSurahEndWithPending) {
      const windowEndIndex = khatmahWindowStartIndex + 9;
      if (numericIndex >= windowEndIndex && windowEndIndex < khatmahVerses.length - 1) {
        setKhatmahWindowStartIndex((current) => {
          const next = Math.min(current + 10, Math.max(0, khatmahVerses.length - 1));
          return next;
        });
      }
      return;
    }

    khatmahGateTriggeringRef.current = true;
    try {
      const sortedIndices = Array.from(khatmahCheckpointReadIndicesRef.current).sort((a, b) => a - b);
      const gateEndIndex = sortedIndices[sortedIndices.length - 1];
      const blockVerses = sortedIndices
        .map((readIndex) => khatmahVerses[readIndex])
        .filter(Boolean);

      await buildActionGateForRange(blockVerses, gateEndIndex);
    } finally {
      khatmahGateTriggeringRef.current = false;
    }
  }

  function getKhatmahNextSurah() {
    const currentSurah = Number(khatmahSurahId || 0);
    if (!currentSurah) {
      return null;
    }

    return chapters.find((chapter) => Number(chapter?.id || 0) === currentSurah + 1) || null;
  }

  function unlockKhatmahAfterGate({ skipAll = false } = {}) {
    const gateEnd = Number(khatmahGateEndIndex || -1);
    if (gateEnd < 0 || gateEnd >= khatmahVerses.length) {
      setKhatmahGate((current) => ({ ...current, open: false }));
      return;
    }

    const acceptedIndexes = skipAll ? [] : Array.isArray(khatmahGate.acceptedIndexes) ? khatmahGate.acceptedIndexes : [];
    const gateChallenges = Array.isArray(khatmahGate.challenges) ? khatmahGate.challenges : [];

    if (acceptedIndexes.length > 0) {
      acceptedIndexes.forEach((challengeIndex) => {
        const challenge = gateChallenges[challengeIndex] || {};
        upsertLivingLogEntry({
          id: (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          verseRange: khatmahGate.verseRange,
          theme: khatmahGate.theme,
          challengeTitle: String(challenge?.title || 'Live one verse today'),
          challengeBody: String(challenge?.body || 'Choose one practical action from these verses and complete it today.'),
          acceptedDate: new Date().toISOString().slice(0, 10),
          status: 'active',
          reflection: '',
        });
      });
    } else {
      const firstChallenge = gateChallenges[0] || {};
      upsertLivingLogEntry({
        id: (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        verseRange: khatmahGate.verseRange,
        theme: khatmahGate.theme,
        challengeTitle: String(firstChallenge?.title || 'Live one verse today'),
        challengeBody: String(firstChallenge?.body || 'Choose one practical action from these verses and complete it today.'),
        acceptedDate: new Date().toISOString().slice(0, 10),
        status: 'skipped',
        reflection: '',
      });
    }

    const completedVerse = khatmahVerses[gateEnd];
    if (completedVerse) {
      setKhatmahProgressState({
        verseKey: String(completedVerse?.verse_key || khatmahProgressState.verseKey || '1:1'),
        verseId: Number(completedVerse?.id || khatmahProgressState.verseId || 1),
      });
    }

    const reachedSurahEnd = gateEnd >= khatmahVerses.length - 1;
    if (reachedSurahEnd) {
      const nextSurah = getKhatmahNextSurah();
      if (nextSurah) {
        setKhatmahTransition({
          chapterId: Number(nextSurah.id),
          nameSimple: String(nextSurah.name_simple || `Surah ${nextSurah.id}`),
          nameArabic: String(nextSurah.name_arabic || ''),
          versesCount: Number(nextSurah.verses_count || nextSurah.versesCount || 0),
        });
      } else {
        setKhatmahTransition({
          chapterId: 0,
          nameSimple: 'Khatmah Completed',
          nameArabic: '',
          versesCount: 0,
          completed: true,
        });
      }
    } else {
      setKhatmahBlockStartIndex(gateEnd + 1);
    }

    khatmahCheckpointReadIndicesRef.current = new Set();
    setVersesSinceLastCheckpoint(0);
    setKhatmahWindowStartIndex(Math.floor(Math.max(0, gateEnd + 1) / 10) * 10);

    setKhatmahGateEndIndex(-1);
    setKhatmahGate({
      open: false,
      verseRange: '',
      verses: [],
      loading: false,
      theme: '',
      challenges: [],
      acceptedIndexes: [],
      error: '',
    });
  }

  async function continueToNextKhatmahSurah() {
    if (!khatmahTransition || khatmahTransition.completed) {
      return;
    }

    setKhatmahTransition(null);
    try {
      await loadKhatmahSurah(khatmahTransition.chapterId, {
        resumeVerseKey: `${khatmahTransition.chapterId}:1`,
        resetCheckpoint: true,
      });
    } catch (error) {
      setKhatmahError(error.message || 'Could not load next surah');
    }
  }

  function markLivingChallengeDone(id) {
    setLivingQuranLog((current) =>
      current.map((entry) =>
        String(entry?.id || '') === String(id)
          ? { ...entry, status: 'done' }
          : entry
      )
    );
  }

  function updateLivingChallengeReflection(id, reflection) {
    setLivingQuranLog((current) =>
      current.map((entry) =>
        String(entry?.id || '') === String(id)
          ? { ...entry, reflection: String(reflection || '') }
          : entry
      )
    );
  }

  useEffect(() => {
    if (activePage !== 'khatmah' || !khatmahVerses.length || khatmahTransition || khatmahGate.open) {
      return;
    }

    if (khatmahObserverRef.current) {
      khatmahObserverRef.current.disconnect();
      khatmahObserverRef.current = null;
    }

    khatmahVisibleTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    khatmahVisibleTimersRef.current = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const node = entry.target;
          const index = Number.parseInt(String(node.getAttribute('data-khatmah-index') || ''), 10);
          if (!Number.isFinite(index) || index < khatmahBlockStartIndex) {
            return;
          }

          const verseKey = String(node.getAttribute('data-khatmah-verse-key') || '');
          if (!verseKey || khatmahReadVerseKeysRef.current.has(verseKey)) {
            return;
          }

          const existingTimer = khatmahVisibleTimersRef.current.get(verseKey);
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            if (!existingTimer) {
              const timerId = window.setTimeout(() => {
                khatmahVisibleTimersRef.current.delete(verseKey);
                onKhatmahVerseRead(index);
              }, 1000);
              khatmahVisibleTimersRef.current.set(verseKey, timerId);
            }
            return;
          }

          if (existingTimer) {
            window.clearTimeout(existingTimer);
            khatmahVisibleTimersRef.current.delete(verseKey);
          }
        });
      },
      { threshold: [0.6] }
    );

    khatmahObserverRef.current = observer;
    document.querySelectorAll('[data-khatmah-index]').forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
      khatmahVisibleTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      khatmahVisibleTimersRef.current = new Map();
      khatmahObserverRef.current = null;
    };
  }, [activePage, khatmahVerses, khatmahBlockStartIndex, khatmahTransition, khatmahGate.open]);

  function openCompanion() {
    if (!companionMessages.length) {
      setCompanionMessages([
        {
          role: 'assistant',
          content: `As-salamu alaykum. I'm here with you in ${currentSurahForCompanion}. If you'd like, I can give a simple meaning, brief context, or one practical takeaway from the verse you're on.`,
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
        currentArabicText: currentArabicTextForCompanion,
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

      const payload = await response.json();

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error('The AI is temporarily busy. Please try again in a moment.');
        }
        throw new Error(payload?.message || payload?.error || 'Failed to get companion reply');
      }

      setError('');

      const reply = String(payload?.reply || payload?.response || '').trim() || 'I am here with you. Could you rephrase that question?';
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
      const chapterTimings = buildWordTimingMap(payload?.audio_files || []);
      setAudioByChapter((current) => ({
        ...current,
        [cacheKey]: chapterMap,
      }));
      setWordTimingsByChapter((current) => ({
        ...current,
        [cacheKey]: chapterTimings,
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

  function normalizeVoiceMirrorReferenceText(text) {
    return String(text || '')
      .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
      .replace(/\u0640/g, '')
      .replace(/[إأآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[ؤئ]/g, 'ء')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const base64 = result.split(',')[1] || '';
        if (!base64) {
          reject(new Error('Could not convert recording to base64.'));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Could not read recorded audio.'));
      reader.readAsDataURL(blob);
    });
  }

  async function getVoiceMirrorRecordedBlob(waitMs = 2500) {
    const startedAt = Date.now();
    while (!voiceMirrorRecordedBlobRef.current && Date.now() - startedAt < waitMs) {
      // Wait briefly for MediaRecorder onstop to populate the blob.
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    return voiceMirrorRecordedBlobRef.current;
  }

  function applyVoiceMirrorFallbackScoring(comparison) {
    setVoiceMirrorWordRows(comparison.rows);
    setVoiceMirrorCorrectWords(comparison.correctWords);
    setVoiceMirrorScore({
      matched: comparison.matched,
      total: comparison.total,
      percent: comparison.percent,
    });
    setVoiceMirrorDetailedScores({
      pronunciationScore: comparison.percent,
      accuracyScore: comparison.percent,
      fluencyScore: 0,
      completenessScore: 0,
    });
  }

  async function assessVoiceMirrorPronunciation(referenceText, fallbackComparison, transcribedTextInput = '') {
    const normalizedReferenceText = normalizeVoiceMirrorReferenceText(referenceText);
    if (!normalizedReferenceText) {
      applyVoiceMirrorFallbackScoring(fallbackComparison);
      return;
    }

    const recordedBlob = await getVoiceMirrorRecordedBlob();
    if (!recordedBlob) {
      applyVoiceMirrorFallbackScoring(fallbackComparison);
      setVoiceMirrorError('Recorded audio was not available for pronunciation assessment. Showing local scoring.');
      return;
    }

    try {
      const audioBase64 = await blobToBase64(recordedBlob);
      const response = await fetch('/api/voice/assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioBase64,
          referenceText: normalizedReferenceText,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Pronunciation assessment failed.');
      }

      const pronunciationScore = Math.max(0, Math.min(100, Number(payload?.pronunciationScore || 0)));
      const accuracyScore = Math.max(0, Math.min(100, Number(payload?.accuracyScore || 0)));
      const fluencyScore = Math.max(0, Math.min(100, Number(payload?.fluencyScore || 0)));
      const completenessScore = Math.max(0, Math.min(100, Number(payload?.completenessScore || 0)));

      const azureWords = Array.isArray(payload?.words) ? payload.words : [];
      const referenceWords = String(referenceText || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      const transcriptWords = String(transcribedTextInput || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      const rows = referenceWords.map((referenceWord, index) => {
        const azureWord = azureWords[index] || {};
        const rowAccuracyScore = Math.max(0, Math.min(100, Number(azureWord?.accuracyScore || 0)));
        const errorType = String(azureWord?.errorType || 'None').trim() || 'None';
        const transcriptWord = String(transcriptWords[index] || '').trim();
        const normalizedReferenceWord = normalizeArabicComparisonWord(referenceWord);
        const normalizedTranscriptWord = normalizeArabicComparisonWord(transcriptWord);
        const hasTranscriptMismatch =
          Boolean(transcriptWord) &&
          Boolean(normalizedReferenceWord) &&
          normalizedTranscriptWord !== normalizedReferenceWord;

        const adjustedWordScore = hasTranscriptMismatch
          ? Math.max(0, rowAccuracyScore - 20)
          : rowAccuracyScore;

        return {
          quranWord: referenceWord,
          userWord: transcriptWord || String(azureWord?.word || '').trim(),
          matched: errorType === 'None' && adjustedWordScore >= 90,
          similarityScore: adjustedWordScore / 100,
          accuracyScore: adjustedWordScore,
          azureAccuracyScore: rowAccuracyScore,
          transcriptMismatch: hasTranscriptMismatch,
          errorType,
        };
      });

      const resolvedRows = rows.length > 0 ? rows : fallbackComparison.rows;
      const penaltyWordCount = resolvedRows.filter((row) => {
        const score = Number(row?.accuracyScore ?? (row?.similarityScore || 0) * 100);
        return score < 80;
      }).length;
      const adjustedPronunciationScore =
        pronunciationScore > 85 && penaltyWordCount === 0
          ? pronunciationScore
          : Math.max(0, pronunciationScore - penaltyWordCount * 15);
      const matchedCount = resolvedRows.filter(
        (row) => String(row.errorType || 'None') === 'None' && Number(row.accuracyScore || 0) >= 90
      ).length;

      setVoiceMirrorWordRows(resolvedRows);
      setVoiceMirrorCorrectWords(resolvedRows.map((row) => String(row.quranWord || '').trim()).filter(Boolean));
      setVoiceMirrorScore({
        matched: matchedCount,
        total: resolvedRows.length,
        percent: Math.round(adjustedPronunciationScore),
      });
      setVoiceMirrorDetailedScores({
        pronunciationScore: adjustedPronunciationScore,
        accuracyScore,
        fluencyScore,
        completenessScore,
      });
    } catch (error) {
      applyVoiceMirrorFallbackScoring(fallbackComparison);
      setVoiceMirrorError(error.message || 'Pronunciation assessment failed. Showing local scoring.');
    }
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
    setVoiceMirrorDetailedScores({ pronunciationScore: 0, accuracyScore: 0, fluencyScore: 0, completenessScore: 0 });
    setVoiceMirrorUserProgress(0);
    voiceMirrorLiveTranscriptRef.current = '';
    voiceMirrorRecordedBlobRef.current = null;
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
        await assessVoiceMirrorPronunciation(localFallback.verseText, localComparison, transcribedText);
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
      await assessVoiceMirrorPronunciation(match.verseText, comparison, transcribedText);

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
    setVoiceMirrorDetailedScores({ pronunciationScore: 0, accuracyScore: 0, fluencyScore: 0, completenessScore: 0 });
    stopVoiceMirrorMediaCapture();
    stopAndReleaseVoiceMirrorUserAudio();
    voiceMirrorRecordedChunksRef.current = [];
    voiceMirrorRecordedBlobRef.current = null;
    voiceMirrorLiveTranscriptRef.current = '';
    voiceMirrorShouldMatchRef.current = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceMirrorError('Please allow microphone access in your browser settings to use Voice Mirror');
      return;
    }

    let stream;
    try {
      // Explicitly request mic permission before starting speech recognition.
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceMirrorMediaStreamRef.current = stream;
    } catch {
      setVoiceMirrorError('Please allow microphone access in your browser settings to use Voice Mirror');
      return;
    }

    try {
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
        voiceMirrorRecordedBlobRef.current = blob;
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
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'ar-SA';

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
      const errorType = String(event?.error || 'unknown');
      console.error('[tilawah] Voice recognition error', errorType, event);

      let message = 'Voice recognition encountered an error. Please try again.';
      if (errorType === 'not-allowed') {
        message = 'Please allow microphone access in your browser settings to use Voice Mirror';
      } else if (errorType === 'no-speech') {
        message = 'No speech was detected. Please recite clearly and try again.';
      } else if (errorType === 'network') {
        message = 'Network issue while recognizing speech. Please check your connection and try again.';
      } else if (errorType === 'aborted') {
        message = 'Voice recording was stopped before completion.';
      }

      setVoiceMirrorError(message);
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

  function onAudioVolumeChange(event) {
    const nextVolume = Math.max(0, Math.min(1, Number(event.target.value)));
    setAudioVolume(nextVolume);
    setIsAudioMuted(nextVolume === 0);
  }

  function toggleAudioMute() {
    setIsAudioMuted((current) => !current);
  }

  function selectAudioPlaybackRate(rate) {
    const nextRate = Math.max(0.5, Math.min(2, Number(rate)));
    setAudioPlaybackRate(nextRate);
  }

  function toggleAudioMenu(event) {
    event.stopPropagation();
    console.log('[tilawah] audio menu trigger clicked');
    setIsAudioMenuOpen((current) => !current);
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
    setActiveAudioWord(null);
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

  async function requestUnsealWordAnalysis(payload) {
    const response = await fetch('/api/ai/unseal-word', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error('Could not unseal this word right now. Please try again in a bit.');
    }

    const acrossQuranInput = Array.isArray(result?.acrossQuran) ? result.acrossQuran : [];
    const acrossQuran = acrossQuranInput
      .map((entry) => ({
        verseKey: String(entry?.verseKey || '').trim(),
        quote: String(entry?.quote || '').trim(),
        context: String(entry?.context || '').trim(),
      }))
      .filter((entry) => entry.verseKey && entry.quote)
      .slice(0, 3);

    return {
      totalOccurrences: Number.parseInt(String(result?.totalOccurrences || 0), 10) || 0,
      mostCommonSurah: String(result?.mostCommonSurah || '').trim(),
      makkiOrMadani: String(result?.makkiOrMadani || '').trim(),
      whyThisWord: String(result?.whyThisWord || '').trim(),
      coreMeaning: String(result?.coreMeaning || result?.coreМeaning || '').trim(),
      acrossQuran,
      whatChanges: String(result?.whatChanges || '').trim(),
    };
  }

  async function openUnsealedWordPanel() {
    if (!wordTooltip) {
      return;
    }

    const arabicWord = String(wordTooltip.arabicWord || '').trim();
    if (!arabicWord) {
      return;
    }

    const rootDisplay = formatWordRootDisplay(wordTooltip.wordRoot);
    setUnsealedWordPanel({
      loading: true,
      arabicWord,
      root: rootDisplay,
      pronunciation: String(wordTooltip.wordPronunciation || '').trim(),
      verseKey: String(wordTooltip.verseKey || '').trim(),
      error: '',
      analysis: null,
    });
    setWordTooltip(null);

    try {
      const analysis = await requestUnsealWordAnalysis({
        arabicWord,
        wordRoot: rootDisplay || String(wordTooltip.wordRoot || '').trim(),
        verseKey: String(wordTooltip.verseKey || '').trim(),
        verseText: String(wordTooltip.verseText || '').trim(),
        translation: String(wordTooltip.translation || '').trim(),
      });

      setUnsealedWordPanel((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          loading: false,
          analysis,
        };
      });
    } catch (error) {
      setUnsealedWordPanel((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          loading: false,
          error: error.message || 'Could not unseal this word right now.',
        };
      });
    }
  }

  function closeUnsealedWordPanel() {
    setUnsealedWordPanel(null);
  }

  function jumpToAcrossQuranVerse(verseKey) {
    const parsed = parseVerseKeyParts(verseKey);
    if (!parsed.surah || !parsed.ayah) {
      return;
    }

    const targetChapter = chapters.find((chapter) => Number(chapter?.id || 0) === parsed.surah);
    if (!targetChapter) {
      return;
    }

    const targetVerseKey = `${parsed.surah}:${parsed.ayah}`;
    setPendingBookmarkJump({
      chapterId: parsed.surah,
      verseId: '',
      verseKey: targetVerseKey,
    });
    setSelectedChapter(targetChapter);
    setActivePage('reader');
    closeUnsealedWordPanel();
  }

  function renderWhyThisWordText(text) {
    const source = String(text || '');
    const terms = extractAlternativeTerms(source);
    if (!source || !terms.length) {
      return source;
    }

    const matcher = new RegExp(`(${terms.map((term) => escapeRegExp(term)).join('|')})`, 'gi');
    const chunks = source.split(matcher);

    return chunks.map((chunk, index) => {
      const isAltTerm = terms.some((term) => term.toLowerCase() === chunk.toLowerCase());
      return isAltTerm ? (
        <span key={`why-alt-${index}`} className="unsealed-alt-term">
          {chunk}
        </span>
      ) : (
        <span key={`why-text-${index}`}>{chunk}</span>
      );
    });
  }

  async function handleArabicTextClick(verse, event) {
    const clickTarget = event.target instanceof HTMLElement ? event.target : null;
    const isOrnamentClick = Boolean(clickTarget?.closest('.verse-ornament'));
    const verseId = String(getVerseId(verse));

    if (isOrnamentClick) {
      triggerVerseGlow(verseId);
      return;
    }

    const container = event.currentTarget;
    const words = buildInteractiveWords(verse);
    if (!words.length) {
      return;
    }

    const wordIndex = findClosestWordIndexByCenter(container, event.clientX, event.clientY, 60);
    const word = words[wordIndex];
    if (!word) {
      return;
    }

    setWordTooltip({
      verseId,
      wordIndex,
      text: word.translation_text || 'No meaning available.',
      arabicWord: String(word.text_uthmani || '').trim(),
      wordRoot: String(word.root || '').trim(),
      wordPronunciation: String(word.transliteration || '').trim(),
      verseKey: String(verse?.verse_key || ''),
      verseText: String(verse?.text_uthmani || ''),
      translation: stripHtmlTags(
        verse?.translations?.[0]?.text ||
        verse?.translations?.[0]?.translation ||
        verse?.translation?.text ||
        ''
      ),
      x: event.clientX,
      y: event.clientY,
    });

    await playWordAudio(word, verseId);
  }

  function handleArabicTextMouseMove(verse, event) {
    const hoverTarget = event.target instanceof HTMLElement ? event.target : null;
    if (hoverTarget?.closest('.verse-ornament')) {
      setHoveredWord(null);
      return;
    }

    const container = event.currentTarget;
    const words = buildInteractiveWords(verse);
    if (!words.length) {
      setHoveredWord(null);
      return;
    }

    const wordIndex = findClosestWordIndexByCenter(container, event.clientX, event.clientY, 60);
    if (wordIndex < 0) {
      setHoveredWord(null);
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

  function triggerVerseGlow(verseId) {
    const normalizedVerseId = String(verseId || '');
    if (!normalizedVerseId) {
      return;
    }

    setWordTooltip(null);
    setHoveredWord(null);
    setGlowingVerseId(normalizedVerseId);

    if (verseGlowTimerRef.current) {
      clearTimeout(verseGlowTimerRef.current);
    }

    verseGlowTimerRef.current = setTimeout(() => {
      setGlowingVerseId((current) => (current === normalizedVerseId ? '' : current));
      verseGlowTimerRef.current = null;
    }, 2000);
  }

  function handleOrnamentClick(verse, event) {
    event.preventDefault();
    event.stopPropagation();
    triggerVerseGlow(getVerseId(verse));
  }

  function handleOrnamentMouseEnter(verse, event) {
    const verseId = String(getVerseId(verse));
    const translation = stripHtmlTags(
      verse?.translations?.[0]?.text ||
      verse?.translations?.[0]?.translation ||
      verse?.translation?.text ||
      ''
    );

    setWordTooltip(null);
    setHoveredWord(null);
    setHoveredOrnamentVerseId(verseId);
    setOrnamentVersePreview({
      verseKey: String(verse?.verse_key || ''),
      verseText: String(verse?.text_uthmani || ''),
      translation,
      x: Number(event?.clientX || 0),
      y: Number(event?.clientY || 0),
    });
  }

  function handleOrnamentMouseLeave() {
    setHoveredOrnamentVerseId('');
    setOrnamentVersePreview(null);
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
  const voiceMirrorMetricRows = [
    { label: 'Accuracy', value: Math.round(Number(voiceMirrorDetailedScores.accuracyScore || 0)) },
    { label: 'Fluency', value: Math.round(Number(voiceMirrorDetailedScores.fluencyScore || 0)) },
    { label: 'Completeness', value: Math.round(Number(voiceMirrorDetailedScores.completenessScore || 0)) },
  ];
  const getVoiceMirrorWordScore = (row) =>
    Math.round(Number(row?.accuracyScore ?? (row?.similarityScore || 0) * 100));
  const getVoiceMirrorWordClass = (row) => {
    const errorType = String(row?.errorType || 'None');
    if (errorType === 'Omission') {
      return 'word-omission';
    }

    if (row?.transcriptMismatch) {
      return 'word-okay';
    }

    const score = getVoiceMirrorWordScore(row);
    if (score >= 90) {
      return 'word-great';
    }
    if (score >= 75) {
      return 'word-okay';
    }
    return 'word-needs-work';
  };
  const voiceMirrorMistakes = voiceMirrorWordRows.filter(
    (row) =>
      (Number(row?.accuracyScore ?? (row?.similarityScore || 0) * 100) < 70 || String(row?.errorType || 'None') !== 'None') &&
      String(row?.quranWord || row?.userWord || '').trim()
  );
  const oauthDisplayName = String(authSession.user?.name || authSession.user?.email || '').trim();
  const displayedProfileName = authSession.loggedIn ? oauthDisplayName || 'Friend' : profileName;
  const headerProfileName = authSession.loggedIn ? getFirstName(oauthDisplayName) || 'User' : profileName;
  const reflectionShareKey = reflectionModal ? getReflectionShareKey(reflectionModal) : '';
  const isSavedReflection = Boolean(reflectionModal?.mode === 'saved');
  const isReflectionShared = isSavedReflection && sharedReflectionsSet.has(reflectionShareKey);
  const currentUserId = String(authSession.user?.sub || authSession.user?.email || oauthDisplayName || '').trim();
  const currentUserVote = Number(groupData?.wirdVotes?.[currentUserId] || 0);
  const selectedReciterLabel =
    reciterOptions.find((option) => option.id === selectedReciterId)?.label ||
    DEFAULT_RECITER_OPTIONS.find((option) => option.id === selectedReciterId)?.label ||
    'Selected Reciter';
  const khatmahCurrentSurah = chapters.find((chapter) => Number(chapter?.id || 0) === Number(khatmahSurahId || 0)) || null;
  const khatmahVisibleWindow = khatmahVerses
    .slice(khatmahWindowStartIndex, khatmahWindowStartIndex + 10)
    .map((verse, offset) => ({ verse, index: khatmahWindowStartIndex + offset }));
  const khatmahCurrentTrackedVerse =
    khatmahCurrentReadIndex >= 0 && khatmahCurrentReadIndex < khatmahVerses.length
      ? khatmahVerses[khatmahCurrentReadIndex]
      : null;
  const sortedGroupMembers = Array.isArray(groupData?.members)
    ? [...groupData.members].sort((a, b) => Number(b?.versesToday || 0) - Number(a?.versesToday || 0))
    : [];
  const groupGoalTarget = Math.max(1, Number(groupData?.wirdGoal || 10));
  const highestVersesToday = sortedGroupMembers.reduce((highest, member) => {
    return Math.max(highest, Number(member?.versesToday || 0));
  }, 0);
  const crownedMemberIds = new Set(
    sortedGroupMembers
      .filter((member) => Number(member?.versesToday || 0) === highestVersesToday)
      .map((member) => String(member?.userId || member?.name || '').trim())
      .filter(Boolean)
  );
  const currentUserMember = sortedGroupMembers.find((member) => String(member?.userId || '') === currentUserId);
  const currentUserHitGroupGoal = Boolean(currentUserId) && Number(currentUserMember?.versesToday || 0) >= groupGoalTarget;
  const activeFirstVisitTourStep = FIRST_VISIT_TOUR_STEPS[firstVisitTourStepIndex] || null;

  function getFirstVisitTourTargetElement(stepId) {
    if (stepId === 'arabic-word') {
      return firstVerseArabicRef.current;
    }
    if (stepId === 'tafsir-button') {
      return firstVerseTafsirRef.current;
    }
    if (stepId === 'user-dropdown') {
      return userTriggerRef.current;
    }
    if (stepId === 'surah-dropdown') {
      return surahMenuTriggerRef.current;
    }
    return null;
  }

  function getFirstVisitTourCardStyle(targetRect) {
    if (!targetRect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const cardWidth = Math.min(360, viewportWidth - 28);
    const preferredLeft = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    const left = Math.max(14, Math.min(viewportWidth - cardWidth - 14, preferredLeft));

    const belowTop = targetRect.bottom + 14;
    const aboveTop = targetRect.top - 178;
    const top = belowTop <= viewportHeight - 24 ? belowTop : Math.max(14, aboveTop);

    return {
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
    };
  }
  const groupUpdatedLabel = groupLastUpdatedAt
    ? new Date(groupLastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  const volumeIcon = isAudioMuted || audioVolume === 0 ? '🔇' : audioVolume < 0.5 ? '🔉' : '🔊';
  const audioSpeedOptions = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 1.75, 2];
  const forgottenSurahChapter = chapters.find(
    (chapter) => Number(chapter?.id || 0) === Number(forgottenSurah?.surahNumber || 0)
  );
  const wirdCelebrationParticles = useMemo(
    () => Array.from({ length: 20 }, (_, index) => ({
      id: index,
      left: 4 + ((index * 11) % 92),
      delay: (index % 7) * 0.35,
      duration: 2.8 + ((index % 5) * 0.45),
      size: 4 + (index % 4),
    })),
    []
  );

  if (!entryMode) {
    return (
      <main className="landing-shell">
        <section className="landing-left" aria-label="Introductory Quran verse">
          <div className="landing-hero-copy">
            <p className="landing-verse-ar" dir="rtl" lang="ar" translate="no">
              اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ
            </p>
            <p className="landing-verse-en">
              Read in the name of your Lord who created
              <span>Surah Al-Alaq 96:1</span>
            </p>
            <p className="landing-context">The first word revealed to the Prophet ﷺ was a command to read.</p>
          </div>
          <div className="landing-brand">Tilawah</div>
        </section>

        <section className="landing-right" aria-label="Authentication options">
          <article className="landing-card">
            <h1>Tilawah</h1>
            <p className="landing-subtitle-line">The Quran reading experience built for lasting connection - not just recitation.</p>
            <p className="landing-tagline">Your personal Quran companion</p>

            <button
              type="button"
              className="landing-guest-btn"
              onClick={continueAsGuest}
            >
              Continue as Guest
            </button>

            <div className="landing-divider" aria-hidden="true">
              <span />
              <strong>or</strong>
              <span />
            </div>

            <button
              type="button"
              className="landing-signin-btn"
              onClick={startQuranFoundationLogin}
            >
              Sign in with Quran Foundation
            </button>

            <p className="landing-footnote">Sign in to sync your bookmarks, streaks, and reflections across devices</p>
          </article>
        </section>
      </main>
    );
  }

  return (
    <main className={`reader-layout theme-${readerTheme} ${isChildModeActive ? 'child-mode-active' : ''}`}>
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
            {shouldShowForgottenSurahCard ? (
              <article className="forgotten-surah-card" aria-live="polite">
                <button
                  type="button"
                  className="forgotten-surah-dismiss-btn"
                  aria-label="Dismiss forgotten surah card for today"
                  onClick={() => {
                    const todayDateKey = getTodayKey();
                    setForgottenSurahDismissedDate(todayDateKey);
                    localStorage.setItem(FORGOTTEN_SURAH_DISMISSED_DATE_STORAGE_KEY, todayDateKey);
                  }}
                >
                  ×
                </button>
                <small className="forgotten-surah-tier-text">
                  {forgottenSurah?.tierMessage || 'Refreshing your forgotten surah...'}
                </small>
                <h3 className="forgotten-surah-arabic" dir="rtl" lang="ar" translate="no">
                  {forgottenSurah?.surahNameArabic || (isForgottenSurahLoading ? '...' : '—')}
                </h3>
                <p className="forgotten-surah-meta">
                  {forgottenSurah
                    ? `${forgottenSurah.surahNumber}. ${forgottenSurah.surahName}`
                    : 'Preparing your weekly forgotten surah'}
                </p>
                <p className="forgotten-surah-hook">
                  {forgottenSurah?.hook || 'Loading your one-line reminder...'}
                </p>
                <button
                  type="button"
                  className="forgotten-surah-open-btn"
                  disabled={!forgottenSurahChapter}
                  onClick={() => {
                    if (!forgottenSurahChapter) {
                      return;
                    }

                    setSelectedChapter(forgottenSurahChapter);
                    setActivePage('reader');
                    setIsDrawerOpen(false);
                  }}
                >
                  {forgottenSurah ? `Read Surah ${forgottenSurah.surahName} now →` : 'Read now →'}
                </button>
              </article>
            ) : null}

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
            <div className="bookmark-section-header">
              <h3>Bookmarks</h3>
              {authSession.loggedIn ? <span className="synced-badge">Synced</span> : null}
            </div>
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
        {activePage === 'reader' ? (
          isChildModeActive ? (
            <header className="reading-header child-mode-header" ref={readingHeaderRef}>
              <div className="child-mode-header-main" aria-live="polite">
                <h2 className="child-mode-surah-name">{selectedChapter?.name_simple || 'Surah'}</h2>
                <div className="child-goal-wrap">
                  <div className="child-goal-row">
                    <strong>Today's Goal</strong>
                    <span>{todaysReadCount} / {normalizedChildModeGoal} verses</span>
                  </div>
                  <div className="child-goal-track" role="progressbar" aria-valuemin={0} aria-valuemax={normalizedChildModeGoal} aria-valuenow={Math.min(todaysReadCount, normalizedChildModeGoal)}>
                    <div className="child-goal-fill" style={{ width: `${childGoalProgress}%` }} />
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="child-mode-back-btn"
                onClick={backToParentMode}
              >
                Back to Parent Mode
              </button>
            </header>
          ) : (
            <header className="reading-header" ref={readingHeaderRef}>
              <div className="reading-header-left">
                <button
                  type="button"
                  className="surah-menu-trigger"
                  ref={surahMenuTriggerRef}
                  onClick={() => {
                    setDrawerTab('surahs');
                    setIsDrawerOpen(true);
                  }}
                >
                  {selectedChapter?.name_simple || 'Surahs'}
                  <span className="surah-trigger-chevron" aria-hidden="true">
                    ▾
                    {hasForgottenSurahSignal ? <span className="forgotten-surah-dot" /> : null}
                  </span>
                </button>
                <button type="button" className="mushaf-log-trigger" onClick={openMushafLogModal}>
                  📖 Log Mushaf Reading
                </button>
                {familyModeEnabled && /^\d{4}$/.test(familyModePin) ? (
                  <button type="button" className="switch-child-mode-btn" onClick={switchToChildMode}>
                    Switch to Child Mode
                  </button>
                ) : null}
              </div>
              <div className="reading-header-info" aria-live="polite">
                <span className="reading-header-page">Page {centeredVerseData?.page_number || '-'}</span>
                <span className="reading-header-meta"> · Juz {centeredVerseData?.juz_number || '-'} / Hizb {centeredVerseData?.hizb_number || '-'}</span>
              </div>
              <div className="header-right-controls" ref={userMenuRef}>
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
                  className="user-trigger"
                  type="button"
                  ref={userTriggerRef}
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                  onClick={() => setIsUserMenuOpen((current) => !current)}
                >
                  {headerProfileName}
                </button>
                {isUserMenuOpen ? (
                  <div className="user-dropdown-menu" role="menu" aria-label="Profile navigation">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsDrawerOpen(false);
                        setProfileTab('stats');
                        setActivePage('profile');
                      }}
                    >
                      <span aria-hidden="true">📊</span>
                      <span>Dashboard</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsDrawerOpen(false);
                        setProfileTab('groups');
                        setActivePage('profile');
                      }}
                    >
                      <span aria-hidden="true">👥</span>
                      <span>Groups</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsDrawerOpen(false);
                        setSelectedCollectionId('');
                        setActivePage('collections');
                      }}
                    >
                      <span aria-hidden="true">🗂</span>
                      <span>Collections</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        openKhatmahMode();
                      }}
                    >
                      <span aria-hidden="true">📖</span>
                      <span>Khatmah Mode</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </header>
          )
        ) : null}

        {mushafLogStatus ? <p className="mushaf-log-status" aria-live="polite">{mushafLogStatus}</p> : null}

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
              {verses.map((verse, verseIndex) => {
                const verseId = getVerseId(verse);
                const verseNumber =
                  Number.parseInt(String(verse?.verse_number || ''), 10) ||
                  parseVerseKeyParts(String(verse?.verse_key || '')).ayah ||
                  0;
                const liveThisState = liveThisByVerse[verseId] || null;
                const liveThisParts = liveThisState?.response ? parseLiveThisResponse(liveThisState.response) : null;
                const interactiveWords = buildInteractiveWords(verse);
                const ornamentText = `۝${toArabicIndicNumber(verseNumber)}`;
                const translation =
                  verse.translations?.[0]?.text ||
                  verse.translations?.[0]?.translation ||
                  verse.translation?.text ||
                  '';
                const isBookmarked = bookmarks.has(verseId);

                return (
                  <article
                    key={verseId}
                    className={`verse-card verse-fade-in ${todaysActions.read.has(verseId) ? 'is-read' : ''} ${
                      isAudioPlaying && currentAudio?.verseId === verseId ? 'is-playing' : ''
                    } ${glowingVerseId === String(verseId) ? 'is-glowing' : ''}`}
                    style={{ animationDelay: `${verseIndex * 60}ms` }}
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
                        <div className="verse-collection-menu-wrap" ref={collectionMenuVerseId === String(verseId) ? collectionMenuRef : null}>
                          <button
                            className="verse-icon-btn verse-collection-btn"
                            type="button"
                            data-tooltip="Save to Collection"
                            aria-label="Save verse to collection"
                            onClick={() => {
                              setCollectionMenuVerseId((current) => (current === String(verseId) ? '' : String(verseId)));
                            }}
                          >
                            🔖+
                          </button>
                          {collectionMenuVerseId === String(verseId) ? (
                            <div className="verse-collection-menu" role="menu" aria-label="Save verse to collection">
                              {verseCollections.length === 0 ? (
                                <p className="verse-collection-empty">No collections yet</p>
                              ) : (
                                verseCollections.map((collection) => (
                                  <button
                                    key={collection.id}
                                    type="button"
                                    className="verse-collection-option"
                                    onClick={() => handleCollectionMenuPick(collection.id, verse, translation)}
                                  >
                                    {collection.name}
                                  </button>
                                ))
                              )}
                              <button
                                type="button"
                                className="verse-collection-option create"
                                onClick={() => handleCollectionMenuPick('__create__', verse, translation)}
                              >
                                + Create new collection
                              </button>
                            </div>
                          ) : null}
                        </div>
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
                        ref={verseIndex === 0 ? firstVerseArabicRef : null}
                        onClick={(event) => handleArabicTextClick(verse, event)}
                        onMouseMove={(event) => handleArabicTextMouseMove(verse, event)}
                        onMouseLeave={handleArabicTextMouseLeave}
                      >
                        {interactiveWords.length > 0
                          ? interactiveWords.map((word, index) => (
                              <span
                                key={`${verseId}-${word.id || index}`}
                                data-word-index={index}
                                className={`arabic-word-segment ${(hoveredWord?.verseId === String(verseId) && hoveredWord?.wordIndex === index) || hoveredOrnamentVerseId === String(verseId) ? 'hovered' : ''} ${activeAudioWord?.verseId === String(verseId) && activeAudioWord?.wordIndex === index ? 'word-active' : ''}`}
                              >
                                {tajweedEnabled
                                  ? renderTajweedText(word.text_uthmani, `${verseId}-${word.id || index}`)
                                  : word.text_uthmani}
                                {index < interactiveWords.length - 1 ? ' ' : ''}
                              </span>
                            ))
                          : tajweedEnabled
                            ? renderTajweedText(String(verse?.text_uthmani || '').trim(), `${verseId}-full`)
                            : String(verse?.text_uthmani || '').trim()}
                        {' '}
                        <span
                          className="verse-ornament"
                          aria-label={`Verse ${verseNumber}`}
                          onClick={(event) => handleOrnamentClick(verse, event)}
                          onMouseEnter={(event) => handleOrnamentMouseEnter(verse, event)}
                          onMouseLeave={handleOrnamentMouseLeave}
                        >
                          {ornamentText}
                        </span>
                      </span>
                    </div>

                    {showTranslation ? (
                      <div className="translation-box" dangerouslySetInnerHTML={{ __html: translation || 'No translation found.' }} />
                    ) : null}

                    <div className="verse-bottom-row">
                      {!isChildModeActive ? (
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
                      ) : null}
                      <button
                        className={`tafsir-link-btn ${expandedTafsir[verseId] ? 'active' : ''}`}
                        type="button"
                        ref={verseIndex === 0 ? firstVerseTafsirRef : null}
                        data-tooltip="Tafsir"
                        onClick={() => toggleTafsir(verseId)}
                        disabled={isLoadingTafsir}
                        aria-label="Tafsir"
                      >
                        <span aria-hidden="true">📖</span>
                        <span>Tafsir</span>
                      </button>
                      {!isChildModeActive ? (
                        <button
                          className={`tafsir-link-btn live-this-btn ${liveThisState?.expanded ? 'active' : ''}`}
                          type="button"
                          data-tooltip="Live with this Verse"
                          onClick={() => toggleLiveThis(verse)}
                          aria-label="Live with this verse"
                        >
                          <span>✦ Live this</span>
                        </button>
                      ) : null}
                    </div>

                    {expandedTafsir[verseId] ? (
                      <div
                        className="tafsir-box"
                        dangerouslySetInnerHTML={{
                          __html:
                            tafsirByChapter[selectedChapter.id]?.[verseId] ||
                            'No tafsir available for this verse.',
                        }}
                      />
                    ) : null}

                    {liveThisState?.expanded ? (
                      <div className="tafsir-box live-this-box" aria-live="polite">
                        {liveThisState.loading ? (
                          <p className="live-this-loading">Generating one practical action...</p>
                        ) : liveThisState.error ? (
                          <p className="live-this-error">{liveThisState.error}</p>
                        ) : liveThisParts ? (
                          <div className="live-this-content">
                            <p>
                              <strong>Action:</strong> {liveThisParts.action || 'No action available.'}
                            </p>
                            <p>
                              <strong>Why:</strong> {liveThisParts.why || 'No explanation available.'}
                            </p>
                            <p>
                              <strong>Example:</strong> {liveThisParts.example || 'No example available.'}
                            </p>
                          </div>
                        ) : (
                          <p className="live-this-error">No action returned yet.</p>
                        )}
                      </div>
                    ) : null}

                  </article>
                );
              })}
            </div>
            </div>
          </>
        ) : activePage === 'profile' ? (
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

            <div className="profile-page-tabs" role="tablist" aria-label="Profile sections">
              <button
                type="button"
                role="tab"
                aria-selected={profileTab === 'stats'}
                className={profileTab === 'stats' ? 'active' : ''}
                onClick={() => setProfileTab('stats')}
              >
                Stats
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={profileTab === 'groups'}
                className={profileTab === 'groups' ? 'active' : ''}
                onClick={() => setProfileTab('groups')}
              >
                Groups
              </button>
            </div>

            {profileTab === 'stats' ? (
              <>

            <header className="profile-hero">
              <h2>As-salamu alaykum, {displayedProfileName}</h2>
              <p>
                {gregorianDateLabel}
                {hijriDateLabel ? ` · ${hijriDateLabel} (Hijri)` : ''}
              </p>
              <div className="profile-auth-row">
                {authSession.loggedIn ? (
                  <>
                    <p className="profile-auth-text">Connected to Quran Foundation</p>
                    <button type="button" className="profile-auth-btn" onClick={signOutQuranFoundation}>
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button type="button" className="profile-auth-btn" onClick={startQuranFoundationLogin}>
                    Sign In with Quran Foundation
                  </button>
                )}
              </div>
            </header>

            <div className="profile-section-header">
              <h3>Streak</h3>
              {authSession.loggedIn ? <span className="synced-badge">Synced</span> : null}
            </div>

            <section className="profile-stats-row" aria-label="Reading streak statistics">
              <article className="profile-stat-tile">
                <span>Current Streak</span>
                <strong>🔥 {streakCount}</strong>
              </article>
              <article className="profile-stat-tile">
                <span>Server Streak</span>
                <strong>{serverStreak ?? '-'}</strong>
              </article>
              <article className="profile-stat-tile">
                <span>Longest Streak</span>
                <strong>{streak.longestStreak || 0}</strong>
              </article>
              <article className="profile-stat-tile">
                <span>Total Days Read</span>
                <strong>{totalDaysRead}</strong>
              </article>
              {isPublicAccount ? (
                <article className="profile-stat-tile">
                  <span>Shared to Community</span>
                  <strong>{sharedReflectionCount} reflections</strong>
                </article>
              ) : null}
            </section>

            <section className="khatm-projector-card" aria-live="polite">
              <div className="khatm-projector-header">
                <h3>Khatm Completion Projector</h3>
                {khatmProjection.activeDays > 0 ? (
                  <span>
                    {khatmProjection.activeDays} active day{khatmProjection.activeDays === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>

              {khatmProjection.totalVersesRead <= 0 ? (
                <p className="khatm-projector-primary">Start reading to see your completion projection.</p>
              ) : khatmProjection.remainingPages <= 0 ? (
                <p className="khatm-projector-primary">Masha'Allah, you've completed the Quran at this pace.</p>
              ) : (
                <>
                  <p className="khatm-projector-primary">Projected completion: {khatmProjection.projectedDateLabel}</p>
                  <p className="khatm-projector-detail">
                    {khatmProjection.totalPagesRead.toFixed(1)} / {TOTAL_QURAN_PAGES.toFixed(1)} pages read
                    {' · '}
                    {khatmProjection.remainingPages.toFixed(1)} pages remaining
                    {' · '}
                    {khatmProjection.avgDailyPages.toFixed(1)} pages/day
                  </p>
                  {khatmProjection.occasionMessage ? (
                    <p className="khatm-projector-occasion">{khatmProjection.occasionMessage}</p>
                  ) : null}
                </>
              )}
            </section>

            <section className="khatmah-journey-card" aria-live="polite">
              <div className="khatmah-journey-head">
                <h3>Khatmah Journey</h3>
                <span>{khatmahProgressPercent.toFixed(1)}%</span>
              </div>
              <p className="khatmah-journey-progress-label">
                Khatmah Progress: {khatmahProgressCount} / {TOTAL_QURAN_VERSES} verses
              </p>
              <div className="khatmah-journey-track" aria-hidden="true">
                <div className="khatmah-journey-fill" style={{ width: `${khatmahProgressPercent}%` }} />
              </div>
              <div className="khatmah-journey-stats">
                <span>Accepted: {khatmahAcceptedCount}</span>
                <span>Skipped: {khatmahSkippedCount}</span>
                <span>Done: {khatmahDoneCount}</span>
              </div>
              <button
                type="button"
                className="profile-auth-btn"
                onClick={() => {
                    openKhatmahMode({ directStart: true });
                }}
              >
                Continue Khatmah
              </button>
            </section>

            <section className="quran-map-card" aria-live="polite">
              <div className="quran-map-head">
                <h3>Your Quran Map</h3>
                <small>{quranMapReadCount} read</small>
              </div>
              <div className="quran-map-grid" role="img" aria-label="Quran surah coverage map">
                {quranMapSquares.map((square) => (
                  <span
                    key={`quran-map-${square.surahId}`}
                    className={`quran-map-cell ${square.level}`}
                    title={`Surah ${square.surahId}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="quran-map-caption">You have read {quranMapReadCount} of 114 surahs</p>
            </section>

            <section className="wird-ring-section" aria-live="polite">
              <h3>Daily Page Goal</h3>
              <div className="daily-page-goal-controls">
                <input
                  type="text"
                  inputMode="decimal"
                  value={dailyPageGoalInput}
                  onChange={(event) => setDailyPageGoalInput(event.target.value)}
                  placeholder="Enter pages (e.g. 0.5, 1, 2, 5)"
                />
                <button type="button" onClick={handleSetDailyPageGoal}>
                  Set Goal
                </button>
              </div>
              <p className="daily-page-goal-current">
                Goal: {hasDailyPageGoal ? `${dailyPageGoal} pages per day` : 'Set a page target'}
              </p>

              <div className="wird-goal-content">
                <div className="wird-wheel-column">
                  <div className="wird-ring-shell">
                    {hasDailyPageGoal ? (
                      <>
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
                      </>
                    ) : (
                      <div className="wird-ring-empty">Set a page goal below to track your progress</div>
                    )}
                  </div>

                  <p className="wird-ring-caption">
                    {hasDailyPageGoal ? `${pagesReadToday.toFixed(1)} / ${dailyPageGoal} pages` : 'Set a page goal below to track your progress'}
                  </p>
                </div>

                <aside className="reading-stats-card" aria-label="Reading statistics by period">
                  <div className="reading-stats-toggle" role="tablist" aria-label="Reading stats period">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={readingStatsPeriod === 'day'}
                      className={readingStatsPeriod === 'day' ? 'active' : ''}
                      onClick={() => setReadingStatsPeriod('day')}
                    >
                      Day
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={readingStatsPeriod === 'week'}
                      className={readingStatsPeriod === 'week' ? 'active' : ''}
                      onClick={() => setReadingStatsPeriod('week')}
                    >
                      Week
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={readingStatsPeriod === 'month'}
                      className={readingStatsPeriod === 'month' ? 'active' : ''}
                      onClick={() => setReadingStatsPeriod('month')}
                    >
                      Month
                    </button>
                  </div>

                  <div className="reading-stats-list">
                    {readingStatsRows.map((row) => (
                      <div key={row.label} className="reading-stat-row">
                        <span className="reading-stat-label">{row.icon} {row.label}</span>
                        <strong className="reading-stat-value">{row.value}</strong>
                      </div>
                    ))}
                  </div>
                </aside>
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
              </>
            ) : (
              <section className="groups-panel" aria-live="polite">
                {!authSession.loggedIn ? (
                  <div className="groups-empty-state">
                    <p>Sign in to join or create a group</p>
                    <button type="button" className="profile-auth-btn" onClick={startQuranFoundationLogin}>
                      Sign In with Quran Foundation
                    </button>
                  </div>
                ) : groupData ? (
                  <div className="group-dashboard">
                    {currentUserHitGroupGoal ? (
                      <p className="group-goal-hit-line">You hit the group goal today - Barakallahu feek 🌙</p>
                    ) : null}
                    <header className="group-header">
                      <h3>{groupData.name}</h3>
                      <small>Share code: {groupData.code}</small>
                    </header>

                    <section className="group-goal-box">
                      <h4>Wird Goal</h4>
                      <p>{Number(groupData.wirdGoal || 10)} verses/day</p>
                      <div className="group-vote-pills">
                        {GROUP_VOTE_OPTIONS.map((vote) => (
                          <button
                            key={vote}
                            type="button"
                            className={`group-vote-pill ${currentUserVote === vote ? 'active' : ''}`}
                            onClick={() => voteOnGroupWird(vote)}
                          >
                            {vote}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="group-leaderboard">
                      <h4>Leaderboard</h4>
                      <div className="group-member-list">
                        {sortedGroupMembers.map((member) => {
                          const memberToday = Number(member?.versesToday || 0);
                          const goal = Math.max(1, Number(groupData?.wirdGoal || 10));
                          const progress = Math.min(100, (memberToday / goal) * 100);
                          const isCurrentUser = String(member?.userId || '') === currentUserId;
                          const memberIdentity = String(member?.userId || member?.name || '').trim();
                          const isTopMember = memberIdentity ? crownedMemberIds.has(memberIdentity) : false;

                          return (
                            <article key={String(member?.userId || member?.name)} className={`group-member-row ${isCurrentUser ? 'is-me' : ''}`}>
                              <div className="group-member-head">
                                <strong>
                                  {isTopMember ? <span className="group-crown" aria-label="Top member">👑</span> : null}
                                  {member?.name || 'Member'}
                                </strong>
                                <span>{memberToday} today</span>
                              </div>
                              <div className="group-progress-track" aria-hidden="true">
                                <div className="group-progress-fill" style={{ width: `${progress}%` }} />
                              </div>
                              <div className="group-member-meta">
                                <span>{Number(member?.totalVerses || 0)} total</span>
                                <span>{memberToday >= goal ? '✓ Goal hit' : 'In progress'}</span>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>

                    <div className="group-refresh-row">
                      <small>{groupUpdatedLabel ? `Last updated ${groupUpdatedLabel}` : 'Last updated just now'}</small>
                      <button
                        type="button"
                        className="profile-auth-btn"
                        onClick={() => loadGroupByCode(groupData?.code || groupCode)}
                        disabled={isGroupLoading}
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="groups-empty-state">
                    <div className="groups-actions">
                      <button type="button" className="profile-auth-btn" onClick={createGroup} disabled={isGroupLoading}>
                        Create a Group
                      </button>
                    </div>
                    <div className="group-join-form">
                      <input
                        type="text"
                        value={joinGroupCode}
                        onChange={(event) => setJoinGroupCode(event.target.value.toUpperCase().slice(0, 6))}
                        placeholder="Enter 6-character code"
                      />
                      <button type="button" className="profile-auth-btn" onClick={joinGroup} disabled={isGroupLoading}>
                        Join a Group
                      </button>
                    </div>
                  </div>
                )}

                {groupError ? <p className="group-error-text">{groupError}</p> : null}
              </section>
            )}
          </section>
        ) : activePage === 'collections' ? (
          <section className="profile-dashboard collections-page">
            <button
              type="button"
              className="profile-back-btn"
              onClick={() => {
                setActivePage('reader');
                setSelectedCollectionId('');
              }}
            >
              ← Back to Reading
            </button>

            {!activeCollection ? (
              <>
                <header className="collections-header-card">
                  <h2>Verse Collections</h2>
                  <p>A personal library above basic bookmarks.</p>
                  <button
                    type="button"
                    className="profile-auth-btn"
                    onClick={() => {
                      const createdId = promptCreateCollection();
                      if (createdId) {
                        setSelectedCollectionId(createdId);
                      }
                    }}
                  >
                    + Create Collection
                  </button>
                </header>

                {verseCollections.length === 0 ? (
                  <section className="collections-empty-card">
                    <p>No collections yet. Use 🔖+ on any verse to save it into a collection.</p>
                  </section>
                ) : (
                  <section className="collections-card-grid" aria-live="polite">
                    {verseCollections.map((collection) => (
                      <article key={collection.id} className="collection-card">
                        <button
                          type="button"
                          className="collection-card-open"
                          onClick={() => setSelectedCollectionId(collection.id)}
                        >
                          <strong>{collection.name}</strong>
                          <span>{(collection.verses || []).length} saved verse{(collection.verses || []).length === 1 ? '' : 's'}</span>
                          <small>Created {new Date(collection.createdAt || Date.now()).toLocaleDateString()}</small>
                        </button>
                        <button
                          type="button"
                          className="collection-delete-btn"
                          onClick={() => deleteCollection(collection.id)}
                        >
                          Delete Collection
                        </button>
                      </article>
                    ))}
                  </section>
                )}
              </>
            ) : (
              <section className="collection-detail-card" aria-live="polite">
                <div className="collection-detail-top">
                  <button type="button" className="profile-auth-btn" onClick={() => setSelectedCollectionId('')}>
                    ← All Collections
                  </button>
                  <button
                    type="button"
                    className="collection-delete-btn"
                    onClick={() => deleteCollection(activeCollection.id)}
                  >
                    Delete Collection
                  </button>
                </div>

                <h3>{activeCollection.name}</h3>
                <p className="collection-detail-meta">{activeCollectionVerses.length} verse{activeCollectionVerses.length === 1 ? '' : 's'}</p>

                {activeCollectionVerses.length === 0 ? (
                  <p className="collections-empty-text">No verses saved here yet.</p>
                ) : (
                  <div className="collection-verses-list">
                    {activeCollectionVerses.map((item) => (
                      <article key={`${activeCollection.id}-${item.verseKey}`} className="collection-verse-card">
                        <div className="collection-verse-top">
                          <strong>{item.verseKey}</strong>
                          <button
                            type="button"
                            className="collection-verse-delete"
                            onClick={() => removeVerseFromCollection(activeCollection.id, item.verseKey)}
                          >
                            Remove
                          </button>
                        </div>
                        <p className="collection-verse-ar" dir="rtl" lang="ar" translate="no">
                          {item.arabicText || '—'}
                        </p>
                        <p className="collection-verse-tr">{item.translationText || 'No translation saved.'}</p>
                        <label className="collection-note-label" htmlFor={`collection-note-${activeCollection.id}-${item.verseKey}`}>
                          Private notes
                        </label>
                        <textarea
                          id={`collection-note-${activeCollection.id}-${item.verseKey}`}
                          className="collection-note-input"
                          defaultValue={item.note || ''}
                          placeholder="Write your private note..."
                          onBlur={(event) => updateCollectionVerseNote(activeCollection.id, item.verseKey, event.target.value)}
                        />
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </section>
        ) : (
          <section className="khatmah-mode-shell">
            <button
              type="button"
              className="profile-back-btn"
              onClick={() => {
                setActivePage('reader');
              }}
            >
              ← Back to Reading
            </button>

            {!khatmahSurahId || !khatmahVerses.length ? (
              <section className="khatmah-welcome-card">
                <h2>Khatmah Mode</h2>
                <p>
                  The companions of the Prophet ﷺ would not move past a verse until they implemented it into their lives.
                  This mode invites you to read the Quran the way they did — slowly, intentionally, and with action.
                </p>
                <div className="khatmah-interval-picker">
                  <strong>How often would you like an action challenge?</strong>
                  <div className="khatmah-interval-options" role="group" aria-label="Khatmah checkpoint interval">
                    {KHATMAH_INTERVAL_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`khatmah-interval-pill ${khatmahInterval === option.id ? 'active' : ''}`}
                        onClick={() => setKhatmahInterval(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                {hasKhatmahResumePoint ? (
                  <p className="khatmah-resume-copy">Resume your Khatmah from {khatmahResumeLabel}.</p>
                ) : null}
                {khatmahError ? <p className="group-error-text">{khatmahError}</p> : null}
                <button type="button" className="profile-auth-btn" onClick={beginKhatmah} disabled={isKhatmahLoading}>
                  {isKhatmahLoading ? 'Loading...' : hasKhatmahResumePoint ? 'Resume Your Khatmah' : 'Begin Your Khatmah'}
                </button>
              </section>
            ) : (
              <>
                <section className="khatmah-reader-card">
                  <div className="khatmah-progress-row">
                    <strong>Khatmah Progress: {khatmahProgressCount} / {TOTAL_QURAN_VERSES} verses</strong>
                    <span>{khatmahProgressPercent.toFixed(1)}%</span>
                  </div>
                  <div className="khatmah-progress-track" aria-hidden="true">
                    <div className="khatmah-progress-fill" style={{ width: `${khatmahProgressPercent}%` }} />
                  </div>
                  <div className="khatmah-surah-head">
                    <strong>{khatmahCurrentSurah?.name_simple || `Surah ${khatmahSurahId}`}</strong>
                    <span dir="rtl" lang="ar" translate="no">{khatmahCurrentSurah?.name_arabic || ''}</span>
                  </div>
                  <p className="khatmah-checkpoint-counter">
                    Verses since last checkpoint: {versesSinceLastCheckpoint} / {selectedKhatmahIntervalTarget}
                  </p>
                  <p className="khatmah-checkpoint-counter">
                    Current verse: {String(khatmahCurrentTrackedVerse?.verse_key || khatmahProgressState.verseKey || '1:1')}
                  </p>
                  <p className="khatmah-checkpoint-counter">
                    Showing verses {Math.min(khatmahWindowStartIndex + 1, khatmahVerses.length)}-
                    {Math.min(khatmahWindowStartIndex + 10, khatmahVerses.length)} of {khatmahVerses.length}
                  </p>

                  <div className="khatmah-verses-list">
                    {khatmahVisibleWindow.map(({ verse, index }) => {
                      const translation = getKhatmahVerseTranslation(verse);
                      return (
                        <article
                          key={String(verse?.id || verse?.verse_key || index)}
                          className="khatmah-verse-item"
                          data-khatmah-index={index}
                          data-khatmah-verse-key={String(verse?.verse_key || '')}
                        >
                          <div className="khatmah-verse-badge">{String(verse?.verse_key || '')}</div>
                          <p className="khatmah-verse-ar" dir="rtl" lang="ar" translate="no">
                            {String(verse?.text_uthmani || '')}
                            <span className="khatmah-ayah-end"> {buildKhatmahVerseEnding(verse)}</span>
                          </p>
                          <p
                            className="khatmah-verse-translation"
                            dangerouslySetInnerHTML={{ __html: translation || 'Translation unavailable.' }}
                          />
                        </article>
                      );
                    })}
                  </div>

                  {khatmahTransition ? (
                    <article className="khatmah-transition-card khatmah-transition-bottom">
                      <h3>{khatmahTransition.completed ? 'Khatmah Completed' : 'Next Surah Ready'}</h3>
                      {khatmahTransition.completed ? (
                        <p>You have completed your Khatmah journey. May Allah accept it from you.</p>
                      ) : (
                        <>
                          <p className="khatmah-transition-en">{khatmahTransition.nameSimple}</p>
                          <p className="khatmah-transition-ar" dir="rtl" lang="ar" translate="no">{khatmahTransition.nameArabic}</p>
                          <p>{khatmahTransition.versesCount} verses</p>
                          <button type="button" className="profile-auth-btn" onClick={continueToNextKhatmahSurah}>
                            Continue
                          </button>
                        </>
                      )}
                    </article>
                  ) : null}

                  {khatmahError ? <p className="group-error-text">{khatmahError}</p> : null}
                </section>

                <section className="khatmah-log-section">
                  <h3>My Living Quran</h3>
                  {livingQuranLog.length === 0 ? (
                    <p className="recent-reflection-empty">No challenges yet. Accept a challenge to begin your living log.</p>
                  ) : (
                    <div className="khatmah-log-list">
                      {livingQuranLog.map((entry) => {
                        const status = String(entry?.status || 'active');
                        const isDone = status === 'done';
                        const isSkipped = status === 'skipped';
                        return (
                          <article key={String(entry?.id || Math.random())} className="khatmah-log-card">
                            <div className="khatmah-log-top">
                              <strong>{entry?.verseRange || ''}</strong>
                              <span className={`khatmah-status ${isDone ? 'done' : isSkipped ? 'skipped' : 'active'}`}>
                                {isDone ? '✓ Done' : isSkipped ? 'Skipped' : '● Active'}
                              </span>
                            </div>
                            <p className="khatmah-log-theme">{entry?.theme || ''}</p>
                            <h4>{entry?.challengeTitle || ''}</h4>
                            <p>{entry?.challengeBody || ''}</p>
                            <small>Accepted: {entry?.acceptedDate || ''}</small>
                            {status === 'active' ? (
                              <>
                                <button
                                  type="button"
                                  className="profile-auth-btn"
                                  onClick={() => markLivingChallengeDone(entry?.id)}
                                >
                                  Mark as done
                                </button>
                                <textarea
                                  className="journal-answer-input"
                                  placeholder="How did this go? Write your experience..."
                                  value={String(entry?.reflection || '')}
                                  onChange={(event) => updateLivingChallengeReflection(entry?.id, event.target.value)}
                                />
                              </>
                            ) : null}
                            {isDone && entry?.reflection ? (
                              <p className="khatmah-log-reflection">{entry.reflection}</p>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                {khatmahGate.open ? (
                  <div className="khatmah-gate-overlay" role="dialog" aria-modal="true" aria-label="Khatmah action gate">
                    <section className="khatmah-gate-card">
                      <p className="khatmah-gate-range">Verses [{String(khatmahGate.verseRange || '').replace(' - ', ' — ')}]</p>
                      <h3>{khatmahGate.theme || 'Reflect and act'}</h3>
                      <div className="khatmah-gate-challenge-list">
                        {(khatmahGate.challenges?.length ? khatmahGate.challenges : [{
                          title: 'Live one verse today',
                          body: 'Choose one practical action from these verses and complete it today.',
                        }]).map((challenge, index) => {
                          const accepted = Array.isArray(khatmahGate.acceptedIndexes) && khatmahGate.acceptedIndexes.includes(index);
                          return (
                            <article key={`gate-challenge-${index}`} className="khatmah-gate-challenge">
                              <h4>{challenge.title}</h4>
                              <p>{challenge.body}</p>
                              <button
                                type="button"
                                className={`khatmah-accept-btn ${accepted ? 'accepted' : ''}`}
                                onClick={() => toggleGateChallengeAccepted(index)}
                                disabled={khatmahGate.loading}
                              >
                                {accepted ? 'Accepted' : 'Accept'}
                              </button>
                            </article>
                          );
                        })}
                      </div>
                      {khatmahGate.error ? <p className="group-error-text">{khatmahGate.error}</p> : null}
                      <div className="khatmah-gate-actions">
                        <button
                          type="button"
                          className="profile-auth-btn"
                          onClick={() => unlockKhatmahAfterGate({ skipAll: false })}
                          disabled={khatmahGate.loading}
                        >
                          Continue reading
                        </button>
                        <button
                          type="button"
                          className="khatmah-skip-link"
                          onClick={() => unlockKhatmahAfterGate({ skipAll: true })}
                          disabled={khatmahGate.loading}
                        >
                          Skip all for now
                        </button>
                      </div>
                    </section>
                  </div>
                ) : null}
              </>
            )}
          </section>
        )}
      </section>

      {activePage === 'reader' ? <div className={`global-audio-bar ${isAudioBarVisible ? 'visible' : ''}`} aria-hidden={!isAudioBarVisible}>
        <div className="audio-volume-group">
          <button
            type="button"
            className="audio-volume-toggle"
            onClick={toggleAudioMute}
            aria-label={isAudioMuted || audioVolume === 0 ? 'Unmute audio' : 'Mute audio'}
          >
            <span aria-hidden="true">{volumeIcon}</span>
          </button>
          <input
            className="audio-volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isAudioMuted ? 0 : audioVolume}
            onChange={onAudioVolumeChange}
            aria-label="Audio volume"
          />
        </div>
        <div className="audio-meta">
          <strong>{currentAudio ? `${currentAudio.chapterName} · ${currentAudio.verseKey}` : 'No surah selected'}</strong>
          <span>{currentAudio ? currentAudio.verseText || `Verse ${currentAudio.verseNumber}` : 'Choose a verse audio'}</span>
        </div>
        <div className="audio-transport-group">
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
        </div>
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
        <div className="audio-right-group" ref={audioBarMenuRef}>
          {audioPlaybackRate !== 1 ? <span className="audio-speed-indicator">{audioPlaybackRate.toFixed(1)}x</span> : null}
          <div className="audio-menu-wrap">
            <button
              type="button"
              className="audio-menu-trigger"
              aria-label="Audio player options"
              onClick={toggleAudioMenu}
            >
              ⋯
            </button>

            {isAudioMenuOpen ? (
              <div className="audio-menu-popover" role="menu" aria-label="Audio options">
                <section className="audio-menu-section">
                  <h4>Reciter</h4>
                  <div className="audio-menu-reciter-list">
                    {reciterOptions.map((option) => {
                      const selected = selectedReciterId === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`audio-menu-reciter-option ${selected ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedReciterId(option.id);
                            setIsAudioMenuOpen(false);
                          }}
                        >
                          <span>{option.label} (ID: {option.id})</span>
                          {selected ? <span aria-hidden="true">✓</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="audio-menu-section">
                  <h4>Playback Speed</h4>
                  <div className="audio-menu-speed-list">
                    {audioSpeedOptions.map((speed) => {
                      const selected = audioPlaybackRate === speed;
                      const label = speed === 1 ? '1x (Normal)' : `${Number(speed).toString()}x`;
                      return (
                        <button
                          key={speed}
                          type="button"
                          className={`audio-menu-speed-option ${selected ? 'active' : ''}`}
                          onClick={() => {
                            selectAudioPlaybackRate(speed);
                            setIsAudioMenuOpen(false);
                          }}
                        >
                          <span>{label}</span>
                          {selected ? <span aria-hidden="true">✓</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            ) : null}
          </div>
          <button
            className="global-close-btn"
            type="button"
            aria-label="Close audio player"
            onClick={closeAudioBar}
          >
            ✕
          </button>
        </div>
        <audio
          ref={audioRef}
          preload="none"
          onPlay={() => setIsAudioPlaying(true)}
          onPause={() => {
            setIsAudioPlaying(false);
            setActiveAudioWord(null);
          }}
          onEnded={async () => {
            setIsAudioPlaying(false);
            setAudioProgress(100);
            setActiveAudioWord(null);

            if (hasNextVerse) {
              await transitionToVerseByIndex(currentVerseIndex + 1, { preferPrefetched: true });
            }
          }}
          onTimeUpdate={onAudioTimeUpdate}
        />
        <audio ref={wordAudioRef} preload="none" />
      </div> : null}

      {activePage === 'reader' && !isChildModeActive ? <button
        type="button"
        className="voice-mirror-fab"
        aria-label="Open Voice Mirror"
        onClick={openVoiceMirror}
      >
        🎤
      </button> : null}

      {activePage === 'reader' && !isChildModeActive ? <button
        type="button"
        className="companion-fab"
        aria-label="Open Quran Companion"
        onClick={openCompanion}
      >
        💬
      </button> : null}

      {activePage === 'reader' && !isChildModeActive ? <section className={`companion-panel ${isCompanionOpen ? 'open' : ''}`} aria-hidden={!isCompanionOpen}>
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
                        <span
                          key={`spoken-${index}`}
                          className={getVoiceMirrorWordClass(row)}
                          data-score={`${getVoiceMirrorWordScore(row)}%`}
                          title={`Score: ${getVoiceMirrorWordScore(row)}%`}
                        >
                          {String(row.quranWord || row.userWord || '').trim() || '∅'}
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
                    <p className="voice-mirror-reciter-name">{selectedReciterLabel}</p>
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
                  <p className="voice-mirror-similarity-label">Pronunciation Score</p>
                  <p className={`voice-mirror-similarity-value ${similarityTone}`}>{voiceMirrorAnimatedPercent}%</p>
                  <div className="voice-mirror-similarity-bar" aria-hidden="true">
                    <div className={`voice-mirror-similarity-fill ${similarityTone}`} style={{ width: `${voiceMirrorAnimatedPercent}%` }} />
                  </div>
                  <p className="voice-mirror-similarity-note">
                    Harakat (short vowel) accuracy requires careful listening - compare your recitation with the reciter using the Play buttons above.
                  </p>
                  <div className="voice-mirror-subscores">
                    {voiceMirrorMetricRows.map((metric) => (
                      <div key={metric.label} className="voice-mirror-subscore-item">
                        <div className="voice-mirror-subscore-head">
                          <span>{metric.label}</span>
                          <strong>{metric.value}%</strong>
                        </div>
                        <div className="voice-mirror-subscore-bar" aria-hidden="true">
                          <div className="voice-mirror-subscore-fill" style={{ width: `${metric.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <section className="voice-mirror-mistakes">
                  {voiceMirrorMistakes.length > 0 ? (
                    <>
                      <h5>Word-by-word breakdown</h5>
                      <div className="voice-mirror-mistake-grid">
                        <strong>Word</strong>
                        <strong>Score</strong>
                        <strong>Issue</strong>
                        {voiceMirrorMistakes.map((row, index) => (
                          <div className="voice-mirror-mistake-row" key={`mistake-${index}`}>
                            <span dir="rtl" lang="ar">{row.quranWord || row.userWord || '—'}</span>
                            <span>{Math.round(Number(row.accuracyScore ?? (row.similarityScore || 0) * 100))}%</span>
                            <span>{String(row.errorType || 'None')}</span>
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
              <div className="journal-modal-title-wrap">
                <strong>{journalViewTab === 'mine' ? reflectionModal.verseKey : 'Community Feed'}</strong>
                <span>{journalViewTab === 'mine' ? 'My Reflections' : 'Public reflections from the community'}</span>
              </div>
              <button type="button" className="journal-close" onClick={() => setReflectionModal(null)}>
                ✕
              </button>
            </header>

            <div className="journal-modal-tabs" role="tablist" aria-label="Journal views">
              <button
                type="button"
                role="tab"
                aria-selected={journalViewTab === 'mine'}
                className={journalViewTab === 'mine' ? 'active' : ''}
                onClick={() => setJournalViewTab('mine')}
              >
                My Reflections
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={journalViewTab === 'community'}
                className={journalViewTab === 'community' ? 'active' : ''}
                onClick={() => setJournalViewTab('community')}
              >
                Community
              </button>
            </div>

            {journalViewTab === 'mine' ? (
              <>
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
                  {isSavedReflection ? (
                    <button
                      type="button"
                      className={`journal-share ${isReflectionShared || accountPrivacy !== 'public' ? 'disabled' : ''}`}
                      onClick={handleShareReflectionToCommunity}
                      disabled={isSharingReflection || isReflectionShared || accountPrivacy !== 'public'}
                      title={
                        accountPrivacy === 'public'
                          ? ''
                          : 'Set your account to public in settings to share reflections'
                      }
                    >
                      {isReflectionShared ? 'Shared' : isSharingReflection ? 'Sharing...' : 'Share to Community'}
                    </button>
                  ) : null}
                  <button type="button" className="journal-cancel" onClick={() => setReflectionModal(null)}>
                    Close
                  </button>
                </div>

                {isSavedReflection && reflectionShareNotice ? (
                  <p className="journal-share-notice">{reflectionShareNotice}</p>
                ) : null}
              </>
            ) : (
              <section className="community-feed-panel" aria-live="polite">
                <div className="community-feed-head">
                  <button
                    type="button"
                    className="community-refresh-btn"
                    onClick={() =>
                      fetchCommunityReflections({ verseKey: String(reflectionModal?.verseKey || '').trim() })
                    }
                    disabled={isCommunityLoading}
                  >
                    Refresh
                  </button>
                </div>

                {isCommunityLoading ? <div className="community-loading-spinner" aria-label="Loading" /> : null}
                {communityFeedError ? <p className="community-feed-error">{communityFeedError}</p> : null}

                {!isCommunityLoading && communityReflections.length === 0 ? (
                  <p className="community-feed-empty">No community reflections yet — be the first to share yours</p>
                ) : (
                  <div className="community-feed-list" role="list">
                    {communityReflections.map((item) => {
                      const reflectionId = String(item?.id || '');
                      const likedBy = Array.isArray(item?.likedBy) ? item.likedBy.map((value) => String(value)) : [];
                      const likedByCurrentUser = likedBy.includes(reflectionActor.userId);
                      const isOwnedByCurrentUser = Boolean(
                        authSession.loggedIn && currentUserId && String(item?.userId || '') === currentUserId
                      );
                      const isExpanded = Boolean(expandedCommunityItems[reflectionId]);

                      return (
                        <article key={reflectionId || `${item?.verseKey}-${item?.date}`} className="community-feed-card" role="listitem">
                          <div className="community-card-top">
                            <strong>{item?.userName || 'Member'}</strong>
                            <span>{item?.date ? new Date(item.date).toLocaleDateString() : ''}</span>
                          </div>

                          <span className="community-verse-pill">{item?.verseKey || ''}</span>

                          <p className="community-verse-ar" dir="rtl" lang="ar" translate="no">
                            {item?.verseText || ''}
                          </p>

                          <p className={`community-answer ${isExpanded ? 'expanded' : ''}`}>
                            {item?.answer || ''}
                          </p>
                          <button
                            type="button"
                            className="community-read-more"
                            onClick={() => toggleCommunityReflectionExpanded(reflectionId)}
                          >
                            {isExpanded ? 'Show less' : 'Read more'}
                          </button>

                          <div className="community-card-bottom">
                            <button
                              type="button"
                              className={`community-like-btn ${likedByCurrentUser ? 'liked' : ''}`}
                              onClick={() => toggleCommunityLike(reflectionId)}
                            >
                              <span aria-hidden="true">♥</span>
                              <span>{Number(item?.likes || likedBy.length || 0)}</span>
                            </button>

                            {isOwnedByCurrentUser ? (
                              <button
                                type="button"
                                className="community-delete-btn"
                                onClick={() => deleteCommunityReflection(reflectionId)}
                                aria-label="Delete reflection"
                                title="Delete reflection"
                              >
                                🗑
                              </button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
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

                <section className="settings-subsection">
                  <h4>Account Privacy</h4>
                  <label className="setting-row" htmlFor="account-privacy-toggle">
                    <span>{isPublicAccount ? 'Public account' : 'Private account'}</span>
                    <input
                      id="account-privacy-toggle"
                      type="checkbox"
                      checked={isPublicAccount}
                      onChange={(event) => setAccountPrivacy(event.target.checked ? 'public' : 'private')}
                    />
                  </label>
                  <p className="settings-note-text">
                    {isPublicAccount
                      ? 'Public account — your reflections can be shared to the community feed.'
                      : 'Private account — your reflections are only visible to you.'}
                  </p>
                </section>

                <section className="settings-subsection">
                  <h4>Family Mode</h4>
                  <label className="setting-row" htmlFor="family-mode-toggle">
                    <span>Enable Child Mode</span>
                    <input
                      id="family-mode-toggle"
                      type="checkbox"
                      checked={familyModeEnabled}
                      onChange={(event) => handleFamilyModeToggle(event.target.checked)}
                    />
                  </label>
                  <label className="setting-row column" htmlFor="child-daily-goal-input">
                    <span>Child Daily Goal (verses)</span>
                    <input
                      id="child-daily-goal-input"
                      type="number"
                      min={1}
                      max={300}
                      value={childModeDailyGoal}
                      onChange={(event) => {
                        const next = Number.parseInt(String(event.target.value || ''), 10);
                        if (!Number.isFinite(next)) {
                          setChildModeDailyGoal(5);
                          return;
                        }

                        setChildModeDailyGoal(Math.max(1, Math.min(300, next)));
                      }}
                    />
                  </label>
                  <p className="settings-note-text">
                    {familyModeEnabled ? 'Family Mode enabled. PIN is required to switch in and out of Child Mode.' : 'Family Mode is off.'}
                  </p>
                </section>

                <section className="settings-subsection parent-dashboard-card">
                  <h4>Parent Dashboard</h4>
                  <p className="settings-note-text">Today's date: {gregorianDateLabel}</p>
                  <p className="settings-note-text">Child last read: {childModeLastSurah || 'No child activity yet'}</p>
                  <p className="settings-note-text">Child verses completed today: {childModeVersesToday}</p>
                </section>
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

                <label className="setting-row" htmlFor="tajweed-colors-toggle">
                  <span>Tajweed Colors</span>
                  <input
                    id="tajweed-colors-toggle"
                    type="checkbox"
                    checked={tajweedEnabled}
                    onChange={(event) => setTajweedEnabled(event.target.checked)}
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

                <p className="settings-note-text">Daily progress is now controlled by the Daily Page Goal on the profile page.</p>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {isMushafLogOpen ? (
        <div className="mushaf-log-overlay" onClick={closeMushafLogModal}>
          <section className="mushaf-log-modal" onClick={(event) => event.stopPropagation()}>
            <header className="mushaf-log-header">
              <h3>I read from my Mushaf today</h3>
              <button type="button" className="mushaf-log-close" onClick={closeMushafLogModal}>
                ✕
              </button>
            </header>

            <label className="mushaf-log-field" htmlFor="mushaf-log-surah-select">
              <span>Surah</span>
              <select
                id="mushaf-log-surah-select"
                value={mushafLogForm.surahId}
                onChange={(event) => {
                  const nextSurahId = Number.parseInt(String(event.target.value || ''), 10) || 1;
                  setMushafLogForm((current) => ({
                    ...current,
                    surahId: nextSurahId,
                  }));
                }}
              >
                {mushafSurahOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.id}. {option.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="mushaf-log-range-grid">
              <label className="mushaf-log-field" htmlFor="mushaf-log-from-verse">
                <span>From verse</span>
                <input
                  id="mushaf-log-from-verse"
                  type="number"
                  min={1}
                  max={selectedMushafSurahMaxVerse > 0 ? selectedMushafSurahMaxVerse : undefined}
                  value={mushafLogForm.fromVerse}
                  onChange={(event) => {
                    const nextValue = Number.parseInt(String(event.target.value || ''), 10);
                    setMushafLogForm((current) => ({
                      ...current,
                      fromVerse: Number.isFinite(nextValue) ? nextValue : 1,
                    }));
                  }}
                />
              </label>

              <label className="mushaf-log-field" htmlFor="mushaf-log-to-verse">
                <span>To verse</span>
                <input
                  id="mushaf-log-to-verse"
                  type="number"
                  min={1}
                  max={selectedMushafSurahMaxVerse > 0 ? selectedMushafSurahMaxVerse : undefined}
                  value={mushafLogForm.toVerse}
                  onChange={(event) => {
                    const nextValue = Number.parseInt(String(event.target.value || ''), 10);
                    setMushafLogForm((current) => ({
                      ...current,
                      toVerse: Number.isFinite(nextValue) ? nextValue : 1,
                    }));
                  }}
                />
              </label>
            </div>

            {selectedMushafSurahMaxVerse > 0 ? (
              <p className="mushaf-log-help-text">{selectedMushafSurah?.name || 'Selected surah'} has {selectedMushafSurahMaxVerse} verses.</p>
            ) : null}
            {mushafLogError ? <p className="mushaf-log-error">{mushafLogError}</p> : null}

            <button type="button" className="mushaf-log-confirm" onClick={submitMushafLogReading}>
              Log Reading
            </button>

            <section className="mushaf-log-history" aria-live="polite">
              <h4>History</h4>
              {mushafLogHistory.length === 0 ? (
                <p className="mushaf-log-history-empty">No manual Mushaf logs yet.</p>
              ) : (
                <div className="mushaf-log-history-list">
                  {mushafLogHistory.slice(0, 8).map((entry) => (
                    <p key={entry.id} className="mushaf-log-history-item">
                      <strong>{entry.dateKey}</strong> · {entry.surahName || `Surah ${entry.surahId}`} · {entry.fromVerse}–{entry.toVerse} ({entry.versesLogged} verses)
                    </p>
                  ))}
                </div>
              )}
            </section>
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
          <p className="word-tooltip-meaning">{wordTooltip.text}</p>
          <button type="button" className="word-tooltip-unseal-btn" onClick={openUnsealedWordPanel}>
            Unseal this word ✦
          </button>
        </div>
      ) : null}

      {unsealedWordPanel ? (
        <div className="unsealed-sheet-overlay" onClick={closeUnsealedWordPanel}>
          <section
            className="unsealed-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Quran Unsealed"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="unsealed-sheet-header">
              <div className="unsealed-word-meta">
                <h3>{unsealedWordPanel.arabicWord}</h3>
                {unsealedWordPanel.pronunciation ? <span>{unsealedWordPanel.pronunciation}</span> : null}
                {unsealedWordPanel.root ? <small>Root: {unsealedWordPanel.root}</small> : null}
              </div>
              <button type="button" className="unsealed-sheet-close" onClick={closeUnsealedWordPanel} aria-label="Close">
                ✕
              </button>
            </header>

            {!unsealedWordPanel.loading && !unsealedWordPanel.error && unsealedWordPanel.analysis ? (
              <div className="unsealed-stats-row" aria-label="Word statistics">
                <span className="unsealed-stat-pill teal">
                  {Number(unsealedWordPanel.analysis.totalOccurrences || 0) > 0
                    ? `${unsealedWordPanel.analysis.totalOccurrences} occurrences`
                    : 'Occurrences unknown'}
                </span>
                <span className="unsealed-stat-pill navy">
                  {unsealedWordPanel.analysis.mostCommonSurah
                    ? `Most in ${unsealedWordPanel.analysis.mostCommonSurah}`
                    : 'Most in Unknown'}
                </span>
                <span className="unsealed-stat-pill amber">
                  {unsealedWordPanel.analysis.makkiOrMadani || 'Balance unknown'}
                </span>
              </div>
            ) : null}

            {unsealedWordPanel.loading ? (
              <div className="unsealed-loading-state" aria-live="polite" aria-busy="true">
                <div className="unsealed-shimmer-line cream" />
                <div className="unsealed-shimmer-line cream w-90" />
                <div className="unsealed-shimmer-line cream w-85" />
              </div>
            ) : null}

            {!unsealedWordPanel.loading && unsealedWordPanel.error ? (
              <p className="unsealed-error-text">{unsealedWordPanel.error}</p>
            ) : null}

            {!unsealedWordPanel.loading && !unsealedWordPanel.error && unsealedWordPanel.analysis ? (
              <div className="unsealed-content">
                <section className="unsealed-section">
                  <h4>
                    <span aria-hidden="true">🫀</span>
                    Why this word here?
                  </h4>
                  <p>{renderWhyThisWordText(unsealedWordPanel.analysis.whyThisWord)}</p>
                </section>

                <section className="unsealed-section">
                  <h4>
                    <span aria-hidden="true">📖</span>
                    Core meaning of the root
                  </h4>
                  <p>{unsealedWordPanel.analysis.coreMeaning || 'No root meaning available yet.'}</p>
                </section>

                <section className="unsealed-section">
                  <h4>
                    <span aria-hidden="true">🌍</span>
                    Across the Quran
                  </h4>
                  {Array.isArray(unsealedWordPanel.analysis.acrossQuran) && unsealedWordPanel.analysis.acrossQuran.length ? (
                    <div className="unsealed-across-list">
                      {unsealedWordPanel.analysis.acrossQuran.map((item) => (
                        <button
                          type="button"
                          key={`${item.verseKey}-${item.quote}`}
                          className="unsealed-across-card"
                          onClick={() => jumpToAcrossQuranVerse(item.verseKey)}
                        >
                          <strong>{item.verseKey}</strong>
                          <p dir="rtl" lang="ar" translate="no">{item.quote}</p>
                          <small>{item.context}</small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p>No additional occurrences found.</p>
                  )}
                </section>

                <section className="unsealed-section">
                  <h4>
                    <span aria-hidden="true">🌱</span>
                    What this changes in the verse
                  </h4>
                  <p>{unsealedWordPanel.analysis.whatChanges || 'No additional insight available yet.'}</p>
                </section>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {isWirdCelebrationOpen ? (
        <div className="wird-celebration-overlay" onClick={() => setIsWirdCelebrationOpen(false)}>
          <div className="wird-celebration-particles" aria-hidden="true">
            {wirdCelebrationParticles.map((particle) => (
              <span
                key={`wird-particle-${particle.id}`}
                className="wird-celebration-particle"
                style={{
                  left: `${particle.left}%`,
                  animationDelay: `${particle.delay}s`,
                  animationDuration: `${particle.duration}s`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                }}
              />
            ))}
          </div>
          <div className="wird-celebration-content">
            <p className="wird-celebration-ar" dir="rtl" lang="ar" translate="no">بَارَكَ اللهُ فِيكُمْ</p>
            <p className="wird-celebration-en">You have reached your daily wird</p>
          </div>
        </div>
      ) : null}

      {isFirstVisitTourActive && activePage === 'reader' && activeFirstVisitTourStep ? (
        <div className="first-visit-tour-layer" role="dialog" aria-modal="true" aria-label="First visit tour">
          {firstVisitTourRect ? (
            <div
              className="first-visit-tour-ring"
              style={{
                top: `${Math.max(4, firstVisitTourRect.top - 8)}px`,
                left: `${Math.max(4, firstVisitTourRect.left - 8)}px`,
                width: `${Math.max(20, firstVisitTourRect.width + 16)}px`,
                height: `${Math.max(20, firstVisitTourRect.height + 16)}px`,
              }}
            />
          ) : null}

          <section className="first-visit-tour-card" style={getFirstVisitTourCardStyle(firstVisitTourRect)}>
            <p>{activeFirstVisitTourStep.message}</p>
            <div className="first-visit-tour-actions">
              <button type="button" className="first-visit-tour-next" onClick={goToNextFirstVisitTourStep}>
                Next
              </button>
              <button type="button" className="first-visit-tour-skip" onClick={completeFirstVisitTour}>
                Skip Tour
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {ornamentVersePreview ? (
        <div
          className="ornament-preview-card"
          style={{
            left: `${Math.max(24, ornamentVersePreview.x - 280)}px`,
            top: `${Math.max(24, ornamentVersePreview.y - 210)}px`,
          }}
        >
          <strong>{ornamentVersePreview.verseKey}</strong>
          <p dir="rtl" lang="ar" translate="no">{ornamentVersePreview.verseText}</p>
          <small>{ornamentVersePreview.translation || 'No translation found.'}</small>
        </div>
      ) : null}
    </main>
  );
}
