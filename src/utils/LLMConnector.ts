import {Anchor, Message} from "../types";

/**
 * Класс типизирует методы взаимодействия объекта
 * типа {@link AnchorAssistant} с LLM.
 */
export abstract class LLMConnector {
    protected abstract anchors: Anchor[];

    abstract setAnchors(anchors: Anchor[]): void;
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
}