"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMConnector = void 0;
const SystemPrompt_1 = require("./SystemPrompt");
/**
 * Класс типизирует методы взаимодействия объекта
 * типа {@link AnchorAssistant} с LLM.
 */
class LLMConnector {
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
        this.systemPrompt = (0, SystemPrompt_1.SystemPrompt)(anchors);
    }
}
exports.LLMConnector = LLMConnector;
//# sourceMappingURL=LLMConnector.js.map