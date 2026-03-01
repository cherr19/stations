/**
 * Конфиг вопросов по методологии Founders Vision Alignment.
 * Каждый вопрос участвует в подсчёте; критические (critical: true) имеют вес 4, остальные 2.
 */

export const CRITICAL_IDS = new Set(['q6', 'q7', 'q9', 'q11', 'q17'])

/** Параметры для подсчёта баллов: id, label для таблицы сравнения, critical */
export const SCORING_PARAMS = [
  { id: 'q1', label: 'Идеальная жизнь через 5 лет', critical: false },
  { id: 'q2', label: 'Главные роли (приоритет)', critical: false },
  { id: 'q3_comfort', label: 'Доход комфорт (USD/мес)', critical: false },
  { id: 'q3_good', label: 'Доход желаемый (USD/мес)', critical: false },
  { id: 'q3_dream', label: 'Доход мечта (USD/мес)', critical: false },
  { id: 'q4', label: 'Что заряжает (ТОП-3)', critical: false },
  { id: 'q5', label: 'Что истощает (ТОП-3)', critical: false },
  { id: 'q6', label: 'Жёсткие ограничения', critical: true },
  { id: 'q7', label: 'Риск-профиль', critical: true },
  { id: 'scenario_a', label: 'Сценарий A (консервативный)', critical: false },
  { id: 'scenario_b', label: 'Сценарий B (умеренный)', critical: false },
  { id: 'scenario_c', label: 'Сценарий C (амбициозный)', critical: false },
  { id: 'scenario_favorite', label: 'Любимый сценарий будущего', critical: false },
  { id: 'q8', label: 'Winning Aspiration', critical: false },
  { id: 'q9', label: 'Главная амбиция', critical: true },
  { id: 'q10', label: 'Идеальный клиент', critical: false },
  { id: 'q11', label: 'Масштаб через 3 года', critical: true },
  { id: 'q12', label: 'Роль в бизнесе (что делаю)', critical: false },
  { id: 'q13', label: 'Что делегирую / не делаю', critical: false },
  { id: 'q14', label: 'Что нужно построить', critical: false },
  { id: 'q15_hours', label: 'Часов в неделю (готовность)', critical: false },
  { id: 'q15_money', label: 'Инвестиции личные (USD)', critical: false },
  { id: 'q15_months', label: 'Месяцев без прибыли', critical: false },
  { id: 'q16', label: 'Готова принести в жертву', critical: false },
  { id: 'q17', label: 'Что НЕ готова принести в жертву', critical: true },
  { id: 'q18a', label: 'Чувства в сценарии SUCCESS', critical: false },
  { id: 'q18b', label: 'Приобретения (SUCCESS)', critical: false },
  { id: 'q18c', label: 'Потери (SUCCESS)', critical: false },
  { id: 'q18d', label: 'Стоило ли (SUCCESS)', critical: false },
  { id: 'q19a', label: 'Чувства в сценарии STAGNATION', critical: false },
  { id: 'q19b', label: 'Потери (STAGNATION)', critical: false },
  { id: 'q19c', label: 'Следующий шаг (STAGNATION)', critical: false },
  { id: 'q20a', label: 'Оглядываясь назад (FAILURE)', critical: false },
  { id: 'q20b', label: 'Чему научилась (FAILURE)', critical: false },
  { id: 'q20c', label: 'Стоило ли пробовать (FAILURE)', critical: false },
  { id: 'q21', label: 'Какой сценарий пугает', critical: false },
  { id: 'q21_why', label: 'Почему пугает', critical: false },
]

/** Структура формы по частям и блокам для рендера */
export const PARTS = [
  {
    id: 1,
    title: 'Часть 1: Личный аудит',
    subtitle: '30 мин',
    blocks: [
      {
        id: '1.1',
        title: 'Моя жизнь через 5 лет',
        questions: [
          { id: 'q1', label: 'Опиши типичный день идеальной жизни через 5 лет (не думай о бизнесе): во сколько просыпаешься, как выглядит день, где живёшь, сколько работаешь и отдыхаешь.', type: 'textarea', placeholder: '...' },
          { id: 'q2', label: 'Какие роли важны через 5 лет? Выбери до 5 и расставь по приоритету (1 — главное).', type: 'multicheck', maxSelect: 5, options: ['Эксперт/профессионал', 'Предприниматель/владелец бизнеса', 'Партнёр/супруг(а)', 'Родитель', 'Друг/член сообщества', 'Другое'] },
          { id: 'q3_comfort', label: 'Доход комфортно (базовый уровень), USD/мес', type: 'number', placeholder: '...' },
          { id: 'q3_good', label: 'Доход хорошо (желаемый уровень), USD/мес', type: 'number', placeholder: '...' },
          { id: 'q3_dream', label: 'Доход отлично (уровень мечты), USD/мес', type: 'number', placeholder: '...' },
        ],
      },
      {
        id: '1.2',
        title: 'Энергия и истощение',
        questions: [
          { id: 'q4', label: 'Что ЗАРЯЖАЕТ тебя энергией в работе? Выбери ТОП-3 и кратко опиши почему.', type: 'multicheck', maxSelect: 3, options: ['Стратегическое мышление и планирование', 'Общение с людьми (клиенты, команда)', 'Создание продукта/контента', 'Решение сложных проблем', 'Обучение других', 'Продажи и переговоры', 'Построение систем и процессов', 'Креативная работа', 'Другое'] },
          { id: 'q5', label: 'Что ИСТОЩАЕТ тебя в работе? Выбери ТОП-3 и кратко опиши почему.', type: 'multicheck', maxSelect: 3, options: ['Рутинные операционные задачи', 'Управление людьми', 'Постоянные встречи', 'Административная работа', 'Работа с деньгами (финансы, бюджеты)', 'Публичные выступления', 'Техническая работа', 'Неопределённость и риски', 'Другое'] },
        ],
      },
      {
        id: '1.3',
        title: 'Ограничения и non-negotiables',
        questions: [
          { id: 'q6', label: 'Жёсткие ограничения (что НЕ готова принести в жертву)', type: 'compound', fields: [
            { key: 'life', label: 'Личная жизнь/семья', type: 'text' },
            { key: 'health', label: 'Здоровье', type: 'text' },
            { key: 'time', label: 'Время (например: не хочу работать >50 ч/нед)', type: 'text' },
            { key: 'geo', label: 'География (где хочу жить)', type: 'text' },
            { key: 'other', label: 'Другое', type: 'text' },
          ]},
          { id: 'q7', label: 'Риск-профиль', type: 'radio', options: ['Консервативный: стабильность, не готова рисковать', 'Умеренный: готова к рискам с подстраховкой', 'Агрессивный: all-in, высокие риски ради результата'] },
        ],
      },
      {
        id: '1.4',
        title: 'Три сценария моего будущего',
        questions: [
          { id: 'scenario_a', label: 'Сценарий A (консервативный): что делаю, как зарабатываю, с кем работаю, как живу.', type: 'textarea', placeholder: '3–5 предложений' },
          { id: 'scenario_b', label: 'Сценарий B (умеренный/реалистичный)', type: 'textarea', placeholder: '3–5 предложений' },
          { id: 'scenario_c', label: 'Сценарий C (амбициозный/мечта)', type: 'textarea', placeholder: '3–5 предложений' },
          { id: 'scenario_favorite', label: 'Какой сценарий больше всего волнует (в хорошем смысле)?', type: 'radio', options: ['A', 'B', 'C'] },
        ],
      },
    ],
  },
  {
    id: 2,
    title: 'Часть 2: Бизнес-видение',
    subtitle: '30 мин',
    blocks: [
      {
        id: '2.1',
        title: 'Моя Winning Aspiration',
        questions: [
          { id: 'q8', label: 'Если стартап станет успешным, что это будет значить лично для тебя через 5 лет?', type: 'compound', fields: [
            { key: 'fin', label: 'Финансово', type: 'text' },
            { key: 'prof', label: 'Профессионально (репутация, экспертность)', type: 'text' },
            { key: 'emot', label: 'Эмоционально (гордость, удовлетворение)', type: 'text' },
            { key: 'pract', label: 'Практически (образ жизни, свобода)', type: 'text' },
          ]},
          { id: 'q9', label: 'Главная амбиция для этого проекта', type: 'radio', options: ['Lifestyle business: стабильный доход, контроль, без масштабирования', 'Growth business: рост, новые рынки, команда 10–50', 'Venture-backed startup: инвестиции, быстрый рост, exit/unicorn', 'Social impact: влияние и миссия важнее денег', 'Не уверена / хочу попробовать и понять'] },
        ],
      },
      {
        id: '2.2',
        title: 'Where will we play?',
        questions: [
          { id: 'q10', label: 'Идеальный клиент', type: 'compound', fields: [
            { key: 'size', label: 'Размер компаний', type: 'text' },
            { key: 'geo', label: 'География', type: 'text' },
            { key: 'industry', label: 'Индустрия', type: 'text' },
            { key: 'how', label: 'Как хочу работать (удалённо/очно/гибрид)', type: 'text' },
          ]},
          { id: 'q11', label: 'Масштаб бизнеса через 3 года', type: 'compound', fields: [
            { key: 'team', label: 'Команда, чел.', type: 'text' },
            { key: 'turnover', label: 'Годовой оборот, USD', type: 'text' },
            { key: 'clients', label: 'Количество клиентов', type: 'text' },
            { key: 'model', label: 'Модель (проект/продукт/SaaS/другое)', type: 'text' },
          ]},
        ],
      },
      {
        id: '2.3',
        title: 'How will we win?',
        questions: [
          { id: 'q12', label: 'Какую работу хочу делать ЛИЧНО в этом бизнесе? (расставь 1–5: продуктовая стратегия, фасилитация, продажи, маркетинг, управление командой, разработка методологии, обучение, другое)', type: 'textarea', placeholder: '1. ... 2. ... 3. ...' },
          { id: 'q13', label: 'Что хочу делегировать / НЕ делать', type: 'compound', fields: [
            { key: 'delegate', label: 'Первым делом делегирую', type: 'text' },
            { key: 'never', label: 'Никогда не хочу делать', type: 'text' },
          ]},
        ],
      },
      {
        id: '2.4',
        title: 'What must be in place?',
        questions: [
          { id: 'q14', label: 'Чтобы выиграть, нужно построить (выбери подходящее)', type: 'multicheck', options: ['Сильный бренд и репутацию', 'Большую клиентскую базу', 'Уникальную методологию/IP', 'Технологический продукт', 'Команду экспертов', 'Партнёрскую сеть', 'Другое'] },
          { id: 'q15_hours', label: 'Готова работать, часов в неделю (первые 1–2 года)', type: 'number', placeholder: '...' },
          { id: 'q15_money', label: 'Готова инвестировать лично, USD (или 0)', type: 'number', placeholder: '...' },
          { id: 'q15_months', label: 'Готова работать без прибыли максимум, мес.', type: 'number', placeholder: '...' },
        ],
      },
      {
        id: '2.5',
        title: "What's the price?",
        questions: [
          { id: 'q16', label: 'Что готова принести в жертву ради успеха?', type: 'compound', fields: [
            { key: 'time', label: 'Личное время', type: 'text' },
            { key: 'income', label: 'Стабильный доход', type: 'text' },
            { key: 'opportunities', label: 'Другие возможности', type: 'text' },
            { key: 'comfort', label: 'Комфорт', type: 'text' },
          ]},
          { id: 'q17', label: 'Что НЕ готова принести в жертву ни при каких обстоятельствах', type: 'textarea', placeholder: '...' },
        ],
      },
    ],
  },
  {
    id: 3,
    title: 'Часть 3: Сценарный анализ',
    subtitle: '20 мин',
    blocks: [
      {
        id: '3.1',
        title: 'Сценарий SUCCESS (стартап вырос и успешен)',
        questions: [
          { id: 'q18a', label: 'Как я себя чувствую в этом сценарии? (эмоции, энергия, удовлетворение)', type: 'textarea', placeholder: '...' },
          { id: 'q18b', label: 'Что я приобрела? (профессионально, финансово, личностно)', type: 'textarea', placeholder: '...' },
          { id: 'q18c', label: 'Что я потеряла или чем пожертвовала?', type: 'textarea', placeholder: '...' },
          { id: 'q18d', label: 'Стоило ли оно того?', type: 'radio', options: ['Да', 'Нет', 'Зависит от того...'] },
        ],
      },
      {
        id: '3.2',
        title: 'Сценарий STAGNATION (топчемся на месте)',
        questions: [
          { id: 'q19a', label: 'Как я себя чувствую в этом сценарии?', type: 'textarea', placeholder: '...' },
          { id: 'q19b', label: 'Что я потеряла за эти 3 года? (возможности, ресурсы, другое)', type: 'textarea', placeholder: '...' },
          { id: 'q19c', label: 'Мой следующий шаг в этой ситуации', type: 'radio', options: ['Продолжаю пытаться, ищу новые подходы', 'Закрываю проект и иду дальше', 'Превращаю в lifestyle-бизнес без амбиций на рост', 'Другое'] },
        ],
      },
      {
        id: '3.3',
        title: 'Сценарий FAILURE (провал, закрыли проект)',
        questions: [
          { id: 'q20a', label: 'Как я себя чувствую, оглядываясь назад?', type: 'radio', options: ['Сожалею, что попробовала', 'Не жалею — получила опыт', 'Злюсь и разочарована', 'Рада, что быстро поняла и переключилась', 'Другое'] },
          { id: 'q20b', label: 'Чему я научилась?', type: 'textarea', placeholder: '...' },
          { id: 'q20c', label: 'Стоило ли пробовать?', type: 'radio', options: ['Да, точно стоило', 'Нет, лучше бы не начинала', 'Зависит от того, сколько времени/денег потеряла'] },
        ],
      },
      {
        id: '3.4',
        title: 'Финальный вопрос',
        questions: [
          { id: 'q21', label: 'Какой сценарий больше всего пугает?', type: 'radio', options: ['SUCCESS', 'STAGNATION', 'FAILURE'] },
          { id: 'q21_why', label: 'Почему?', type: 'textarea', placeholder: '...' },
        ],
      },
    ],
  },
]
