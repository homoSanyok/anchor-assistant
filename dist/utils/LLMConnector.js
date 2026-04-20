"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMConnector = void 0;
/**
 * Класс типизирует методы взаимодействия объекта
 * типа {@link AnchorAssistant} с LLM.
 */
class LLMConnector {
    anchors;
    anchorsString;
    /**
     * Рекурсивная функция поиска полного пути до указанного якоря.
     * Возвращает списко формата: [искмный якорь, ..., последний родительский якорь].
     *
     * @param selectors - список якорей, который будет дополняться.
     * Ищет родительский якорь последнего элемента списка и возвращает новый список.
     */
    selectorFinder(selectors) {
        const selector = selectors.at(-1) ?? "";
        const parentSelector = this.anchors.find(anchor => anchor.selector === selector)?.parent_selector;
        if (!parentSelector)
            return selectors;
        return this.selectorFinder([...selectors, parentSelector]);
    }
    /**
     * Функция парсит ответ LLM в Message
     * @param answer - ответ LLM в строке
     * @protected
     */
    parseAnswer(answer) {
        let [link, text] = answer.split("|");
        if (!link) {
            return {
                from: "llm",
                text: "Ошибка парсинга ответа LLM!"
            };
        }
        return {
            from: "llm",
            text: text ?? "Для доступа к искомому меню, выберайте выделяемые на экране элементы пока не достигнете цели.",
            selectors: this.selectorFinder([link]).reverse()
        };
    }
    /**
     * Функция преобразует объект якорей в строку для
     * последующей отправки в LLM.
     * @param anchors - список якорей
     */
    parseAnchors(anchors) {
        let result = '';
        anchors.forEach(anchor => result = `${result}${anchor.selector} - ${anchor.anchor} - ${anchor.parent_selector}\n`);
        return result;
    }
    getAnchors() {
        return this.anchors;
    }
    constructor(anchors) {
        this.anchors = anchors;
        this.anchorsString = this.parseAnchors(anchors);
    }
}
exports.LLMConnector = LLMConnector;
//# sourceMappingURL=LLMConnector.js.map