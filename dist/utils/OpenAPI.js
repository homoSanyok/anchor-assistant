"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAPI = void 0;
const _1 = require("./");
class OpenAPI extends _1.LLMConnector {
    config;
    /** @inheritDoc */
    async send(message) {
        if (message.from === "llm")
            return {
                from: "llm",
                text: "Ошибка запроса! LLM может обрабатывать только пользовтательские запросы!"
            };
        if (!this.config.model_url)
            return {
                from: "llm",
                text: "Ошибка запроса! Не задан адрес LLM!"
            };
        const body = {
            model: this.config.model,
            messages: [
                {
                    "role": "user",
                    "content": `Запрос:\n${message.text}\n\nЯкоря:\n${this.anchorsString}`
                }
            ],
            max_tokens: this.config.max_tokens,
            temperature: this.config.temperature
        };
        const response = await fetch(this.config.model_url, {
            method: "POST",
            body: JSON.stringify(body)
        });
        if (!response.ok)
            return {
                from: "llm",
                text: "Ошибка отправки запроса в GigaChat!"
            };
        const data = await response.json();
        return this.parseAnswer(`${data.choices[0]?.message.content}`);
    }
    constructor(anchors, config) {
        super(anchors);
        this.config = config;
    }
}
exports.OpenAPI = OpenAPI;
//# sourceMappingURL=OpenAPI.js.map