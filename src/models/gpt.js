import OpenAI from 'openai';
import { Langfuse } from "langfuse";

const DEBUG = true;

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
    constructor(model_name, embedding_model_name) {
        this.model_name = model_name || "gpt-4o-mini";
        this.embedding_model_name = embedding_model_name || "text-embedding-3-small";

        console.log(`Using model: ${model_name}`);
        console.log(`Using embedding model: ${embedding_model_name}`);

        this.openai_api_key = process.env.OPENAI_API_KEY;
        this.openai = new OpenAI({
            apiKey: this.openai_api_key
        });

        if (DEBUG) {
            // logging with Langfuse
            let langfuse_secret_key = process.env.MINEPAL_LANGFUSE_SECRET_KEY;
            let langfuse_public_key = process.env.MINEPAL_LANGFUSE_PUBLIC_KEY;
            let langfuse_baseurl = process.env.MINEPAL_LANGFUSE_BASEURL;

            if (langfuse_secret_key !== undefined && langfuse_public_key !== undefined && langfuse_baseurl !== undefined) {
                this.langfuse = new Langfuse({
                    secretKey: langfuse_secret_key,
                    publicKey: langfuse_public_key,
                    baseUrl: langfuse_baseurl
                });
                this.trace = null;
            }
        }
    }

    async sendRequest(turns, systemMessage, stop_seq='***', memSaving=false) {
        let messages = [{'role': 'system', 'content': systemMessage.trim()}].concat(turns);

        let trace = this.trace || this.langfuse?.trace({
            name: memSaving? "Memory optimization" : "Response generation",
        });

        const span = trace?.span({
            name: memSaving? "Memory optimization" : "Response generation",
            input: messages
        });

        let attempt = 0;    
        while (attempt <= MAX_RETRIES) {
            try {
                let result;
                if (memSaving) {
                    result = await this._sendStringRequest(messages, stop_seq);
                } else {
                    result = await this._sendJsonRequest(messages, stop_seq);
                }
                
                span?.update({
                    endTime: new Date(),
                    output: result
                });

                return result;
            } catch (err) {
                console.error("Request failed:", err);
                // console.error("Request failed");
                attempt++;
            }
        }

        let res = "My brain disconnected, try again.";

        span?.update({
            endTime: new Date(),
            statusMessage: res,
            level: "ERROR"
        });

        if (memSaving) {
            return res;
        } else {
            return { chat_response: res };
        }
    }

    async _sendJsonRequest(messages, stop_seq) {
        const modelParameters = {
            model: this.model_name,
            stop: stop_seq,
            max_completion_tokens: 512,
            response_format: MINEPAL_RESPONSE_FORMAT,
            logit_bias: {
                "198": -100,
                "279": -100,
                "2499": -100,
                "4707": -100,
                "27559": -100,
                "37680": -100,
                "70224": -100,
                "21301": -100,
                "128841": -100,
                "160468": -100,
                "64469": -100
            }  // Temporary workaround: https://github.com/openai/openai-node/issues/1185
        };

        const generation = this.trace?.generation({
            name: "Response generation",
            model: this.model_name,
            modelParameters: modelParameters,
            input: messages
        });

        try {
            let completion = await this.openai.chat.completions.create({...modelParameters, messages });

            generation?.update({
                output: completion,
                endTime: new Date()
            });

            let finish_reason = completion.choices[0].finish_reason;
            if (finish_reason == "stop") {
                let content = completion.choices[0].message.content;
                return JSON.parse(content);
            } else if (finish_reason == "length") {
                throw new Error("finish_reason is 'length' in the JSON mode.");
            } else {
                throw new Error("finish_reason is not 'stop'.");
            }
        } catch (err) {
            generation?.update({
                statusMessage: err.message,
                endTime: new Date()
            });

            throw err;
        }
    }

    async _sendStringRequest(messages, stop_seq) {
        const modelParameters = {
            model: this.model_name,
            stop: stop_seq
        };

        const generation = this.trace?.generation({
            name: "Response generation",
            model: this.model_name,
            modelParameters: modelParameters,
            input: messages
        });

        try {
            let completion = await this.openai.chat.completions.create({ ...modelParameters, messages});

            generation?.update({
                output: completion,
                endTime: new Date()
            });

            let finish_reason = completion.choices[0].finish_reason;
            if (finish_reason == "stop") {
                return completion.choices[0].message.content;
            } else {
                throw new Error("finish_reason is not 'stop'.");
            }
        } catch (err) {
            generation?.update({
                statusMessage: err.message,
                endTime: new Date()
            });

            throw err;
        }
    }

    async embed(text) {
        let embedding_model_name = this.embedding_model_name;

        try {
            const embedding = await this.openai.embeddings.create({
                model: embedding_model_name,
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