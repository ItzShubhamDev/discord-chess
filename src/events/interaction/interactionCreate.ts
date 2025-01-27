import { BaseInteraction, Events, MessageFlags, TextChannel } from "discord.js";
import { commands } from "../..";
import { MatchRequest } from "../../schemas/MatchRequest";
import { accept, decline } from "../../functions/game";
import { Game } from "../../schemas/Game";

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
        } else if (interaction.isButton()) {
            await interaction.deferUpdate();
            const channel = (await interaction.client.channels.fetch(
                interaction.channelId
            )) as TextChannel;
            const userId = interaction.user.id;
            const buttonId = interaction.customId;
            const [action, id] = buttonId.split("-");
            if (userId !== id)
                return await interaction.editReply({
                    content: "You cannot interact with this button!",
                });
            if (["accept", "decline"].includes(action)) {
                const request = await MatchRequest.findOne({
                    requestTo: userId,
                });
                if (!request)
                    return await interaction.editReply({
                        content: "No request found!",
                    });
                if (action === "accept") {
                    await accept(
                        request.requestBy,
                        request.requestTo,
                        request.channel,
                        interaction.client
                    );
                } else if (action === "decline") {
                    await decline(
                        request.requestBy,
                        request.requestTo,
                        request.channel,
                        interaction.client
                    );
                }
            } else if (action.startsWith("draw")) {
                const game = await Game.findOne({
                    $or: [{ player1: userId }, { player2: userId }],
                    status: "active",
                });
                if (!game) {
                    return await interaction.editReply({
                        content: "No game found!",
                    });
                }
                await game.updateOne({ status: "draw" });
                await (interaction.channel as TextChannel).send(
                    `Game between <@${game.player1}> and <@${game.player2}> has ended in a draw!`
                );
            }
            if (channel && channel.isTextBased()) {
                const message = await channel.messages.fetch(
                    interaction.message.id
                );
                await message.delete();
            }
        }
    },
};
