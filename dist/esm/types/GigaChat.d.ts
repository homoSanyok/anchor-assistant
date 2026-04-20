/**
 * Дотсупные модели GigaChat
 */
export type GigaChatModel = "GigaChat-2" | "GigaChat-2-Pro" | "GigaChat-2-Max";
/**
 * Объект запроса в GigaChat.
 */
export interface GigaChatRequest {
    model: GigaChatModel;
    messages: {
        role: "system" | "user";
        content: string;
    }[];
    stream: boolean;
    update_interval: number;
}
export interface GigaChatResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}
/**
 * Конфигурация подключения к GigaChat API.
 */
export interface GigaChatConfig {
    accessor_url?: string;
    model_url?: string;
    scope: string;
    authorization_key: string;
    model: GigaChatModel;
    system?: string;
}
//# sourceMappingURL=GigaChat.d.ts.map