// Personal experience, not product descriptions. Dates are approximate first use.
// Keep English/Russian together; the language switch reads these same translations.
const t = (en: string, ru: string) => ({ en, ru });
export type SoftwareGroup = "engines" | "3d" | "video" | "graphics-audio" | "capture" | "workflow";
export interface Software {
	slug: string;
	title: string;
	group: SoftwareGroup;
	status: "In use" | "Occasional use" | "Used previously" | "Learning";
	firstUsed?: { en: string; ru: string };
	summary: { en: string; ru: string };
	experience: { en: string; ru: string }[];
	focus: { en: string; ru: string }[];
	projectIds?: string[];
}
export const softwareGroups = [
	{ id: "engines", title: t("Game engines", "Игровые движки") },
	{ id: "3d", title: t("3D & texturing", "3D и текстурирование") },
	{ id: "video", title: t("Video & motion", "Монтаж и анимационная графика") },
	{ id: "graphics-audio", title: t("Graphics & audio", "Графика и звук") },
	{ id: "capture", title: t("Recording & streaming", "Запись и стримы") },
	{ id: "workflow", title: t("Code & organisation", "Код и организация работы") },
] as const;
export const software: Software[] = [
	{
		slug: "unity", title: "Unity", group: "engines", status: "In use", firstUsed: t("~2021–2022", "~2021–2022"),
		summary: t("My main game engine: scenes, prefabs, animation, interfaces, and shaders.", "Мой основной игровой движок: сцены, префабы, анимации, интерфейсы и шейдеры."),
		experience: [
			t("I moved from Unreal Engine 4 to Unity for mobile development and a more approachable workflow. I build scenes and complex prefabs, connect gameplay components, configure Animator graphs, and work with materials, lighting, physics, and builds.", "Я перешёл с Unreal Engine 4 на Unity ради мобильной разработки и более понятного рабочего процесса. Собираю сцены и комплексные префабы, связываю игровые компоненты, настраиваю Animator и работаю с материалами, освещением, физикой и сборками."),
			t("Most of my shader work uses URP and Shader Graph. Early experiments followed tutorials; later I assembled effects more independently. I also use open-source packages and scripts to automate routine work. AI assistance became part of my coding workflow later on.", "Основная работа с шейдерами — URP и Shader Graph. Ранние эксперименты делал по урокам, позднее стал самостоятельнее собирать эффекты. Использую открытые пакеты и скрипты для автоматизации рутины. Позже к работе над кодом добавилась помощь ИИ."),
		], focus: [t("Scenes & prefabs", "Сцены и префабы"), t("Animator & UI", "Animator и интерфейсы"), t("Shader Graph", "Shader Graph")],
		projectIds: ["animation/buildest-ui-animation", "animation/misform-first-person-animation", "shaders/firstbuildest/firstbuildest-settingsshader"],
	},
	{
		slug: "unreal-engine-4", title: "Unreal Engine 4", group: "engines", status: "Used previously", firstUsed: t("~2019", "~2019"),
		summary: t("My starting point in game development: scenes, Blueprints, and simple cutscenes.", "Начало моего пути в разработке игр: сцены, Blueprints и небольшие кат-сцены."),
		experience: [t("From September 2019 to late 2021, I assembled scenes from assets and my own models, set up triggers, and made small Blueprint scripts and cutscenes. Tutorials and ready-made assets were an important part of learning. I later moved to Unity; my Unreal skills would need refreshing today.", "С сентября 2019 до конца 2021 я собирал сцены из ассетов и своих моделей, настраивал триггеры, создавал небольшие Blueprint-скрипты и кат-сцены. Учился в том числе по урокам и на готовых ассетах. Затем перешёл на Unity; сейчас навыки Unreal потребовали бы восстановления.")],
		focus: [t("Scene assembly", "Сборка сцен"), t("Blueprints", "Blueprints"), t("Cutscenes", "Кат-сцены")],
	},
	{
		slug: "blender", title: "Blender", group: "3d", status: "In use", firstUsed: t("~2020", "~2020"),
		summary: t("My main 3D tool for original models, UVs, animation, and game-ready exports.", "Основной 3D-инструмент: собственные модели, UV, анимации и подготовка объектов для игр."),
		experience: [
			t("I model from references, simplify meshes, check topology and normals, and prepare UVs with automatic tools and manual refinement. I also edit existing models and create animations. Plugins speed up the process, while the modelling decisions remain mine; I do not use AI for my 3D modelling.", "Моделирую по референсам, упрощаю сетки, проверяю топологию и нормали, готовлю UV автоматическими инструментами с ручной доработкой. Также редактирую готовые модели и создаю анимации. Плагины ускоряют процесс, но решения по моделированию принимаю сам; ИИ для 3D-моделирования не использую."),
			t("My current workflow can continue into Substance Painter, then back to Blender to inspect textures under different lighting. Modelling and UV work are stronger areas for me than baking, skeletal animation, or advanced material work.", "Мой текущий процесс может продолжаться в Substance Painter, после чего я проверяю текстуры в Blender под разным освещением. Моделирование и UV освоены увереннее, чем запекание, скелетная анимация и сложная работа с материалами."),
		], focus: [t("Modelling & topology", "Моделирование и топология"), t("UV preparation", "Подготовка UV"), t("Animation & export", "Анимация и экспорт")],
		projectIds: ["animation/buildest-first-person-hands"],
	},
	{
		slug: "substance-painter", title: "Adobe Substance Painter", group: "3d", status: "Learning", firstUsed: t("~2026", "~2026"),
		summary: t("Layer-based texturing for my models, with a particular interest in PS1-style work.", "Послойное текстурирование своих моделей с особым интересом к стилистике PS1."),
		experience: [t("I started in August 2026 to make texturing more comfortable than my earlier Blender and Photoshop workflow. I combine materials, masks, and decals on a model and export the resulting textures. I can texture a straightforward model independently; building my own materials and deeper settings are still areas I am learning.", "Начал в августе 2026, чтобы сделать текстурирование удобнее прежнего процесса в Blender и Photoshop. Сочетаю материалы, маски и декали на модели, затем экспортирую текстуры. Несложную модель могу протекстурировать самостоятельно; создание своих материалов и глубокие настройки ещё осваиваю.")],
		focus: [t("Layers & masks", "Слои и маски"), t("Material blending", "Смешивание материалов"), t("Texture export", "Экспорт текстур")],
	},
	{
		slug: "cinema-4d", title: "Cinema 4D", group: "3d", status: "Used previously", firstUsed: t("~2019", "~2019"),
		summary: t("Early modelling, simulation experiments, and renders with ready-made Minecraft rigs.", "Раннее моделирование, эксперименты с симуляциями и рендеры с готовыми Minecraft-ригами."),
		experience: [t("I used Cinema 4D for simple models, early Unreal projects, and experiments with fire, smoke, and water. I also posed ready-made Minecraft rigs with my own skin, mainly for still renders. I learned through tutorials and experiments before moving to Blender; this is earlier experience rather than current practice.", "Использовал Cinema 4D для простых моделей, ранних Unreal-проектов и экспериментов с огнём, дымом и водой. Также выставлял позы готовым Minecraft-ригам со своим скином, преимущественно для статичных рендеров. Учился по урокам и экспериментировал, затем перешёл на Blender. Это прежний опыт, а не текущая практика.")],
		focus: [t("Simple models", "Простые модели"), t("Simulation experiments", "Эксперименты с симуляциями"), t("Still renders", "Статичные рендеры")],
	},
	{
		slug: "magica-voxel", title: "MagicaVoxel", group: "3d", status: "Used previously",
		summary: t("Small voxel models, basic colouring, and experiments with the built-in renderer.", "Небольшие воксельные модели, базовая покраска и эксперименты со встроенным рендером."),
		experience: [t("I discovered MagicaVoxel shortly after Cinema 4D. Its accessible tools let me make small original voxel objects after a few lessons. I liked the style and renderer, but the meshes from my export workflow needed more simplification than I wanted. I now prefer Blender for this work.", "Познакомился с MagicaVoxel вскоре после Cinema 4D. После нескольких уроков доступные инструменты позволяли создавать небольшие собственные воксельные объекты. Нравились стиль и рендер, но сетки после моего экспорта требовали лишнего упрощения. Сейчас для таких задач предпочитаю Blender.")],
		focus: [t("Voxel modelling", "Воксельное моделирование"), t("Basic colouring", "Базовая покраска"), t("Export", "Экспорт")],
	},
	{
		slug: "premiere-pro", title: "Adobe Premiere Pro", group: "video", status: "In use", firstUsed: t("~2021", "~2021"),
		summary: t("My main editor for selecting footage and turning long recordings into finished videos.", "Основной монтажный редактор для отбора материала и сборки длинных записей в готовые ролики."),
		experience: [t("I moved from Vegas to Premiere for my later editing work: long gameplay recordings, commissions, Shorts, and trailers. I organise projects with bins, markers, and nested sequences, then refine cuts, timing, basic colour, and sound levels. More involved graphics go to After Effects. Advanced grading and audio mixing have not been my main practice.", "После Vegas я перешёл на Premiere: длинные игровые записи, заказы, Shorts и трейлеры. Организую проекты через папки, маркеры и вложенные последовательности, затем дорабатываю склейки, тайминг, базовый цвет и уровни звука. Более сложную графику делаю в After Effects. Глубокий грейдинг и сведение звука не были моей основной практикой.")],
		focus: [t("Selection & pacing", "Отбор и темп"), t("Long-form editing", "Монтаж длинных видео"), t("Project organisation", "Организация проекта")],
		projectIds: ["videoediting/commissioned-video-editing", "videoediting/camoka-youtube-gamedev"],
	},
	{
		slug: "after-effects", title: "Adobe After Effects", group: "video", status: "In use", firstUsed: t("~2019", "~2019"),
		summary: t("Animation, motion design, masks, and tracking for my videos and game-related visuals.", "Анимация, моушен-дизайн, маски и трекинг для видео и графики игровых проектов."),
		experience: [
			t("Animation is the part I enjoy most. I work with keyframes, speed graphs, masks, tracking, and plugins for intros and visual explanations. Before switching to Premiere, I rendered AE sequences for assembly in Vegas. Working on limited hardware taught me to reduce preview quality and unnecessary effects.", "Больше всего люблю анимацию. Работаю с ключами, графиками скорости, масками, трекингом и плагинами для заставок и визуальных объяснений. До перехода на Premiere рендерил фрагменты AE для сборки в Vegas. Ограниченная мощность ПК приучила снижать качество предпросмотра и убирать лишние эффекты."),
			t("I handle familiar animation tasks independently. Expressions are a weaker area: the audio-reactive music template used AI-assisted expressions, while I created the composition and its visual treatment.", "Привычные анимационные задачи решаю самостоятельно. Выражения — менее освоенная область: в музыкальном шаблоне использовались выражения с помощью ИИ, а композицию и её визуальное оформление создавал я."),
		], focus: [t("Keyframe animation", "Ключевая анимация"), t("Masks & tracking", "Маски и трекинг"), t("Motion design", "Моушен-дизайн")],
		projectIds: ["motiondesign/telegram-channel-promo", "motiondesign/nullstudio-animated-intros", "videoediting/camoka-youtube-gamedev"],
	},
	{
		slug: "media-encoder", title: "Adobe Media Encoder", group: "video", status: "In use",
		summary: t("Export queues, presets, and format conversion throughout my Adobe editing workflow.", "Очереди экспорта, пресеты и преобразование форматов в моём монтажном процессе Adobe."),
		experience: [t("I started using Media Encoder soon after After Effects. It handles exports from AE and Premiere, queues, alternate versions, and source conversion. I choose settings for the intended platform and adjust file size, render time, and compatibility to the task.", "Начал пользоваться Media Encoder вскоре после After Effects. Через него вывожу AE и Premiere, собираю очереди, разные версии и перекодирую исходники. Подбираю настройки под площадку и задачу: вес файла, время вывода и совместимость.")],
		focus: [t("Export queues", "Очереди экспорта"), t("Presets & formats", "Пресеты и форматы"), t("Transcoding", "Перекодирование")],
		projectIds: ["videoediting/camoka-youtube-gamedev"],
	},
	{
		slug: "vegas-pro", title: "VEGAS Pro", group: "video", status: "Used previously", firstUsed: t("2018 or earlier", "2018 или раньше"),
		summary: t("My early editing tool for gameplay montages, sound, simple effects, and transitions.", "Мой ранний монтажный инструмент: игровые нарезки, звук, простые эффекты и переходы."),
		experience: [t("Vegas was where I learned to select and assemble longer recordings, add text and graphics, adjust sound and colour, and export videos. I combined it with rendered After Effects sequences for a while. It felt more manageable on my older PC; after moving fully to Premiere, I stopped using it.", "В Vegas я учился отбирать и собирать длинные записи, добавлять текст и графику, корректировать звук и цвет, выводить видео. Некоторое время сочетал его с готовыми фрагментами After Effects. На старом ПК он казался удобнее; после окончательного перехода на Premiere перестал им пользоваться.")],
		focus: [t("Gameplay montages", "Игровые нарезки"), t("Sound & transitions", "Звук и переходы"), t("Early editing practice", "Ранний опыт монтажа")],
		projectIds: ["videoediting/game-highlights-era"],
	},
	{
		slug: "capcut", title: "CapCut", group: "video", status: "Occasional use",
		summary: t("Quick cuts and subtitles for simple, often personal videos.", "Быстрая нарезка и субтитры для простых, часто личных видео."),
		experience: [t("I have used CapCut on mobile and later on desktop for quick assembly and subtitles. It fills a lighter role in my workflow when I want to put a straightforward video together quickly; my more involved editing work is centred on Premiere and After Effects.", "Использовал CapCut на телефоне, позднее — на ПК, для быстрой сборки и субтитров. Он занимает небольшую нишу, когда нужно быстро собрать простой ролик. Более сложные монтажные работы делаю преимущественно в Premiere и After Effects.")],
		focus: [t("Quick assembly", "Быстрая сборка"), t("Subtitles", "Субтитры")],
	},
	{
		slug: "photoshop", title: "Adobe Photoshop", group: "graphics-audio", status: "In use",
		summary: t("Thumbnails, graphics, textures, interfaces, and image compositing.", "Обложки, графика, текстуры, интерфейсы и композиции из изображений."),
		experience: [t("Photoshop is my usual tool for image work: selections, masks, retouching, composition, text, and colour. I often assemble and rework source images into a final design; pixel art is something I also create from scratch. I use it alongside my video and game workflows.", "Photoshop — мой привычный инструмент для изображений: выделение, маски, ретушь, композиция, текст и цвет. Часто собираю и перерабатываю исходники в итоговое оформление; пиксель-арт также создаю с нуля. Использую его вместе с монтажными и игровыми инструментами.")],
		focus: [t("Image compositing", "Композиция изображений"), t("Thumbnails & graphics", "Обложки и графика"), t("Pixel art", "Пиксель-арт")],
	},
	{
		slug: "adobe-audition", title: "Adobe Audition", group: "graphics-audio", status: "In use", firstUsed: t("~2022–2023", "~2022–2023"),
		summary: t("Basic voice cleanup and editing game sounds from existing audio sources.", "Базовая чистка голоса и подготовка игровых звуков из готовых исходников."),
		experience: [t("I moved from Audacity to Audition for voice editing and the Adobe workflow. I reduce noise, adjust EQ, cut and join recordings, and reuse processing chains. For IsLands, I also assembled sounds for blocks, creatures, and UI from CC0 sources. My audio knowledge is practical and limited; unfamiliar processing often starts with a tutorial.", "Перешёл с Audacity на Audition ради обработки голоса и процесса Adobe. Уменьшаю шум, настраиваю эквалайзер, режу и склеиваю записи, повторно использую цепочки обработки. Для IsLands также собирал звуки блоков, существ и интерфейса из CC0-исходников. Знания звука практические и ограниченные; незнакомую обработку часто начинаю с урока.")],
		focus: [t("Voice cleanup", "Чистка голоса"), t("Audio editing", "Монтаж звука"), t("Reusable processing", "Повторяемая обработка")],
		projectIds: ["videoediting/camoka-youtube-gamedev", "videoediting/commissioned-video-editing"],
	},
	{
		slug: "audacity", title: "Audacity", group: "graphics-audio", status: "Used previously", firstUsed: t("~2020–2021", "~2020–2021"),
		summary: t("My first audio editor for home recordings and basic cleanup.", "Первый звуковой редактор для домашних записей и базовой чистки."),
		experience: [t("I used Audacity to work on home recordings and try straightforward noise and echo reduction methods from tutorials. It was an introduction to audio editing before I switched to Audition. My experience here stayed at the level of those practical tasks.", "В Audacity я работал с домашними записями и пробовал простые способы уменьшения шума и эха по урокам. Он познакомил меня с обработкой звука до перехода на Audition. Опыт остался в пределах этих практических задач.")],
		focus: [t("Home recordings", "Домашние записи"), t("Basic cleanup", "Базовая чистка")],
	},
	{
		slug: "fl-studio", title: "FL Studio", group: "graphics-audio", status: "In use", firstUsed: t("~2019–2020", "~2019–2020"),
		summary: t("Simple original electronic music, composed by ear for my projects.", "Несложная собственная электронная музыка, которую пишу на слух для проектов."),
		experience: [t("I explored FL Studio around 2019–2020 and began learning more actively in 2024 with Adventure for Buildest. I build my own melodies and arrangements, experiment with synthesisers, and automate parameters. I do not rely on ready-made loops. My approach is intuitive; music theory and detailed synth design are still limited areas.", "Познакомился с FL Studio примерно в 2019–2020, а активнее начал изучать в 2024 с треком Adventure для Buildest. Собираю свои мелодии и аранжировки, экспериментирую с синтезаторами и автоматизацией параметров. Готовые лупы не использую. Подход интуитивный; музыкальной теории и глубокого знания синтезаторов пока немного.")],
		focus: [t("Original melodies", "Собственные мелодии"), t("Electronic arrangements", "Электронные аранжировки"), t("Parameter automation", "Автоматизация параметров")],
		projectIds: ["videoediting/camoka-youtube-gamedev"],
	},
	{
		slug: "obs", title: "OBS Studio", group: "capture", status: "In use", firstUsed: t("~2017–2018", "~2017–2018"),
		summary: t("Gameplay and desktop capture, scene setup, and streaming.", "Запись геймплея и рабочего стола, настройка сцен и стримы."),
		experience: [t("I started with gameplay recording, then used OBS for Unity, individual windows, and my working process. I configure video and audio sources, overlays, filters, and output settings, balancing codec, bitrate, quality, and PC load. I also had a period of streaming and briefly used Streamlabs OBS.", "Начинал с записи геймплея, затем использовал OBS для Unity, отдельных окон и рабочего процесса. Настраиваю источники видео и звука, наложения, фильтры и вывод, подбирая кодек, битрейт и качество под нагрузку ПК. Также был период стримов и небольшой опыт Streamlabs OBS.")],
		focus: [t("Screen capture", "Запись экрана"), t("Scenes & sources", "Сцены и источники"), t("Streaming", "Стримы")],
		projectIds: ["videoediting/camoka-youtube-gamedev"],
	},
	{
		slug: "visual-studio", title: "Visual Studio", group: "workflow", status: "In use", firstUsed: t("With my first Unity projects", "С первых проектов Unity"),
		summary: t("My familiar IDE for Unity C# scripts and small Windows utilities.", "Привычная IDE для C#-скриптов Unity и небольших Windows-утилит."),
		experience: [t("I have used Visual Studio since starting Unity: gameplay and utility scripts, small C# and WinForms programs, and work with JSON. It became a familiar environment for writing and building code. My experience is concentrated on Unity and smaller C# applications rather than the full range of development the IDE supports.", "Использую Visual Studio с начала знакомства с Unity: игровые и служебные скрипты, небольшие программы на C# и WinForms, работа с JSON. Она стала привычной средой написания и сборки кода. Опыт сосредоточен на Unity и небольших C#-приложениях, а не на всём спектре разработки, который поддерживает IDE.")],
		focus: [t("Unity C#", "C# для Unity"), t("Small Windows utilities", "Небольшие Windows-утилиты")],
	},
	{
		slug: "vs-code", title: "VS Code", group: "workflow", status: "Occasional use", firstUsed: t("~2023–2024", "~2023–2024"),
		summary: t("A lightweight option for quick edits to small files.", "Лёгкий вариант для быстрых правок небольших файлов."),
		experience: [t("I tried VS Code for its startup speed and extensions, mainly to edit small files quickly. I can configure basic extensions and make straightforward changes, but it never replaced Visual Studio as my main environment. I have not explored its deeper development features.", "Пробовал VS Code ради быстрого запуска и расширений, в основном для небольших правок файлов. Могу установить нужные расширения и внести простые изменения, но основной средой осталась Visual Studio. Глубокие возможности разработки в VS Code не изучал.")],
		focus: [t("Small-file edits", "Правки небольших файлов"), t("Basic extensions", "Базовые расширения")],
	},
	{
		slug: "github-desktop", title: "GitHub Desktop", group: "workflow", status: "In use",
		summary: t("Version history and GitHub publishing for mostly solo projects.", "История версий и отправка на GitHub преимущественно одиночных проектов."),
		experience: [t("I discovered GitHub Desktop after starting Unity and Visual Studio. I create repositories, review changes, commit, and push to GitHub instead of keeping manual copies of every project version. Most work has been solo in the main branch; my experience with branches and merges is basic, and team workflows are less familiar.", "Открыл GitHub Desktop после знакомства с Unity и Visual Studio. Создаю репозитории, просматриваю изменения, делаю коммиты и отправляю их на GitHub вместо ручных копий каждой версии проекта. Работал преимущественно один в основной ветке; с ветками и слияниями знаком базово, командные процессы освоены меньше.")],
		focus: [t("Version history", "История версий"), t("Commits & push", "Коммиты и push"), t("Solo projects", "Одиночные проекты")],
	},
	{
		slug: "obsidian", title: "Obsidian", group: "workflow", status: "In use", firstUsed: t("~2023", "~2023"),
		summary: t("Detailed planning, notes, and logs for my work.", "Подробное планирование, заметки и логи моей работы."),
		experience: [t("I use Obsidian to keep plans, notes, and logs together. It is one of my preferred tools for organising work and keeping track of details, with a few simple plugins supporting the process.", "В Obsidian собираю планы, заметки и логи. Это один из любимых инструментов для организации работы и сохранения деталей; дополнительно использую несколько простых плагинов.")],
		focus: [t("Planning", "Планирование"), t("Notes & logs", "Заметки и логи")],
	},
];

export const softwareUrl = (slug: string, base: string) => `${base}projects/software/${slug}/`;
export const softwareLogo = (slug: string, base: string) => `${base}software/logos/${slug}.svg`;
export const softwareTranslations = Object.fromEntries([
	...softwareGroups.map(group => group.title),
	...software.flatMap(tool => [tool.summary, ...tool.experience, ...tool.focus, ...(tool.firstUsed ? [tool.firstUsed] : [])]),
].map(value => [value.en, value.ru]));
