import { useEffect } from "react";

export const DEFAULT_TITLE = "MedPunk: medical recall";

// Sets the tab title while the calling page is mounted (null leaves it alone) and restores the default when it goes away
export function useTitle(title) {
  useEffect(() => {
    if (!title) return;
    document.title = title;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
