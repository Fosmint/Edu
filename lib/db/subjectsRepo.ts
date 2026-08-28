import { getDb } from "./client";

export interface Subject {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  overall_progress_pct: number;
  is_hidden: number;
}

export interface Topic {
  id: string;
  subject_id: string;
  parent_id: string | null;
  name: string;
  description: string;
  sort_order: number;
  min_difficulty_tier: number;
  is_unlocked: number;
  status: "locked" | "available" | "in_progress" | "mastered";
}

export interface TopicWithProgress extends Topic {
  mastery_pct: number;
  attempts_total: number;
  attempts_correct: number;
  current_difficulty_tier: number;
  next_review_at: string | null;
}

export function getAllSubjects(): Subject[] {
  const db = getDb();
  return db.getAllSync<Subject>("SELECT * FROM subjects WHERE is_hidden = 0 ORDER BY sort_order");
}

export function getSubject(subjectId: string): Subject | null {
  const db = getDb();
  return db.getFirstSync<Subject>("SELECT * FROM subjects WHERE id = ?", [subjectId]);
}

/** Карта тем предмета вместе с прогрессом — для экрана "карта знаний" */
export function getTopicsWithProgress(subjectId: string): TopicWithProgress[] {
  const db = getDb();
  return db.getAllSync<TopicWithProgress>(
    `SELECT t.*, tp.mastery_pct, tp.attempts_total, tp.attempts_correct,
            tp.current_difficulty_tier, tp.next_review_at
     FROM topics t
     JOIN topic_progress tp ON tp.topic_id = t.id
     WHERE t.subject_id = ?
     ORDER BY t.sort_order`,
    [subjectId]
  );
}

export function getTopic(topicId: string): TopicWithProgress | null {
  const db = getDb();
  return db.getFirstSync<TopicWithProgress>(
    `SELECT t.*, tp.mastery_pct, tp.attempts_total, tp.attempts_correct,
            tp.current_difficulty_tier, tp.next_review_at
     FROM topics t
     JOIN topic_progress tp ON tp.topic_id = t.id
     WHERE t.id = ?`,
    [topicId]
  );
}

/**
 * Помечает тему освоенной (mastery_pct >= порог) и открывает темы,
 * для которых она была parent_id. Вызывается после успешного "босса темы".
 */
export function markTopicMastered(topicId: string): string[] {
  const db = getDb();
  const unlockedTopicIds: string[] = [];

  db.withTransactionSync(() => {
    db.runSync(`UPDATE topics SET status = 'mastered' WHERE id = ?`, [topicId]);
    db.runSync(`UPDATE topic_progress SET mastery_pct = 100 WHERE topic_id = ?`, [topicId]);

    const children = db.getAllSync<{ id: string }>(
      `SELECT id FROM topics WHERE parent_id = ? AND is_unlocked = 0`,
      [topicId]
    );

    for (const child of children) {
      db.runSync(
        `UPDATE topics SET is_unlocked = 1, status = 'available' WHERE id = ?`,
        [child.id]
      );
      unlockedTopicIds.push(child.id);
    }

    const updatedTopic = getTopic(topicId);
    if (updatedTopic) {
      recalculateSubjectProgress(db, updatedTopic.subject_id);
    }
  });

  return unlockedTopicIds;
}

/** Пересчитывает средний % прогресса по предмету (для главного экрана) */
export function recalculateSubjectProgress(db: ReturnType<typeof getDb>, subjectId: string): void {
  const row = db.getFirstSync<{ avg_mastery: number }>(
    `SELECT AVG(tp.mastery_pct) as avg_mastery
     FROM topic_progress tp
     JOIN topics t ON t.id = tp.topic_id
     WHERE t.subject_id = ?`,
    [subjectId]
  );
  const avg = row?.avg_mastery ?? 0;
  db.runSync(`UPDATE subjects SET overall_progress_pct = ? WHERE id = ?`, [avg, subjectId]);
}

/** Тема считается достаточно освоенной для разблокировки детей (не обязательно 100%) */
export const MASTERY_THRESHOLD_TO_UNLOCK = 70;

/**
 * Удаляет тему и всё связанное с ней (прогресс, сообщения чата, ошибки, экзамены, сессии).
 * Используется когда пользователь добавил тему через ИИ по ошибке.
 * Если у темы были дети (разблокированные благодаря ей) — они НЕ удаляются,
 * просто их parent_id становится null (чтобы не потерять чужой прогресс).
 */
export function deleteTopic(topicId: string): void {
  const db = getDb();
  const topic = getTopic(topicId);
  if (!topic) return;

  try {
    db.withTransactionSync(() => {
      // Отвязываем детей, если такие есть, вместо каскадного удаления
      db.runSync(`UPDATE topics SET parent_id = NULL WHERE parent_id = ?`, [topicId]);

      // Удаляем сообщения из всех сессий этой темы
      db.runSync(
        `DELETE FROM messages WHERE session_id IN (SELECT id FROM sessions WHERE topic_id = ?)`,
        [topicId]
      );
      db.runSync(`DELETE FROM sessions WHERE topic_id = ?`, [topicId]);
      db.runSync(`DELETE FROM mistakes WHERE topic_id = ?`, [topicId]);
      db.runSync(`DELETE FROM exams WHERE topic_id = ?`, [topicId]);
      db.runSync(`DELETE FROM daily_tasks WHERE topic_id = ?`, [topicId]);
      db.runSync(`DELETE FROM topic_progress WHERE topic_id = ?`, [topicId]);
      db.runSync(`DELETE FROM topics WHERE id = ?`, [topicId]);

      recalculateSubjectProgress(db, topic.subject_id);
    });
  } catch (e) {
    console.error("deleteTopic transaction failed:", e);
    throw e instanceof Error ? e : new Error("Не удалось удалить тему из базы данных");
  }
}

/** Тема считается "своей" (добавленной пользователем через ИИ), если её id начинается с этого паттерна */
export function isCustomTopic(topicId: string): boolean {
  return /_custom_\d+$/.test(topicId);
}
