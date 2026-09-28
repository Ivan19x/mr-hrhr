import { useEffect, useState } from "react";
import type { Profile } from "@/types/game";
import { getProfile, subscribeProfile } from "@/services/progressService";
import { setSoundEnabled } from "@/lib/sound";

/** Current profile from IndexedDB; re-renders whenever it is saved. */
export function useProfile(): Profile | null {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    let alive = true;
    getProfile().then((p) => alive && setProfile(p));
    const off = subscribeProfile((p) => setProfile({ ...p }));
    return () => {
      alive = false;
      off();
    };
  }, []);
  useEffect(() => {
    if (!profile) return;
    setSoundEnabled(profile.settings.sound);
    document.documentElement.classList.toggle("light", profile.settings.theme === "light");
  }, [profile]);
  return profile;
}
