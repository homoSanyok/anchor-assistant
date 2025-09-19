"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HighlightElement = void 0;
/**
 * Класс подсвечиваемого элемента.
 * Реализует вывод элемента в body, создание
 * его копии для сохранения разметки в родительском компоненте и
 * удаление элемента из body.
 */
class HighlightElement {
    element;
    callback;
    /**
     * Позиция элемента относительно области просмотра.
     * @private
     */
    elementRect;
    /**
     * Копия элемента.
     * @private
     */
    plugElement;
    /**
     * Родительский элемент текущего элемента.
     * @private
     */
    parentElement;
    originalStyles;
    /**
     * Функция создаёт копию элемента в том же родителе,
     * а сам элемент выносит в body.
     * @private
     */
    highlight() {
        this.parentElement.insertBefore(this.plugElement, this.element);
        document.body.appendChild(this.element);
        this.element.style.position = "absolute";
        this.element.style.top = `${this.elementRect.top + window.scrollY}px`;
        this.element.style.left = `${this.elementRect.left + window.scrollX}px`;
        this.element.style.zIndex = "101";
    }
    /**
     * Удаляет элемент из body и удаляет слушатель события `click`.
     */
    remove() {
        this.parentElement.insertBefore(this.element, this.plugElement);
        this.element.style.position = this.originalStyles.position;
        this.element.style.top = this.originalStyles.top;
        this.element.style.left = this.originalStyles.left;
        this.element.style.zIndex = this.originalStyles.zIndex;
        this.element.removeEventListener("click", this.callback);
        this.plugElement.remove();
    }
    /**
     * @param element - HTMLElement, который нужно подсветить.
     * @param callback - callback события нажатия на элемент.
     */
    constructor(element, callback) {
        this.element = element;
        this.callback = callback;
        this.elementRect = this.element.getBoundingClientRect();
        this.plugElement = this.element.cloneNode(true);
        this.parentElement = this.element.parentElement;
        this.originalStyles = {
            position: this.element.style.position,
            top: this.element.style.top,
            left: this.element.style.left,
            zIndex: this.element.style.zIndex
        };
        this.highlight();
        this.element.addEventListener("click", this.callback);
        window.addEventListener("closehighlighter", this.remove.bind(this));
    }
}
exports.HighlightElement = HighlightElement;
//# sourceMappingURL=HighlightElement.js.map