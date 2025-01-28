import {
    ChatInputCommandInteraction,
    Colors,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import { getPlayer } from "../../functions/game";

export const command = {
    data: new SlashCommandBuilder()
        .setName("player")
        .setDescription("Get a player's information")
        .addUserOption((option) =>
            option
                .setName("player")
                .setDescription("The player to get information for")
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });
        const user = interaction.options.getUser("player");
        if (!user) {
            return await interaction.editReply({
                content: "Could not find user!",
            });
        }
        const player = await getPlayer(user.id);
        if (!player) {
            return await interaction.editReply({
                content: "Player not found!",
            });
        }
        const embed = new EmbedBuilder()
            .setTitle(user.username)
            .setColor(Colors.Yellow)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                {
                    name: "Rating",
                    value: (player.rating || 1200).toString(),
                },
                {
                    name: "Wins",
                    value: player.wins.toString(),
                    inline: true,
                },
                {
                    name: "Losses",
                    value: player.losses.toString(),
                    inline: true,
                },
                {
                    name: "Draws",
                    value: player.draws.toString(),
                    inline: true,
                }
            );

        await interaction.editReply({
            embeds: [embed],
        });
    },
};
