**Ім'я:** Oleh Zharovskyi  
**Проєкт:** AI Vocabulary Learning App with SRS (Spaced Repetition System)  
**Де код:** [`main` branch](https://github.com/zharovskyi/words-tolearn)  
**Відео-демо (1–2 хв):** [LINK_TO_DEMO_VIDEO]  
**Посилання:** https://words-tolearn.vercel.app/  

### Застосовані практики Agentic Engineering

- **Контекст-інженерія (правила / AGENTS.md, статичний vs динамічний контекст) — доказ:**  
  У `AGENTS.md` задано правила для агента: стек, практики App Router (Server Actions в окремій папці `actions/`, Server Components за замовчуванням, `"use client"` лише за потреби), стандарти коду (без `any`, виправляти помилки TypeScript перед наступним завданням) та вимога читати `docs/prd.md` перед створенням схем і фіч. Блок про Next.js у тому ж файлі змушує агента читати документацію з `node_modules/next/dist/docs/` (версія 16.3.8 має зміни, яких агент не знає). Захист `.env` винесено в `.claude/settings.json` та `.claudeignore` (агенту заборонено читати `.env`). Статичний контекст: `AGENTS.md`, `docs/prd.md`, специфікації в `openspec/`. Динамічний контекст: поточні завдання в `tasks.md`, стан Git і виводи `npm run verify`.  
  Коміти: [`e6c86ed`](https://github.com/zharovskyi/words-tolearn/commit/e6c86ed) (PRD та правила в `AGENTS.md`), [`e27514b`](https://github.com/zharovskyi/words-tolearn/commit/e27514b) (`.claude/settings.json`, `.claudeignore`).

- **Цикли (loop engineering) замість покрокового промптингу — доказ:**  
  Єдиний скрипт `npm run verify` (`prisma validate`, `prisma generate`, `tsc --noEmit`, `lint`, Vitest, `next build`) запускався перед кожним комітом. Агент повторював цикл «запуск → помилка → виправлення → повторний запуск», доки скрипт не завершувався з кодом 0. Приклади з історії роботи: помилка типів після додавання Vitest, правило ESLint, яке сприймало `useTurso` як React-хук (функцію перейменовано), помилка типу у скрипті міграції Turso.  
  Коміти: [`09ca8c6`](https://github.com/zharovskyi/words-tolearn/commit/09ca8c6) (скрипт `verify` уперше), [`51bd843`](https://github.com/zharovskyi/words-tolearn/commit/51bd843) (тести додано до `verify`), [`ab48c41`](https://github.com/zharovskyi/words-tolearn/commit/ab48c41) (виправлення ESLint і типів у Turso-скрипті).

- **Верифікація (тести / evals / перевірки) — доказ:**  
  Кількість тестів зросла з 16 до 87 (7 тестових файлів). Інтеграційні тести працюють на тимчасовій базі SQLite, яка створюється з реальних міграцій для кожного тестового файлу, тому `dev.db` не зачіпається. AI-крок тестується з мокнутою моделлю. Окремо проведено мутаційну перевірку вручну: 6 навмисних поломок (інтервал, порядок черги, перевірка «ще не час», причина архівації, захист від дублікатів, кількість прикладів), кожну з яких виявив хоча б один тест. Також перевірено, що production-збірка (`.next/static`) не містить API-ключів.  
  Коміти: [`51bd843`](https://github.com/zharovskyi/words-tolearn/commit/51bd843) (перші 12 тестів логіки SRS), [`eff5ca1`](https://github.com/zharovskyi/words-tolearn/commit/eff5ca1) (інтеграційні тести, 76 тестів), [`ab48c41`](https://github.com/zharovskyi/words-tolearn/commit/ab48c41) та [`aaa415a`](https://github.com/zharovskyi/words-tolearn/commit/aaa415a) (тести Turso-URL і fail-safe, разом 87).

- **maker ≠ checker (окремий агент або прохід на рев'ю) — доказ:**  
  Розділення ролей: Claude Code виконував роль Maker (код, міграції, тести, мутаційна перевірка, виправлення помилок), а користувач — Checker: ручне наскрізне тестування UI в браузері (додавання слів, генерація ШІ, кнопки повторення, навігація, архів), створення ключа Gemini API та бази Turso, ухвалення рішень за пропозиціями агента. Окремого другого агента-рецензента не було.  
  Коміти: [`137a81d`](https://github.com/zharovskyi/words-tolearn/commit/137a81d) (етап 8 у журналі: ручне E2E-тестування користувачем).

- **Специфікації наперед (SDD) — доказ:**  
  Розробку почато з OpenSpec-зміни `add-vocabulary-srs-core` (proposal, design, 4 специфікації, tasks), яку було створено до написання коду. Вимоги, додані під час реалізації (автокорекція написання, навігація й сторінка «How it works», порядок забутих слів у черзі), занесено до специфікацій уже після реалізації, під час синхронізації. Зміну провалідовано через `openspec validate --strict` і заархівовано як `2026-10-01-add-vocabulary-srs-core`; у `openspec/specs/` тепер 5 специфікацій.  
  Коміти: [`e27514b`](https://github.com/zharovskyi/words-tolearn/commit/e27514b) (пропозиція, дизайн, специфікації, завдання), [`137a81d`](https://github.com/zharovskyi/words-tolearn/commit/137a81d) (синхронізація, валідація, архівація).

- **Журнал рівнів довіри — доказ:**  
  Файл `docs/trust_journal.md` містить 10 етапів розробки з рівнем довіри (від Medium до High), обґрунтуванням, хешами комітів і обмеженнями. Зокрема в ньому зафіксовано інцидент, коли тестовий скрипт агента видалив слово користувача з локальної бази.  
  Коміти: [`2c876f2`](https://github.com/zharovskyi/words-tolearn/commit/2c876f2) (створення журналу), [`fab294e`](https://github.com/zharovskyi/words-tolearn/commit/fab294e) (етапи 2–3), [`8631181`](https://github.com/zharovskyi/words-tolearn/commit/8631181) (етапи 4–7), [`137a81d`](https://github.com/zharovskyi/words-tolearn/commit/137a81d) (етапи 8–9), [`eff5ca1`](https://github.com/zharovskyi/words-tolearn/commit/eff5ca1) (етап 10).

- **Project Factory — доказ:**  
  Стандартизована структура проєкту: Next.js 16.3.8 (App Router), React 19, Prisma 7.10.0, Tailwind CSS 4, README із запуском, `.env.example`, міграції Prisma та скрипт `scripts/turso-migrate.ts` (`npm run db:turso`) для застосування міграцій до Turso. Окремого CI-конвеєра немає: перевірка запускається локально через `npm run verify`.  
  Коміти: [`09ca8c6`](https://github.com/zharovskyi/words-tolearn/commit/09ca8c6) (схема Prisma та міграція), [`ab48c41`](https://github.com/zharovskyi/words-tolearn/commit/ab48c41) (Turso, `scripts/turso-migrate.ts`, `.env.example`), [`137a81d`](https://github.com/zharovskyi/words-tolearn/commit/137a81d) (README).

- **Інше — доказ:**  
  Безпека й надійність: перевірка збірки на витік ключів, fail-safe в `lib/db.ts` (у production без `DATABASE_URL_LIBSQL` застосунок кидає зрозумілу помилку, а не переходить на локальний файл; перевірено запуском production-сервера з URL і без нього), підтримка Turso (libSQL) для хмарної бази, автокорекція написання слів із захистом від підміни слова (відстань редагування).  
  Коміти: [`aaa415a`](https://github.com/zharovskyi/words-tolearn/commit/aaa415a) (fail-safe), [`ab48c41`](https://github.com/zharovskyi/words-tolearn/commit/ab48c41) (Turso), [`27320f9`](https://github.com/zharovskyi/words-tolearn/commit/27320f9) (автокорекція).  
  Відомий відхід від `AGENTS.md`: правило вимагає полів `nextReviewDate` (DateTime), `intervalLevel` (Int) і `contextSentences` (JSON), а в схемі вони називаються `dueDate` (рядок `YYYY-MM-DD` у часовому поясі застосунку, щоб інтервали в днях не залежали від UTC і літнього часу), `level` та окрема таблиця `Example` (по одному рядку на речення з порядком `position`). Це відповідність за змістом, а не за назвами; її задокументовано в `AGENTS.md`.

### Інструменти та MCP
Next.js 16.3.8 (App Router), React 19, TypeScript, Tailwind CSS 4, SQLite, Turso (libSQL), Prisma 7.10.0, Vitest 5, Vercel AI SDK, Google Gemini API (`@ai-sdk/google`, модель `gemini-3.5-flash-lite`), OpenSpec CLI, Claude Code (розширення VS Code). MCP-сервери не використовувались.

### Що вирішував(ла) я, а що агент
- **Я (Людина / Checker):** ідея продукту та вимоги (`docs/prd.md`, правила в `AGENTS.md`), вибір стеку, затвердження плану та кожного наступного кроку, рівні довіри для етапів 1–3, ключ Gemini API і база Turso, ручне наскрізне тестування UI в браузері, рішення залишити в розробці локальну базу, а Turso вмикати лише в production.
- **Агент (Claude Code / Maker):** вибір стабільної Prisma 7.10.0 замість release candidate 8.0, схема бази й міграція, Server Actions, логіка SRS, інтеграція Gemini, інтерфейс, скрипт `npm run verify`, 71 новий тест і мутаційна перевірка, скрипт `turso-migrate.ts`, fail-safe в `lib/db.ts`, OpenSpec-документи, README, `trust_journal.md`, рівні довіри для етапів 4–7, 9 і 10.

### Перевірка
```text
$ npm run verify
prisma validate      -> The schema at prisma/schema.prisma is valid
prisma generate      -> Prisma Client generated
tsc --noEmit         -> без помилок
eslint               -> без помилок
vitest run           -> Test Files 7 passed (7); Tests 87 passed (87)
next build           -> Compiled successfully; TypeScript пройдено
exit code            -> 0

Тести за файлами:
  actions/word-actions.integration.test.ts   26
  lib/srs/review.integration.test.ts         21
  lib/ai/enrich.test.ts                      13
  lib/srs/schedule.test.ts                   12
  lib/db-config.test.ts                       8
  lib/text.test.ts                            4
  lib/libsql-url.test.ts                      3

Остання перевірка: git status — чисто; HEAD = aaa415a
https://words-tolearn.vercel.app/ -> HTTP 200
```
