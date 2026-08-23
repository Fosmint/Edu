import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL, SEED_PROFILE_SQL } from "./schema";
import { SUBJECTS, TOPICS } from "./seed";

const DB_NAME = "edumentor.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Возвращает singleton-соединение с БД. Открывается один раз за жизнь приложения.
 */
export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  return dbInstance;
}

/**
 * Полная инициализация: создание таблиц + первичное наполнение (если пусто).
 * Вызывается один раз при старте приложения (см. app/_layout.tsx).
 */
export async function initDatabase(): Promise<void> {
  const db = getDb();

  db.execSync(CREATE_TABLES_SQL);
  db.execSync(SEED_PROFILE_SQL);
  runMigrations(db);

  const subjectCountRow = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM subjects"
  );

  if (!subjectCountRow || subjectCountRow.count === 0) {
    seedSubjectsAndTopics(db);
  }
}

/**
 * Лёгкие миграции для полей, добавленных после того как приложение уже могло быть
 * установлено у пользователя с более старой схемой. CREATE_TABLES_SQL использует
 * "IF NOT EXISTS" и потому не добавляет новые колонки в уже существующие таблицы —
 * это компенсируется здесь через ALTER TABLE с проверкой на существование колонки.
 */
function runMigrations(db: SQLite.SQLiteDatabase): void {
  addColumnIfMissing(db, "mistakes", "mistake_type_ru", "TEXT");
}

function addColumnIfMissing(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  type: string
): void {
  const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
  const exists = columns.some((c) => c.name === column);
  if (!exists) {
    db.execSync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

function seedSubjectsAndTopics(db: SQLite.SQLiteDatabase): void {
  db.withTransactionSync(() => {
    for (const s of SUBJECTS) {
      db.runSync(
        `INSERT INTO subjects (id, name, icon, sort_order) VALUES (?, ?, ?, ?)`,
        [s.id, s.name, s.icon, s.sort_order]
      );
    }

    for (const t of TOPICS) {
      db.runSync(
        `INSERT INTO topics (id, subject_id, parent_id, name, description, sort_order, min_difficulty_tier, is_unlocked, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.id,
          t.subject_id,
          t.parent_id,
          t.name,
          t.description,
          t.sort_order,
          t.min_difficulty_tier,
          t.is_unlocked,
          t.is_unlocked ? "available" : "locked",
        ]
      );

      // Создаём пустую строку прогресса для каждой темы сразу
      db.runSync(`INSERT INTO topic_progress (topic_id) VALUES (?)`, [t.id]);
    }
  });
}

/**
 * Утилита для дев-режима: полностью сбросить БД (удалить и пересоздать).
 * НЕ вызывать в проде без явного подтверждения пользователя.
 */
export async function resetDatabase(): Promise<void> {
  const db = getDb();
  db.execSync(`
    DROP TABLE IF EXISTS daily_tasks;
    DROP TABLE IF EXISTS exams;
    DROP TABLE IF EXISTS achievements;
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS mistakes;
    DROP TABLE IF EXISTS topic_progress;
    DROP TABLE IF EXISTS topics;
    DROP TABLE IF EXISTS subjects;
    DROP TABLE IF EXISTS profile;
  `);
  await initDatabase();
}
