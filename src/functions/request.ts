import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    TextChannel,
    User as DiscordUser,
} from "discord.js";
import { MatchRequest } from "../schemas/MatchRequest";
import { play } from "./game";
import { Game } from "../schemas/Game";
import { User } from "../schemas/User";

export async function request(
    p1: DiscordUser,
    p2: DiscordUser,
    channel: TextChannel,
    interaction: ChatInputCommandInteraction
) {
    let player1 = await User.findOne({ userId: p1.id });
    if (!player1) {
        player1 = await User.create({
            userId: p1.id,
            name: p1.username,
            avatar: p1.displayAvatarURL({
                extension: "png",
                forceStatic: true,
                size: 256,
            }),
        });
    }
    const player2 = await User.findOne({ userId: p2.id });
    if (!player2) {
        await interaction.editReply(
            "Player not found in the database. Ask him to send the game request."
        );
        return;
    }
    if (player1.currentGame) {
        await interaction.editReply("You are already in a game.");
        return;
    }
    if (player2.currentGame) {
        await interaction.editReply(`<@${p2.id}> is already in a game.`);
        return;
    }
    const req1 = await MatchRequest.findOne({
        $or: [{ requestBy: player1.userId }, { requestTo: player1.userId }],
    });
    if (req1) {
        await interaction.editReply("You have a pending request.");
        return;
    }

    const req2 = await MatchRequest.findOne({
        $or: [{ requestBy: player2.userId }, { requestTo: player2.userId }],
    });
    if (req2) {
        return await interaction.editReply("Player 2 has a pending request.");
    }

    await MatchRequest.create({
        requestBy: player1.userId,
        requestTo: player2.userId,
        channel: interaction.channelId,
    });

    const acceptBtn = new ButtonBuilder()
        .setCustomId("accept")
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success);
    const declineBtn = new ButtonBuilder()
        .setCustomId("decline")
        .setLabel("Decline")
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        acceptBtn,
        declineBtn
    );

    await interaction.editReply("Match request sent!");

    const r = await channel.send({
        content: `<@${p2.id}>, you have a new match request from <@${p1.id}>`,
        components: [row],
    });

    const collectorFilter = (i: any) => i.user.id === p2.id;
    try {
        const confirmation = await r.awaitMessageComponent({
            filter: collectorFilter,
            time: 60_000,
        });
        await confirmation.deferUpdate();

        if (confirmation.customId === `accept`) {
            await accept(p1.id, p2.id, channel.id, interaction.client);
        } else if (confirmation.customId === `decline`) {
            await decline(p1.id, p2.id, channel.id, interaction.client);
        }
    } catch (e) {
        await channel.send("Match request timed out.");
        await MatchRequest.deleteOne({
            requestBy: p1.id,
            requestTo: p2.id,
            channel: channel.id,
        });
    }
    await r.delete();
}

export async function accept(
    p1: string,
    p2: string,
    channelId: string,
    client: Client
) {
    const player1 = await User.findOne({ userId: p1 });
    const player2 = await User.findOne({ userId: p2 });

    const channel = (await client.channels.fetch(channelId)) as TextChannel;

    if (!player1 || !player2) {
        await channel.send("Players not found.");
        return;
    }

    await MatchRequest.deleteOne({
        requestBy: p1,
        requestTo: p2,
        channel: channel.id,
    });

    await channel.send("Match request accepted!");

    const game = await Game.create({
        player1: p1,
        player2: p2,
        status: "active",
    });

    player1.currentGame = game.id;
    player2.currentGame = game.id;

    await player1?.save();
    await player2?.save();

    await play(p1, p2, channel);
}

export async function decline(
    p1: string,
    p2: string,
    channelId: string,
    client: Client
) {
    const channel = (await client.channels.fetch(channelId)) as TextChannel;

    await MatchRequest.deleteOne({
        requestBy: p1,
        requestTo: p2,
        channel: channel.id,
    });

    await channel.send("Match request declined!");
}
