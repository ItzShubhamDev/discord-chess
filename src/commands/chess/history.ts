import {
    ChatInputCommandInteraction,
    Colors,
    EmbedBuilder,
    MessageFlags,
    SlashCommandBuilder,
    time,
} from "discord.js";
import { getHistory } from "../../functions/game";
import { checkAI } from "../../functions/ai";

export const command = {
    data: new SlashCommandBuilder()
        .setName("history")
        .setDescription("Shows your history of chess games"),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });
        const history = await getHistory(interaction.user.id);
        if (!history) {
            return await interaction.editReply({
                content: "You have no history!",
            });
        }
        const embed = new EmbedBuilder()
            .setTitle("Chess History")
            .setColor(Colors.Yellow);

        const opponents: string[] = [];
        const results: string[] = [];
        const times: string[] = [];
        for (const game of history) {
            const opponent =
                game.player1 === interaction.user.id
                    ? game.player2
                    : game.player1;
            const result =
                game.status === "draw" || !game.winner
                    ? "Draw"
                    : game.winner === interaction.user.id
                    ? "Win"
                    : "Loss";
            opponents.push(opponent);
            results.push(result);
            times.push(time(game.createdAt));
        }
        embed.addFields(
            {
                name: "Opponent",
                value: opponents
                    .map((opponent) => {
                        const ai = checkAI(opponent);
                        if (ai) {
                            return opponent + " (AI)";
                        }
                        return `<@${opponent}>`;
                    })
                    .join("\n"),
                inline: true,
            },
            {
                name: "Result",
                value: results.join("\n"),
                inline: true,
            },
            {
                name: "Time",
                value: times.join("\n"),
                inline: true,
            }
        );
        await interaction.editReply({
            embeds: [embed],
        });
    },
};
