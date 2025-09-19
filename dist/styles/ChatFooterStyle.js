"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatFooterStyle = ChatFooterStyle;
/**
 * Функция формирует стили для области создания сообщения.
 *
 * @param className - название класса элемента.
 * @constructor
 */
function ChatFooterStyle(className) {
    return `
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
                height: 40px;
                
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
                display: flex;
                align-items: center;
                font-style: normal;
                font-size: 14px;
                color: #525252;
            }
        `;
}
//# sourceMappingURL=ChatFooterStyle.js.map