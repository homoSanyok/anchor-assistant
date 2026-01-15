// generate-dataset.ts
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
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
    
    // Распределение типов примеров
    exampleTypes: {
        exactMatch: 0.4,
        partialMatch: 0.3,
        notFound: 0.2,
        ambiguous: 0.1
    }
};

// Создание папки если её нет
function ensureDataDirectory() {
    const dataDir = join(__dirname, 'data');
    if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
    }
    return dataDir;
}

// Генерация случайного числа в диапазоне
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Выбор случайного элемента из массива
function sample<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

// Выбор нескольких случайных элементов из массива
function sampleSize<T>(array: T[], n: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
}

// Перемешивание массива
function shuffle<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Создание случайных анкоров
function generateRandomAnchors(count: number = 15): Anchor[] {
    const anchors: Anchor[] = [];
    
    // Базовые элементы (корневые)
    const rootAnchors = [
        { selector: '#settings', anchor: 'настройки, параметры приложения, конфигурация', parent_selector: 'root' },
        { selector: '#profile', anchor: 'профиль, личный кабинет, учетная запись', parent_selector: 'root' },
        { selector: '#analytics', anchor: 'аналитика, статистика, отчеты', parent_selector: 'root' },
        { selector: '#help', anchor: 'помощь, справка, документация', parent_selector: 'root' },
        { selector: '#catalog', anchor: 'каталог, товары, продукты', parent_selector: 'root' },
        { selector: '#messages', anchor: 'сообщения, чат, переписка', parent_selector: 'root' },
        { selector: '#dashboard', anchor: 'дашборд, главная страница, обзор', parent_selector: 'root' }
    ];
    
    // Добавляем корневые анкоры
    const selectedRoots = sampleSize(rootAnchors, randomInt(3, 6));
    selectedRoots.forEach(root => {
        anchors.push({
            selector: root.selector,
            anchor: root.anchor,
            parent_selector: root.parent_selector
        });
    });
    
    // Создаем вложенные анкоры
    const rootSelectors = selectedRoots.map(r => r.selector);
    
    rootSelectors.forEach(parentSelector => {
        const childCount = randomInt(1, 4);
        
        for (let i = 1; i <= childCount; i++) {
            const childSelectors = [
                { selector: `${parentSelector.replace('#', '')}-button`, anchor: 'кнопка, нажать, кликнуть' },
                { selector: `${parentSelector.replace('#', '')}-edit`, anchor: 'редактировать, изменить, обновить' },
                { selector: `${parentSelector.replace('#', '')}-add`, anchor: 'добавить, создать, новый' },
                { selector: `${parentSelector.replace('#', '')}-delete`, anchor: 'удалить, стереть, убрать' },
                { selector: `${parentSelector.replace('#', '')}-view`, anchor: 'просмотреть, посмотреть, открыть' },
                { selector: `${parentSelector.replace('#', '')}-settings`, anchor: 'настройки, параметры, конфигурация' },
                { selector: `${parentSelector.replace('#', '')}-export`, anchor: 'экспорт, выгрузить, скачать' },
                { selector: `${parentSelector.replace('#', '')}-import`, anchor: 'импорт, загрузить, добавить из файла' },
                { selector: `${parentSelector.replace('#', '')}-filter`, anchor: 'фильтр, отфильтровать, поиск' },
                { selector: `${parentSelector.replace('#', '')}-sort`, anchor: 'сортировка, упорядочить, организовать' }
            ];
            
            const selectedChild = sample(childSelectors);
            anchors.push({
                selector: `#${selectedChild.selector}`,
                anchor: `${getActionForParent(parentSelector)} ${selectedChild.anchor}`,
                parent_selector: parentSelector
            });
            
            // Создаем еще один уровень вложенности (с вероятностью 50%)
            if (Math.random() > 0.5) {
                const grandChildSelectors = [
                    { action: 'fast', desc: 'быстро, скоро, моментально' },
                    { action: 'detailed', desc: 'подробно, детально, с деталями' },
                    { action: 'multiple', desc: 'множественно, несколько, много' },
                    { action: 'favorite', desc: 'избранное, любимое, сохраненное' },
                    { action: 'template', desc: 'шаблон, заготовка, пресет' }
                ];
                
                const grandChild = sample(grandChildSelectors);
                anchors.push({
                    selector: `#${selectedChild.selector}-${grandChild.action}`,
                    anchor: `${grandChild.desc} ${selectedChild.anchor}`,
                    parent_selector: `#${selectedChild.selector}`
                });
            }
        }
    });
    
    // Добавляем несколько изолированных элементов
    const isolatedCount = randomInt(1, 3);
    for (let i = 0; i < isolatedCount; i++) {
        anchors.push({
            selector: `#isolated-${i + 1}`,
            anchor: `изолированный элемент ${i + 1}, отдельный раздел`,
            parent_selector: 'root'
        });
    }
    
    return anchors.slice(0, count);
}

// Получение действия для родительского элемента
function getActionForParent(parentSelector: string): string {
    if (parentSelector === '#settings') return 'настроить';
    if (parentSelector === '#profile') return 'управлять профилем';
    if (parentSelector === '#analytics') return 'просмотреть аналитику';
    if (parentSelector === '#catalog') return 'управлять каталогом';
    if (parentSelector === '#messages') return 'отправить сообщение';
    if (parentSelector === '#dashboard') return 'настроить дашборд';
    return 'управлять';
}

// Форматирование анкоров для input
function formatAnchors(anchors: Anchor[]): string {
    return anchors.map(a => 
        `{ selector: "${a.selector}", anchor: "${a.anchor}", parent_selector: "${a.parent_selector}" }`
    ).join(', ');
}

// Поиск пути к элементу
function findPath(selector: string, anchors: Anchor[]): Anchor[] {
    const path: Anchor[] = [];
    const anchorMap = new Map(anchors.map(a => [a.selector, a]));
    
    let current = selector;
    
    while (current && current !== 'root') {
        const anchor = anchorMap.get(current);
        if (!anchor) break;
        
        path.unshift(anchor);
        current = anchor.parent_selector;
    }
    
    return path;
}

// Получение краткого описания из анкора
function getShortDescription(anchor: string): string {
    // Проверяем, что anchor существует и является строкой
    if (!anchor || typeof anchor !== 'string') {
        return 'элемент';
    }
    // Берем первую часть до запятой
    const firstPart = anchor.split(',')[0];
    return firstPart ? firstPart.trim() : 'элемент';
}

// Форматирование ответа
function formatResponse(path: Anchor[]): string {
    if (path.length === 0) {
        return "not_found. Извините, раздел не найден.";
    }
    
    const selectors = path.map(a => a.selector).join(', ');
    const descriptions = path.map(a => getShortDescription(a.anchor)).join(' → ');
    
    return `${selectors}. ${descriptions}.`;
}

// Генерация запроса для анкора
function generateQueryForAnchor(anchor: Anchor | null, queryType: string): string {
    const queries = {
        exactMatch: [
            'Найди настройки безопасности',
            'Где находится профиль пользователя?',
            'Покажи мне аналитику продаж',
            'Открой раздел помощи',
            'Как найти каталог товаров?',
            'Мне нужен доступ к сообщениям',
            'Перейди в дашборд',
            'Где искать настройки уведомлений?',
            'Покажи меню редактирования профиля',
            'Где можно изменить пароль?'
        ],
        partialMatch: [
            'Найди раздел с настройками',
            'Где можно изменить параметры?',
            'Покажи меню редактирования',
            'Как добавить новый элемент?',
            'Где находится управление?',
            'Покажи опции',
            'Как получить доступ к настройкам?',
            'Где редактировать профиль?',
            'Найди статистику',
            'Покажи отчеты'
        ],
        ambiguous: [
            'Настройки',
            'Редактировать',
            'Добавить',
            'Удалить',
            'Просмотреть',
            'Экспорт',
            'Импорт',
            'Фильтр',
            'Статистика',
            'Профиль'
        ],
        notFound: [
            'Найди игровую панель',
            'Где находится музыкальный плеер?',
            'Покажи мне прогноз погоды',
            'Открой видеоконференции',
            'Как найти криптокошелек?',
            'Мне нужен доступ к календарю',
            'Где искать голосового помощника?',
            'Покажи раздел с картами',
            'Найди калькулятор',
            'Где редактор фото?'
        ]
    };
    
    // Для exactMatch используем anchor, если он есть
    if (queryType === 'exactMatch' && anchor && anchor.anchor) {
        const shortDesc = getShortDescription(anchor.anchor);
        const exactQueries = [
            `Найди "${shortDesc}"`,
            `Где находится ${shortDesc}?`,
            `Покажи мне ${shortDesc}`,
            `Открой ${shortDesc}`,
            `Как найти ${shortDesc}?`,
            `Мне нужен доступ к ${shortDesc}`,
            `Перейди в ${shortDesc}`,
            `Где искать ${shortDesc}?`
        ];
        return sample(exactQueries);
    }
    
    // Для других типов берем из предопределенных запросов
    return sample(queries[queryType as keyof typeof queries] || queries.exactMatch);
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
function generateExample(): TrainingExample {
    // Генерируем случайные анкоры
    const anchors = generateRandomAnchors(randomInt(8, 20));
    
    // Выбираем тип запроса
    const queryType = weightedRandom(CONFIG.exampleTypes);
    
    if (queryType === 'notFound') {
        return {
            instruction: generateQueryForAnchor(null, 'notFound'),
            input: formatAnchors(anchors),
            output: "not_found. Извините, раздел не найден."
        };
    }
    
    // Выбираем случайный анкор
    const targetAnchor = sample(anchors);
    
    // Находим путь к целевому анкору
    const path = findPath(targetAnchor.selector, anchors);
    
    // Проверяем, найден ли путь
    if (path.length === 0) {
        // Если путь не найден, считаем это not_found
        return {
            instruction: generateQueryForAnchor(null, 'notFound'),
            input: formatAnchors(anchors),
            output: "not_found. Извините, раздел не найден."
        };
    }
    
    return {
        instruction: generateQueryForAnchor(targetAnchor, queryType),
        input: formatAnchors(anchors),
        output: formatResponse(path)
    };
}

// Основная функция
async function generateDataset() {
    console.log('🎯 Генерация датасета для навигационного ассистента...\n');
    
    // Создаем папку для данных
    const dataDir = ensureDataDirectory();
    
    const allExamples: TrainingExample[] = [];
    
    for (let i = 0; i < CONFIG.totalExamples; i++) {
        try {
            const example = generateExample();
            allExamples.push(example);
        } catch (error) {
            console.error(`Ошибка при генерации примера ${i}:`, error);
            continue;
        }
        
        if (i % 100 === 0) {
            process.stdout.write(`\r🔄 Сгенерировано: ${i}/${CONFIG.totalExamples} примеров`);
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
    
    // Сохранение в папку data
    writeFileSync(join(dataDir, 'train.json'), JSON.stringify(trainSet, null, 2));
    writeFileSync(join(dataDir, 'validation.json'), JSON.stringify(valSet, null, 2));
    writeFileSync(join(dataDir, 'test.json'), JSON.stringify(testSet, null, 2));
    
    console.log('📊 Статистика датасета:');
    console.log(`   Train: ${trainSet.length} примеров (сохранено в ${join(dataDir, 'train.json')})`);
    console.log(`   Validation: ${valSet.length} примеров (сохранено в ${join(dataDir, 'validation.json')})`);
    console.log(`   Test: ${testSet.length} примеров (сохранено в ${join(dataDir, 'test.json')})`);
    
    // Анализ результатов
    console.log('\n📈 Анализ типов ответов:');
    const responseTypes = {
        found: 0,
        not_found: 0
    };
    
    allExamples.forEach(ex => {
        if (ex.output.startsWith('not_found')) {
            responseTypes.not_found++;
        } else {
            responseTypes.found++;
        }
    });
    
    console.log(`   Найдено: ${responseTypes.found} (${((responseTypes.found / allExamples.length) * 100).toFixed(1)}%)`);
    console.log(`   Не найдено: ${responseTypes.not_found} (${((responseTypes.not_found / allExamples.length) * 100).toFixed(1)}%)`);
    
    // Показываем несколько примеров для проверки
    console.log('\n📝 Примеры данных:');
    console.log('='.repeat(50));
    
    for (let i = 0; i < 3; i++) {
        const example = trainSet[i];
        console.log(`\nПример ${i + 1}:`);
        console.log(`Instruction: ${example.instruction}`);
        console.log(`Output: ${example.output}`);
        console.log(`Input (первые 150 символов): ${example.input.substring(0, 150)}...`);
    }
    
    console.log('\n📁 Файлы сохранены в папке:');
    console.log(`   ${dataDir}`);
    console.log('   ├── train.json');
    console.log('   ├── validation.json');
    console.log('   └── test.json');
}

// Запуск с обработкой ошибок
generateDataset().catch(error => {
    console.error('❌ Ошибка при генерации датасета:', error);
    process.exit(1);
});