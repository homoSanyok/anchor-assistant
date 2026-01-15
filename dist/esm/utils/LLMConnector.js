import { SystemPrompt } from "./SystemPrompt";
/**
 * Класс типизирует методы взаимодействия объекта
 * типа {@link AnchorAssistant} с LLM.
 */
export class LLMConnector {
    anchors;
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
        return {
            from: "llm",
            text: text,
            selectors: links.split(",")
        };
    }
    getAnchors() {
        return this.anchors;
    }
    constructor(anchors) {
        this.anchors = anchors;
        this.systemPrompt = SystemPrompt(anchors);
    }
}
//# sourceMappingURL=LLMConnector.js.map