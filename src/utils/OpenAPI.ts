import { Anchor, Message, OpenAPIConfig, OpenAPIRequest, OpenAPIResponse } from "../types";
import { LLMConnector } from "./";

export class OpenAPI extends LLMConnector {
    /** @inheritDoc */
    async send(message: Message): Promise<Message> {
        if (message.from === "llm") return {
            from: "llm",
            text: "Ошибка запроса! LLM может обрабатывать только пользовтательские запросы!"
        };
        if (!this.config.model_url) return {
            from: "llm",
            text: "Ошибка запроса! Не задан адрес LLM!"
        };

        const body: OpenAPIRequest = {
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

        if (!response.ok) return {
            from: "llm",
            text: "Ошибка отправки запроса в GigaChat!"
        };

        const data: OpenAPIResponse = await response.json();
        return this.parseAnswer(`${data.choices[0]?.message.content}`);
    }

    constructor(anchors: Anchor[], private readonly config: OpenAPIConfig) {
        super(anchors);
    }
}