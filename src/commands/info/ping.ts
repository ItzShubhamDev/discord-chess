import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export const command = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Sends the bot's ping."),
    async execute(interaction: ChatInputCommandInteraction) {
        const ping = interaction.client.ws.ping;
        if (ping < 0) {
            return await interaction.reply("Bot is not ready yet!");
        }
        await interaction.reply(`Pong! ${interaction.client.ws.ping}ms`);
    },
};
