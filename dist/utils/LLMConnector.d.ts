import { Anchor, Message } from "../types";
/**
 * Класс типизирует методы взаимодействия объекта
 * типа {@link AnchorAssistant} с LLM.
 */
export declare abstract class LLMConnector {
    private readonly anchors;
    protected systemPrompt: string;
    /**
     * функция отправляет пользовательский запрос в LLM и
     * возвращает Promise с ответом LLM.
     * @param message
     */
    abstract send(message: Message): Promise<Message>;
    /**
     * Функция парсит ответ LLM в Message
     * @param answer
     * @protected
     */
    protected parseAnswer(answer: string): Message;
    getAnchors(): Anchor[];
    constructor(anchors: Anchor[]);
}
//# sourceMappingURL=LLMConnector.d.ts.map