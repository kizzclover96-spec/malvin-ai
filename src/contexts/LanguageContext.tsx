import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ALL_LANGUAGES, LANGUAGE_STORAGE_KEY, LanguageOption } from '../i18n/languages';
import { translateBatch } from '../services/liveTranslate';

interface LanguageContextValue {
  language: string;
  languages: LanguageOption[];
  isTranslating: boolean;
  setLanguage: (code: string) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Elements whose text should never be touched — code, form controls, and
// anything an owner explicitly opts out with data-no-translate (e.g. a
// brand name, an order number, a QR code's raw link text).
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'CODE', 'PRE']);

function hasLetters(text: string): boolean {
  return /\p{L}/u.test(text);
}

function isEligibleTextNode(node: Text): boolean {
  const value = node.nodeValue;
  if (!value || !value.trim() || !hasLetters(value)) return false;
  const parent = node.parentElement;
  if (!parent) return false;
  if (SKIP_TAGS.has(parent.tagName)) return false;
  if (parent.closest('[data-no-translate]')) return false;
  return true;
}

function collectTextNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (isEligibleTextNode(n as Text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
  });
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    try {
      return localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en';
    } catch {
      return 'en';
    }
  });
  const [isTranslating, setIsTranslating] = useState(false);

  // The DOM's true, original English text per node — captured the first
  // time we ever see that node, so switching back to English (or to a
  // second language) always translates from the real source text rather
  // than compounding translations of translations.
  const originalTextRef = useRef<WeakMap<Text, string>>(new WeakMap());
  // What language each node's CURRENT nodeValue is already in, so a
  // MutationObserver pass triggered by our own edits is a no-op instead of
  // an infinite retranslation loop.
  const appliedLangRef = useRef<WeakMap<Text, string>>(new WeakMap());
  const languageRef = useRef(language);
  languageRef.current = language;
  const runIdRef = useRef(0);

  const applyLanguageToTree = useCallback(async (root: Node, targetLang: string) => {
    const nodes = collectTextNodes(root);
    if (nodes.length === 0) return;

    const originals = originalTextRef.current;
    const applied = appliedLangRef.current;

    // Skip nodes already showing this exact language — covers both "we
    // already translated this" and "target is English and this node was
    // never touched" (nothing recorded == already original English).
    const needsWork = nodes.filter((n) => {
      if (targetLang === 'en') return applied.has(n); // only revert nodes we've actually changed
      return applied.get(n) !== targetLang;
    });
    if (needsWork.length === 0) return;

    for (const n of needsWork) {
      if (!originals.has(n)) originals.set(n, n.nodeValue || '');
    }

    if (targetLang === 'en') {
      for (const n of needsWork) {
        n.nodeValue = originals.get(n) || n.nodeValue;
        applied.delete(n);
      }
      return;
    }

    const uniqueSourceTexts = Array.from(new Set(needsWork.map((n) => originals.get(n)!)));
    const runId = ++runIdRef.current;
    setIsTranslating(true);
    try {
      const translations = await translateBatch(uniqueSourceTexts, targetLang);
      // A newer translation run (language changed again while this one was
      // in flight) supersedes this one — drop the stale result.
      if (runId !== runIdRef.current) return;
      for (const n of needsWork) {
        const source = originals.get(n)!;
        const translated = translations.get(source);
        if (translated) {
          n.nodeValue = translated;
          applied.set(n, targetLang);
        }
      }
    } finally {
      if (runId === runIdRef.current) setIsTranslating(false);
    }
  }, []);

  // Re-scan on any DOM change (tab switches, new dashboard screens, live
  // data rendering in) so newly-mounted text picks up the active language
  // too — debounced so a burst of React re-renders collapses into one pass.
  useEffect(() => {
    const debounceMs = 350;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
      if (languageRef.current === 'en') return; // nothing to do — English is the DOM's native state
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        applyLanguageToTree(document.body, languageRef.current);
      }, debounceMs);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [applyLanguageToTree]);

  // Apply whenever the selected language changes (including on first load,
  // if a non-English language was previously saved).
  useEffect(() => {
    applyLanguageToTree(document.body, language);
  }, [language, applyLanguageToTree]);

  const setLanguage = useCallback((code: string) => {
    setLanguageState(code);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      // Non-fatal — the choice just won't survive a reload.
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ language, languages: ALL_LANGUAGES, isTranslating, setLanguage }),
    [language, isTranslating, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Never actually thrown in practice — LanguageProvider wraps the whole
    // app in main.jsx — but a clear error beats a silent crash if some
    // future page ever renders outside that tree.
    throw new Error('useLanguage() must be used inside <LanguageProvider>');
  }
  return ctx;
}
