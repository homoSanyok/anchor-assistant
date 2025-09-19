import { SelectorHighlighterOptions } from "./types";
import { LLMConnector } from "./utils";
/**
 * Класс `AnchorAssistant`, отображающий кнопку чата,
 * сам чат и демонстрирует пользователю путь до нужного элемента.
 *
 * На вход получает один из экземпляров классов коннекторов
 * к LLM.
 */
export declare class AnchorAssistant {
    private readonly connector;
    private readonly parent?;
    private readonly highlighterOptions?;
    private readonly CHAT_BUTTON_CLASS;
    private readonly CHAT_CLASS;
    private readonly CHAT_MESSAGE_FIELD_CLASS;
    private readonly CHAT_FOOTER_CLASS;
    private readonly CHAT_MESSAGES_CLASS;
    /**
     * Флаг хранит состояние: открыт ли чат.
     * @private
     */
    private isChatOpen;
    /**
     * Хранит список сообщений {@link Message} текущей сессии.
     * @private
     */
    private messages;
    /**
     * Функция хранит список всех сообщений, которые вводил пользователь
     * в текущей сессии.
     *
     * Используется для реализации автоподставления сообщений
     * по нажатии на клавиши `стрелка вверх` и `стрелка вниз`.
     * @private
     */
    private userMessages;
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
    private initChatButton;
    /**
     * Функция инициализирует компонент чата.
     * Создаёт слушатели события нажатия на кнопку {@link chatButton}.
     * По событию скрывает или закрывает чат.
     * @private
     */
    private initChat;
    /**
     * Функция инициализирует поле для создания сообщения.
     * Создаёт DOM элементы input и button и реализует
     * отправку сообщения в хранилище {}
     * @private
     */
    private initChatMessageField;
    /**
     * Функция инициализирует footer чата.
     *
     * Создаёт DOM элемент кнопки скрытия и реализует
     * закрытье меню по её нажатии.
     * @private
     */
    private initChatFooter;
    /**
     * Инициализирует область просмотра сообщений.
     * Выводит в область все сообщения из списка {@link message}.
     * По событию `messages-update`, ререндерит область, добавляя новые сообщения из
     * {@link messages}.
     * @private
     */
    private initChatMessages;
    /**
     * Инициализация всех стилей.
     * Все стили хранятся в папке `./icons`.
     * @private
     */
    private initStyles;
    /**
     * Функция добавляет все элементы в DOM.
     * Если указан parent, добавляет элементы в него.
     * Если не указан, добавляет в body.
     * @private
     */
    private renderElements;
    /**
     * Функция обработки отправки сообщения от пользователя.
     * Записывает новое сообщение в стек {@link messages}
     * и генерирует событие `messages-update`,
     * которое вызывает ререндер области отображения сообщений.
     * @private
     */
    private onSendMessage;
    /**
     * Функция последовательно подсвечивает необходимые области.
     * По клику на область снимает подсвечивание и выделяет следующую после
     * выбранной область.
     *
     * @param selectors - список селекторов областей.
     * @private
     */
    private highlightSelectors;
    /**
     * @param connector - экземпляр класса коннектора к LLM.
     * @param parent - родительский контейнер кнопки чата. Если не указан, родительским считается `body`.
     * @param highlighterOptions - настройки области подсветки.
     */
    constructor(connector: LLMConnector, parent?: HTMLElement | undefined, highlighterOptions?: SelectorHighlighterOptions | undefined);
}
//# sourceMappingURL=AnchorAssistant.d.ts.map