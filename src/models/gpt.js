import axios from 'axios';
import OpenAI from 'openai';

const minepal_response_schema = {
    type: "object",
    properties: {
        chat_response: { type: "string" },
        execute_command: { type: "string" }
    },
    required: ["chat_response", "execute_command"],
    additionalProperties: false
};

const MAX_RETRIES = 5;
const REQUEST_TIMEOUT = 3000; // msec

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
        let messages = [{'role': 'system', 'content': systemMessage}].concat(turns);

        // console.log("=== BEGIN MESSAGES ===");
        // messages.forEach((msg, index) => {
        //     console.log(`Message ${index + 1}:`);
        //     console.log(`Role: ${msg.role}`);
        //     console.log(`Content: ${msg.content}`);
        //     console.log("---");
        // });
        // console.log("=== END MESSAGES ===");

        try {
            let response_format = null;
            if (!memSaving) {
                response_format = {
                    type: "json_schema",
                    json_schema: {
                        name: "minepal_response",
                        schema: minepal_response_schema,
                        strict: true
                    }
                };
            }

            let attempt = 0;    
            while (attempt < MAX_RETRIES) {
                try {
                    let response = await axios.post('https://api.openai.com/v1/chat/completions', {
                        model: this.model_name || "gpt-4o-mini",
                        messages,
                        stop: stop_seq,
                        response_format,
                    }, {
                        headers: {
                            'Authorization': `Bearer ${this.openai_api_key}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: REQUEST_TIMEOUT
                    });
                    console.log(response);

                    if (memSaving) {
                        return response.data.choices[0].message.content;
                    } else {
                        return JSON.parse(response.data.choices[0].message.content);
                    }
                } catch (err) {
                    console.error("Request failed:", err);
                    attempt++;
                    if (attempt >= MAX_RETRIES) {
                        return "Connection to OpenAI service timed out.";
                    }
                }
            }

            return null;
        } catch (err) {
            console.error("Request failed:", err);
            let res = "My brain disconnected.";
            // if ((err.message.includes('Context length exceeded') || err.response?.status === 500) && turns.length > 1) {
            //     return await this.sendRequest(turns.slice(1), systemMessage, stop_seq, memSaving);
            // } else {
            //     res = 'My brain disconnected, try again.';
            // }
            return res;
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