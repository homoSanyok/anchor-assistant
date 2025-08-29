/**
 * Класс подсвечиваемого элемента.
 * Реализует вывод элемента в body, создание
 * его копии для сохранения разметки в родительском компоненте и
 * удаление элемента из body.
 */
export class HighlightElement {
    /**
     * Позиция элемента относительно области просмотра.
     * @private
     */
    private readonly elementRect;

    /**
     * Копия элемента.
     * @private
     */
    private readonly plugElement: HTMLElement;

    /**
     * Родительский элемент текущего элемента.
     * @private
     */
    private readonly parentElement: HTMLElement;

    private readonly originalStyles: {
        position: string;
        top: string;
        left: string;
        zIndex: string;
    };

    /**
     * Функция создаёт копию элемента в том же родителе,
     * а сам элемент выносит в body.
     * @private
     */
    private highlight() {
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
    constructor(
        private readonly element: HTMLElement,
        private callback: () => void
    ) {
        this.elementRect = this.element.getBoundingClientRect();
        this.plugElement = this.element.cloneNode(true) as HTMLElement;
        this.parentElement = this.element.parentElement!;
        this.originalStyles = {
            position: this.element.style.position,
            top: this.element.style.top,
            left: this.element.style.left,
            zIndex: this.element.style.zIndex
        };

        this.highlight();
        this.element.addEventListener("click", this.callback);
    }
}