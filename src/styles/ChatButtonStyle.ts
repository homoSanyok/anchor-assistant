/**
 * Функция формирует стили для кнопки открытия чата ИИ.
 *
 * @param className - название класса элемента.
 * @constructor
 */
export function ChatButtonStyle(className: string) {
    return `
            .${className} {
                position: fixed;
                width: 40px;
                height: 40px;
                right: 0;
                bottom: 0;
                margin: 0 8px 8px 0;
                
                cursor: pointer;
                border-radius: 25%;
                border: none;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                background: #ffffff;
                
                transition: all 0.3s ease;
            }
            
            .${className}:hover {
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                background: #ddf0de;
            }
        `
}