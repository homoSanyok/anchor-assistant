import {LLMConnector} from "./LLMConnector";
import {Anchor, GigaChatChatCompletion, Message} from "../types";
import {GigaChatConfig} from "../types";
import {SystemPrompt} from "./SystemPrompt";

/**
 * Класс подключает
 */
export class GigaChat extends LLMConnector {
    /**
     * Список якорей системы.
     * Задаётся посредством вызова сеттера {@link setAnchors}.
     * @private
     */
    anchors: Anchor[] = [];

    /**
     * Access token для авторизации запросов к GigaChat API.
     * @private
     */
    private AccessToken?: string;

    /**
     * Сеттер переменной {@link anchors}.
     * @param anchors
     */
    setAnchors(anchors: Anchor[]) {
        this.anchors = anchors;
    }

    /**
     * Функция получает от GigaChat API Access token
     * и возвращает его.
     *
     * @private
     */
    private async accessor() {
        const URL = this.config.accessor_url || "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";

        const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "RqUID": crypto.randomUUID(),
            "Authorization": `Basic ${this.config.authorization_key}`
        };
        const body = new URLSearchParams({ "scope": this.config.scope });

        const response = await fetch(URL, {
            method: "POST",
            headers: headers,
            body: body
        });

        if (!response.ok) return;

        const data: { access_token: string } = await response.json();
        this.AccessToken = data.access_token;
    }

    async send(message: Message): Promise<Message> {
        if (!this.AccessToken) return {
            from: "llm",
            text: "Ошибка авторизации в GigaChat!"
        };

        const URL = this.config.model_url || "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";

        const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "Authorization": `Bearer ${this.AccessToken}`
        };
        const body: GigaChatChatCompletion = {
            model: this.config.model,
            stream: false,
            update_interval: 0,
            messages: [
                {
                    role: "system",
                    content: SystemPrompt(this.anchors)
                },
                {
                    role: "user",
                    content: message.text
                }
            ]
        }

        const response = await fetch(URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            return {
                from: "llm",
                text: "Ошибка отправки запроса в GigaChat!"
            };
        }

        const data: { choices: { message: { content: string } }[] } = await response.json();
        return this.parseAnswer(`${data.choices[0]?.message.content}`);
    }

    constructor(private readonly config: GigaChatConfig) {
        super();

        this.accessor();
        setInterval(this.accessor.bind(this), 1000 * 60 * 10);
    }
}