import { Anchor, Message, OpenAPIConfig } from "../types";
import { LLMConnector } from "./";
export declare class OpenAPI extends LLMConnector {
    private readonly config;
    /** @inheritDoc */
    send(message: Message): Promise<Message>;
    constructor(anchors: Anchor[], config: OpenAPIConfig);
}
//# sourceMappingURL=OpenAPI.d.ts.map