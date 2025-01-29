import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { config } from "dotenv";
config();

const token = process.env.GITHUB_TOKEN as string;
const endpoint = "https://models.inference.ai.azure.com";
const models = ["gpt-4o-mini", "Codestral-2501"];

if (!token) {
    throw new Error("Please set the GITHUB_TOKEN environment variable.");
}

export async function main() {
    const credentials = new AzureKeyCredential(token);
    const client = ModelClient(endpoint, credentials);

    const response = await client.path("/chat/completions").post({
        body: {
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "What is the capital of France?" },
            ],
            temperature: 1.0,
            top_p: 1.0,
            max_tokens: 1000,
            model: models[0],
        },
    });

    if (response.status !== "200") {
        throw response.body;
    }
    const responseBody = response.body as any;
    if (responseBody.choices) {
        console.log(responseBody.choices[0].message.content);
    } else {
        console.error("Unexpected response format:", responseBody);
    }
}
