import {GigaChatModel} from "./GigaChatConfig";

export interface GigaChatChatCompletion {
    model: GigaChatModel;
    messages: {
        role: "system" | "user",
        content: string;
    }[];
    stream: boolean;
    update_interval: number;
}