/**
 * Начальные данные: предметы + карта тем.
 * Математика — полное дерево (эталон для MVP).
 * Остальные предметы — базовый набор тем, расширяется позже.
 */

export interface SubjectSeed {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

export interface TopicSeed {
  id: string;
  subject_id: string;
  parent_id: string | null;
  name: string;
  description: string;
  sort_order: number;
  min_difficulty_tier: number;
  is_unlocked: number; // первая тема каждого предмета открыта сразу
}

// Поле icon хранит семантический ключ (не emoji) — см. components/icons/iconMap.ts,
// который сопоставляет ключ с конкретной SVG-иконкой при отрисовке.
export const SUBJECTS: SubjectSeed[] = [
  { id: "math", name: "Математика", icon: "math", sort_order: 1 },
  { id: "russian", name: "Русский язык", icon: "russian", sort_order: 2 },
  { id: "english", name: "Английский язык", icon: "english", sort_order: 3 },
  { id: "chemistry", name: "Химия", icon: "chemistry", sort_order: 4 },
  { id: "physics", name: "Физика", icon: "physics", sort_order: 5 },
];

export const TOPICS: TopicSeed[] = [
  // ===== МАТЕМАТИКА — полное дерево =====
  { id: "math_numbers", subject_id: "math", parent_id: null, name: "Числа", description: "Натуральные, целые, рациональные числа, действия с ними", sort_order: 1, min_difficulty_tier: 1, is_unlocked: 1 },
  { id: "math_fractions", subject_id: "math", parent_id: "math_numbers", name: "Дроби", description: "Обыкновенные и десятичные дроби, действия с ними", sort_order: 2, min_difficulty_tier: 1, is_unlocked: 0 },
  { id: "math_percent", subject_id: "math", parent_id: "math_fractions", name: "Проценты", description: "Проценты, задачи на проценты", sort_order: 3, min_difficulty_tier: 1, is_unlocked: 0 },
  { id: "math_equations", subject_id: "math", parent_id: "math_fractions", name: "Уравнения", description: "Линейные уравнения и их системы", sort_order: 4, min_difficulty_tier: 1, is_unlocked: 0 },
  { id: "math_systems", subject_id: "math", parent_id: "math_equations", name: "Системы уравнений", description: "Системы линейных уравнений, методы решения", sort_order: 5, min_difficulty_tier: 2, is_unlocked: 0 },
  { id: "math_powers", subject_id: "math", parent_id: "math_equations", name: "Степени", description: "Степени и их свойства", sort_order: 6, min_difficulty_tier: 1, is_unlocked: 0 },
  { id: "math_quadratic", subject_id: "math", parent_id: "math_powers", name: "Квадратные уравнения", description: "Дискриминант, теорема Виета, формулы корней", sort_order: 7, min_difficulty_tier: 2, is_unlocked: 0 },
  { id: "math_functions", subject_id: "math", parent_id: "math_quadratic", name: "Функции", description: "Понятие функции, графики, свойства", sort_order: 8, min_difficulty_tier: 2, is_unlocked: 0 },
  { id: "math_geometry", subject_id: "math", parent_id: "math_numbers", name: "Геометрия", description: "Планиметрия: фигуры, площади, теоремы", sort_order: 9, min_difficulty_tier: 2, is_unlocked: 0 },

  // ===== РУССКИЙ ЯЗЫК — базовый набор =====
  { id: "ru_orthography", subject_id: "russian", parent_id: null, name: "Орфография", description: "Правописание корней, приставок, суффиксов", sort_order: 1, min_difficulty_tier: 1, is_unlocked: 1 },
  { id: "ru_punctuation", subject_id: "russian", parent_id: "ru_orthography", name: "Пунктуация", description: "Знаки препинания в простом и сложном предложении", sort_order: 2, min_difficulty_tier: 1, is_unlocked: 0 },
  { id: "ru_morphology", subject_id: "russian", parent_id: "ru_orthography", name: "Морфология", description: "Части речи и их формы", sort_order: 3, min_difficulty_tier: 1, is_unlocked: 0 },
  { id: "ru_syntax", subject_id: "russian", parent_id: "ru_punctuation", name: "Синтаксис", description: "Строение предложений, члены предложения", sort_order: 4, min_difficulty_tier: 2, is_unlocked: 0 },

  // ===== АНГЛИЙСКИЙ ЯЗЫК — базовый набор =====
  { id: "en_grammar_basics", subject_id: "english", parent_id: null, name: "Основы грамматики", description: "Present/Past/Future Simple, базовые конструкции", sort_order: 1, min_difficulty_tier: 1, is_unlocked: 1 },
  { id: "en_vocabulary", subject_id: "english", parent_id: "en_grammar_basics", name: "Лексика", description: "Базовый словарный запас по темам", sort_order: 2, min_difficulty_tier: 1, is_unlocked: 0 },
  { id: "en_tenses", subject_id: "english", parent_id: "en_grammar_basics", name: "Времена глагола", description: "Continuous, Perfect формы", sort_order: 3, min_difficulty_tier: 2, is_unlocked: 0 },
  { id: "en_speaking", subject_id: "english", parent_id: "en_vocabulary", name: "Разговорная практика", description: "Диалоги, устная речь", sort_order: 4, min_difficulty_tier: 2, is_unlocked: 0 },

  // ===== ХИМИЯ — базовый набор =====
  { id: "chem_atoms", subject_id: "chemistry", parent_id: null, name: "Атомы и элементы", description: "Строение атома, периодическая таблица", sort_order: 1, min_difficulty_tier: 1, is_unlocked: 1 },
  { id: "chem_bonds", subject_id: "chemistry", parent_id: "chem_atoms", name: "Химическая связь", description: "Ионная, ковалентная связь", sort_order: 2, min_difficulty_tier: 1, is_unlocked: 0 },
  { id: "chem_reactions", subject_id: "chemistry", parent_id: "chem_bonds", name: "Химические реакции", description: "Типы реакций, уравнивание", sort_order: 3, min_difficulty_tier: 2, is_unlocked: 0 },
  { id: "chem_solutions", subject_id: "chemistry", parent_id: "chem_reactions", name: "Растворы", description: "Концентрация, растворимость", sort_order: 4, min_difficulty_tier: 2, is_unlocked: 0 },

  // ===== ФИЗИКА — базовый набор =====
  { id: "phys_mechanics", subject_id: "physics", parent_id: null, name: "Механика", description: "Движение, скорость, ускорение", sort_order: 1, min_difficulty_tier: 1, is_unlocked: 1 },
  { id: "phys_forces", subject_id: "physics", parent_id: "phys_mechanics", name: "Силы", description: "Законы Ньютона, сила тяжести, трение", sort_order: 2, min_difficulty_tier: 1, is_unlocked: 0 },
  { id: "phys_pressure", subject_id: "physics", parent_id: "phys_forces", name: "Давление и сила Архимеда", description: "Давление в жидкостях и газах, плавание тел", sort_order: 3, min_difficulty_tier: 2, is_unlocked: 0 },
  { id: "phys_energy", subject_id: "physics", parent_id: "phys_forces", name: "Работа и энергия", description: "Механическая работа, кинетическая и потенциальная энергия", sort_order: 4, min_difficulty_tier: 2, is_unlocked: 0 },
];
