import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { config } from "dotenv";
config();

const token = process.env.GITHUB_TOKEN as string;
const endpoint = "https://models.inference.ai.azure.com";
export const models = [
    "AI21-Jamba-1.5-Mini",
    "Phi-4",
    "Codestral-2501",
    "jais-30b-chat",
    "Cohere-command-r-08-2024",
    "gpt-4o-mini",
];

if (!token) {
    throw new Error("Please set the GITHUB_TOKEN environment variable.");
}

const credentials = new AzureKeyCredential(token);
export const client = ModelClient(endpoint, credentials);
