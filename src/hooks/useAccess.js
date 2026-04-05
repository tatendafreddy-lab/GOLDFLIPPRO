import { useEffect, useState } from "react";
import { isValidCode } from "../utils/accessCodes.js";

const STORAGE_KEY = "goldflip-access-code";
const OWNER_CODE = (import.meta.env.VITE_OWNER_CODE || "").trim().toUpperCase();

export function useAccess() {
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    // Owner bypass: if an owner code is defined at build time, auto-unlock.
    if (OWNER_CODE) {
      setIsPro(true);
      try {
        localStorage.setItem(STORAGE_KEY, OWNER_CODE);
      } catch {
        /* ignore */
      }
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isValidCode(saved)) {
        setIsPro(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const activateCode = (code) => {
    if (OWNER_CODE) {
      setIsPro(true);
      try {
        localStorage.setItem(STORAGE_KEY, OWNER_CODE);
      } catch {
        /* ignore */
      }
      return true;
    }

    if (!isValidCode(code)) return false;
    try {
      localStorage.setItem(STORAGE_KEY, code.trim().toUpperCase());
    } catch {
      /* ignore */
    }
    setIsPro(true);
    return true;
  };

  const removeCode = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setIsPro(false);
  };

  return { isPro, activateCode, removeCode };
}
