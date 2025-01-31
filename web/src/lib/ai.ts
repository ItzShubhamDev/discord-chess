"use server";

import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
const globalForModel = global as unknown as {
    modelClient: ReturnType<typeof ModelClient>;
};

const models = [
    "AI21-Jamba-1.5-Mini",
    "Phi-4",
    "Codestral-2501",
    "jais-30b-chat",
    "Cohere-command-r-08-2024",
    "gpt-4o-mini",
];

const endpoint = "https://models.inference.ai.azure.com";

const token = process.env.GITHUB_TOKEN as string;
if (!token) {
    throw new Error("Please set the GITHUB_TOKEN environment variable.");
}

const credentials = new AzureKeyCredential(token);

export const getModels = async () => models;

export const getModelClient = async () => {
    if (!globalForModel.modelClient) {
        globalForModel.modelClient = ModelClient(endpoint, credentials);
    }
    return globalForModel.modelClient;
};
