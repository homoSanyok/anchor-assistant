import {ChatButtonStyle, ChatButtonIcon} from "./constants";

/**
 * Класс `AnchorAssistant`, отображающий кнопку чата,
 * сам чат и демонстрирует пользователю путь до нужного элемента.
 *
 * На вход получает один из экземпляров классов коннекторов
 * к LLM.
 */
export class AnchorAssistant {
    readonly CHAT_BUTTON_CLASS = "anchor-assistant-chat-button";
    readonly CHAT_BUTTON_ID = "anchor-assistant-chat-button_element";

    readonly CHAT_CLASS = "anchor-assistant-chat";
    readonly CHAT_ID = "anchor-assistant-chat_element"

    private isChatOpen: boolean = false;

    /**
     * Функция отображает кнопку чата внутри родительского компонента
     * {@link parent}, если он указан.
     */
    private showChatButton() {
        const button = document.createElement("button");

        // Задаёт класс и id элемента.
        button.className = this.CHAT_BUTTON_CLASS;
        button.id = this.CHAT_BUTTON_ID;

        // Вставка svg иконки в контент кнопки.
        button.innerHTML = ChatButtonIcon;

        if (this.parent) {
            // Если указан parent, создаёт элемент внутри него.
            this.parent.appendChild(button);
            return;
        }
        // Если parent не указан, создаёт элемент в body.
        document.body.appendChild(button);
    }

    /**
     * Функция инициализирует компонент чата.
     * Создаёт слушатели события нажатия на кнопку с id {@link CHAT_BUTTON_ID}.
     * По событию скрывает или закрывает чат.
     * @private
     */
    private initChat() {
        const chat = document.createElement("div");

        // Задаёт класс и id элемента.
        chat.className = this.CHAT_CLASS;
        chat.id = this.CHAT_ID;


    }

    /**
     * Инициализация всех стилей.
     * Все стили хранятся в папке `./constants`.
     * @private
     */
    private initStyles() {
        const buttonSheet = new CSSStyleSheet();
        buttonSheet.replaceSync(ChatButtonStyle(this.CHAT_BUTTON_CLASS));

        document.adoptedStyleSheets = [ ...document.adoptedStyleSheets, buttonSheet ];
    }

    /**
     * @param parent - родительский контейнер кнопки чата.
     * Если не указан, родительским считается `body`.
     */
    constructor(private readonly parent?: HTMLElement) {
        this.initStyles();
        this.showChatButton();
    }
}