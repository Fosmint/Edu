import { getDb } from "./client";

export interface ExamPrepStep {
  order: number;
  type: "review" | "practice" | "weak_spot" | "mini_test";
  title: string;
  description: string;
  topic_id: string | null;
  estimated_minutes: number;
}

export interface ExamPrep {
  id: number;
  subject_id: string;
  exam_title: string;
  exam_date: string | null;
  steps: ExamPrepStep[];
  completed_steps: number[];
  is_completed: number;
  created_at: string;
}

interface ExamPrepRow {
  id: number;
  subject_id: string;
  exam_title: string;
  exam_date: string | null;
  steps_json: string;
  completed_steps: string;
  is_completed: number;
  created_at: string;
}

function rowToExamPrep(row: ExamPrepRow): ExamPrep {
  return {
    id: row.id,
    subject_id: row.subject_id,
    exam_title: row.exam_title,
    exam_date: row.exam_date,
    steps: JSON.parse(row.steps_json) as ExamPrepStep[],
    completed_steps: JSON.parse(row.completed_steps) as number[],
    is_completed: row.is_completed,
    created_at: row.created_at,
  };
}

/** Сохраняет новый план подготовки и возвращает его id */
export function saveExamPrep(params: {
  subjectId: string;
  examTitle: string;
  examDate: string | null;
  steps: ExamPrepStep[];
}): number {
  const db = getDb();
  const result = db.runSync(
    `INSERT INTO exam_preps (subject_id, exam_title, exam_date, steps_json) VALUES (?, ?, ?, ?)`,
    [params.subjectId, params.examTitle, params.examDate, JSON.stringify(params.steps)]
  );
  return result.lastInsertRowId;
}

/** Все незавершённые планы — для главного экрана */
export function getActiveExamPreps(): ExamPrep[] {
  const db = getDb();
  const rows = db.getAllSync<ExamPrepRow>(
    `SELECT * FROM exam_preps WHERE is_completed = 0 ORDER BY created_at DESC`
  );
  return rows.map(rowToExamPrep);
}

/** Конкретный план по id */
export function getExamPrep(id: number): ExamPrep | null {
  const db = getDb();
  const row = db.getFirstSync<ExamPrepRow>(
    `SELECT * FROM exam_preps WHERE id = ?`,
    [id]
  );
  return row ? rowToExamPrep(row) : null;
}

/** Отмечает шаг выполненным */
export function markStepCompleted(prepId: number, stepOrder: number): void {
  const db = getDb();
  const row = db.getFirstSync<{ completed_steps: string }>(
    `SELECT completed_steps FROM exam_preps WHERE id = ?`,
    [prepId]
  );
  if (!row) return;

  const completed: number[] = JSON.parse(row.completed_steps);
  if (!completed.includes(stepOrder)) {
    completed.push(stepOrder);
    db.runSync(
      `UPDATE exam_preps SET completed_steps = ? WHERE id = ?`,
      [JSON.stringify(completed), prepId]
    );
  }
}

/** Завершает весь план */
export function completeExamPrep(prepId: number): void {
  const db = getDb();
  db.runSync(
    `UPDATE exam_preps SET is_completed = 1 WHERE id = ?`,
    [prepId]
  );
}

/** Удаляет план */
export function deleteExamPrep(prepId: number): void {
  const db = getDb();
  db.runSync(`DELETE FROM exam_preps WHERE id = ?`, [prepId]);
}
