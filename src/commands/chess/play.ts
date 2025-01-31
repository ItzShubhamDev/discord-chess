import {
    ChatInputCommandInteraction,
    InteractionContextType,
    MessageFlags,
    SlashCommandBuilder,
    TextChannel,
} from "discord.js";
import { request } from "../../functions/request";
import { models } from "../../ai";
import { getChannel, play } from "../../functions/game";

export const command = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Starts a new chess game")
        .addSubcommand((subcommand) => {
            return subcommand
                .setName("ai")
                .setDescription("Play against the AI")
                .addStringOption((option) => {
                    return option
                        .setName("model")
                        .setDescription("The model to use")
                        .setRequired(true)
                        .addChoices(
                            models.map((model) => {
                                return {
                                    name: model,
                                    value: model,
                                };
                            })
                        );
                });
        })
        .addSubcommand((subcommand) => {
            return subcommand
                .setName("opponent")
                .setDescription("Play against a user")
                .addUserOption((option) => {
                    return option
                        .setName("opponent")
                        .setDescription("The user you want to play against")
                        .setRequired(true);
                });
        })
        .setContexts(InteractionContextType.Guild),
    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();
        const channel = await getChannel(interaction);
        if (!channel) return;
        if (subcommand === "opponent") {
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
            if (opponent.id === interaction.user.id) {
                return await interaction.editReply({
                    content: "Cannot play against yourself",
                });
            }

            await request(interaction.user, opponent, channel, interaction);
        } else if (subcommand === "ai") {
            const model = interaction.options.getString("model");
            if (!model) {
                return await interaction.editReply({
                    content: "Please provide a model!",
                });
            }

            await play(interaction.user.id, model, channel);
            await interaction.deleteReply();
        }
    },
};
