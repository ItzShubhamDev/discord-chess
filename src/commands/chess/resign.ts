import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { resign } from "../../functions/game";

export const command = {
    data: new SlashCommandBuilder()
        .setName("resign")
        .setDescription("Resigns the current chess game"),

    async execute(interaction: ChatInputCommandInteraction) {
        await resign(interaction.user.id, interaction);
    },
};
