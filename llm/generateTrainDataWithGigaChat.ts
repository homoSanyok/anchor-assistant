import {GigaChatChatCompletion, GigaChatModel} from "../src/types";
import * as fs from "node:fs";

type Parameter = {
    "messages": [
        {
            "role": "user",
            "content": string
        },
        {
            "role": " assistant",
            "content": string
        }
    ]
}

const TOKEN = "MDE5YmQ2MWYtMzBmMC03NmVlLWJjNGQtNjY0YWMwMTQ4YzdkOmMxOGI2NzY5LTk4NGYtNDZjNC05YjJhLTRhMjMzODE3NzhkZA==";
const MODEL: GigaChatModel = "GigaChat-2-Pro";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function access(): Promise<string | undefined> {
    const URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";

    const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "RqUID": crypto.randomUUID(),
        "Authorization": `Basic ${TOKEN}`
    };
    const body = new URLSearchParams({ "scope": "GIGACHAT_API_PERS" });

    const response = await fetch(URL, {
        method: "POST",
        headers: headers,
        body: body
    });

    if (!response.ok) return;

    const data: { access_token: string } = await response.json();
    return data.access_token;
}

async function send(access_token: string, not_found_count: number, flat_count: number, nested_count: number, nested_levels: number) {
    const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "Authorization": `Bearer ${access_token}`
    };
    const body: GigaChatChatCompletion = {
        model: MODEL,
        stream: false,
        update_interval: 0,
        messages: [
            {
                role: "user",
                content: `
Ты — генератор тренировочных данных для AI-ассистента по навигации в веб-интерфейсе. Генерируй JSON-массив с 10 элементами для обучения модели.

КОНФИГУРАЦИЯ ГЕНЕРАЦИИ:
{not_found_count} элементов → not_found (элемент не найден)
{flat_count} элементов → без вложенности (только корневой элемент)  
{nested_count} элементов → с {nested_levels} уровнями вложенности

ПРАВИЛА ФОРМАТИРОВАНИЯ ОТВЕТОВ:
not_found: "not_found. Извините, раздел не найден."
Без вложенности: "<селектор1>. <описание1>."
С {nested_levels} уровнями: 
- Если {nested_levels}=1: "<селектор1>. <описание1>."
- Если {nested_levels}=2: "<селектор1>, <селектор2>. <описание1> → <описание2>."
- Если {nested_levels}=3: "<селектор1>, <селектор2>, <селектор3>. <описание1> → <описание2> → <описание3>."
- Если {nested_levels}=4: "<селектор1>, <селектор2>, <селектор3>, <селектор4>. <описание1> → <описание2> → <описание3> → <описание4>."
- И так далее для любого {nested_levels}: N селекторов через запятую, N описаний через стрелки.

ВАЖНЫЕ ПРАВИЛА:
1. Для not_found элементов создай нормальный список якорей (не пустой), но запрос должен не соответствовать ни одному якорю
2. Названия якорей должны быть РЕАЛИСТИЧНЫМИ: #profile-edit, #settings-theme, #dashboard-filter, #analytics-export, #catalog-sort с разными суффиксами
3. Для элементов с {nested_levels} уровнями создай иерархию глубиной {nested_levels}

ТРЕБОВАНИЯ К ДАННЫМ:
1. РЕАЛИСТИЧНОСТЬ: реалистичные якоря с синонимами в описаниях
2. СИНОНИМЫ В ЗАПРОСАХ: разные формулировки одинаковых действий
3. ИЕРАРХИЯ: логичные цепочки родитель-потомок
4. Not_found: с нормальными якорями, но несоответствующий запрос

ФОРМАТ КАЖДОГО ЭЛЕМЕНТА:
{
  "messages": [
    {
      "role": "user",
      "content": "Запрос: [запрос]\n\nДоступные якори (формат: СЕЛЕКТОР - ОПИСАНИЕ - РОДИТЕЛЬ):\n[якоря]"
    },
    {
      "role": "assistant", 
      "content": "[ответ]"
    }
  ]
}

СОЗДАЙ РОВНО 10 ЭЛЕМЕНТОВ:
- {not_found_count}× not_found (с якорями, но запрос не подходит)
- {flat_count}× без вложенности  
- {nested_count}× с {nested_levels} уровнями

ВЕРНИ ТОЛЬКО JSON-МАССИВ, БЕЗ ЛЮБЫХ ПОЯСНЕНИЙ и просто JSON текстом, чтобы я прогнал его через JSON.parse().

УСТАНОВИ ПАРАМЕТРЫ:
not_found_count = ${not_found_count}
flat_count = ${flat_count}
nested_count = ${nested_count}
nested_levels = ${nested_levels}
                `
            }
        ]
    }

    const response = await fetch("https://gigachat.devices.sberbank.ru/api/v1/chat/completions", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        console.log(response.json());
        return {
            from: "llm",
            text: "Ошибка отправки запроса в GigaChat!"
        };
    }

    const data: { choices: { message: { content: string } }[] } = await response.json();
    return data.choices[0]?.message.content;
}

function checkData(data: Parameter[]) {
    const resultData: Parameter[] = [];

    data.forEach(item => {
       const splitItem = item.messages[1].content.split(".");

       const anchors = splitItem[0]?.split(",");
       const descriptions = splitItem[1]?.split("→");

       if (anchors?.length === descriptions?.length) resultData.push(item);
    });

    return resultData;
}

async function generateParameters(access_token: string) {
    try {
        const data = await send(access_token, 1, 2, 7, Math.floor(Math.random() * (8 - 3 + 1)) + 3);
        if (typeof data !== "string") return;

        const parsedData = JSON.parse(data) as Parameter[];

        const filePath = 'data/train.json';
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const dataArray = JSON.parse(fileContent);
        const newData = [...checkData(parsedData)];
        dataArray.push(...newData);
        fs.writeFileSync(filePath, JSON.stringify(dataArray, null, 2));
        return true;
    } catch {
        return false;
    }
}

async function main() {
    const access_token = await access();
    if (!access_token) return;

    const count = 300;
    for (let i = 0; i < count; i++) {
        const result = await generateParameters(access_token);
        if (result) {
            console.log("Сгенерирован массив параметров размером 10.", `Осталось ${count * 10 - i - 10} параметров.`);
            continue;
        }

        console.log("Ошибка генерации.", `Осталось ${count * 10 - i - 10} параметров.`);
    }
}

main();