import { BaseInteraction, Events, MessageFlags } from "discord.js";
import { commands } from "../..";
import { drawGame, legalMoves, resign } from "../../functions/game";

export const event = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: BaseInteraction) {
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName !== "moves") {
                await interaction.deferReply({
                    flags: MessageFlags.Ephemeral,
                });
            }

            const command = commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.editReply({
                    content: "There was an error while executing this command!",
                });
            }
        }
        if (interaction.isButton()) {
            if (interaction.customId === "moves") {
                await legalMoves(interaction.user.id, interaction);
            } else if (interaction.customId === "resign") {
                await interaction.deferUpdate();
                await resign(interaction.user.id, interaction);
            } else if (interaction.customId === "draw") {
                await interaction.deferUpdate();
                await drawGame(interaction.user.id, interaction);
            }
        }
    },
};
