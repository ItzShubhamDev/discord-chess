import {
    ChatInputCommandInteraction,
    Colors,
    EmbedBuilder,
    InteractionContextType,
    SlashCommandBuilder,
} from "discord.js";
import { getLeaderboard } from "../../functions/game";

export const command = {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Shows the leaderboard of chess players")
        .setContexts(InteractionContextType.Guild),

    async execute(interaction: ChatInputCommandInteraction) {
        const leaderboard = await getLeaderboard();
        const embed = new EmbedBuilder()
            .setTitle("Leaderboard")
            .setColor(Colors.Yellow);

        const players: string[] = [];
        const ranking: string[] = [];
        for (const user of leaderboard) {
            try {
                const u = await interaction.client.users.fetch(user.userId);
                if (!u) {
                    continue;
                }
                players.push(u.username);
                ranking.push(user.rating.toString());
            } catch (e) {
                players.push(user.userId + " (AI)");
                ranking.push(user.rating.toString());
            }
        }
        embed.addFields(
            {
                name: "Player",
                value: players.join("\n"),
                inline: true,
            },
            {
                name: "Rating",
                value: ranking.join("\n"),
                inline: true,
            }
        );
        await interaction.editReply({
            embeds: [embed],
        });
    },
};
