/**
 * Объект запроса к LLM
 */
export interface OpenAPIRequest {
    model: string;
    messages: [
        {
            role: string;
            content: string;
        }
    ];
    max_tokens: number;
    temperature: number;
}
/**
 * Объект ответа LLM
 */
export interface OpenAPIResponse {
    id: string;
    object: string;
    created: 1776661527;
    model: string;
    choices: [
        {
            index: 0;
            message: {
                role: "assistant";
                content: string;
            };
            finish_reason: "stop";
        }
    ];
    usage: {
        prompt_tokens: 152;
        completion_tokens: 4;
        total_tokens: 156;
    };
}
/**
 * Конфиг для создания класса OpenAPI
 */
export interface OpenAPIConfig {
    model_url?: string;
    model: string;
    max_tokens: number;
    temperature: number;
}
//# sourceMappingURL=OpenAPI.d.ts.map