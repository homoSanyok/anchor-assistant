/**
 * Функция формирует стили для области просмотра сообщений.
 *
 * @param className - название класса элемента.
 * @constructor
 */
export function ChatMessagesStyle(className: string) {
    return /*css*/ `
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
                
                color: #10141B;
                font-variant-numeric: lining-nums tabular-nums slashed-zero;
                font-family: Arial;
                font-size: 14px;
                font-style: normal;
                font-weight: 400;
                line-height: 16px;
                letter-spacing: 0;
            }
            
            .${className} > div.user {
                margin-left: auto;
                border-radius: 8px 8px 0 8px;
            }
            .${className} > div.llm {
                margin-right: auto;
                border-radius: 8px 8px 8px 0;
            }

            .${className} > div.loader {
                background: #ddf0de;
                margin-right: auto;
                border-radius: 50%;
                padding: 10px;
                animation: pulse 1.5s infinite ease-in-out;
            }
            @keyframes pulse {
                0% {
                    transform: scale(1);
                    opacity: 1;
                }
                50% {
                    transform: scale(.85);
                    opacity: 0.85;
                }
                100% {
                    transform: scale(1);
                    opacity: 1;
                }
            }
        `
}