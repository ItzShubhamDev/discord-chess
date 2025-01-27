import { BaseInteraction, Events } from "discord.js";
import { commands } from "../..";

export const event = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: BaseInteraction) {
        if (interaction.isChatInputCommand()) {
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
    },
};
