import {
    ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import { showGame } from "../../functions/game";

export const command = {
    data: new SlashCommandBuilder()
        .setName("show")
        .setDescription("Shows the current chess game"),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });
        await showGame(interaction.user.id, interaction);
    },
};
