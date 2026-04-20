import { Anchor, Message, GigaChatConfig, GigaChatResponse, GigaChatRequest } from "../types";
import { LLMConnector } from "./";

/**
 * Класс подключает
 */
export class GigaChat extends LLMConnector {
    /**
     * Access token для авторизации запросов к GigaChat API.
     * @private
     */
    private AccessToken?: string;

    /**
     * Системный запрос к GigaChat.
     * @private
     */
    private readonly systemPrompt = `
        # РОЛЬ
        Ты — AI-ассистент для навигации по веб-интерфейсу. Твоя единственная задача — анализировать запросы пользователей и предоставлять конечную точку пути до запрашиваемого элемента.
        
        # ДАННЫЕ
        Тебе доступна следующая структура якорей (в формате <селектор> - <описание> - <родительский селектор>).
        Сама структура будет отдана тебе в пользовательском сообщении.

        Формат пользовтательского сообщения:
        Запрос:\n{запрос пользователя}\n\nЯкоря:\n{полная структура якорей}
        
        # ИНСТРУКЦИИ ПО АНАЛИЗУ
        1. Определи intent пользователя на основе запроса
        2. Найди самый релевантный якорь по ключевым словам
        3. Сформируй краткое описание того, как добраться до этого якоря
        
        # ФОРМАТ ОТВЕТА
        Верни сам якорь и краткое описание того, как до него добраться.
        Если якорь не найден, верни изменение.
        
        Примеры ответов:
        - #settings-button|Настройки приложения
        - #user-profile-button|Настройки -> кнопка редактирования пользователя
        - not_found|Извините, раздел не найден
        
        # ПРАВИЛА
        - Используй ТОЛЬКО предоставленные якоря
        - Не придумывай новые селекторы или функциональность
        - Если запрос не соответствует ни одному якорю возвращай: not_found
    `;

    /**
     * Функция получает от GigaChat API Access token
     * и возвращает его.
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

    /** @inheritDoc */
    async send(message: Message): Promise<Message> {
        if (message.from === "llm") return {
            from: "llm",
            text: "Ошибка запроса! LLM может обрабатывать только пользовтательские запросы!"
        };

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
        const body: GigaChatRequest = {
            model: this.config.model,
            stream: false,
            update_interval: 0,
            messages: [
                {
                    role: "system",
                    content: this.systemPrompt
                },
                {
                    role: "user",
                    content: `Запрос:\n${message.text}\n\nЯкоря:\n${this.anchorsString}`
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

        const data: GigaChatResponse = await response.json();
        return this.parseAnswer(`${data.choices[0]?.message.content}`);
    }

    constructor(anchors: Anchor[], private readonly config: GigaChatConfig) {
        super(anchors);

        this.accessor();
        setInterval(this.accessor.bind(this), 1000 * 60 * 10);
    }
}