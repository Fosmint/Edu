import { getDb } from "./client";
import { format } from "date-fns";

export interface Profile {
  id: number;
  name: string;
  xp: number;
  level: number;
  streak_days: number;
  last_active_date: string | null;
  created_at: string;
}

/** XP, нужный чтобы перейти с уровня N на N+1. Растущая кривая. */
export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.35));
}

export function getProfile(): Profile {
  const db = getDb();
  const row = db.getFirstSync<Profile>("SELECT * FROM profile WHERE id = 1");
  if (!row) throw new Error("Профиль не инициализирован — вызови initDatabase()");
  return row;
}

/**
 * Начисляет XP, пересчитывает уровень (может перепрыгнуть несколько уровней сразу),
 * обновляет streak по дате последней активности.
 * Возвращает обновлённый профиль + флаг levelUp для UI-анимации.
 */
export function addXp(amount: number): { profile: Profile; leveledUp: boolean } {
  const db = getDb();
  const today = format(new Date(), "yyyy-MM-dd");

  return db.withTransactionSync(() => {
    const current = getProfile();
    let newXp = current.xp + amount;
    let newLevel = current.level;

    while (newXp >= xpForLevel(newLevel)) {
      newXp -= xpForLevel(newLevel);
      newLevel += 1;
    }

    const newStreak = computeStreak(current.last_active_date, current.streak_days, today);

    db.runSync(
      `UPDATE profile SET xp = ?, level = ?, streak_days = ?, last_active_date = ? WHERE id = 1`,
      [newXp, newLevel, newStreak, today]
    );

    return {
      profile: getProfile(),
      leveledUp: newLevel > current.level,
    };
  });
}

function computeStreak(lastActiveDate: string | null, currentStreak: number, today: string): number {
  if (!lastActiveDate) return 1;
  if (lastActiveDate === today) return currentStreak; // уже занимались сегодня

  const last = new Date(lastActiveDate);
  const todayDate = new Date(today);
  const diffDays = Math.round((todayDate.getTime() - last.getTime()) / 86400000);

  if (diffDays === 1) return currentStreak + 1; // занимался вчера — стрик продолжается
  return 1; // пропустил день(и) — стрик сбрасывается
}
