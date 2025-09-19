import { Anchor, Message, GigaChatConfig } from "../types";
import { LLMConnector } from "./";
/**
 * Класс подключает
 */
export declare class GigaChat extends LLMConnector {
    private readonly config;
    /**
     * Access token для авторизации запросов к GigaChat API.
     * @private
     */
    private AccessToken?;
    /**
     * Функция получает от GigaChat API Access token
     * и возвращает его.
     *
     * @private
     */
    private accessor;
    send(message: Message): Promise<Message>;
    constructor(anchors: Anchor[], config: GigaChatConfig);
}
//# sourceMappingURL=GigaChat.d.ts.map