import * as SecureStore from "expo-secure-store";

/**
 * Реестр провайдеров + настройки. Раньше в приложении был жёстко зашит один
 * провайдер (OpenRouter). Теперь пользователь может выбрать в настройках
 * один из готовых провайдеров (со своим API-ключом) или задать свой,
 * OpenAI-совместимый Base URL + модель вручную (как раньше).
 *
 * GigaChat — особый случай: у него нет OpenAI-совместимой авторизации.
 * Ключ, который вводит пользователь в настройках — это "Authorization key"
 * (Base64 строка client_id:client_secret из личного кабинета Studio).
 * Из него на каждый вызов (с кэшированием ~28 минут) получаем access_token
 * через отдельный OAuth-запрос, и уже им авторизуем chat/completions.
 */

export type ProviderId = "openrouter" | "gigachat" | "openai" | "anthropic" | "deepseek" | "google" | "custom";

export interface ProviderDef {
  id: ProviderId;
  label: string;
  defaultModel: string;
  defaultBaseUrl: string;
  keyPlaceholder: string;
  keyHint: string;
  docsUrl?: string;
}

export const PROVIDERS: Record<Exclude<ProviderId, "custom">, ProviderDef> = {
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    defaultModel: "deepseek/deepseek-v4-flash-0731",
    defaultBaseUrl: "https://openrouter.ai/api/v1/chat/completions",
    keyPlaceholder: "sk-or-v1-...",
    keyHint: "Один ключ — доступ к десяткам моделей сразу (DeepSeek, GPT, Claude, Gemini и т.д.).",
    docsUrl: "https://openrouter.ai/keys",
  },
  gigachat: {
    id: "gigachat",
    label: "GigaChat (Сбер)",
    defaultModel: "GigaChat",
    defaultBaseUrl: "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
    keyPlaceholder: "Authorization key (Base64 из личного кабинета Studio)",
    keyHint:
      "Не путай с access token! Сюда вставляется именно Authorization key (Base64-строка client_id:client_secret) из настроек проекта GigaChat API в личном кабинете Studio — токен доступа приложение получит и обновит само.",
    docsUrl: "https://developers.sber.ru/docs/ru/gigachat/quickstart/ind-using-api",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-5.1-mini",
    defaultBaseUrl: "https://api.openai.com/v1/chat/completions",
    keyPlaceholder: "sk-...",
    keyHint: "Ключ из platform.openai.com. Тарифицируется напрямую OpenAI.",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    defaultModel: "claude-sonnet-5",
    defaultBaseUrl: "https://api.anthropic.com/v1/messages",
    keyPlaceholder: "sk-ant-...",
    keyHint: "Ключ из console.anthropic.com. У Anthropic другой формат API (Messages), приложение учитывает это автоматически.",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    defaultModel: "deepseek-chat",
    defaultBaseUrl: "https://api.deepseek.com/chat/completions",
    keyPlaceholder: "sk-...",
    keyHint: "Ключ из platform.deepseek.com. Обычно самый дешёвый вариант напрямую (без OpenRouter).",
    docsUrl: "https://platform.deepseek.com/api_keys",
  },
  google: {
    id: "google",
    label: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyPlaceholder: "AIza...",
    keyHint: "Ключ из aistudio.google.com. Используется OpenAI-совместимый эндпоинт Gemini.",
    docsUrl: "https://aistudio.google.com/apikey",
  },
};

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const STORAGE_KEYS = {
  activeProvider: "edumentor_active_provider",
  // ключи хранятся отдельно на каждого провайдера, чтобы переключение туда-обратно
  // не затирало ранее введённые ключи
  keyPrefix: "edumentor_key_",
  model: "edumentor_ai_model",
  baseUrl: "edumentor_ai_base_url",
  gigachatTokenCache: "edumentor_gigachat_token_cache", // {token, expiresAt} JSON
};

export class ProviderError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ProviderError";
  }
}
// Оставляем алиас со старым именем — часть кода/сообщений об ошибке ссылалась на него
export const OpenRouterError = ProviderError;

// ===== Настройки: активный провайдер, ключи, кастомная модель/URL =====

export async function getActiveProviderId(): Promise<ProviderId> {
  const v = await SecureStore.getItemAsync(STORAGE_KEYS.activeProvider);
  return (v as ProviderId) || "openrouter";
}

export async function setActiveProviderId(id: ProviderId): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.activeProvider, id);
}

export async function getKeyFor(providerId: ProviderId): Promise<string | null> {
  const key = await SecureStore.getItemAsync(STORAGE_KEYS.keyPrefix + providerId);
  if (key) return key;
  // Совместимость со старой версией приложения: раньше был единственный провайдер
  // (OpenRouter) и ключ хранился под одним общим именем без префикса на провайдера.
  // Пробуем известные варианты имени старого ключа и переносим его в новое хранилище.
  if (providerId === "openrouter") {
    const legacyNames = ["edumentor_api_key", "openrouter_api_key", "edumentor_openrouter_key"];
    for (const name of legacyNames) {
      const legacy = await SecureStore.getItemAsync(name);
      if (legacy) {
        await SecureStore.setItemAsync(STORAGE_KEYS.keyPrefix + providerId, legacy);
        return legacy;
      }
    }
  }
  return null;
}

export async function setKeyFor(providerId: ProviderId, key: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.keyPrefix + providerId, key);
}

export async function clearKeyFor(providerId: ProviderId): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.keyPrefix + providerId);
}

/** Старое имя — используется существующим экраном настроек для активного провайдера (обычно openrouter) */
export async function getApiKey(): Promise<string | null> {
  const active = await getActiveProviderId();
  return getKeyFor(active);
}
export async function setApiKey(key: string): Promise<void> {
  const active = await getActiveProviderId();
  await setKeyFor(active, key);
}
export async function clearApiKey(): Promise<void> {
  const active = await getActiveProviderId();
  await clearKeyFor(active);
}

export async function getCustomModel(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.model);
}
export async function setCustomModel(model: string): Promise<void> {
  if (!model.trim()) {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.model);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEYS.model, model.trim());
}

export async function getCustomBaseUrl(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.baseUrl);
}
export async function setCustomBaseUrl(url: string): Promise<void> {
  if (!url.trim()) {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.baseUrl);
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEYS.baseUrl, url.trim());
}

export async function resetToDefaults(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.model);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.baseUrl);
}

export const DEFAULT_MODEL = PROVIDERS.openrouter.defaultModel;

/** Текущая эффективная конфигурация — с учётом активного провайдера и опциональной ручной модели/URL поверх него */
export async function getEffectiveConfig(): Promise<{
  providerId: ProviderId;
  baseUrl: string;
  model: string;
  isCustom: boolean;
}> {
  const [providerId, customModel, customBaseUrl] = await Promise.all([
    getActiveProviderId(),
    getCustomModel(),
    getCustomBaseUrl(),
  ]);
  const def = PROVIDERS[providerId as Exclude<ProviderId, "custom">] ?? PROVIDERS.openrouter;
  return {
    providerId,
    baseUrl: customBaseUrl || def.defaultBaseUrl,
    model: customModel || def.defaultModel,
    isCustom: !!(customModel || customBaseUrl),
  };
}

// ===== GigaChat: обмен Authorization key -> access token (с кэшем) =====

const GIGACHAT_OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const GIGACHAT_TOKEN_TTL_MS = 28 * 60 * 1000; // токен живёт 30 минут, обновляем с запасом

function uuidv4(): string {
  // достаточно для RqUID-заголовка, криптостойкость тут не требуется
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function getGigaChatAccessToken(authKey: string): Promise<string> {
  const cachedRaw = await SecureStore.getItemAsync(STORAGE_KEYS.gigachatTokenCache);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw) as { token: string; expiresAt: number; authKey: string };
      if (cached.authKey === authKey && cached.expiresAt > Date.now()) {
        return cached.token;
      }
    } catch {
      // битый кэш — просто получаем токен заново
    }
  }

  let response: Response;
  try {
    response = await fetch(GIGACHAT_OAUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        RqUID: uuidv4(),
        Authorization: `Basic ${authKey}`,
      },
      body: "scope=GIGACHAT_API_PERS",
    });
  } catch (e) {
    // Самая частая причина сетевой ошибки именно к домену Сбера — отсутствие
    // корневого сертификата НУЦ Минцифры в системе доверенных сертификатов.
    throw new ProviderError(
      "Не удалось подключиться к серверу авторизации GigaChat. Если ошибка повторяется — вероятно, на устройстве не установлен корневой сертификат НУЦ Минцифры, который требует Сбер для TLS-соединений. Установи его из личного кабинета Госуслуг/Минцифры и повтори попытку."
    );
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    if (response.status === 401) {
      throw new ProviderError(
        "GigaChat не принял ключ авторизации. Проверь, что в настройках вставлен именно Authorization key (Base64-строка) из личного кабинета Studio, а не access token и не Client Secret по отдельности."
      );
    }
    throw new ProviderError(`Ошибка авторизации GigaChat (${response.status}): ${errText || response.statusText}`, response.status);
  }

  const data = await response.json();
  const token = data?.access_token as string | undefined;
  if (!token) {
    throw new ProviderError("GigaChat не вернул токен доступа. Попробуй ещё раз.");
  }

  await SecureStore.setItemAsync(
    STORAGE_KEYS.gigachatTokenCache,
    JSON.stringify({ token, expiresAt: Date.now() + GIGACHAT_TOKEN_TTL_MS, authKey })
  );

  return token;
}

// ===== Вызовы API =====

interface CallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonSchema?: { name: string; schema: object };
}

function buildAnthropicBody(messages: ChatMessage[], model: string, options: CallOptions) {
  const system = messages.find((m) => m.role === "system")?.content;
  const rest = messages.filter((m) => m.role !== "system");
  return {
    model,
    system,
    max_tokens: options.maxTokens ?? 1500,
    temperature: options.temperature ?? 0.7,
    messages: rest.map((m) => ({ role: m.role, content: m.content })),
  };
}

/**
 * Единая точка вызова любого сконфигурированного провайдера.
 * Большинство провайдеров (OpenRouter, GigaChat, OpenAI, DeepSeek, Google-совместимый
 * эндпоинт) говорят на одном OpenAI-совместимом Chat Completions формате — отличаются
 * только base URL, ключ/токен и модель. Anthropic использует свой формат (Messages API),
 * поэтому для него тело запроса и парсинг ответа собираются отдельно.
 */
export async function callProvider(messages: ChatMessage[], options: CallOptions = {}): Promise<string> {
  const { providerId, baseUrl, model } = await getEffectiveConfig();
  const rawKey = await getKeyFor(providerId);

  if (!rawKey) {
    const label = PROVIDERS[providerId as Exclude<ProviderId, "custom">]?.label ?? "выбранного провайдера";
    throw new ProviderError(`API-ключ для ${label} не задан. Добавь его в настройках приложения.`);
  }

  const effectiveModel = options.model ?? model;
  const isAnthropic = providerId === "anthropic";

  let authHeader: Record<string, string>;
  if (providerId === "gigachat") {
    const accessToken = await getGigaChatAccessToken(rawKey);
    authHeader = { Authorization: `Bearer ${accessToken}` };
  } else if (isAnthropic) {
    authHeader = { "x-api-key": rawKey, "anthropic-version": "2023-06-01" };
  } else {
    authHeader = { Authorization: `Bearer ${rawKey}` };
  }

  const body: Record<string, unknown> = isAnthropic
    ? buildAnthropicBody(messages, effectiveModel, options)
    : {
        model: effectiveModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1500,
      };

  if (options.jsonSchema && !isAnthropic) {
    // GigaChat пока не поддерживает response_format=json_schema так же строго, как OpenAI —
    // но принимает json_object и обычно неплохо следует схеме, если она описана в system-промпте.
    // Поэтому запрашиваем json_object везде, кроме Anthropic (структурируем через промпт для неё).
    if (providerId === "gigachat") {
      body.response_format = { type: "json_object" };
    } else {
      body.response_format = {
        type: "json_schema",
        json_schema: { name: options.jsonSchema.name, strict: true, schema: options.jsonSchema.schema },
      };
    }
  }

  const MAX_ATTEMPTS = 2;
  let lastError: ProviderError | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
          ...(providerId === "openrouter" ? { "HTTP-Referer": "https://edumentor.local", "X-Title": "EduMentor" } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (e) {
      const isAbort = e instanceof Error && e.name === "AbortError";
      const sslHint =
        providerId === "gigachat"
          ? " Если это GigaChat и ошибка повторяется — проверь, установлен ли на устройстве сертификат НУЦ Минцифры."
          : "";
      lastError = new ProviderError(
        isAbort
          ? "Модель отвечает слишком долго. Проверь интернет-соединение и попробуй снова."
          : `Нет соединения с сетью. Проверь интернет и попробуй снова.${sslHint}`
      );
      continue;
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      lastError = new ProviderError(`Ошибка API (${response.status}): ${errText || response.statusText}`, response.status);
      if (response.status >= 400 && response.status < 500) {
        throw lastError;
      }
      continue;
    }

    const data = await response.json();
    const content = isAnthropic
      ? data?.content?.map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : "")).join("")
      : data?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || content.length === 0) {
      lastError = new ProviderError("Пустой ответ от модели. Попробуй переформулировать запрос.");
      continue;
    }

    return content;
  }

  throw lastError ?? new ProviderError("Не удалось получить ответ от модели.");
}

export async function callProviderJson<T>(
  messages: ChatMessage[],
  jsonSchema: { name: string; schema: object },
  options: Omit<CallOptions, "jsonSchema"> = {}
): Promise<T> {
  const raw = await callProvider(messages, { ...options, jsonSchema });
  try {
    // На случай если модель обернула JSON в ```json ... ``` (иногда бывает у GigaChat/Gemini)
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    return JSON.parse(cleaned) as T;
  } catch {
    throw new ProviderError("Модель вернула некорректный JSON. Попробуй ещё раз.");
  }
}

// Алиасы под старые имена, чтобы не переписывать сигнатуры вызовов по всему проекту
export const callOpenRouter = callProvider;
export const callOpenRouterJson = callProviderJson;
