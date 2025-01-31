import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { drawGame } from "../../functions/game";

export const command = {
    data: new SlashCommandBuilder()
        .setName("draw")
        .setDescription("Draws the current chess game"),

    async execute(interaction: ChatInputCommandInteraction) {
        await drawGame(interaction.user.id, interaction);
    },
};
