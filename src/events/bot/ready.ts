import { Client, Events } from "discord.js";
import { connect } from "../../db";

export const event = {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client) {
        console.log(`[INFO] Logged in as ${client.user?.tag}!`);
        await connect();
    },
};
