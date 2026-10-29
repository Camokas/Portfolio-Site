# Camoka — Portfolio

Мультимедийное портфолио на Astro с публикацией через GitHub Pages.

- [Руководство по наполнению](CONTENT_GUIDE.md) — начните здесь.
- [Минимальный шаблон проекта](templates/project-minimal.mdx).
- [Полный шаблон с медиаблоками](templates/project-full.mdx).
- [Живой пример со всеми возможностями](src/content/projects/demo-game-prototype.mdx).
- [Публикация сайта](DEPLOYMENT.md).

Тексты главной: `src/data/home.ts`. Контакты: `src/data/contactLinks.ts`.
Направления: `src/data/directions.ts`. Работы: `src/content/projects/`.
Все локальные файлы работы: `public/projects/категория/проект/` (уровней вложенности может быть больше или меньше).
В настройках любой тип медиа использует такой же путь без `public/`: `projects/категория/проект/файл.ext`.

Локальный просмотр: `server.bat` → 1, затем адрес из вывода сервера
(обычно `http://localhost:4321/Portfolio-Site/`). Остановка: `server.bat` → 2.
Проверка перед отправкой: `npm run build`. Новые зависимости для наполнения не нужны.

