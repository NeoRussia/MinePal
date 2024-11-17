import axios from 'axios';
import OpenAI from 'openai';

const MINEPAL_RESPONSE_FORMAT = {
    type: "json_schema",
    json_schema: {
        name: "minepal_response",
        schema: {
            type: "object",
            properties: {
                chat_response: { type: "string" },
                execute_command: { type: "string" }
            },
            required: ["chat_response", "execute_command"],
            additionalProperties: false
        },
        strict: true
    }
};

const MAX_RETRIES = 2;
// const REQUEST_TIMEOUT = 3000; // msec

export class GPT {
    constructor(model_name) {
        this.model_name = model_name;
        console.log(`Using model: ${model_name}`);
        this.openai_api_key = process.env.OPENAI_API_KEY;
        this.openai = new OpenAI({
            apiKey: this.openai_api_key
        });
    }

    async sendRequest(turns, systemMessage, stop_seq='***', memSaving=false) {
        let messages = [{'role': 'system', 'content': systemMessage.trim()}].concat(turns);

        // console.log("=== BEGIN MESSAGES ===");
        // messages.forEach((msg, index) => {
        //     console.log(`Message ${index + 1}:`);
        //     console.log(`Role: ${msg.role}`);
        //     console.log(`Content: ${msg.content}`);
        //     console.log("---");
        // });
        // console.log("=== END MESSAGES ===");

        let attempt = 0;    
        while (attempt <= MAX_RETRIES) {
            try {
                if (memSaving) {
                    return await this._sendStringRequest(messages, stop_seq);
                } else {
                    return await this._sendJsonRequest(messages, stop_seq);
                }
            } catch (err) {
                console.error("Request failed:", err);
                // console.error("Request failed");
                attempt++;
                if (attempt > MAX_RETRIES) {
                    let res = "My brain disconnected, try again.";
                    if (memSaving) {
                        return res;
                    } else {
                        return { chat_response: res };
                    }
                }
            }
        }

        return null;
    }

    async _sendJsonRequest(messages, stop_seq) {
        while (true) {
            let completion = await this.openai.chat.completions.create({
                model: this.model_name || "gpt-4o-mini",
                messages: messages,
                stop: stop_seq,
                max_completion_tokens: 256,
                response_format: MINEPAL_RESPONSE_FORMAT
            });
            try {
                let finish_reason = completion.choices[0].finish_reason;
                if (finish_reason == "stop") {
                    let content = completion.choices[0].message.content;
                    return JSON.parse(content);
                } else if (finish_reason == "length") {
                    // let message = completion.choices[0].message[0];
                    // console.log("message: ", message);
                    throw new Error("finish_reason is 'length' in the JSON mode.");
                } else {
                    throw new Error("finish_reason is not 'stop'.");
                }
            } catch (err) {
                // console.log("request: ", messages);
                // console.log("content: ", completion);
                // await new Promise((resolve) => setTimeout(resolve, 500));
                throw err;
            }
        }
    }

    async _sendStringRequest(messages, stop_seq) {
        let completion = await this.openai.chat.completions.create({
            model: this.model_name || "gpt-4o-mini",
            messages: messages,
            stop: stop_seq
        });
        let finish_reason = completion.choices[0].finish_reason;
        if (finish_reason == "stop") {
            return completion.choices[0].message.content;
        } else {
            throw new Error("finish_reason is not 'stop'.");
        }
    }

    async embed(text) {
        let model_name = this.model_name || "text-embedding-3-small";

        try {
            const embedding = await this.openai.embeddings.create({
                model: model_name,
                input: text,
                encoding_format: "float",
            });

            return embedding.data[0].embedding;
        } catch (err) {
            console.log(err);
            throw new Error('Failed to get embedding');
        }
    }
}