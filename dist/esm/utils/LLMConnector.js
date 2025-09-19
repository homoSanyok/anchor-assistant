import { SystemPrompt } from "./SystemPrompt";
/**
 * Класс типизирует методы взаимодействия объекта
 * типа {@link AnchorAssistant} с LLM.
 */
export class LLMConnector {
    systemPrompt;
    /**
     * Функция парсит ответ LLM в Message
     * @param answer
     * @protected
     */
    parseAnswer(answer) {
        let [links, text] = answer.split(".");
        if (!links || !text) {
            return {
                from: "llm",
                text: "Ошибка парсинга ответа LLM!"
            };
        }
        links = links.replaceAll(' ', '');
        const message = {
            from: "llm",
            text: text,
            selectors: links.split(",")
        };
        return message;
    }
    constructor(anchors) {
        this.systemPrompt = SystemPrompt(anchors);
    }
}
//# sourceMappingURL=LLMConnector.js.map