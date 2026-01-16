// generateTrainData.ts
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { Anchor } from "../src/index";

// Новый формат с messages
interface TrainingExample {
    messages: {
        role: 'user' | 'assistant';
        content: string;
    }[];
}

// Конфигурация
const CONFIG = {
    totalExamples: 2500,
    trainSplit: 0.7,
    valSplit: 0.15,
    testSplit: 0.15,

    // Распределение типов запросов
    queryTypes: {
        exactMatch: 0.3,
        partialMatch: 0.3,
        naturalLanguage: 0.2,
        ambiguous: 0.1,
        notFound: 0.1
    },

    minAnchors: 8,
    maxAnchors: 25
};

// Базы данных
const DATABASE = {
    mainSections: [
        {
            base: 'settings',
            synonyms: ['настройки', 'параметры', 'конфигурация', 'опции', 'установки'],
            children: ['general', 'security', 'privacy', 'notifications', 'appearance']
        },
        {
            base: 'profile',
            synonyms: ['профиль', 'аккаунт', 'учетная запись', 'личный кабинет'],
            children: ['edit', 'security', 'preferences', 'subscription']
        },
        {
            base: 'dashboard',
            synonyms: ['дашборд', 'главная', 'обзор', 'панель управления', 'сводка'],
            children: ['widgets', 'analytics', 'quick-actions', 'recent']
        },
        {
            base: 'analytics',
            synonyms: ['аналитика', 'статистика', 'отчеты', 'метрики'],
            children: ['sales', 'users', 'traffic', 'conversion', 'export']
        },
        {
            base: 'messages',
            synonyms: ['сообщения', 'чат', 'переписка', 'коммуникация'],
            children: ['inbox', 'sent', 'drafts', 'archived']
        },
        {
            base: 'catalog',
            synonyms: ['каталог', 'товары', 'продукты', 'элементы'],
            children: ['list', 'add', 'edit', 'categories', 'import']
        }
    ],

    actions: [
        { base: 'edit', synonyms: ['редактировать', 'изменить', 'обновить', 'модифицировать'] },
        { base: 'add', synonyms: ['добавить', 'создать', 'новый', 'внести'] },
        { base: 'delete', synonyms: ['удалить', 'стереть', 'убрать', 'очистить'] },
        { base: 'view', synonyms: ['просмотреть', 'посмотреть', 'открыть', 'показать'] },
        { base: 'export', synonyms: ['экспорт', 'выгрузить', 'скачать', 'сохранить в файл'] },
        { base: 'import', synonyms: ['импорт', 'загрузить', 'добавить из файла', 'upload'] },
        { base: 'filter', synonyms: ['фильтр', 'отфильтровать', 'поиск', 'сортировка'] },
        { base: 'sort', synonyms: ['сортировать', 'упорядочить', 'организовать'] }
    ],

    modifiers: [
        { base: 'quick', synonyms: ['быстро', 'оперативно', 'моментально'] },
        { base: 'detailed', synonyms: ['подробно', 'детально', 'расширенно'] },
        { base: 'multiple', synonyms: ['множественно', 'несколько', 'много'] },
        { base: 'favorite', synonyms: ['избранное', 'любимое', 'закладки'] }
    ],

    naturalQueries: [
        "Где я могу {action} {item}?",
        "Как {action} {item}?",
        "Мне нужно {action} {item}",
        "Покажи {item}",
        "Открой {item}",
        "Найди {item}",
        "Как попасть в {item}?",
        "Где находится {item}?",
        "Хочу {action} {item}"
    ]
};

// Вспомогательные функции
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function sampleSize<T>(array: T[], n: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
}

function shuffle<T>(array: T[]): T[] {
    return [...array].sort(() => Math.random() - 0.5);
}

function weightedRandom(weights: Record<string, number>): string {
    const entries = Object.entries(weights);
    const sum = entries.reduce((acc, [, w]) => acc + w, 0);
    let r = Math.random() * sum;
    for (const [key, weight] of entries) {
        if (r < weight) return key;
        r -= weight;
    }
    return entries[0][0];
}

// Генерация анкоров
function generateRichAnchors(): Anchor[] {
    const anchors: Anchor[] = [];
    const usedSelectors = new Set<string>();

    const mainSections = sampleSize(DATABASE.mainSections, randomInt(3, 6));

    // Корневые элементы
    mainSections.forEach(section => {
        const selector = `#${section.base}`;
        const synonyms = sampleSize(section.synonyms, randomInt(2, 4)).join(', ');

        anchors.push({
            selector,
            anchor: synonyms,
            parent_selector: 'root'
        });

        usedSelectors.add(selector);

        // Дочерние элементы
        const childCount = randomInt(2, 4);
        const childActions = sampleSize(DATABASE.actions, childCount);

        childActions.forEach(action => {
            const childSelector = `#${section.base}-${action.base}`;
            const childSynonyms = sampleSize(action.synonyms, randomInt(2, 4)).join(', ');

            anchors.push({
                selector: childSelector,
                anchor: childSynonyms,
                parent_selector: selector
            });

            usedSelectors.add(childSelector);

            // Вложенные элементы
            if (Math.random() < 0.4) {
                const modifier = sample(DATABASE.modifiers);
                const deepSelector = `#${section.base}-${action.base}-${modifier.base}`;
                const deepSynonyms = `${sample(modifier.synonyms)} ${sample(action.synonyms)}`;

                anchors.push({
                    selector: deepSelector,
                    anchor: deepSynonyms,
                    parent_selector: childSelector
                });

                usedSelectors.add(deepSelector);
            }
        });
    });

    return shuffle(anchors).slice(0, randomInt(CONFIG.minAnchors, CONFIG.maxAnchors));
}

// Форматирование анкоров
function formatAnchorsForDisplay(anchors: Anchor[]): string {
    return anchors.map(a => {
        const parent = a.parent_selector === 'root' ? 'root' : a.parent_selector;
        return `${a.selector} - ${a.anchor} - ${parent}`;
    }).join('\n');
}

// ПОИСК ПОЛНОГО ПУТИ - КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ
function findFullPathToTarget(anchors: Anchor[], targetQuery: string): Anchor[] {
    const anchorMap = new Map(anchors.map(a => [a.selector, a]));
    const scoredAnchors: { anchor: Anchor; score: number }[] = [];

    // Оцениваем релевантность
    anchors.forEach(anchor => {
        let score = 0;
        const queryWords = targetQuery.toLowerCase().split(/\s+/);
        const anchorSynonyms = anchor.anchor.toLowerCase().split(/[,\s]+/);

        queryWords.forEach(word => {
            if (word.length < 3) return;
            if (anchorSynonyms.some(syn => syn.includes(word) || word.includes(syn))) {
                score += 3;
            }
        });

        if (score > 0) {
            scoredAnchors.push({ anchor, score });
        }
    });

    if (scoredAnchors.length === 0) {
        return [];
    }

    scoredAnchors.sort((a, b) => b.score - a.score);
    const bestMatch = scoredAnchors[0].anchor;

    // СТРОИМ ПОЛНЫЙ ПУТЬ ОТ КОРНЯ
    const fullPath: Anchor[] = [];
    let current: Anchor | undefined = bestMatch;

    // Идем вверх по иерархии пока не дойдем до root
    while (current) {
        fullPath.unshift(current);

        if (current.parent_selector === 'root') {
            break;
        }

        current = anchorMap.get(current.parent_selector);
        if (!current) {
            // Если родитель не найден, сбрасываем путь
            return [];
        }
    }

    return fullPath;
}

// Генерация запроса
function generateUserQuery(anchors: Anchor[], queryType: string): string {
    if (queryType === 'notFound') {
        const notFoundItems = [
            'космический корабль', 'магический шар', 'пульт управления',
            'кнопка счастья', 'секретная лаборатория', 'портал'
        ];
        return `Найди ${sample(notFoundItems)}`;
    }

    const anchor = sample(anchors);
    const synonyms = anchor.anchor.split(',').map(s => s.trim());
    const mainSynonym = synonyms[0];

    switch(queryType) {
        case 'exactMatch':
            return sample([`Найди ${mainSynonym}`, `Где ${mainSynonym}?`, `Открой ${mainSynonym}`]);
        case 'partialMatch':
            const randomSynonym = sample(synonyms.slice(1));
            return sample([`Хочу ${randomSynonym}`, `Как найти ${randomSynonym}?`]);
        case 'naturalLanguage':
            const template = sample(DATABASE.naturalQueries);
            return template
                .replace('{action}', sample(['найти', 'открыть', 'посмотреть']))
                .replace('{item}', mainSynonym);
        case 'ambiguous':
            const ambiguousWord = mainSynonym.split(' ')[0];
            return sample([ambiguousWord, `Где ${ambiguousWord}?`]);
        default:
            return `Найди ${mainSynonym}`;
    }
}

// Форматирование ответа с ПОЛНЫМ ПУТЕМ
function formatAssistantResponse(path: Anchor[]): string {
    if (path.length === 0) {
        return "not_found. Извините, раздел не найден.";
    }

    const selectors = path.map(a => a.selector).join(', ');
    const descriptions = path.map(a => {
        const firstSynonym = a.anchor.split(',')[0].trim();
        return firstSynonym;
    }).join(' → ');

    return `${selectors}. ${descriptions}.`;
}

// Генерация примера
function generateTrainingExample(): TrainingExample {
    const anchors = generateRichAnchors();
    const queryType = weightedRandom(CONFIG.queryTypes);

    let query: string;
    let path: Anchor[] = [];

    if (queryType === 'notFound') {
        query = generateUserQuery(anchors, 'notFound');
    } else {
        query = generateUserQuery(anchors, queryType);
        path = findFullPathToTarget(anchors, query); // ВАЖНО: используем findFullPathToTarget

        // Если не нашли полный путь
        if (path.length === 0) {
            query = generateUserQuery(anchors, 'notFound');
        }
    }

    const anchorsText = formatAnchorsForDisplay(anchors);

    const userContent = `Запрос: ${query}

Доступные якори (формат: СЕЛЕКТОР - ОПИСАНИЕ - РОДИТЕЛЬ):
${anchorsText}`;

    let assistantContent: string;
    if (queryType === 'notFound' || path.length === 0) {
        assistantContent = "not_found. Извините, раздел не найден.";
    } else {
        // Убеждаемся, что путь начинается с корня
        if (path[0].parent_selector !== 'root') {
            // Ищем корневой элемент
            const anchorMap = new Map(anchors.map(a => [a.selector, a]));
            let current = path[0];
            const fullPath: Anchor[] = [];

            while (current) {
                fullPath.unshift(current);
                if (current.parent_selector === 'root') break;
                current = anchorMap.get(current.parent_selector)!;
            }

            path = fullPath;
        }

        assistantContent = formatAssistantResponse(path);
    }

    return {
        messages: [
            { role: 'user', content: userContent },
            { role: 'assistant', content: assistantContent }
        ]
    };
}

// Основная функция
async function generateDataset() {
    console.log('🤖 Генерация датасета с полными путями...\n');

    const dataDir = join(__dirname, 'data');
    if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
    }

    const allExamples: TrainingExample[] = [];
    const pathLengths: Record<number, number> = {};

    for (let i = 0; i < CONFIG.totalExamples; i++) {
        try {
            const example = generateTrainingExample();
            allExamples.push(example);

            // Анализ длины пути
            const content = example.messages[1].content;
            if (!content.startsWith('not_found')) {
                const pathLength = content.split(',').length;
                pathLengths[pathLength] = (pathLengths[pathLength] || 0) + 1;
            }

        } catch (error) {
            console.error(`Ошибка примера ${i}:`, error);
            continue;
        }

        if (i % 100 === 0) {
            process.stdout.write(`\r📊 Генерация: ${i}/${CONFIG.totalExamples}`);
        }
    }

    console.log(`\n\n✅ Сгенерировано ${allExamples.length} примеров`);

    const shuffled = shuffle(allExamples);
    const trainSize = Math.floor(shuffled.length * CONFIG.trainSplit);
    const valSize = Math.floor(shuffled.length * CONFIG.valSplit);

    const trainSet = shuffled.slice(0, trainSize);
    const valSet = shuffled.slice(trainSize, trainSize + valSize);
    const testSet = shuffled.slice(trainSize + valSize);

    writeFileSync(join(dataDir, 'train.json'), JSON.stringify(trainSet, null, 2));
    writeFileSync(join(dataDir, 'validation.json'), JSON.stringify(valSet, null, 2));
    writeFileSync(join(dataDir, 'test.json'), JSON.stringify(testSet, null, 2));

    console.log('\n📈 Статистика:');
    console.log(`   Train: ${trainSet.length}`);
    console.log(`   Validation: ${valSet.length}`);
    console.log(`   Test: ${testSet.length}`);

    console.log('\n📏 Длины путей:');
    Object.keys(pathLengths).sort().forEach(length => {
        console.log(`   ${length} уровень(ей): ${pathLengths[parseInt(length)]}`);
    });

    console.log('\n📋 Примеры путей:');
    console.log('='.repeat(80));

    // Показываем примеры с разной глубиной
    const examplesByDepth = allExamples.filter(ex => !ex.messages[1].content.startsWith('not_found'));

    [1, 2, 3].forEach(depth => {
        const example = examplesByDepth.find(ex =>
            ex.messages[1].content.split(',').length === depth
        );
        if (example) {
            console.log(`\nПуть глубины ${depth}:`);
            console.log('─'.repeat(40));
            console.log(example.messages[1].content);
        }
    });

    console.log('\n💾 Файлы сохранены в data/');
}

// Запуск
generateDataset().catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
});