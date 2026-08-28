import { getDb } from "../db/client";
import { addDays, format } from "date-fns";

/**
 * Упрощённый SM-2. Качество ответа 0..5:
 * 0-2 — не вспомнил / много ошибок → интервал сбрасывается
 * 3   — вспомнил с трудом
 * 4   — вспомнил уверенно
 * 5   — вспомнил мгновенно и правильно
 */
export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

interface SM2State {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
}

export function computeNextReview(state: SM2State, quality: ReviewQuality): SM2State {
  let { ease_factor, interval_days, repetitions } = state;

  if (quality < 3) {
    // Забыл — начинаем цикл заново, но ease не роняем ниже минимума
    repetitions = 0;
    interval_days = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval_days = 1;
    else if (repetitions === 2) interval_days = 6;
    else interval_days = Math.round(interval_days * ease_factor);
  }

  ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  ease_factor = Math.max(1.3, ease_factor);

  return { ease_factor, interval_days, repetitions };
}

/** Обновляет topic_progress после сессии повторения/практики по теме */
export function applyReviewResult(topicId: string, quality: ReviewQuality): void {
  const db = getDb();

  const current = db.getFirstSync<SM2State>(
    `SELECT ease_factor, interval_days, repetitions FROM topic_progress WHERE topic_id = ?`,
    [topicId]
  );
  if (!current) return;

  const next = computeNextReview(current, quality);
  const nextReviewDate = format(addDays(new Date(), next.interval_days), "yyyy-MM-dd");

  db.runSync(
    `UPDATE topic_progress
     SET ease_factor = ?, interval_days = ?, repetitions = ?,
         last_reviewed_at = datetime('now'), next_review_at = ?, updated_at = datetime('now')
     WHERE topic_id = ?`,
    [next.ease_factor, next.interval_days, next.repetitions, nextReviewDate, topicId]
  );
}

/** Темы, которые пора повторить сегодня — используется для главного экрана и напоминаний */
export function getTopicsDueForReview(): Array<{ topic_id: string; name: string; subject_id: string }> {
  const db = getDb();
  return db.getAllSync(
    `SELECT t.id as topic_id, t.name, t.subject_id
     FROM topic_progress tp
     JOIN topics t ON t.id = tp.topic_id
     WHERE tp.next_review_at IS NOT NULL
       AND tp.next_review_at <= date('now')
       AND t.status != 'locked'
     ORDER BY tp.next_review_at ASC`
  );
}
