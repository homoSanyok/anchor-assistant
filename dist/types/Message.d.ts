/**
 * Типизирует объекты сообщений.
 */
export interface Message {
    /**
     * Кто инициатор сообщения.
     */
    from: "user" | "llm";
    /**
     * Текст сообщения, отображаемый пользователю.
     */
    text: string;
    /**
     * Если инициатор сообщения llm, задаётся список ссылок, который она нашла.
     */
    selectors?: string[];
}
//# sourceMappingURL=Message.d.ts.map