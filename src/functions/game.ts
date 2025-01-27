import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    TextChannel,
} from "discord.js";
import { User } from "../schemas/User";
import { Game } from "../schemas/Game";
import { MatchRequest } from "../schemas/MatchRequest";
import { Chess } from "chess.js";
import { drawBoard } from "./board";

export default async function request(
    p1: string,
    p2: string,
    channel: TextChannel,
    interaction: ChatInputCommandInteraction
) {
    let player1 = await User.findOne({ userId: p1 });
    if (!player1) {
        player1 = await User.create({ userId: p1, username: p1 });
    }
    const player2 = await User.findOne({ userId: p2 });
    if (!player2) {
        interaction.editReply(
            "Player not found in the database. Ask him to send the game request."
        );
        return;
    }
    if (player1.currentGame) {
        interaction.editReply("You are already in a game.");
        return;
    }
    if (player2.currentGame) {
        interaction.editReply("Player 2 is already in a game.");
        return;
    }
    const req1 =
        (await MatchRequest.findOne({
            requestBy: player1.userId,
        })) ||
        (await MatchRequest.findOne({
            requestTo: player1.userId,
        }));
    if (req1) {
        interaction.editReply("You have a pending request.");
        return;
    }

    const req2 =
        (await MatchRequest.findOne({
            requestTo: player2.userId,
        })) ||
        (await MatchRequest.findOne({
            requestBy: player2.userId,
        }));
    if (req2) {
        interaction.editReply("Player 2 has a pending request.");
        return;
    }

    await MatchRequest.create({
        requestBy: player1.userId,
        requestTo: player2.userId,
        channel: interaction.channelId,
    });

    const accept = new ButtonBuilder()
        .setCustomId(`accept-${player2.userId}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success);
    const decline = new ButtonBuilder()
        .setCustomId(`decline-${player2.userId}`)
        .setLabel("Decline")
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        accept,
        decline
    );

    await channel.send({
        content: `<@${p2}>, you have a new match request from <@${p1}>`,
        components: [row],
    });
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
        channel.send("Players not found.");
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

export async function play(p1: string, p2: string, channel: TextChannel) {
    const player1 = await User.findOne({ userId: p1 });
    const player2 = await User.findOne({ userId: p2 });
    if (!player1 || !player2) {
        channel.send("Players not found.");
        return;
    }

    if (!player1.currentGame.equals(player2.currentGame)) {
        channel.send("Players are not in same game.");
        return;
    }

    const game = await Game.findOne({
        $or: [{ player1: p1 }, { player2: p1 }],
        status: "active",
    });

    const chess = new Chess();
    const image = await drawBoard(chess.board());

    if (!game) {
        channel.send("Game not found.");
        return;
    }

    game.fen = chess.fen();

    const attachment = new AttachmentBuilder(image, {
        name: "board.png",
    });

    const message = await channel.send({
        files: [attachment],
    });
    game.message = message.id;
    game.channel = channel.id;

    await game.save();
}

export async function drawGame(player: string, channel: TextChannel) {
    const game = await Game.findOne({
        $or: [{ player1: player }, { player2: player }],
        status: "active",
    });
    if (!game) {
        channel.send("Game not found.");
        return;
    }
    const opponent = game.player1 === player ? game.player2 : game.player1;
    const accept = new ButtonBuilder()
        .setCustomId(`drawAccept-${opponent}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success);
    const decline = new ButtonBuilder()
        .setCustomId(`drawDecline-${opponent}`)
        .setLabel("Decline")
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        accept,
        decline
    );

    await User.updateMany(
        {
            currentGame: game.id,
        },
        {
            currentGame: null,
        }
    );

    await channel.send({
        content: `<@${opponent}>, <@${player}> has requested a draw.`,
        components: [row],
    });
}

export async function legalMoves(
    player: string,
    channel: TextChannel,
    interaction: ChatInputCommandInteraction
) {
    const game = await Game.findOne({
        $or: [{ player1: player }, { player2: player }],
        status: "active",
    });
    const color = game?.player1 === player ? "w" : "b";
    if (!game || !game.fen) {
        channel.send("Game not found.");
        return;
    }

    const chess = new Chess(game.fen);
    if (chess.turn() !== color) {
        interaction.editReply("It's not your turn.");
        return;
    }
    const moves = chess.moves({
        verbose: true,
    });

    return moves;
}

export async function move(
    player: string,
    move: {
        from: string;
        to: string;
        promotion: string;
    },
    interaction: ChatInputCommandInteraction
) {
    const game = await Game.findOne({
        $or: [{ player1: player }, { player2: player }],
        status: "active",
    });
    const color = game?.player1 === player ? "w" : "b";
    if (!game || !game.fen || !game.channel) {
        interaction.editReply("Game not found.");
        return;
    }
    const channel = (await interaction.client.channels.fetch(
        game.channel
    )) as TextChannel;

    if (!channel || !channel.isTextBased()) {
        interaction.editReply("Channel not found.");
        return;
    }

    const chess = new Chess(game.fen);

    if (chess.turn() !== color) {
        channel.send("It's not your turn.");
        return;
    }

    chess.move(move);

    const image = await drawBoard(chess.board());

    game.fen = chess.fen();

    const attachment = new AttachmentBuilder(image, {
        name: "board.png",
    });

    const message = await channel.messages.fetch(game.message || "");
    if (message) {
        return await message.edit({
            files: [attachment],
        });
    }
    await channel.send({
        files: [attachment],
    });
}
