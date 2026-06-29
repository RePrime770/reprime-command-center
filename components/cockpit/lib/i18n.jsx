'use client';

// Lightweight EN/HE locale for the cockpit chrome. The cockpit is a fixed
// spatial kiosk layout, so the toggle translates visible LABELS to Hebrew and
// sets the root lang — it does NOT flip the whole layout to dir:rtl (that would
// mirror the absolute-positioned chrome and the 4000px horizontal flex and
// break it). Per-message Hebrew already renders RTL via the `hebrew` class.
//
// t('English string') returns the Hebrew translation when locale==='he', else
// the English string itself — so any string not yet in the dictionary simply
// stays English (graceful, incremental coverage). Preference persists in
// localStorage. The chosen locale is also a hint the AI routes use to bias
// Nora's output language.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'cockpit-locale';

// English string -> Hebrew. Add entries to widen coverage; missing keys fall
// back to English automatically.
const HE = {
  // Concierge + chrome
  'Search': 'חיפוש',
  'Note': 'פתק',
  'Email': 'אימייל',
  'Briefing': 'תדריך',
  'Invite': 'הזמנה',
  'Talk to Nora': 'דברו עם נורה',
  'Listening': 'מקשיבה',
  'tap to stop': 'הקישו לעצירה',
  'Note mode': 'מצב פתק',
  'recording memo': 'מקליט תזכיר',
  'Listen': 'האזנה',
  'Participate': 'השתתפות',
  // Panel titles / subtitles
  'COMMS': 'תקשורת',
  'CALENDAR': 'יומן',
  'EMAIL TRIAGE': 'מיון אימייל',
  'NOTES': 'פתקים',
  'BRIEF': 'תדריך',
  'TRIAGED': 'ממוין',
  'quick capture': 'לכידה מהירה',
  'RELIGIOUS CALENDAR': 'לוח דתי',
  "Nora's Desk": 'השולחן של נורה',
  'Today': 'היום',
  // Common actions
  'Send': 'שליחה',
  'Cancel': 'ביטול',
  'Edit': 'עריכה',
  'Save': 'שמירה',
  'Add note': 'הוספת פתק',
  'Search notes…': 'חיפוש פתקים…',
  'Compose': 'חיבור',
  'Confirm send': 'אישור שליחה',
  'Morning briefing': 'תדריך בוקר',
};

const LocaleContext = createContext({
  locale: 'en',
  setLocale: () => {},
  t: (s) => s,
});

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState('en');

  // Hydrate from localStorage after mount (avoids SSR/client mismatch).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'he' || saved === 'en') setLocaleState(saved);
    } catch { /* ignore */ }
  }, []);

  const setLocale = useCallback((next) => {
    const v = next === 'he' ? 'he' : 'en';
    setLocaleState(v);
    try { localStorage.setItem(STORAGE_KEY, v); } catch { /* ignore */ }
    try { if (typeof document !== 'undefined') document.documentElement.lang = v; } catch { /* ignore */ }
  }, []);

  const t = useCallback(
    (s) => (locale === 'he' ? (HE[s] || s) : s),
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
