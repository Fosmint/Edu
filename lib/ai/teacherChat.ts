import { buildSystemPrompt } from "./subjectPrompts";
import { buildStudentContext } from "./context";
import { callOpenRouter, ChatMessage } from "./openrouter";
import { getDb } from "../db/client";

/**
 * Возвращает список чатов по теме (для экрана со списком чатов), самые новые первыми.
 * Каждый чат — отдельная запись в sessions (type='chat'), пользователь может завести
 * их сколько угодно — это то, что позволяет не тащить всю историю в одном бесконечном
 * диалоге и не тратить токены на контекст, который уже не нужен.
 */
export interface ChatSummary {
  id: number;
  title: string;
  messageCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
}

export function listChatsForTopic(topicId: string): ChatSummary[] {
  const db = getDb();
  return db.getAllSync<ChatSummary>(
    `SELECT
       s.id as id,
       COALESCE(s.title, 'Новый чат') as title,
       (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id AND m.role != 'system') as messageCount,
       (SELECT MAX(created_at) FROM messages m WHERE m.session_id = s.id) as lastMessageAt,
       (SELECT content FROM messages m WHERE m.session_id = s.id AND m.role != 'system' ORDER BY m.id DESC LIMIT 1) as lastMessagePreview
     FROM sessions s
     WHERE s.topic_id = ? AND s.type = 'chat'
     ORDER BY COALESCE(
       (SELECT MAX(created_at) FROM messages m WHERE m.session_id = s.id),
       s.started_at
     ) DESC`,
    [topicId]
  );
}

/** Создаёт новый именованный (или безымянный — заголовок проставится по первому сообщению) чат по теме. */
export function createChat(params: { subjectId: string; topicId: string; title?: string }): number {
  const db = getDb();
  const result = db.runSync(
    `INSERT INTO sessions (subject_id, topic_id, type, title) VALUES (?, ?, 'chat', ?)`,
    [params.subjectId, params.topicId, params.title ?? null]
  );
  return result.lastInsertRowId;
}

/** Удаляет чат целиком (сессию + все её сообщения). */
export function deleteChat(sessionId: number): void {
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync(`DELETE FROM messages WHERE session_id = ?`, [sessionId]);
    db.runSync(`DELETE FROM sessions WHERE id = ?`, [sessionId]);
  });
}

/** Переименовывает чат вручную (пользователь может переименовать из списка чатов). */
export function renameChat(sessionId: number, title: string): void {
  const db = getDb();
  db.runSync(`UPDATE sessions SET title = ? WHERE id = ?`, [title.trim() || null, sessionId]);
}

/**
 * Если у чата ещё нет заголовка (title IS NULL) — проставляет его по первому сообщению
 * пользователя (обрезая до разумной длины). Вызывается после первого обмена сообщениями.
 */
function autoTitleIfNeeded(sessionId: number, firstUserMessage: string): void {
  const db = getDb();
  const row = db.getFirstSync<{ title: string | null }>(`SELECT title FROM sessions WHERE id = ?`, [sessionId]);
  if (row && !row.title) {
    const title = firstUserMessage.trim().slice(0, 60) || "Новый чат";
    db.runSync(`UPDATE sessions SET title = ? WHERE id = ?`, [title, sessionId]);
  }
}

/**
 * Отправляет сообщение преподавателю в рамках сессии.
 * История чата берётся из БД по session_id, system-промпт собирается заново каждый раз
 * (чтобы контекст ученика был всегда свежим — прогресс мог измениться с прошлого сообщения).
 */
export async function sendMessageToTeacher(params: {
  sessionId: number;
  subjectId: string;
  topicId?: string;
  sessionType?: "chat" | "practice" | "exam" | "boss" | "review" | "diagnostic";
  userMessage: string;
}): Promise<string> {
  const db = getDb();

  // Сохраняем сообщение пользователя сразу
  db.runSync(
    `INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)`,
    [params.sessionId, params.userMessage]
  );
  autoTitleIfNeeded(params.sessionId, params.userMessage);

  const contextBlock = buildStudentContext({
    subjectId: params.subjectId,
    topicId: params.topicId,
    sessionType: params.sessionType ?? "chat",
  });

  const systemPrompt = buildSystemPrompt({
    subjectId: params.subjectId,
    contextBlock,
  });

  const history = db.getAllSync<{ role: string; content: string }>(
    `SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC`,
    [params.sessionId]
  );

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
  ];

  const reply = await callOpenRouter(messages, { temperature: 0.7, maxTokens: 700 });

  db.runSync(
    `INSERT INTO messages (session_id, role, content) VALUES (?, 'assistant', ?)`,
    [params.sessionId, reply]
  );

  return reply;
}

/** Специальная функция для кнопки "Я ничего не понял" — объясняет тему заново с нуля */
export async function requestSimplerExplanation(params: {
  sessionId: number;
  subjectId: string;
  topicId?: string;
}): Promise<string> {
  return sendMessageToTeacher({
    ...params,
    sessionType: "chat",
    userMessage: `Я ничего не понял.

Пользователь нажал кнопку «Я ничего не понял».

Твоя задача — заново объяснить ему текущую тему с нуля, предполагая, что он вообще ничего не понял из предыдущего объяснения.

Правила:
- Не повторяй предыдущий ответ другими словами — объясни концепцию заново.
- Используй максимально простой и понятный русский язык.
- Избегай сложных терминов. Если термин необходим — сразу объясни его простыми словами.
- Разбивай объяснение на маленькие шаги.
- Сначала объясни самую базовую идею темы.
- Используй простой конкретный пример из школьной программы.
- Покажи решение или ход рассуждения пошагово.
- Не перегружай пользователя большим количеством информации.
- Не используй формальный или академический стиль.
- Можно использовать аналогии из повседневной жизни, если они действительно помогают понять тему.
- После объяснения задай ОДИН очень простой вопрос или пример, чтобы проверить, понял ли пользователь основную идею.
- Не давай ответ на проверочный вопрос заранее.
- Если пользователь всё ещё не понимает, после его ответа объясни ещё проще.

Главная цель: не просто дать правильную информацию, а добиться того, чтобы школьник действительно понял принцип.`,
  });
}

/** Загружает всю историю сообщений сессии — для восстановления чата при открытии */
export function getSessionMessages(sessionId: number): Array<{ role: "user" | "assistant"; content: string }> {
  const db = getDb();
  return db
    .getAllSync<{ role: string; content: string }>(
      `SELECT role, content FROM messages WHERE session_id = ? AND role != 'system' ORDER BY id ASC`,
      [sessionId]
    )
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}

/** Создаёт новую сессию в БД и возвращает её id */
export function createSession(params: {
  subjectId: string;
  topicId?: string;
  type: "chat" | "practice" | "exam" | "boss" | "review" | "diagnostic";
}): number {
  const db = getDb();
  const result = db.runSync(
    `INSERT INTO sessions (subject_id, topic_id, type) VALUES (?, ?, ?)`,
    [params.subjectId, params.topicId ?? null, params.type]
  );
  return result.lastInsertRowId;
}

export function endSession(sessionId: number, score?: number, xpEarned = 0): void {
  const db = getDb();
  db.runSync(
    `UPDATE sessions SET ended_at = datetime('now'), score = ?, xp_earned = ? WHERE id = ?`,
    [score ?? null, xpEarned, sessionId]
  );
}
