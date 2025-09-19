"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnchorAssistant = void 0;
/**
 * @module AnchorAssistant
 */
const icons_1 = require("./icons");
const styles_1 = require("./styles");
const utils_1 = require("./utils");
/**
 * Класс `AnchorAssistant`, отображающий кнопку чата,
 * сам чат и демонстрирует пользователю путь до нужного элемента.
 *
 * На вход получает один из экземпляров классов коннекторов
 * к LLM.
 */
class AnchorAssistant {
    connector;
    parent;
    highlighterOptions;
    CHAT_BUTTON_CLASS = "anchor-assistant-chat-button";
    CHAT_CLASS = "anchor-assistant-chat";
    CHAT_MESSAGE_FIELD_CLASS = "anchor-assistant-chat-message-field";
    CHAT_FOOTER_CLASS = "anchor-assistant-chat-footer";
    CHAT_MESSAGES_CLASS = "anchor-assistant-chat-messages";
    /**
     * Флаг хранит состояние: открыт ли чат.
     * @private
     */
    isChatOpen = false;
    /**
     * Хранит список сообщений {@link Message} текущей сессии.
     * @private
     */
    messages = [];
    /**
     * Функция хранит список всех сообщений, которые вводил пользователь
     * в текущей сессии.
     *
     * Используется для реализации автоподставления сообщений
     * по нажатии на клавиши `стрелка вверх` и `стрелка вниз`.
     * @private
     */
    userMessages = [];
    /**
     * Объект хранит DOM элемент кнопки вызова чата.
     */
    chatButton;
    /**
     * Объект хранит DOM элемент контейнера чата.
     */
    chat;
    /**
     * Функция инициализирует кнопку вызова чата.
     */
    initChatButton() {
        this.chatButton = document.createElement("button");
        // Задаёт класс элемента.
        this.chatButton.className = this.CHAT_BUTTON_CLASS;
        // Вставка svg иконки в контент кнопки.
        this.chatButton.innerHTML = icons_1.ChatButtonIcon;
    }
    /**
     * Функция инициализирует компонент чата.
     * Создаёт слушатели события нажатия на кнопку {@link chatButton}.
     * По событию скрывает или закрывает чат.
     * @private
     */
    initChat() {
        this.chat = document.createElement("div");
        // Задаёт класс элемента.
        this.chat.className = this.CHAT_CLASS;
        if (!this.chatButton)
            return;
        // Слушатель клика по кнопке.
        // По клику добавляет или удаляет чату класс opened
        this.chatButton.addEventListener("click", () => {
            this.isChatOpen = !this.isChatOpen;
            this.chat.classList.toggle("opened");
            if (this.isChatOpen) {
                // Если чат открыт,
                // делает input сообщения пользователя выделенным
                if (!this.chat)
                    return;
                const messageField = this.chat.querySelector(`.${this.CHAT_MESSAGE_FIELD_CLASS}`);
                if (!messageField)
                    return;
                const input = messageField.querySelector("input");
                if (!input)
                    return;
                input.select();
            }
        });
    }
    /**
     * Функция инициализирует поле для создания сообщения.
     * Создаёт DOM элементы input и button и реализует
     * отправку сообщения в хранилище {}
     * @private
     */
    initChatMessageField() {
        const messageField = document.createElement("div");
        // Задаёт класс элемента.
        messageField.className = this.CHAT_MESSAGE_FIELD_CLASS;
        if (!this.chat)
            return;
        this.chat.appendChild(messageField);
        const input = document.createElement("input");
        const button = document.createElement("button");
        messageField.appendChild(input);
        messageField.appendChild(button);
        input.placeholder = "Задайте свой вопрос...";
        button.innerHTML = icons_1.ChatSendButtonIcon;
        button.addEventListener("click", () => this.onSendMessage(input));
        window.addEventListener("keydown", event => {
            if (this.isChatOpen && event.key === "Enter")
                this.onSendMessage(input);
        });
        input.addEventListener("keydown", event => {
            if (!this.isChatOpen)
                return;
            switch (event.key) {
                case "ArrowUp": {
                    event.preventDefault();
                    const valueIndex = this.userMessages.indexOf(input.value);
                    if (valueIndex === -1) {
                        input.value = this.userMessages.at(-1) || "";
                        return;
                    }
                    input.value = valueIndex - 1 < 0 ? "" : this.userMessages.at(valueIndex - 1) || "";
                    requestAnimationFrame(() => input.selectionStart = input.value.length);
                    break;
                }
                case "ArrowDown": {
                    event.preventDefault();
                    const valueIndex = this.userMessages.indexOf(input.value);
                    if (valueIndex === -1) {
                        input.value = this.userMessages.at(0) || "";
                        return;
                    }
                    input.value = this.userMessages.at(valueIndex + 1) || "";
                    requestAnimationFrame(() => input.selectionStart = input.value.length);
                    break;
                }
            }
        });
    }
    /**
     * Функция инициализирует footer чата.
     *
     * Создаёт DOM элемент кнопки скрытия и реализует
     * закрытье меню по её нажатии.
     * @private
     */
    initChatFooter() {
        const footer = document.createElement("div");
        // Задаёт класс элемента.
        footer.className = this.CHAT_FOOTER_CLASS;
        if (!this.chat)
            return;
        this.chat.appendChild(footer);
        const button = document.createElement("button");
        const text = document.createElement("div");
        footer.appendChild(text);
        footer.appendChild(button);
        text.innerHTML = "Узнайте у бота, как найти нужный вам элемент сайта!";
        button.innerHTML = icons_1.ChatCloseButtonIcon;
        button.addEventListener("click", () => {
            this.isChatOpen = !this.isChatOpen;
            this.chat.classList.toggle("opened");
        });
    }
    /**
     * Инициализирует область просмотра сообщений.
     * Выводит в область все сообщения из списка {@link message}.
     * По событию `messages-update`, ререндерит область, добавляя новые сообщения из
     * {@link messages}.
     * @private
     */
    initChatMessages() {
        const chatMessages = document.createElement("div");
        chatMessages.className = this.CHAT_MESSAGES_CLASS;
        if (!this.chat)
            return;
        this.chat.appendChild(chatMessages);
        window.addEventListener("messages-update", () => {
            chatMessages.innerHTML = "";
            for (const message of this.messages) {
                const messageElement = document.createElement("div");
                messageElement.className = message.from;
                messageElement.innerHTML = message.text;
                chatMessages.appendChild(messageElement);
            }
            // Автоскроллл в самый низ списка.
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
        window.dispatchEvent(new Event("messages-update"));
    }
    /**
     * Инициализация всех стилей.
     * Все стили хранятся в папке `./icons`.
     * @private
     */
    initStyles() {
        const chatButtonSheet = new CSSStyleSheet();
        chatButtonSheet.replaceSync((0, styles_1.ChatButtonStyle)(this.CHAT_BUTTON_CLASS));
        const chatSheet = new CSSStyleSheet();
        chatSheet.replaceSync((0, styles_1.ChatStyle)(this.CHAT_CLASS));
        const chatMessageFieldSheet = new CSSStyleSheet();
        chatMessageFieldSheet.replaceSync((0, styles_1.ChatMessageFieldStyle)(this.CHAT_MESSAGE_FIELD_CLASS));
        const chatFooterSheet = new CSSStyleSheet();
        chatFooterSheet.replaceSync((0, styles_1.ChatFooterStyle)(this.CHAT_FOOTER_CLASS));
        const chatMessagesSheet = new CSSStyleSheet();
        chatMessagesSheet.replaceSync((0, styles_1.ChatMessagesStyle)(this.CHAT_MESSAGES_CLASS));
        document.adoptedStyleSheets = [
            ...document.adoptedStyleSheets,
            chatButtonSheet,
            chatSheet,
            chatMessageFieldSheet,
            chatFooterSheet,
            chatMessagesSheet
        ];
    }
    /**
     * Функция добавляет все элементы в DOM.
     * Если указан parent, добавляет элементы в него.
     * Если не указан, добавляет в body.
     * @private
     */
    renderElements() {
        if (!this.chatButton || !this.chat)
            return;
        if (this.parent) {
            // Если указан parent, создаёт элементы внутри него.
            this.parent.appendChild(this.chatButton);
            this.parent.appendChild(this.chat);
            return;
        }
        // Если parent не указан, создаёт элементы в body.
        document.body.appendChild(this.chatButton);
        document.body.appendChild(this.chat);
    }
    /**
     * Функция обработки отправки сообщения от пользователя.
     * Записывает новое сообщение в стек {@link messages}
     * и генерирует событие `messages-update`,
     * которое вызывает ререндер области отображения сообщений.
     * @private
     */
    onSendMessage(input) {
        if (!input.value)
            return;
        const message = {
            from: "user",
            text: input.value
        };
        this.messages.push(message);
        window.dispatchEvent(new Event("messages-update"));
        input.value = "";
        this.connector.send(message)
            .then(answer => {
            this.messages.push(answer);
            window.dispatchEvent(new Event("messages-update"));
            this.highlightSelectors(answer.selectors ?? []);
        });
        // Добавляет в конец userMessages последнее введённое сообщение.
        // Если такое сообщение уже было, удаляет его из списка и добавляет в конец.
        this.userMessages = this.userMessages.filter(userMessage => userMessage !== message.text);
        this.userMessages.push(message.text);
    }
    /**
     * Функция последовательно подсвечивает необходимые области.
     * По клику на область снимает подсвечивание и выделяет следующую после
     * выбранной область.
     *
     * @param selectors - список селекторов областей.
     * @private
     */
    highlightSelectors(selectors) {
        selectors.forEach((selector, index) => new utils_1.SelectorHighlighter(selector, selectors[index - 1], this.highlighterOptions));
    }
    /**
     * @param connector - экземпляр класса коннектора к LLM.
     * @param parent - родительский контейнер кнопки чата. Если не указан, родительским считается `body`.
     * @param highlighterOptions - настройки области подсветки.
     */
    constructor(connector, parent, highlighterOptions) {
        this.connector = connector;
        this.parent = parent;
        this.highlighterOptions = highlighterOptions;
        this.initStyles();
        this.initChatButton();
        this.initChat();
        this.initChatFooter();
        this.initChatMessages();
        this.initChatMessageField();
        this.renderElements();
    }
}
exports.AnchorAssistant = AnchorAssistant;
//# sourceMappingURL=AnchorAssistant.js.map