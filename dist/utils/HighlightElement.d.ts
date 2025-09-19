/**
 * Класс подсвечиваемого элемента.
 * Реализует вывод элемента в body, создание
 * его копии для сохранения разметки в родительском компоненте и
 * удаление элемента из body.
 */
export declare class HighlightElement {
    private readonly element;
    private callback;
    /**
     * Позиция элемента относительно области просмотра.
     * @private
     */
    private readonly elementRect;
    /**
     * Копия элемента.
     * @private
     */
    private readonly plugElement;
    /**
     * Родительский элемент текущего элемента.
     * @private
     */
    private readonly parentElement;
    private readonly originalStyles;
    /**
     * Функция создаёт копию элемента в том же родителе,
     * а сам элемент выносит в body.
     * @private
     */
    private highlight;
    /**
     * Удаляет элемент из body и удаляет слушатель события `click`.
     */
    remove(): void;
    /**
     * @param element - HTMLElement, который нужно подсветить.
     * @param callback - callback события нажатия на элемент.
     */
    constructor(element: HTMLElement, callback: () => void);
}
//# sourceMappingURL=HighlightElement.d.ts.map