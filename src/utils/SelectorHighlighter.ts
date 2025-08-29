import {SelectorHighlighterOptions} from "../types";
import {HighlightElement} from "./HighlightElement";

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
        const elements = document.querySelectorAll<HTMLElement>(this.selector);
        if (elements.length === 0) return;

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
        setTimeout(() => highlighter.style.opacity = ".5", 300);

        for (let i = 0; i < elements.length; i++) {
            const highlightElement = new HighlightElement(elements.item(i), () => {
                highlightElement.remove();

                highlighter.style.opacity = "0";
                setTimeout(() => highlighter.remove(), 300);
                setTimeout(() => window.dispatchEvent(new Event(this.selector)), this.options?.delay ?? 0);
            })
        }

        highlighter.addEventListener("click", () => {
            highlighter.style.opacity = "0";
            setTimeout(() => highlighter.remove(), 300);

            window.dispatchEvent(new Event("closehighlighter"));
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
        window.addEventListener("closehighlighter", () => {
            window.removeEventListener(parentSelector, this.highlight.bind(this));
        }, { once: true })
    }
}