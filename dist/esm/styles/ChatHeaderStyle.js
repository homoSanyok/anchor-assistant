/**
 * Функция формирует стили для области создания сообщения.
 *
 * @param className - название класса элемента.
 * @constructor
 */
export function ChatHeaderStyle(className) {
    return /*css*/ `
            .${className} {
                width: 100%;
                overflow: hidden;
                padding: 16px;
                display: flex;
                gap: 16px;
                
                background: #ddf0de;
                border-radius: 8px 8px 0 0;
                
                order: 1;
            }
            
            .${className} > button {
                width: 40px;
                
                cursor: pointer;
                border-radius: 25%;
                border: none;
                background: #ddf0de;
                
                margin-left: auto;
                
                transition: all 0.3s ease;
            }
            .${className} > button:hover {
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .${className} > div {
                overflow: hidden;
                color: #10141B;
                font-variant-numeric: lining-nums tabular-nums slashed-zero;
                text-overflow: ellipsis;
                font-family: Arial;
                font-size: 12px;
                font-style: normal;
                font-weight: 500;
                line-height: 16px;
                letter-spacing: 0;
            }
        `;
}
//# sourceMappingURL=ChatHeaderStyle.js.map