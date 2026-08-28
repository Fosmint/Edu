import { IconName } from "./Icon";

/**
 * Централизованное сопоставление коротких ключей (хранятся в БД в полях
 * subjects.icon и achievements.icon) с именами SVG-иконок. Раньше в этих
 * полях хранились emoji-строки напрямую — теперь хранится семантический
 * ключ, а компонент Icon сам рисует нужную SVG-иконку.
 */
export const ICON_KEY_MAP: Record<string, IconName> = {
  // предметы
  math: "calculator",
  russian: "letter-ru",
  english: "letter-en",
  chemistry: "flask",
  physics: "atom",
  sos: "lifebuoy",

  // достижения
  flag: "flag",
  trophy: "trophy",
  books: "books",
  calculator: "calculator",
  bolt: "bolt",
  flame: "flame",
  sword: "sword",
  skull: "skull",
  target: "target",
  pencil: "pencil",
  star: "star",
  "sparkle-star": "sparkle-star",
};

/** Возвращает имя SVG-иконки по ключу, хранящемуся в БД. Есть безопасный фолбэк. */
export function resolveIconName(key: string): IconName {
  return ICON_KEY_MAP[key] ?? "star";
}
