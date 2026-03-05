/**
 * Конфиг вопросов по методологии Founders Vision Alignment.
 * Дизайн: академический стиль, меньше рукописных блоков, чек-листы, русские термины.
 */

export const CRITICAL_IDS = new Set(['q6', 'q7', 'q9', 'q11', 'q17'])

/** ID параметров с текстовым ответом: не участвуют в числовом подсчёте баллов */
export const TEXT_ANSWER_PARAM_IDS = new Set([
  'q1', 'q6', 'scenario_a', 'scenario_b', 'scenario_c', 'q8', 'q10', 'q11', 'q12', 'q13', 'q16', 'q17',
  'q18_success', 'q19_failure',
])

/** Параметры для подсчёта баллов (таблица сравнения) */
export const SCORING_PARAMS = [
  { id: 'q1', label: 'Идеальная жизнь через 5 лет', critical: false },
  { id: 'q2', label: 'Главные роли (приоритет)', critical: false },
  { id: 'q3_comfort', label: 'Доход комфорт', critical: false },
  { id: 'q3_good', label: 'Доход желаемый', critical: false },
  { id: 'q3_dream', label: 'Доход мечта', critical: false },
  { id: 'q4', label: 'Что заряжает (ТОП-3)', critical: false },
  { id: 'q5', label: 'Что истощает (ТОП-3)', critical: false },
  { id: 'q6', label: 'Жёсткие ограничения', critical: true },
  { id: 'q6_other', label: 'Ограничения (другое)', critical: false },
  { id: 'q7', label: 'Риск-профиль', critical: true },
  { id: 'scenario_a', label: 'Сценарий A (консервативный)', critical: false },
  { id: 'scenario_b', label: 'Сценарий B (умеренный)', critical: false },
  { id: 'scenario_c', label: 'Сценарий C (амбициозный)', critical: false },
  { id: 'scenario_favorite', label: 'Любимый сценарий будущего', critical: false },
  { id: 'q8', label: 'Главные атрибуты успеха', critical: false },
  { id: 'q9', label: 'Главная амбиция', critical: true },
  { id: 'q10', label: 'Идеальный клиент', critical: false },
  { id: 'q11', label: 'Масштаб через 3 года', critical: true },
  { id: 'q12', label: 'Роль в бизнесе (что делаю)', critical: false },
  { id: 'q13', label: 'Что делегирую / не делаю', critical: false },
  { id: 'q14', label: 'Что нужно построить', critical: false },
  { id: 'q15_hours', label: 'Часов в неделю (готовность)', critical: false },
  { id: 'q15_money', label: 'Инвестиции личные', critical: false },
  { id: 'q15_months', label: 'Месяцев без прибыли', critical: false },
  { id: 'q16', label: 'Жертвы и границы', critical: false },
  { id: 'q17', label: 'Ресурсы (VRIO)', critical: false },
  { id: 'q18_success', label: 'Успех: результаты и достижения', critical: false },
  { id: 'q19_failure', label: 'Провал: что помешало', critical: false },
]

const PART_1_IDS = ['q1', 'q2', 'q3_comfort', 'q3_good', 'q3_dream', 'q4', 'q5', 'q6', 'q6_other', 'q7', 'scenario_a', 'scenario_b', 'scenario_c', 'scenario_favorite']
const PART_2_IDS = ['q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15_hours', 'q15_money', 'q15_months', 'q16', 'q17']
const PART_3_IDS = ['q18_success', 'q19_failure']

function hasDataInPart(data, ids) {
  if (!data || typeof data !== 'object') return false
  return ids.some((id) => {
    const v = data[id]
    if (v == null) return false
    if (typeof v === 'string') return v.trim() !== ''
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'object') {
      if (Array.isArray(v.selected)) return v.selected.length > 0
      if (v.value != null && v.value !== '') return true
      return Object.values(v).some((x) => x != null && (Array.isArray(x) ? x.length > 0 : String(x).trim() !== ''))
    }
    return true
  })
}

export function hasFinishedAll(data) {
  return hasDataInPart(data, PART_1_IDS) && hasDataInPart(data, PART_2_IDS) && hasDataInPart(data, PART_3_IDS)
}

/** Ограничения — чек-лист (закрытые формулировки) */
const Q6_OPTIONS = [
  'Личная жизнь/семья (минимум времени с близкими)',
  'Здоровье (сон, нагрузка)',
  'Время (не хочу работать больше N часов в неделю)',
  'География (не переезжать, не долгие командировки в тяжёлый климат)',
  'Стабильный доход (не готов(а) долго без зарплаты)',
  'Другое (опишите в поле ниже)',
]

/** Что построить — максимум 3 выбора */
const Q14_OPTIONS = [
  'Сильный бренд и репутацию',
  'Большую клиентскую базу',
  'Уникальную методологию или продукт',
  'Технологический продукт',
  'Команду экспертов',
  'Партнёрскую сеть',
  'Эффективные процессы и документооборот',
  'Другое',
]

/** Роли в бизнесе — выбор с возможностью расставить приоритеты (список для выбора и сортировки) */
const Q12_OPTIONS = [
  'Продуктовая стратегия',
  'Фасилитация и встречи',
  'Продажи',
  'Маркетинг',
  'Управление командой',
  'Разработка методологии',
  'Обучение',
  'Бухгалтерия и финансы',
  'Документооборот и операции',
  'Другое',
]

/** Что делегирую / не делаю — варианты для выбора */
const Q13_DELEGATE_OPTIONS = [
  'Бухгалтерия и отчётность',
  'Документооборот',
  'Продажи и холодные звонки',
  'Маркетинг и реклама',
  'Операционное управление',
  'Найм и HR',
  'Другое',
]

/** Главные атрибуты успеха (вместо открытого «Если стартап станет успешным...») */
const Q8_CHECKLIST_OPTIONS = [
  'Финансовая независимость или целевой доход',
  'Репутация и экспертность в нише',
  'Гордость и удовлетворение от результата',
  'Свободный график и образ жизни',
  'Влияние на людей или отрасль',
  'Команда и масштаб',
  'Другое',
]

/** Структура формы по частям и блокам */
export const PARTS = [
  {
    id: 1,
    title: 'Часть 1: Личный аудит',
    subtitle: '≈30 мин',
    blocks: [
      {
        id: '1.1',
        num: 1,
        title: 'Моя жизнь через 5 лет',
        questions: [
          { id: 'q1', label: 'Опишите типичный день идеальной жизни через 5 лет (без привязки к бизнесу): во сколько просыпаетесь, как выглядит день, где живёте, сколько работаете и отдыхаете.', type: 'textarea', placeholder: '3–5 предложений', expandable: true },
          { id: 'q2', label: 'Какие роли важны через 5 лет? Выберите до 5 и расставьте по приоритету: порядок выбора = приоритет (первая выбранная — главная роль).', type: 'multicheck', maxSelect: 5, options: ['Эксперт/профессионал', 'Предприниматель/владелец бизнеса', 'Партнёр/супруг(а)', 'Родитель', 'Друг/член сообщества', 'Другое'] },
          { id: 'q3_comfort', label: 'Доход комфортно (базовый уровень)', type: 'number_currency', placeholder: '...' },
          { id: 'q3_good', label: 'Доход желаемый', type: 'number_currency', placeholder: '...' },
          { id: 'q3_dream', label: 'Доход мечты', type: 'number_currency', placeholder: '...' },
        ],
      },
      {
        id: '1.2',
        num: 2,
        title: 'Энергия и истощение',
        questions: [
          { id: 'q4', label: 'Что заряжает вас энергией в работе? Выберите ТОП-3 и при желании кратко поясните почему.', type: 'multicheck_why', maxSelect: 3, options: ['Стратегическое мышление и планирование', 'Общение с людьми (клиенты, команда)', 'Создание продукта/контента', 'Решение сложных проблем', 'Обучение других', 'Продажи и переговоры', 'Построение систем и процессов', 'Креативная работа', 'Другое'] },
          { id: 'q5', label: 'Что истощает в работе? Выберите ТОП-3 и при желании кратко поясните почему.', type: 'multicheck_why', maxSelect: 3, options: ['Рутинные операционные задачи', 'Управление людьми', 'Постоянные встречи', 'Административная работа', 'Работа с деньгами (финансы, бюджеты)', 'Публичные выступления', 'Техническая работа', 'Неопределённость и риски', 'Другое'] },
        ],
      },
      {
        id: '1.3',
        num: 3,
        title: 'Ограничения (чего не готовы принести в жертву)',
        questions: [
          { id: 'q6', label: 'Отметьте всё, что для вас принципиально (можно несколько). Если нужно уточнение — в поле «Другое».', type: 'multicheck', options: Q6_OPTIONS },
          { id: 'q6_other', label: 'Другое (кратко)', type: 'text', optional: true },
          { id: 'q7', label: 'Риск-профиль', type: 'radio', options: ['Консервативный: стабильность, не готова рисковать', 'Умеренный: готова к рискам с подстраховкой', 'Агрессивный: максимальная ставка, высокие риски ради результата'] },
        ],
      },
      {
        id: '1.4',
        num: 4,
        title: 'Три сценария будущего',
        questions: [
          { id: 'scenario_a', label: 'Сценарий А (консервативный): что делаете, как зарабатываете, как живёте.', type: 'textarea', placeholder: '3–5 предложений', expandable: true },
          { id: 'scenario_b', label: 'Сценарий Б (умеренный)', type: 'textarea', placeholder: '3–5 предложений', expandable: true },
          { id: 'scenario_c', label: 'Сценарий В (амбициозный)', type: 'textarea', placeholder: '3–5 предложений', expandable: true },
          { id: 'scenario_favorite', label: 'Какой сценарий больше всего волнует?', type: 'radio', options: ['A', 'B', 'C'] },
        ],
      },
    ],
  },
  {
    id: 2,
    title: 'Часть 2: Бизнес-видение',
    subtitle: '≈30 мин',
    blocks: [
      {
        id: '2.1',
        num: 5,
        title: 'Главные атрибуты успеха',
        questions: [
          { id: 'q8', label: 'Если стартап станет успешным, что это будет значить лично для вас? Выберите 3–5 самых важных атрибутов.', type: 'multicheck', maxSelect: 5, options: Q8_CHECKLIST_OPTIONS },
        ],
      },
      {
        id: '2.2',
        num: 6,
        title: 'Где будем играть',
        questions: [
          { id: 'q10', label: 'Идеальный клиент', type: 'compound', fields: [
            { key: 'size', label: 'Размер компаний', type: 'text' },
            { key: 'geo', label: 'География', type: 'text' },
            { key: 'industry', label: 'Индустрия', type: 'text' },
            { key: 'how', label: 'Формат работы (удалённо/очно/гибрид)', type: 'text' },
          ]},
          { id: 'q11', label: 'Масштаб бизнеса через 3 года', type: 'compound', fields: [
            { key: 'team', label: 'Команда, чел.', type: 'text' },
            { key: 'turnover', label: 'Годовой оборот', type: 'text' },
            { key: 'turnover_note', label: 'Структура/принцип оборота (кратко)', type: 'text' },
            { key: 'clients', label: 'Количество клиентов', type: 'text' },
            { key: 'model', label: 'Модель (проект/продукт/подписка/другое)', type: 'text' },
          ]},
        ],
      },
      {
        id: '2.3',
        num: 7,
        title: 'Как мы выиграем',
        questions: [
          { id: 'q12', label: 'Какую работу хотите делать лично в этом бизнесе? Выберите из списка и расставьте по приоритету (1 — главное).', type: 'sortable_multicheck', maxSelect: 5, options: Q12_OPTIONS },
          { id: 'q13', label: 'Что хотите делегировать или не делать? Выберите из списка и при необходимости добавьте своё.', type: 'multicheck', options: [...Q13_DELEGATE_OPTIONS], delegateType: true },
        ],
      },
      {
        id: '2.4',
        num: 8,
        title: 'Что должно быть на месте',
        questions: [
          { id: 'q14', label: 'Чтобы выиграть, нужно построить. Выберите 3 самых важных.', type: 'multicheck', maxSelect: 3, options: Q14_OPTIONS },
          { id: 'q15_hours', label: 'Готова работать, часов в неделю (первые 1–2 года)', type: 'number', placeholder: '...' },
          { id: 'q15_money', label: 'Готова инвестировать лично (или 0)', type: 'number_currency', placeholder: '...' },
          { id: 'q15_months', label: 'Готова работать без прибыли максимум, мес.', type: 'number', placeholder: '...' },
          { id: 'q17', label: 'Наши ресурсы (по идее VRIO: что у нас уже есть ценное, редкое, сложное для копирования?)', type: 'textarea', placeholder: 'Люди, навыки, связи, репутация, продукт...', expandable: true },
        ],
      },
      {
        id: '2.5',
        num: 9,
        title: 'Цена успеха',
        questions: [
          { id: 'q16', label: 'Один вопрос про жертвы: что готовы принести в жертву ради успеха и чего не готовы ни при каких обстоятельствах? (кратко)', type: 'textarea', placeholder: 'Готова: ... Не готова: ...', expandable: true },
        ],
      },
    ],
  },
  {
    id: 3,
    title: 'Часть 3: Сценарный анализ',
    subtitle: '≈10 мин',
    blocks: [
      {
        id: '3.1',
        num: 10,
        title: 'Успех и провал',
        questions: [
          { id: 'q18_success', label: 'Представьте успех. Какие результаты и достижения докажут, что вы успешны? (метрики, факты)', type: 'textarea', placeholder: 'Например: выручка, команда, клиенты, репутация...', expandable: true },
          { id: 'q19_failure', label: 'Представьте провал. Что помешало? (негативный список — потом можно перевести в план)', type: 'textarea', placeholder: 'Что пошло не так, чего не хватило...', expandable: true },
        ],
      },
    ],
  },
]
