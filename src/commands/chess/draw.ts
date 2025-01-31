import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from "discord.js";
import { drawGame } from "../../functions/game";

export const command = {
    data: new SlashCommandBuilder()
        .setName("draw")
        .setDescription("Draws the current chess game")
        .setContexts(InteractionContextType.Guild),

    async execute(interaction: ChatInputCommandInteraction) {
        await drawGame(interaction.user.id, interaction);
    },
};
