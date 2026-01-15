// generate-dataset.ts
import { writeFileSync } from 'fs';
import { Anchor } from "../src/index";

// Типы
interface TrainingExample {
    instruction: string;
    input: string;
    output: string;
}

// Конфигурация
const CONFIG = {
    totalExamples: 2000,
    trainSplit: 0.7,
    valSplit: 0.15,
    testSplit: 0.15,
    
    domains: ['ecommerce', 'dashboard', 'social', 'admin', 'analytics', 'crm', 'education'] as const,
    
    // Распределение типов примеров
    exampleTypes: {
        exactMatch: 0.25,
        synonymMatch: 0.20,
        partialMatch: 0.15,
        hierarchical: 0.25,
        notFound: 0.10,
        ambiguous: 0.05
    }
};

// Многословные описания для разных категорий
const DESCRIPTIONS = {
    settings: [
        'настройка параметров безопасности и приватности учетной записи пользователя с возможностью двухфакторной аутентификации',
        'конфигурация системных параметров и предпочтений интерфейса с сохранением пользовательских пресетов',
        'управление настройками уведомлений и оповещений приложения для различных типов событий',
        'изменение региональных параметров, языковых настроек и форматов отображения даты и времени',
        'настройка внешнего вида, темы оформления и расположения элементов пользовательского интерфейса',
        'управление правами доступа и разрешениями для различных ролей пользователей в системе',
        'конфигурация параметров интеграции с внешними сервисами и API сторонних приложений'
    ],
    profile: [
        'управление личной информацией, контактными данными и аватаркой учетной записи пользователя',
        'редактирование профиля, настроек видимости и параметров отображения персональной информации',
        'просмотр истории действий, активности и последних операций пользователя в системе',
        'управление подписками, уведомлениями и настройками рассылок для профиля пользователя',
        'настройка параметров конфиденциальности, видимости профиля и управления персональными данными',
        'привязка и управление дополнительными способами аутентификации и социальными аккаунтами',
        'ведение списка избранного, сохраненных элементов и персональных коллекций пользователя'
    ],
    analytics: [
        'анализ статистики использования, метрик производительности и ключевых показателей эффективности системы',
        'просмотр интерактивных отчетов, дашбордов и визуализаций с детализацией по различным параметрам',
        'мониторинг пользовательской активности, поведения и паттернов взаимодействия с приложением',
        'анализ трендов, динамики изменений и прогнозирование метрик использования функциональности',
        'генерация детализированных отчетов с возможностью фильтрации, группировки и экспорта данных',
        'сравнение показателей за различные периоды времени с анализом роста и выявлением аномалий',
        'интеграция аналитических данных с системами бизнес-аналитики и внешними инструментами отчетности'
    ],
    admin: [
        'администрирование пользователей, управление ролями, правами доступа и уровнями привилегий в системе',
        'мониторинг системных логов, диагностика проблем производительности и устранение ошибок работы',
        'управление конфигурацией системы, параметрами развертывания и настройками окружения выполнения',
        'контроль безопасности системы, аудит действий пользователей и мониторинг подозрительной активности',
        'управление резервным копированием, восстановлением данных и планированием задач обслуживания',
        'конфигурация системных уведомлений, оповещений администратора и мониторинга критических событий',
        'управление лицензиями, подписками и биллингом для корпоративных пользователей и организаций'
    ],
    content: [
        'управление контентом, медиафайлами, документами и мультимедийными материалами в системе',
        'создание, редактирование, форматирование и публикация текстовых материалов, статей и документов',
        'организация контента по категориям, тегам, коллекциям и иерархическим структурам навигации',
        'модерация пользовательского контента, комментариев, отзывов и пользовательских материалов',
        'публикация, планирование выхода, управление версиями и история изменений контентных материалов',
        'оптимизация контента для поисковых систем, управление метаданными и SEO-параметрами',
        'анализ эффективности контента, вовлеченности пользователей и метрик взаимодействия с материалами'
    ],
    catalog: [
        'управление каталогом товаров, услуг, продуктов и позиций с детализированными характеристиками',
        'организация товаров по категориям, подкатегориям, коллекциям и тематическим разделам',
        'управление наличием товаров, остатками на складах и параметрами инвентаризации продукции',
        'настройка фильтров, сортировки, поиска и параметров отображения элементов каталога',
        'управление ценами, скидками, акциями и специальными предложениями для товаров каталога',
        'интеграция каталога с системами управления запасами, логистики и цепочками поставок',
        'анализ эффективности каталога, конверсии просмотров в покупки и популярности товарных позиций'
    ]
};

// Синонимы для ключевых слов
const SYNONYMS: Record<string, string[]> = {
    'настройки': ['параметры', 'конфигурация', 'опции', 'установки', 'предпочтения'],
    'профиль': ['аккаунт', 'учетная запись', 'личный кабинет', 'персональная страница'],
    'отчеты': ['аналитика', 'статистика', 'метрики', 'дашборд', 'мониторинг'],
    'пользователи': ['клиенты', 'юзеры', 'аккаунты', 'участники', 'пользватели'],
    'безопасность': ['защита', 'приватность', 'конфиденциальность', 'аутентификация'],
    'уведомления': ['оповещения', 'алерты', 'сообщения', 'уведомления', 'нотификации'],
    'помощь': ['поддержка', 'справка', 'документация', 'FAQ', 'помощь'],
    'поиск': ['фильтр', 'поисковая строка', 'найти', 'поиск', 'фильтрация'],
    'редактировать': ['изменить', 'обновить', 'модифицировать', 'корректировать'],
    'создать': ['добавить', 'новый', 'сгенерировать', 'создать', 'добавить'],
    'управление': ['администрирование', 'контроль', 'руководство', 'управление'],
    'каталог': ['товары', 'продукты', 'позиции', 'ассортимент', 'каталог'],
    'анализ': ['аналитика', 'исследование', 'изучение', 'разбор', 'анализ']
};

// Утилиты для работы с массивами
function sample<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function sampleSize<T>(array: T[], n: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
}

function shuffle<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Генерация многословного описания
function generateMultiWordDescription(category: keyof typeof DESCRIPTIONS): string {
    return sample(DESCRIPTIONS[category]);
}

// Генерация плоского списка якорей для домена
function generateFlatAnchors(domain: string): Anchor[] {
    const anchors: Anchor[] = [];
    const selectorCounter: Record<string, number> = {};
    
    // Определяем категории для домена
    let categories: (keyof typeof DESCRIPTIONS)[] = [];
    switch (domain) {
        case 'ecommerce':
            categories = ['settings', 'profile', 'catalog', 'analytics'];
            break;
        case 'dashboard':
            categories = ['settings', 'analytics', 'admin'];
            break;
        case 'social':
            categories = ['profile', 'settings', 'content'];
            break;
        case 'admin':
            categories = ['admin', 'settings', 'analytics'];
            break;
        case 'analytics':
            categories = ['analytics', 'settings'];
            break;
        case 'crm':
            categories = ['profile', 'analytics', 'admin'];
            break;
        case 'education':
            categories = ['content', 'profile', 'settings'];
            break;
        default:
            categories = ['settings', 'profile'];
    }
    
    // Генерация корневых якорей
    const rootCount = randomInt(4, 7);
    const rootCategories = sampleSize(categories, rootCount);
    
    rootCategories.forEach((category, index) => {
        const selector = `#root-${category}-${index + 1}`;
        const description = generateMultiWordDescription(category);
        
        anchors.push({
            selector,
            anchor: description.charAt(0).toUpperCase() + description.slice(1),
            parent_selector: 'root'
        });
        
        selectorCounter[selector] = 1;
    });
    
    // Генерация вложенных якорей (уровень 1)
    anchors.forEach(rootAnchor => {
        if (Math.random() > 0.3) { // 70% корневых имеют детей
            const childCount = randomInt(2, 5);
            const category = Object.keys(DESCRIPTIONS).find(key => 
                rootAnchor.anchor.toLowerCase().includes(key)
            ) as keyof typeof DESCRIPTIONS || 'settings';
            
            for (let i = 0; i < childCount; i++) {
                const childSelector = `#${rootAnchor.selector.slice(1)}-child-${i + 1}`;
                const description = generateMultiWordDescription(category);
                
                anchors.push({
                    selector: childSelector,
                    anchor: `Подраздел: ${description.toLowerCase()}`,
                    parent_selector: rootAnchor.selector
                });
                
                selectorCounter[childSelector] = 2;
            }
        }
    });
    
    // Генерация глубоко вложенных якорей (уровень 2)
    const level1Anchors = anchors.filter(a => selectorCounter[a.selector] === 2);
    level1Anchors.forEach(parentAnchor => {
        if (Math.random() > 0.5) { // 50% имеют детей
            const grandChildCount = randomInt(1, 3);
            
            for (let i = 0; i < grandChildCount; i++) {
                const grandChildSelector = `#${parentAnchor.selector.slice(1)}-grandchild-${i + 1}`;
                const actionTypes = [
                    'Настройка параметров',
                    'Просмотр статистики',
                    'Управление элементами',
                    'Редактирование контента',
                    'Экспорт данных',
                    'Импорт файлов',
                    'Фильтрация результатов',
                    'Сортировка элементов'
                ];
                
                anchors.push({
                    selector: grandChildSelector,
                    anchor: `${sample(actionTypes)}: ${parentAnchor.anchor.split(':')[1]?.trim() || 'элементов'}`,
                    parent_selector: parentAnchor.selector
                });
            }
        }
    });
    
    // Добавляем несколько изолированных якорей без родителей
    const isolatedCount = randomInt(2, 4);
    for (let i = 0; i < isolatedCount; i++) {
        const isolatedCategory = sample(categories);
        anchors.push({
            selector: `#isolated-${isolatedCategory}-${i + 1}`,
            anchor: generateMultiWordDescription(isolatedCategory),
            parent_selector: 'root'
        });
    }
    
    return anchors;
}

// Поиск пути в плоском списке
function findPathInFlatList(selector: string, anchors: Anchor[]): Anchor[] {
    const path: Anchor[] = [];
    const anchorMap = new Map(anchors.map(a => [a.selector, a]));
    
    let currentSelector = selector;
    let visited = new Set<string>();
    
    while (currentSelector && currentSelector !== 'root' && !visited.has(currentSelector)) {
        const anchor = anchorMap.get(currentSelector);
        if (!anchor) break;
        
        visited.add(currentSelector);
        path.unshift(anchor);
        currentSelector = anchor.parent_selector;
    }
    
    return path;
}

// Форматирование якорей для input
function formatAnchorsFlat(anchors: Anchor[]): string {
    return `Якоря:\n${anchors.map(a => `- ${a.selector} - ${a.anchor} - ${a.parent_selector}`).join('\n')}`;
}

// Форматирование ответа
function formatResponse(path: Anchor[], contextAnchors: Anchor[], intent: string): string {
    if (intent === 'notFound' || path.length === 0) {
        return 'not_found. Извините, раздел не найден.';
    }
    
    const selectors = path.map(a => a.selector).join(', ');
    const descriptions = path.map(a => {
        // Упрощаем описание для краткости
        const shortDesc = a.anchor.split(':')[0] || a.anchor;
        return shortDesc.length > 30 ? shortDesc.substring(0, 30) + '...' : shortDesc;
    }).join(' → ');
    
    return `${selectors}. ${descriptions}.`;
}

// Генерация запроса
function generateQuery(anchor: Anchor, queryType: keyof typeof CONFIG.exampleTypes): string {
    const baseDescription = anchor.anchor.toLowerCase();
    
    switch (queryType) {
        case 'exactMatch':
            const exactTemplates = [
                `Найди "${anchor.anchor}"`,
                `Как перейти к ${baseDescription}?`,
                `Открой раздел "${anchor.anchor}"`,
                `Покажи мне ${baseDescription}`,
                `Где находится ${baseDescription}?`
            ];
            return sample(exactTemplates);
            
        case 'synonymMatch':
            // Ищем синонимы в описании
            for (const [keyword, synonyms] of Object.entries(SYNONYMS)) {
                if (baseDescription.includes(keyword)) {
                    const synonym = sample(synonyms);
                    const synonymTemplates = [
                        `Где можно найти ${synonym}?`,
                        `Покажи раздел с ${synonym}`,
                        `Как получить доступ к ${synonym}?`,
                        `Мне нужен ${synonym}`,
                        `Открой ${synonym}`
                    ];
                    return sample(synonymTemplates);
                }
            }
            // Если не нашли синоним, используем exact match
            return generateQuery(anchor, 'exactMatch');
            
        case 'partialMatch':
            const words = anchor.anchor.split(' ');
            if (words.length <= 2) {
                return generateQuery(anchor, 'exactMatch');
            }
            const partialWords = words.slice(0, randomInt(1, Math.min(3, words.length - 1)));
            const partialDescription = partialWords.join(' ');
            const partialTemplates = [
                `Как найти ${partialDescription.toLowerCase()}?`,
                `Где искать ${partialDescription.toLowerCase()}?`,
                `Покажи ${partialDescription.toLowerCase()}`,
                `Мне нужен доступ к ${partialDescription.toLowerCase()}`,
                `Как перейти в ${partialDescription.toLowerCase()}?`
            ];
            return sample(partialTemplates);
            
        case 'hierarchical':
            const path = findPathInFlatList(anchor.selector, [anchor]);
            if (path.length <= 1) {
                return generateQuery(anchor, 'exactMatch');
            }
            const hierarchicalTemplates = [
                `Как добраться до ${baseDescription}?`,
                `Проведи меня в ${baseDescription}`,
                `Покажи полный путь к ${baseDescription}`,
                `Мне нужно найти ${baseDescription}, как туда попасть?`,
                `Навигация к ${baseDescription}`
            ];
            return sample(hierarchicalTemplates);
            
        case 'ambiguous':
            const firstWord = anchor.anchor.split(' ')[0].toLowerCase();
            const ambiguousTemplates = [
                `Покажи ${firstWord}`,
                `Где ${firstWord}?`,
                `Найди ${firstWord}`,
                `Открой ${firstWord}`,
                `Мне нужен ${firstWord}`
            ];
            return sample(ambiguousTemplates);
            
        default:
            return `Найди ${baseDescription}`;
    }
}

// Взвешенный случайный выбор
function weightedRandom(weights: Record<string, number>): string {
    const entries = Object.entries(weights);
    const sum = entries.reduce((acc, [, weight]) => acc + weight, 0);
    let randomValue = Math.random() * sum;
    
    for (const [key, weight] of entries) {
        if (randomValue < weight) return key;
        randomValue -= weight;
    }
    
    return entries[0][0];
}

// Генерация одного примера
function generateExample(anchors: Anchor[], exampleType: string): TrainingExample {
    if (exampleType === 'notFound') {
        const contextAnchors = sampleSize(anchors, randomInt(5, 12));
        const unrelatedTerms = [
            'голосовой помощник', 'игровой раздел', 'криптовалютный кошелек',
            'прогноз погоды', 'лента новостей', 'видеоконференции',
            'калькулятор', 'календарь событий', 'карта местности'
        ];
        
        return {
            instruction: `Найди ${sample(unrelatedTerms)}`,
            input: formatAnchorsFlat(contextAnchors),
            output: 'not_found. Извините, раздел не найден.'
        };
    }
    
    // Выбираем случайный якорь
    const anchor = sample(anchors);
    const path = findPathInFlatList(anchor.selector, anchors);
    
    // Выбираем контекстные якоря (включая путь и случайные)
    const pathSelectors = new Set(path.map(a => a.selector));
    const contextFromPath = anchors.filter(a => pathSelectors.has(a.selector));
    const remaining = anchors.filter(a => !pathSelectors.has(a.selector));
    const additionalContext = sampleSize(remaining, randomInt(3, 8));
    const contextAnchors = shuffle([...contextFromPath, ...additionalContext]).slice(0, randomInt(5, 15));
    
    const query = generateQuery(anchor, exampleType as any);
    
    return {
        instruction: query,
        input: formatAnchorsFlat(contextAnchors),
        output: formatResponse(path, contextAnchors, exampleType)
    };
}

// Основная функция генерации
async function generateDataset() {
    console.log('🎯 Генерация датасета для навигационного ассистента...\n');
    
    const allExamples: TrainingExample[] = [];
    let exampleCount = 0;
    
    while (exampleCount < CONFIG.totalExamples) {
        for (const domain of CONFIG.domains) {
            if (exampleCount >= CONFIG.totalExamples) break;
            
            // Генерация якорей для домена
            const anchors = generateFlatAnchors(domain);
            
            // Генерация пакета примеров для этого набора якорей
            const batchSize = Math.min(30, CONFIG.totalExamples - exampleCount);
            
            for (let i = 0; i < batchSize; i++) {
                const exampleType = weightedRandom(CONFIG.exampleTypes);
                const example = generateExample(anchors, exampleType);
                allExamples.push(example);
                exampleCount++;
                
                if (exampleCount % 100 === 0) {
                    process.stdout.write(`\r🔄 Сгенерировано: ${exampleCount}/${CONFIG.totalExamples} примеров`);
                }
            }
        }
    }
    
    console.log(`\n\n✅ Сгенерировано ${allExamples.length} примеров!`);
    
    // Перемешиваем и разделяем
    const shuffled = shuffle(allExamples);
    const trainSize = Math.floor(shuffled.length * CONFIG.trainSplit);
    const valSize = Math.floor(shuffled.length * CONFIG.valSplit);
    
    const trainSet = shuffled.slice(0, trainSize);
    const valSet = shuffled.slice(trainSize, trainSize + valSize);
    const testSet = shuffled.slice(trainSize + valSize);
    
    // Сохранение
    writeFileSync('train.json', JSON.stringify(trainSet, null, 2));
    writeFileSync('validation.json', JSON.stringify(valSet, null, 2));
    writeFileSync('test.json', JSON.stringify(testSet, null, 2));
    
    console.log('📊 Статистика датасета:');
    console.log(`   Train: ${trainSet.length} примеров`);
    console.log(`   Validation: ${valSet.length} примеров`);
    console.log(`   Test: ${testSet.length} примеров`);
    
    // Анализ
    console.log('\n📈 Анализ форматов ответов:');
    const analysis = { found: 0, notFound: 0 };
    allExamples.forEach(ex => {
        if (ex.output.startsWith('not_found')) analysis.notFound++;
        else analysis.found++;
    });
    
    console.log(`   Найдено: ${analysis.found} (${((analysis.found / allExamples.length) * 100).toFixed(1)}%)`);
    console.log(`   Не найдено: ${analysis.notFound} (${((analysis.notFound / allExamples.length) * 100).toFixed(1)}%)`);
}

// Запуск
generateDataset().catch(console.error);