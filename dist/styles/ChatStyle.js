"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStyle = ChatStyle;
/**
 * Функция формирует стили для меню чата ИИ.
 *
 * @param className - название класса элемента.
 * @constructor
 */
function ChatStyle(className) {
    return `
            .${className} {
                position: fixed;
                width: 300px;
                height: 0px;
                right: 0;
                bottom: 48px;
                margin: 0 8px 8px 0;
                overflow: hidden;
                
                border-radius: 8px;
                border: none;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                background: #ffffff;
                
                transition: all 0.3s ease;
                
                display: flex;
                flex-direction: column;
                
                font-family: Roboto, "Helvetica Neue", sans-serif;
            }
            
            .${className}.opened {
                height: 500px;
            }
        `;
}
//# sourceMappingURL=ChatStyle.js.map