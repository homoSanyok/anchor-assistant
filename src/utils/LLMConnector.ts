import { Anchor, Message } from "../types";

/**
 * Класс типизирует методы взаимодействия объекта
 * типа {@link AnchorAssistant} с LLM.
 */
export abstract class LLMConnector {
    protected anchorsString: string;

    /**
     * Функция отправляет пользовательский запрос в LLM и
     * возвращает Promise с ответом LLM.
     * @param message - пользовательский запрос
     */
    abstract send(message: Message): Promise<Message>;

    /**
     * Рекурсивная функция поиска полного пути до указанного якоря.
     * Возвращает списко формата: [искмный якорь, ..., последний родительский якорь].
     * 
     * @param selectors - список якорей, который будет дополняться.
     * Ищет родительский якорь последнего элемента списка и возвращает новый список.
     */
    private selectorFinder(selectors: string[]): string[] {
        const selector = selectors.at(-1) ?? "";
        const parentSelector = this.anchors.find(anchor => anchor.selector === selector)?.parent_selector;

        if (!parentSelector || parentSelector === "root") return selectors;
        return this.selectorFinder([...selectors, parentSelector]);
    }

    /**
     * Функция парсит ответ LLM в Message
     * @param answer - ответ LLM в строке
     * @protected
     */
    protected parseAnswer(answer: string): Message {
        let [link, text] = answer.split("|");
        if (!link) return {
            from: "llm",
            text: "Ошибка парсинга ответа LLM!"
        };

        if (link === "not_found") return {
            from: "llm",
            text: "Извините, раздел не найден."
        };

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
    private parseAnchors(anchors: Anchor[]): string {
        let result = '';
        anchors.forEach(anchor => result = `${result}${anchor.selector} - ${anchor.anchor} - ${anchor.parent_selector}\n`);
        return result;
    }

    getAnchors() {
        return this.anchors;
    }

    constructor(private readonly anchors: Anchor[]) {
        this.anchorsString = this.parseAnchors(anchors);
    }
}