import { SelectorHighlighterOptions } from "../types";
/**
 * Класс реализует подсветку компонента
 * до момента нажатия на него и слушатель нажатия на
 * родительский компонент, по срабатывании которого
 * подсветка компонента также прекращается.
 */
export declare class SelectorHighlighter {
    private readonly selector;
    private readonly parentSelector?;
    private readonly options?;
    /**
     * Подсвечивает элемент по селектору {@link selector}.
     * @private
     */
    private highlight;
    /**
     * @param selector - селектор выделяемого компонента.
     * @param parentSelector - селектор родительского компонента. Если не указан, выделение происходит сразу.
     * @param options - настройки области подсветки.
     */
    constructor(selector: string, parentSelector?: string | undefined, options?: SelectorHighlighterOptions | undefined);
}
//# sourceMappingURL=SelectorHighlighter.d.ts.map