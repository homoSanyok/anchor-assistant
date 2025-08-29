import {SelectorHighlighterOptions} from "../types";

/**
 * Класс реализует подсветку компонента
 * до момента нажатия на него и слушатель нажатия на
 * родительский компонент, по срабатывании которого
 * подсветка компонента также прекращается.
 */
export class SelectorHighlighter {
    /**
     * Подсвечивает элемент по селектору {@link selector}.
     * @private
     */
    private highlight() {
        const element = document.querySelector(this.selector) as HTMLElement | undefined;
        if (!element) return;

        const parentElement = element.parentElement;
        if (!parentElement) return;

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

        const elementRect = element.getBoundingClientRect();
        const originalElementStyles = {
          position: element.style.position,
          zIndex: element.style.zIndex,
          left: element.style.left,
          top: element.style.top
        };

        const plugElement = element.cloneNode(true) as HTMLElement;
        parentElement.insertBefore(plugElement, element);

        document.body.appendChild(element);
        element.style.position = "absolute";
        element.style.top = `${elementRect.top + window.scrollY}px`;
        element.style.left = `${elementRect.left + window.scrollX}px`;
        element.style.zIndex = "101";

        document.body.appendChild(highlighter);
        setTimeout(() => highlighter.style.opacity = ".5", 300);

        element.addEventListener("click", () => {
            plugElement.remove();
            parentElement.appendChild(element);
            element.style.position = originalElementStyles.position;
            element.style.top = originalElementStyles.top;
            element.style.left = originalElementStyles.left;
            element.style.zIndex = originalElementStyles.zIndex;

            highlighter.style.opacity = "0";
            setTimeout(() => highlighter.remove(), 300);
            setTimeout(() => window.dispatchEvent(new Event(this.selector)), this.options?.delay ?? 0);
        }, { once: true });
    }

    /**
     * @param selector - селектор выделяемого компонента.
     * @param parentSelector - селектор родительского компонента. Если не указан, выделение происходит сразу.
     * @param options - настройки области подсветки.
     */
    constructor(private readonly selector: string, private readonly parentSelector?: string, private readonly options?: SelectorHighlighterOptions) {
        if (!parentSelector) {
            this.highlight();
            return;
        }

        window.addEventListener(parentSelector, this.highlight.bind(this), { once: true });
    }
}