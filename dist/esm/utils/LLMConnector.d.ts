import { Anchor, Message } from "../types";
/**
 * Класс типизирует методы взаимодействия объекта
 * типа {@link AnchorAssistant} с LLM.
 */
export declare abstract class LLMConnector {
    protected systemPrompt: string;
    abstract send(message: Message): Promise<Message>;
    /**
     * Функция парсит ответ LLM в Message
     * @param answer
     * @protected
     */
    protected parseAnswer(answer: string): Message;
    constructor(anchors: Anchor[]);
}
//# sourceMappingURL=LLMConnector.d.ts.map