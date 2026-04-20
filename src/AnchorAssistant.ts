/**
 * @module AnchorAssistant
 */
import { ChatButtonIcon, ChatSendButtonIcon, ChatCloseButtonIcon } from "./icons";
import { Message, SelectorHighlighterOptions } from "./types";
import { ChatMessageFieldStyle, ChatStyle, ChatButtonStyle, ChatHeaderStyle, ChatMessagesStyle } from "./styles";
import { LLMConnector, SelectorHighlighter } from "./utils";

/**
 * Класс `AnchorAssistant`, отображающий кнопку чата,
 * сам чат и демонстрирует пользователю путь до нужного элемента.
 *
 * На вход получает один из экземпляров классов коннекторов
 * к LLM.
 */
export class AnchorAssistant {
    private readonly CHAT_BUTTON_CLASS = "anchor-assistant-chat-button";
    private readonly CHAT_CLASS = "anchor-assistant-chat";
    private readonly CHAT_MESSAGE_FIELD_CLASS = "anchor-assistant-chat-message-field";
    private readonly CHAT_HEADER_CLASS = "anchor-assistant-chat-header";
    private readonly CHAT_MESSAGES_CLASS = "anchor-assistant-chat-messages";

    /**
     * Флаг хранит состояние: открыт ли чат.
     * @private
     */
    private isChatOpen: boolean = false;

    /**
     * Хранит список сообщений {@link Message} текущей сессии.
     * В список сообщений входят пользовательские запросы и ответы LLM.
     * @private
     */
    private messages: Message[] = [];

    /**
     * Хранит список выбранных селекторов DOM объектов.
     * Если пользователь выбирал оин из селекторов, переданных в конструктор класса
     * @private
     */
    private selectedSelectors: string[] = [];

    /**
     * Объект хранит DOM элемент кнопки вызова чата.
     */
    chatButton?: HTMLButtonElement;

    /**
     * Объект хранит DOM элемент контейнера чата.
     */
    chat?: HTMLDivElement;

    /**
     * Функция инициализирует кнопку вызова чата.
     */
    private initChatButton() {
        this.chatButton = document.createElement("button");

        // Задаёт класс элемента.
        this.chatButton.className = this.CHAT_BUTTON_CLASS;

        // Вставка svg иконки в контент кнопки.
        this.chatButton.innerHTML = ChatButtonIcon;
    }

    /**
     * Функция инициализирует компонент чата.
     * Создаёт слушатели события нажатия на кнопку {@link chatButton}.
     * По событию скрывает или закрывает чат.
     * @private
     */
    private initChat() {
        this.chat = document.createElement("div");

        // Задаёт класс элемента.
        this.chat.className = this.CHAT_CLASS;

        if (!this.chatButton) return;
        // Слушатель клика по кнопке.
        // По клику добавляет или удаляет чату класс opened
        this.chatButton.addEventListener("click", () => {
            this.isChatOpen = !this.isChatOpen;
            this.chat!.classList.toggle("opened");

            if (this.isChatOpen) {
                // Если чат открыт,
                // делает input сообщения пользователя выделенным
                if (!this.chat) return;

                const messageField = this.chat.querySelector(`.${this.CHAT_MESSAGE_FIELD_CLASS}`);
                if (!messageField) return;

                const input = messageField.querySelector("input");
                if (!input) return;

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
    private initChatMessageField() {
        const messageField = document.createElement("div");

        // Задаёт класс элемента.
        messageField.className = this.CHAT_MESSAGE_FIELD_CLASS;

        if (!this.chat) return;
        this.chat.appendChild(messageField);

        const input = document.createElement("input");
        const button = document.createElement("button");

        messageField.appendChild(input);
        messageField.appendChild(button);

        input.placeholder = "Задайте свой вопрос...";
        button.innerHTML = ChatSendButtonIcon;

        button.addEventListener("click", () => this.onSendMessage(input));
        window.addEventListener("keydown", event => {
            if (this.isChatOpen && event.key === "Enter") this.onSendMessage(input);
        });

        input.addEventListener("keydown", event => {
            const userMessages = this.messages
                .filter(message => message.from === "user")
                .map(message => message.text);

            if (!this.isChatOpen) return;

            switch (event.key) {
                case "ArrowUp": {
                    event.preventDefault();
                    const valueIndex = userMessages.indexOf(input.value);
                    if (valueIndex === -1) {
                        input.value = userMessages.at(-1) || "";
                        return;
                    }
                    input.value = valueIndex - 1 < 0 ? "" : userMessages.at(valueIndex - 1) || "";
                    requestAnimationFrame(() => input.selectionStart = input.value.length);
                    break;
                }
                case "ArrowDown": {
                    event.preventDefault();
                    const valueIndex = userMessages.indexOf(input.value);
                    if (valueIndex === -1) {
                        input.value = userMessages.at(0) || "";
                        return;
                    }
                    input.value = userMessages.at(valueIndex + 1) || "";
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
    private initChatHeader() {
        const header = document.createElement("div");

        // Задаёт класс элемента.
        header.className = this.CHAT_HEADER_CLASS;

        if (!this.chat) return;
        this.chat.appendChild(header);

        const button = document.createElement("button");
        const text = document.createElement("div");

        header.appendChild(text);
        header.appendChild(button);

        text.innerHTML = "Узнайте у бота, как найти нужный вам элемент сайта!"
        button.innerHTML = ChatCloseButtonIcon;

        button.addEventListener("click", () => {
            this.isChatOpen = !this.isChatOpen;
            this.chat!.classList.toggle("opened");
        });
    }

    /**
     * Инициализирует область просмотра сообщений.
     * Выводит в область все сообщения из списка {@link message}.
     * По событию `messages-update`, ререндерит область, добавляя новые сообщения из
     * {@link messages}.
     * @private
     */
    private initChatMessages() {
        const chatMessages = document.createElement("div");
        chatMessages.className = this.CHAT_MESSAGES_CLASS;

        if (!this.chat) return;
        this.chat.appendChild(chatMessages);

        window.addEventListener("messages-update", () => {
            let diff = this.messages.length - chatMessages.children.length;
            do {
                const message = this.messages[this.messages.length - diff];
                diff--;
                if (!message) continue;

                const messageElement = document.createElement("div");
                messageElement.className = message.from;
                messageElement.innerHTML = message.text;

                chatMessages.appendChild(messageElement);
            } while (diff > 0);

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
    private initStyles() {
        const chatButtonSheet = new CSSStyleSheet();
        chatButtonSheet.replaceSync(ChatButtonStyle(this.CHAT_BUTTON_CLASS));

        const chatSheet = new CSSStyleSheet();
        chatSheet.replaceSync(ChatStyle(this.CHAT_CLASS));

        const chatMessageFieldSheet = new CSSStyleSheet();
        chatMessageFieldSheet.replaceSync(ChatMessageFieldStyle(this.CHAT_MESSAGE_FIELD_CLASS));

        const chatFooterSheet = new CSSStyleSheet();
        chatFooterSheet.replaceSync(ChatHeaderStyle(this.CHAT_HEADER_CLASS));

        const chatMessagesSheet = new CSSStyleSheet();
        chatMessagesSheet.replaceSync(ChatMessagesStyle(this.CHAT_MESSAGES_CLASS));

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
    private renderElements() {
        if (!this.chatButton || !this.chat) return;

        const parent = this.parent ?? document.body;
        parent.appendChild(this.chatButton);
        parent.appendChild(this.chat);
    }

    /**
     * Функция обработки отправки сообщения от пользователя.
     * Записывает новое сообщение в стек {@link messages}
     * и генерирует событие `messages-update`,
     * которое вызывает ререндер области отображения сообщений.
     * @private
     */
    private onSendMessage(input: HTMLInputElement) {
        const chatMessages = document.querySelector(`.${this.CHAT_MESSAGES_CLASS}`);
        const sendButton = document.querySelector(`.${this.CHAT_MESSAGE_FIELD_CLASS}`)?.querySelector("button");
        if (
            !input.value ||
            !chatMessages ||
            !sendButton ||
            !!chatMessages.querySelector("#anchor-assistant-loader")
        ) return;

        const message: Message = {
            from: "user",
            text: input.value
        };
        this.messages.push(message);
        window.dispatchEvent(new Event("messages-update"));

        input.value = "";

        const loaderElement = document.createElement("div");
        loaderElement.className = "loader";
        loaderElement.id = "anchor-assistant-loader";
        chatMessages.appendChild(loaderElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        sendButton.classList.toggle("disabled");

        this.connector.send(message)
            .then(answer => {
                loaderElement.remove();
                sendButton.classList.toggle("disabled");
                this.messages.push(answer);
                window.dispatchEvent(new Event("messages-update"));

                const filteredSelectors = answer.selectors?.filter(selector => this.selectedSelectors.indexOf(selector) === -1);
                this.highlightSelectors(filteredSelectors || []);
            });
    }

    /**
     * Функция инициализирует обработчик выбора пользователем селекторов, переданных
     * в коннекторе {@link connector}.
     *
     * Если до этого селектор не был выбран, он добавляется в список {@link selectedSelectors}.
     * Если был выбран, удаляется из списка.
     * @private
     */
    private initSelectorsSelectHandler() {
        const selectors = this.connector.getAnchors()
            .map(anchor => anchor.selector);

        selectors.forEach((selector) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => element.addEventListener("click", () => {
                if (this.selectedSelectors.indexOf(selector) !== -1) {
                    this.selectedSelectors = this.selectedSelectors.filter(s => s !== selector);
                    return;
                }
                this.selectedSelectors.push(selector);
            }));
        });
    }

    /**
     * Функция последовательно подсвечивает необходимые области.
     * По клику на область снимает подсвечивание и выделяет следующую после
     * выбранной область.
     *
     * @param selectors - список селекторов областей.
     * @private
     */
    private highlightSelectors(selectors: string[]) {
        selectors.forEach(
            (selector, index) =>
                new SelectorHighlighter(selector, index !== 0 ? selectors[index - 1] : undefined, this.highlighterOptions)
        );
    }

    /**
     * @param connector - экземпляр класса коннектора к LLM.
     * @param parent - родительский контейнер кнопки чата. Если не указан, родительским считается `body`.
     * @param highlighterOptions - настройки области подсветки.
     */
    constructor(
        private readonly connector: LLMConnector,
        private readonly parent?: HTMLElement,
        private readonly highlighterOptions?: SelectorHighlighterOptions
    ) {
        this.initStyles();

        this.initChatButton();
        this.initChat();
        this.initChatHeader();
        this.initChatMessages();
        this.initChatMessageField();

        setTimeout(this.initSelectorsSelectHandler.bind(this), 0);
        this.renderElements();
    }
}