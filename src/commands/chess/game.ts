import {
    ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";
import request from "../../functions/game";

export const command = {
    data: new SlashCommandBuilder()
        .setName("game")
        .setDescription("Starts a new chess game")
        .addUserOption((option) => {
            return option
                .setName("opponent")
                .setDescription("The user you want to play against")
                .setRequired(true);
        }),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });
        const opponent = interaction.options.getUser("opponent");
        if (!opponent) {
            return await interaction.editReply({
                content: "Please provide an opponent!",
            });
        }
        if (opponent.bot) {
            return await interaction.editReply({
                content: "Cannot play against a bot!",
            });
        }
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

        await request(interaction.user.id, opponent.id, channel, interaction);
        await interaction.editReply({
            content: "Match request sent!",
        });
    },
};
