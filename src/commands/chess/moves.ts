import {
    ChatInputCommandInteraction,
    InteractionContextType,
    SlashCommandBuilder,
} from "discord.js";
import { legalMoves } from "../../functions/game";
export const command = {
    data: new SlashCommandBuilder()
        .setName("moves")
        .setDescription("Shows the moves of the current chess game")
        .setContexts(InteractionContextType.Guild),

    async execute(interaction: ChatInputCommandInteraction) {
        await legalMoves(interaction.user.id, interaction);
    },
};
