/**
 * Функция формирует стили для области просмотра сообщений.
 *
 * @param className - название класса элемента.
 * @constructor
 */
export function ChatMessagesStyle(className: string) {
    return `
            .${className} {
                flex: 1;
                overflow: auto;
                padding: 16px;
                
                display: flex;
                flex-direction: column;
                gap: 16px;
                
                background: #ffffff;
                
                order: 2;
            }
            
            .${className} > div {
                background: #ddf0de;
                padding: 16px;
                max-width: 90%;
                
                font-style: normal;
                font-size: 14px;
            }
            
            .${className} > div.user {
                margin-left: auto;
                border-radius: 8px 8px 0 8px;
            }
            .${className} > div.llm {
                margin-right: auto;
                border-radius: 8px 8px 8px 0;
            }
        `
}