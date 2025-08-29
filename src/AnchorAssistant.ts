/**
 * @module AnchorAssistant
 */
import {ChatButtonIcon, ChatSendButtonIcon} from "./icons";
import {Message, SelectorHighlighterOptions} from "./types";
import {ChatMessageFieldStyle, ChatStyle, ChatButtonStyle, ChatFooterStyle, ChatMessagesStyle} from "./styles";
import {ChatCloseButtonIcon} from "./icons/ChatCloseButtonIcon";
import {LLMConnector, SelectorHighlighter} from "./utils";
import {Anchor} from "./types";

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
    private readonly CHAT_FOOTER_CLASS = "anchor-assistant-chat-footer";
    private readonly CHAT_MESSAGES_CLASS = "anchor-assistant-chat-messages";

    /**
     * Флаг хранит состояние: открыт ли чат.
     * @private
     */
    private isChatOpen: boolean = false;

    /**
     * Хранит список сообщений {@link Message} текущей сессии.
     * @private
     */
    private messages: Message[] = [];

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
           if (this.isChatOpen && event.key === "Enter")
               this.onSendMessage(input);
        });
    }

    /**
     * Функция инициализирует footer чата.
     *
     * Создаёт DOM элемент кнопки скрытия и реализует
     * закрытье меню по её нажатии.
     * @private
     */
    private initChatFooter() {
        const footer = document.createElement("div");

        // Задаёт класс элемента.
        footer.className = this.CHAT_FOOTER_CLASS;

        if (!this.chat) return;
        this.chat.appendChild(footer);

        const button = document.createElement("button");
        const text = document.createElement("div");

        footer.appendChild(text);
        footer.appendChild(button);

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
            chatMessages.innerHTML = "";

            for (const message of this.messages) {
                const messageElement = document.createElement("div");
                messageElement.className = message.from;
                messageElement.innerHTML = message.text;

                chatMessages.appendChild(messageElement);
            }
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
        chatFooterSheet.replaceSync(ChatFooterStyle(this.CHAT_FOOTER_CLASS));

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
    private onSendMessage(input: HTMLInputElement) {
        if (!input.value) return;

        const message: Message = {
            from: "user",
            text: input.value
        };
        this.messages.push(message);
        window.dispatchEvent(new Event("messages-update"));

        input.value = "";

        this.highlightSelectors(["#link-button"]);
        // this.connector.send(message)
        //     .then(answer => {
        //         this.messages.push(answer);
        //         window.dispatchEvent(new Event("messages-update"));
        //     });
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
                new SelectorHighlighter(selector, selectors[index - 1], this.highlighterOptions)
        );
    }

    /**
     * @param connector - экземпляр класса коннектора к LLM.
     * @param anchors - массив якорей интерфейса.
     * @param parent - родительский контейнер кнопки чата. Если не указан, родительским считается `body`.
     * @param highlighterOptions - настройки области подсветки.
     */
    constructor(
        private readonly connector: LLMConnector,
        private readonly anchors: Anchor[],
        private readonly parent?: HTMLElement,
        private readonly highlighterOptions?: SelectorHighlighterOptions
    ) {
        this.connector.setAnchors(this.anchors);

        this.initStyles();

        this.initChatButton();
        this.initChat();
        this.initChatFooter();
        this.initChatMessages();
        this.initChatMessageField();

        this.renderElements();
    }
}