import { LLMConnector } from "./";
export class OpenAPI extends LLMConnector {
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
        try {
            const response = await fetch(this.config.model_url, {
                method: "POST",
                body: JSON.stringify(body)
            });
            if (!response.ok)
                return {
                    from: "llm",
                    text: "Ошибка отправки запроса в LLM!"
                };
            const data = await response.json();
            return this.parseAnswer(`${data.choices[0]?.message.content}`);
        }
        catch {
            return {
                from: "llm",
                text: "Ошибка отправки запроса в LLM! Проверьте доступность сервера."
            };
        }
    }
    constructor(anchors, config) {
        super(anchors);
        this.config = config;
    }
}
//# sourceMappingURL=OpenAPI.js.map