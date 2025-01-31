import {
    ChatInputCommandInteraction,
    InteractionContextType,
    SlashCommandBuilder,
} from "discord.js";
import { showGame } from "../../functions/game";

export const command = {
    data: new SlashCommandBuilder()
        .setName("status")
        .setDescription("Shows the current chess game")
        .setContexts(InteractionContextType.Guild),
    async execute(interaction: ChatInputCommandInteraction) {
        await showGame(interaction.user.id, interaction);
    },
};
