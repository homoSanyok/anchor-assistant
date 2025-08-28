import {Message} from "../types";

/**
 * Класс типизирует методы взаимодействия объекта
 * типа {@link AnchorAssistant} с LLM.
 */
export abstract class LLMConnector {
    abstract send(message: Message): Promise<Message>;
}