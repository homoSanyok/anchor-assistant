import {Anchor, Message} from "../types";
import {SystemPrompt} from "./SystemPrompt";

/**
 * Класс типизирует методы взаимодействия объекта
 * типа {@link AnchorAssistant} с LLM.
 */
export abstract class LLMConnector {
    protected systemPrompt: string;

    abstract send(message: Message): Promise<Message>;

    /**
     * Функция парсит ответ LLM в Message
     * @param answer
     * @protected
     */
    protected parseAnswer(answer: string): Message {
        let [links, text] = answer.split(".");
        if (!links || !text) {
            return {
                from: "llm",
                text: "Ошибка парсинга ответа LLM!"
            }
        }

        links = links.replaceAll(' ', '');
        const message: Message = {
            from: "llm",
            text: text,
            selectors: links.split(",")
        };

        return message;
    }

    constructor(anchors: Anchor[]) {
        this.systemPrompt = SystemPrompt(anchors);
    }
}