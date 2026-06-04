import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

interface StoredSettings {
  theme?: Theme;
  showImages?: boolean;
}

const STORAGE_KEY = "roco-calculator-settings";

function readStored(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredSettings;
  } catch {
    return {};
  }
}

function writeStored(patch: StoredSettings) {
  const next = { ...readStored(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function useAppSettings() {
  const stored = readStored();
  const [theme, setTheme] = useState<Theme>(stored.theme ?? "light");
  const [showImages, setShowImages] = useState(stored.showImages ?? true);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeStored({ theme });
  }, [theme]);

  useEffect(() => {
    writeStored({ showImages });
  }, [showImages]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  const toggleShowImages = useCallback(() => {
    setShowImages((v) => !v);
  }, []);

  return { theme, showImages, toggleTheme, toggleShowImages, setShowImages };
}
