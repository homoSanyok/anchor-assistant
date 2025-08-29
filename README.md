<div align="center" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
    <img src="public/anchor-assistant.ico" alt="anchor-assistant-logo" width="24" height="24"/>
    <h1 style="margin: 0; padding: 16px 0;">AnchorAssistant</h1>
</div>

<p align="center">
    <em>
        AnchorAssistant - это простая интеграция помощника навигации по вашему сайту
    </em>
  <br>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/anchor-assistant">
    <img src="https://img.shields.io/badge/npm-AnchorAssistant-%23ddf0de?logo=npm" alt="npm" />
  </a>
</p>

Данная библиотека реализует класс `AnchorAssistant`, добавляющий в ваше web приложение чат, взаимодействующий <br>
выбранным вами способом с `LLM`. Работая с чатом, вы можете найти в вашем приложении любой описанный элемент. <br> 
После успешного поиска библиотека сама подсветит в вашем приложении нужные кнопки и элементы, которые вы искали.

Библиотека уже поддерживает взаимодействие с:
- [GigaChat](#GigaChat).

# Установка

```bash
npm i anchor-assistant
```

# Быстрый старт

Для работы с библиотекой требуется составить список якорных ссылок на элементы в вашем приложении. <br>
Для этого импортируйте тип `Anchor` и создайте массив объектов этого типа.

Пример:
```ts
import { Anchor } from "anchor-assistant";

/**
 * Список якорных ссылок на элементы в вашем приложении.
 * Описанные селекторы должны соответствовать HTML элементам вашего приложения.
 * 
 * selector - идентификатор вашего элемента.
 *            Под капотом использует querySelectorAll, по этому полностью совместим со всеми HTML селекторами.
 *            
 * anchor - ключевые слова и/или краткое описание компонента.
 *          Дайте описание селектора так, чтобы LLM смогла ассоциировать запросы пользователей с ним.
 *          
 * parent_selector - идентификатор родительского элемента.
 *                   Необходим для того, чтобы LLM могла построить последовательный список селекторов,
 *                   взаимодействие с которыми приведёт пользователя к желаемому элементу.
 */
const anchors: Anchor[] = [
    {
        selector: "#settings-button",
        anchor: "кнопка настроек, открыть настройки",
        parent_selector: "root"
    },
    {
        selector: "#link-button",
        anchor: "открыть ссылку, выбрать элемент",
        parent_selector: "root"
    },
    {
        selector: "#edit-link-button",
        anchor: "изменить ссылку, изменить элемент, редактировать ссылку",
        parent_selector: "#settings-button"
    },
    {
        selector: "#settings-edit",
        anchor: "меню создания элемента, добавить ссылку, создать элемент",
        parent_selector: "#settings-button"
    },
    {
        selector: "#settings-palette",
        anchor: "изменить тему, меню смены цветовой схемы приложения",
        parent_selector: "#settings-button"
    }
];
```

Далее создайте экземпляр класса коннектора к интересующей вас LLM. <br>
Для этого экспортируйте абстрактный класс `LLMConnector` и переопределите метод `send`.

Пример:

```ts
import {LLMConnector, Anchors, Message} from "anchor-assistant";

class Connector extends LLMConnector {
    /**
     * В этой функции реализуйте взаимодействие с LLM.
     * @param message
     */
    async send(message: Message) {
        const response = (await (await fetch(
            // ...
        )).json()) as { answer: string };

        // Используйте родительский метод parseAnswer для 
        // парсинга ответа от LLM в тип Message.
        return this.parseAnswer(response.answer);
    }

    /**
     * Обязательно вызовите конструктор соперкласса, передав ему ваши якорные ссылки.
     *
     * @param anchors - якорные ссылки
     */
    constructor(anchors: Anchors[]) {
        super(anchors);
    }
}
```

Теперь вы можете создать экземпляр класса `AnchorAssistant`:
```ts
import { AnchorAssistant } from "anchor-assistant";

new AnchorAssistant(
    connector, 
    anchors,
    undefined, // Ссылка на родительский элемент для элемента чата.
    {
        delay: 300 // Задержка подсвечивания элементов интерфейса.
    }
)
```

Мы предоставляем собственные коннекторы для некоторых LLM. <br>
Предоставленные коннекторы уже умеют взаимодействовать с API, вам останется только
создать их экземпляр, задать `options` и пользоваться.

- [GigaChat](#GigaChat).

### GigaChat

Для работы с коннектором `GigaChat` импортируйте его и передайте экземпляру класса `AnchorAssistant`.
```ts
import { GigaChat } from "anchor-assistant";

const connector = new GigaChat({
    accessor_url: "/accessor", // Ссылка на Смену Access Key.
    model_url: "/model", // Ссылка на API взаимодействия с LLM.

    authorization_key: "[your_key]", // Ваш ключ авторизации.
    scope: "GIGACHAT_API_PERS", // Ваш scope.
    model: "GigaChat-2" // Выбранная вами модель.
});
```