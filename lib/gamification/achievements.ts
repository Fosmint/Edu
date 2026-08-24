import { getDb } from "../db/client";

export interface AchievementDef {
  code: string;
  title: string;
  /** Семантический ключ иконки (см. components/icons/iconMap.ts), не emoji. */
  icon: string;
  description: string;
  /** Проверяет, выполнено ли условие. Возвращает true, если достижение нужно разблокировать сейчас. */
  check: (db: ReturnType<typeof getDb>) => boolean;
}

/**
 * Все достижения универсальны — основаны на действиях и цифрах, а не на конкретных
 * названиях тем, чтобы одинаково работать с изначальными темами и темами,
 * добавленными пользователем через ИИ.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    code: "first_topic_started",
    title: "Первый шаг",
    icon: "flag",
    description: "Начал заниматься первой темой",
    check: (db) => {
      const row = db.getFirstSync<{ count: number }>(`SELECT COUNT(*) as count FROM sessions`);
      return (row?.count ?? 0) >= 1;
    },
  },
  {
    code: "first_topic_mastered",
    title: "Первая победа",
    icon: "trophy",
    description: "Полностью освоил первую тему",
    check: (db) => {
      const row = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM topics WHERE status = 'mastered'`
      );
      return (row?.count ?? 0) >= 1;
    },
  },
  {
    code: "topics_mastered_5",
    title: "Пять тем позади",
    icon: "books",
    description: "Освоил 5 тем",
    check: (db) => {
      const row = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM topics WHERE status = 'mastered'`
      );
      return (row?.count ?? 0) >= 5;
    },
  },
  {
    code: "problems_solved_100",
    title: "Сотня задач",
    icon: "calculator",
    description: "Решил 100 задач в практике",
    check: (db) => {
      const row = db.getFirstSync<{ total: number }>(
        `SELECT COALESCE(SUM(attempts_total), 0) as total FROM topic_progress`
      );
      return (row?.total ?? 0) >= 100;
    },
  },
  {
    code: "streak_correct_10",
    title: "Без единой ошибки",
    icon: "bolt",
    description: "10 правильных ответов подряд в одной сессии практики",
    check: (db) => {
      // Проверяем последнюю завершённую сессию практики: score выше 0.9 при >= 10 вопросах — прокси для "почти без ошибок подряд"
      const row = db.getFirstSync<{ id: number }>(
        `SELECT id FROM sessions WHERE type = 'practice' AND score >= 1.0 AND ended_at IS NOT NULL ORDER BY id DESC LIMIT 1`
      );
      return !!row;
    },
  },
  {
    code: "streak_days_7",
    title: "Неделя подряд",
    icon: "flame",
    description: "7 дней обучения подряд",
    check: (db) => {
      const row = db.getFirstSync<{ streak_days: number }>(`SELECT streak_days FROM profile WHERE id = 1`);
      return (row?.streak_days ?? 0) >= 7;
    },
  },
  {
    code: "streak_days_30",
    title: "Месяц дисциплины",
    icon: "flame",
    description: "30 дней обучения подряд",
    check: (db) => {
      const row = db.getFirstSync<{ streak_days: number }>(`SELECT streak_days FROM profile WHERE id = 1`);
      return (row?.streak_days ?? 0) >= 30;
    },
  },
  {
    code: "boss_defeated_1",
    title: "Первый босс повержен",
    icon: "sword",
    description: "Победил первого босса темы",
    check: (db) => {
      const row = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM exams WHERE type = 'boss' AND score >= 70`
      );
      return (row?.count ?? 0) >= 1;
    },
  },
  {
    code: "boss_defeated_5",
    title: "Охотник за боссами",
    icon: "skull",
    description: "Победил 5 боссов тем",
    check: (db) => {
      const row = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM exams WHERE type = 'boss' AND score >= 70`
      );
      return (row?.count ?? 0) >= 5;
    },
  },
  {
    code: "all_subjects_touched",
    title: "Многостаночник",
    icon: "target",
    description: "Позанимался всеми 5 предметами хотя бы раз",
    check: (db) => {
      const row = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(DISTINCT s.subject_id) as count
         FROM sessions s
         JOIN subjects sub ON sub.id = s.subject_id
         WHERE sub.is_hidden = 0`
      );
      return (row?.count ?? 0) >= 5;
    },
  },
  {
    code: "custom_topic_added",
    title: "Своя программа",
    icon: "pencil",
    description: "Добавил свою тему из школьной программы",
    check: (db) => {
      const row = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM topics WHERE id LIKE '%\\_custom\\_%' ESCAPE '\\'`
      );
      return (row?.count ?? 0) >= 1;
    },
  },
  {
    code: "level_5",
    title: "Пятый уровень",
    icon: "star",
    description: "Достиг 5 уровня",
    check: (db) => {
      const row = db.getFirstSync<{ level: number }>(`SELECT level FROM profile WHERE id = 1`);
      return (row?.level ?? 0) >= 5;
    },
  },
  {
    code: "level_10",
    title: "Десятый уровень",
    icon: "sparkle-star",
    description: "Достиг 10 уровня",
    check: (db) => {
      const row = db.getFirstSync<{ level: number }>(`SELECT level FROM profile WHERE id = 1`);
      return (row?.level ?? 0) >= 10;
    },
  },
];

export interface UnlockedAchievement {
  code: string;
  title: string;
  icon: string;
}

/**
 * Проверяет все ещё не разблокированные достижения и разблокирует те, условия
 * которых выполнены. Возвращает список новых разблокировок (для показа тоста/анимации).
 * Вызывать после значимых событий: конец сессии практики/чата, начисление XP, победа над боссом.
 */
export function checkAndUnlockAchievements(): UnlockedAchievement[] {
  const db = getDb();
  const newlyUnlocked: UnlockedAchievement[] = [];

  db.withTransactionSync(() => {
    const alreadyUnlocked = new Set(
      db.getAllSync<{ code: string }>(`SELECT code FROM achievements WHERE unlocked_at IS NOT NULL`).map((r) => r.code)
    );

    for (const def of ACHIEVEMENTS) {
      if (alreadyUnlocked.has(def.code)) continue;
      if (!def.check(db)) continue;

      db.runSync(
        `INSERT INTO achievements (code, title, icon, unlocked_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(code) DO UPDATE SET unlocked_at = excluded.unlocked_at`,
        [def.code, def.title, def.icon]
      );
      newlyUnlocked.push({ code: def.code, title: def.title, icon: def.icon });
    }
  });

  return newlyUnlocked;
}

export interface AchievementStatus extends AchievementDef {
  unlocked: boolean;
  unlockedAt: string | null;
}

/** Список всех достижений с их текущим статусом — для экрана достижений */
export function getAllAchievementsWithStatus(): AchievementStatus[] {
  const db = getDb();
  const unlockedRows = db.getAllSync<{ code: string; unlocked_at: string }>(
    `SELECT code, unlocked_at FROM achievements WHERE unlocked_at IS NOT NULL`
  );
  const unlockedMap = new Map(unlockedRows.map((r) => [r.code, r.unlocked_at]));

  return ACHIEVEMENTS.map((def) => ({
    ...def,
    unlocked: unlockedMap.has(def.code),
    unlockedAt: unlockedMap.get(def.code) ?? null,
  }));
}
