import { create } from "zustand";
import { getProfile, addXp as addXpDb, Profile } from "../lib/db/profileRepo";
import { checkAndUnlockAchievements, UnlockedAchievement } from "../lib/gamification/achievements";

interface ProfileState {
  profile: Profile | null;
  levelUpPending: boolean;
  newlyUnlockedAchievements: UnlockedAchievement[];
  refresh: () => void;
  gainXp: (amount: number) => void;
  checkAchievements: () => void;
  clearLevelUpFlag: () => void;
  clearNewAchievements: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  levelUpPending: false,
  newlyUnlockedAchievements: [],

  refresh: () => {
    set({ profile: getProfile() });
  },

  gainXp: (amount: number) => {
    const { profile, leveledUp } = addXpDb(amount);
    const newAchievements = checkAndUnlockAchievements();
    set({ profile, levelUpPending: leveledUp, newlyUnlockedAchievements: newAchievements });
  },

  /** Проверяет достижения без начисления XP — вызывать после любых значимых действий
   * (начало новой темы, добавление своей темы, победа над боссом и т.п.) */
  checkAchievements: () => {
    const newAchievements = checkAndUnlockAchievements();
    if (newAchievements.length > 0) {
      set((state) => ({
        newlyUnlockedAchievements: [...state.newlyUnlockedAchievements, ...newAchievements],
      }));
    }
  },

  clearLevelUpFlag: () => set({ levelUpPending: false }),
  clearNewAchievements: () => set({ newlyUnlockedAchievements: [] }),
}));
