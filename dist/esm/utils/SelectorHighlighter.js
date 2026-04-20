import { HighlightElement } from "./HighlightElement";
/**
 * Класс реализует подсветку компонента
 * до момента нажатия на него и слушатель нажатия на
 * родительский компонент, по срабатывании которого
 * подсветка компонента также прекращается.
 */
export class SelectorHighlighter {
    selector;
    options;
    abortController = new AbortController();
    /**
     * Подсвечивает элемент по селектору {@link selector}.
     * @private
     */
    highlight() {
        const elements = document.querySelectorAll(this.selector);
        if (elements.length === 0)
            return;
        const highlighter = document.createElement("div");
        highlighter.style.position = "absolute";
        highlighter.style.width = "100vw";
        highlighter.style.height = "100vh";
        highlighter.style.background = "#000000";
        highlighter.style.opacity = "0";
        highlighter.style.transition = "opacity 300ms";
        highlighter.style.zIndex = "100";
        highlighter.style.top = "0";
        highlighter.style.left = "0";
        document.body.appendChild(highlighter);
        setTimeout(() => highlighter.style.opacity = ".5", 300, { signal: this.abortController.signal });
        for (let i = 0; i < elements.length; i++) {
            const highlightElement = new HighlightElement(this.selector, elements.item(i), () => {
                highlightElement.remove();
                highlighter.style.opacity = "0";
                setTimeout(() => highlighter.remove(), 300, { signal: this.abortController.signal });
                setTimeout(() => window.dispatchEvent(new Event(this.selector)), this.options?.delay ?? 0, { signal: this.abortController.signal });
                window.dispatchEvent(new Event(`${this.selector}_closehighlighter`));
            });
        }
        highlighter.addEventListener("click", () => {
            highlighter.style.opacity = "0";
            setTimeout(() => highlighter.remove(), 300, { signal: this.abortController.signal });
            window.dispatchEvent(new Event(`${this.selector}_closehighlighter`));
        }, { once: true, signal: this.abortController.signal });
    }
    /**
     * @param selector - селектор выделяемого компонента.
     * @param parentSelector - селектор родительского компонента. Если не указан, выделение происходит сразу.
     * @param options - настройки области подсветки.
     */
    constructor(selector, parentSelector, options) {
        this.selector = selector;
        this.options = options;
        if (!parentSelector) {
            this.highlight();
            return;
        }
        window.addEventListener(parentSelector, this.highlight.bind(this), { once: true, signal: this.abortController.signal });
        window.addEventListener(`${selector}_closehighlighter`, () => {
            this.abortController.abort();
        }, { once: true, signal: this.abortController.signal });
    }
}
//# sourceMappingURL=SelectorHighlighter.js.map