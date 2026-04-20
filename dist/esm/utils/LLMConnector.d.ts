import { Anchor, Message } from "../types";
/**
 * Класс типизирует методы взаимодействия объекта
 * типа {@link AnchorAssistant} с LLM.
 */
export declare abstract class LLMConnector {
    private readonly anchors;
    protected anchorsString: string;
    /**
     * Функция отправляет пользовательский запрос в LLM и
     * возвращает Promise с ответом LLM.
     * @param message - пользовательский запрос
     */
    abstract send(message: Message): Promise<Message>;
    /**
     * Рекурсивная функция поиска полного пути до указанного якоря.
     * Возвращает списко формата: [искмный якорь, ..., последний родительский якорь].
     *
     * @param selectors - список якорей, который будет дополняться.
     * Ищет родительский якорь последнего элемента списка и возвращает новый список.
     */
    private selectorFinder;
    /**
     * Функция парсит ответ LLM в Message
     * @param answer - ответ LLM в строке
     * @protected
     */
    protected parseAnswer(answer: string): Message;
    /**
     * Функция преобразует объект якорей в строку для
     * последующей отправки в LLM.
     * @param anchors - список якорей
     */
    private parseAnchors;
    getAnchors(): Anchor[];
    constructor(anchors: Anchor[]);
}
//# sourceMappingURL=LLMConnector.d.ts.map