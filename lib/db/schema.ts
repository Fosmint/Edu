/**
 * EduMentor — SQLite schema
 * Одна БД на всё приложение. Инициализируется один раз при первом запуске.
 */

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Профиль пользователя (одна запись, id всегда = 1)
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT 'Максим',
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Предметы (статичный набор из 5, но храним в БД для гибкости)
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,             -- 'math' | 'russian' | 'english' | 'chemistry' | 'physics'
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  overall_progress_pct REAL NOT NULL DEFAULT 0,
  is_hidden INTEGER NOT NULL DEFAULT 0   -- служебные "предметы" (например для режима "Срочно списать"), не показываются в обычных списках
);

-- Темы внутри предмета, с иерархией (parent_id для карты знаний)
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  parent_id TEXT REFERENCES topics(id),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL,
  min_difficulty_tier INTEGER NOT NULL DEFAULT 1,  -- 1=база..4=олимпиадный
  is_unlocked INTEGER NOT NULL DEFAULT 0,          -- 0/1 boolean
  status TEXT NOT NULL DEFAULT 'locked'            -- locked | available | in_progress | mastered
);

-- Прогресс пользователя по каждой теме
CREATE TABLE IF NOT EXISTS topic_progress (
  topic_id TEXT PRIMARY KEY REFERENCES topics(id),
  mastery_pct REAL NOT NULL DEFAULT 0,
  attempts_total INTEGER NOT NULL DEFAULT 0,
  attempts_correct INTEGER NOT NULL DEFAULT 0,
  current_difficulty_tier INTEGER NOT NULL DEFAULT 1,
  -- Spaced repetition (SM-2 упрощённый)
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TEXT,
  next_review_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Журнал ошибок — ядро аналитики "слабых мест"
CREATE TABLE IF NOT EXISTS mistakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id TEXT NOT NULL REFERENCES topics(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  mistake_type TEXT NOT NULL,       -- короткий тег: 'sign_error', 'fraction_reduction', 'formula_choice' и т.п.
  mistake_type_ru TEXT,             -- то же самое на русском для отображения пользователю
  description TEXT,                 -- человекочитаемое пояснение от AI
  session_id INTEGER REFERENCES sessions(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Сессии занятий (чат / практика / экзамен / повторение)
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  topic_id TEXT REFERENCES topics(id),
  type TEXT NOT NULL,               -- 'chat' | 'practice' | 'exam' | 'boss' | 'review' | 'diagnostic'
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  score REAL,                       -- 0..1, для practice/exam/boss
  xp_earned INTEGER NOT NULL DEFAULT 0
);

-- История сообщений в чате (по сессии)
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL,               -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Достижения
CREATE TABLE IF NOT EXISTS achievements (
  code TEXT PRIMARY KEY,            -- 'first_equation', 'streak_7', 'boss_defeated_math_1' и т.п.
  title TEXT NOT NULL,
  icon TEXT NOT NULL,
  unlocked_at TEXT
);

-- Экзамены (боссы тем и диагностика) — детальный результат
CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id TEXT REFERENCES topics(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  type TEXT NOT NULL,               -- 'boss' | 'diagnostic' | 'checkup'
  score REAL NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  weak_points_json TEXT,            -- JSON массив тегов ошибок
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ежедневные задания
CREATE TABLE IF NOT EXISTS daily_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,               -- 'YYYY-MM-DD'
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  topic_id TEXT REFERENCES topics(id),
  duration_min INTEGER NOT NULL DEFAULT 10,
  completed INTEGER NOT NULL DEFAULT 0,
  UNIQUE(date, subject_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_topic ON mistakes(topic_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_type ON mistakes(mistake_type);
CREATE INDEX IF NOT EXISTS idx_sessions_subject ON sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_topic_progress_next_review ON topic_progress(next_review_at);
`;

export const SEED_PROFILE_SQL = `
INSERT OR IGNORE INTO profile (id, name) VALUES (1, 'Максим');
`;
