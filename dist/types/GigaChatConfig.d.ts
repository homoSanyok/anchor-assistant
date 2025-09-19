export type GigaChatModel = "GigaChat-2" | "GigaChat-2-Pro" | "GigaChat-2-Max";
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
//# sourceMappingURL=GigaChatConfig.d.ts.map