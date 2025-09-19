"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessageFieldStyle = ChatMessageFieldStyle;
/**
 * Функция формирует стили для области создания сообщения.
 *
 * @param className - название класса элемента.
 * @constructor
 */
function ChatMessageFieldStyle(className) {
    return `
            .${className} {
                width: 100%;
                overflow: hidden;
                padding: 16px;
                display: flex;
                gap: 16px;
                
                background: #ddf0de;
                border-radius: 0 0 8px 8px;
                
                margin-top: auto;
                order: 3;
            }
            
            .${className} > input {
                flex: 1;
                border: none;
                border-radius: 8px;
                padding: 8px;
            }
            .${className} > input:focus-visible {
                outline: none;
                border: solid 1px #77b870;
            }
            
            .${className} > button {
                width: 40px;
                height: 40px;
                
                cursor: pointer;
                border-radius: 25%;
                border: none;
                background: #ddf0de;
                
                transition: all 0.3s ease;
            }
            .${className} > button:hover {
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
        `;
}
//# sourceMappingURL=ChatMessageFieldStyle.js.map