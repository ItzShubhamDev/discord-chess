import {
    ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";
import { drawGame } from "../../functions/game";

export const command = {
    data: new SlashCommandBuilder()
        .setName("draw")
        .setDescription("Draws the current chess game"),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });
        const channel = (await interaction.client.channels.fetch(
            interaction.channelId
        )) as TextChannel;

        if (!channel) {
            return await interaction.editReply({
                content: "Could not find channel!",
            });
        }
        if (!channel.isTextBased()) {
            return await interaction.editReply({
                content: "Channel is not a text channel!",
            });
        }
        if (!channel.isSendable()) {
            return await interaction.editReply({
                content: "Cannot send messages in this channel!",
            });
        }
        await drawGame(interaction.user.id, channel);
        await interaction.editReply({
            content: "Draw request sent!",
        });
    },
};
