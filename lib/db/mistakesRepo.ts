import { getDb } from "./client";

export interface Mistake {
  id: number;
  topic_id: string;
  subject_id: string;
  mistake_type: string;
  mistake_type_ru: string | null;
  description: string | null;
  session_id: number | null;
  created_at: string;
}

export interface MistakePattern {
  mistake_type: string;
  mistake_type_ru: string | null;
  count: number;
  topic_id: string;
  topic_name: string;
  last_occurred: string;
}

export function recordMistake(params: {
  topicId: string;
  subjectId: string;
  mistakeType: string;
  mistakeTypeRu?: string;
  description?: string;
  sessionId?: number;
}): void {
  const db = getDb();
  db.runSync(
    `INSERT INTO mistakes (topic_id, subject_id, mistake_type, mistake_type_ru, description, session_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      params.topicId,
      params.subjectId,
      params.mistakeType,
      params.mistakeTypeRu ?? null,
      params.description ?? null,
      params.sessionId ?? null,
    ]
  );
}

/**
 * Находит повторяющиеся типы ошибок за последние N дней — то, что AI использует
 * для фразы "ты чаще всего ошибаешься именно при работе со знаками".
 */
export function getRecurringMistakePatterns(subjectId: string, sinceDays = 14, minOccurrences = 3): MistakePattern[] {
  const db = getDb();
  return db.getAllSync<MistakePattern>(
    `SELECT m.mistake_type, MAX(m.mistake_type_ru) as mistake_type_ru, COUNT(*) as count,
            m.topic_id, t.name as topic_name, MAX(m.created_at) as last_occurred
     FROM mistakes m
     JOIN topics t ON t.id = m.topic_id
     WHERE m.subject_id = ?
       AND m.created_at >= datetime('now', '-' || ? || ' days')
     GROUP BY m.mistake_type, m.topic_id
     HAVING count >= ?
     ORDER BY count DESC`,
    [subjectId, sinceDays, minOccurrences]
  );
}

/** Сводка ошибок за неделю для конкретного предмета — то, что показываем на экране статистики */
export function getWeeklyMistakeSummary(subjectId: string): MistakePattern[] {
  return getRecurringMistakePatterns(subjectId, 7, 1);
}

/**
 * Формирует компактный контекст для передачи в system-промпт AI:
 * "Ошибки пользователя за неделю: перенос знаков — 5 раз, дроби — 3 раза..."
 */
export function buildMistakeContextForAI(subjectId: string): string {
  const patterns = getWeeklyMistakeSummary(subjectId);
  if (patterns.length === 0) return "Заметных повторяющихся ошибок за последнюю неделю нет.";

  const lines = patterns
    .slice(0, 5)
    .map((p) => `- ${p.mistake_type_ru || p.mistake_type} (тема "${p.topic_name}") — ${p.count} раз`);

  return `Ошибки пользователя за последнюю неделю:\n${lines.join("\n")}`;
}
