import {
    ActionRowBuilder,
    APIApplicationCommandPermissionsConstant,
    ApplicationCommandNumericOptionMinMaxValueMixin,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    GuildNavigationMentions,
    isJSONEncodable,
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
        await interaction.editReply("Player 2 is already in a game.");
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
        content: `<@${p2}>, you have a new match request from <@${p1}>`,
        components: [row],
    });

    const collectorFilter = (i: any) => i.user.id === p2;
    try {
        const confirmation = await r.awaitMessageComponent({
            filter: collectorFilter,
            time: 60_000,
        });
        await confirmation.deferUpdate();

        if (confirmation.customId === `accept`) {
            await accept(p1, p2, channel.id, interaction.client);
        } else if (confirmation.customId === `decline`) {
            await decline(p1, p2, channel.id, interaction.client);
        }
    } catch (e) {
        await channel.send("Match request timed out.");
        await MatchRequest.deleteOne({
            requestBy: p1,
            requestTo: p2,
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

export async function play(p1: string, p2: string, channel: TextChannel) {
    const player1 = await User.findOne({ userId: p1 });
    const player2 = await User.findOne({ userId: p2 });
    if (!player1 || !player2) {
        await channel.send("Players not found.");
        return;
    }

    if (!player1.currentGame.equals(player2.currentGame)) {
        await channel.send("Players are not in same game.");
        return;
    }

    const game = await Game.findOne({
        $or: [{ player1: p1 }, { player2: p1 }],
        status: "active",
    });

    const chess = new Chess();
    const image = await drawBoard(chess.board());

    if (!game) {
        await channel.send("Game not found.");
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

export async function drawGame(
    player: string,
    channel: TextChannel,
    interaction: ChatInputCommandInteraction
) {
    const game = await Game.findOne({
        $or: [{ player1: player }, { player2: player }],
        status: "active",
    });
    if (!game) {
        await channel.send("Game not found.");
        return;
    }
    const opponent = game.player1 === player ? game.player2 : game.player1;
    const accept = new ButtonBuilder()
        .setCustomId("acceptDraw")
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success);
    const decline = new ButtonBuilder()
        .setCustomId("declineDraw")
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

    const r = await channel.send({
        content: `<@${opponent}>, <@${player}> has requested a draw.`,
        components: [row],
    });

    await interaction.editReply("Draw request sent.");

    const collectorFilter = (i: any) => i.user.id === opponent;
    try {
        const confirmation = await r.awaitMessageComponent({
            filter: collectorFilter,
            time: 60_000,
        });
        await confirmation.deferUpdate();

        if (confirmation.customId === `acceptDraw`) {
            await Game.updateOne(
                {
                    _id: game.id,
                },
                {
                    status: "draw",
                }
            );
            await channel.send("Game ended in a draw.");
        } else if (confirmation.customId === `declineDraw`) {
            await channel.send("Draw request declined.");
        }
    } catch (e) {
        await channel.send("Draw request timed out.");
    }
    await r.delete();
}

export async function legalMoves(
    player: string,
    interaction: ChatInputCommandInteraction
) {
    const game = await Game.findOne({
        $or: [{ player1: player }, { player2: player }],
        status: "active",
    });
    const channel = (await interaction.client.channels.fetch(
        interaction.channelId
    )) as TextChannel;
    const color = game?.player1 === player ? "w" : "b";
    if (!game || !game.fen) {
        await channel.send("Game not found.");
        return;
    }
    const chess = new Chess(game.fen);

    if (chess.turn() !== color) {
        await interaction.editReply("It's not your turn.");
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
        promotion?: string;
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
        await channel.send("It's not your turn.");
        return;
    }

    chess.move(move);

    const image = await drawBoard(chess.board());

    game.fen = chess.fen();
    await game.save();

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

export async function showGame(
    player: string,
    interaction: ChatInputCommandInteraction
) {
    const game = await Game.findOne({
        $or: [{ player1: player }, { player2: player }],
        status: "active",
    });
    if (!game || !game.fen) {
        await interaction.editReply("Game not found.");
        return;
    }
    const chess = new Chess(game.fen);
    const image = await drawBoard(chess.board());

    const attachment = new AttachmentBuilder(image, {
        name: "board.png",
    });

    await interaction.editReply({
        files: [attachment],
    });
}

export async function resign(
    player: string,
    interaction: ChatInputCommandInteraction
) {
    const game = await Game.findOne({
        $or: [{ player1: player }, { player2: player }],
        status: "active",
    });
    if (!game) {
        await interaction.editReply("Game not found.");
        return;
    }
    if (!game.channel) {
        await interaction.editReply("Channel not found.");
        return;
    }

    const channel = (await interaction.client.channels.fetch(
        game.channel
    )) as TextChannel;

    if (!channel || !channel.isTextBased()) {
        await interaction.editReply("Channel not found.");
        return;
    }

    const opponent = game.player1 === player ? game.player2 : game.player1;

    await Game.updateOne(
        {
            _id: game.id,
        },
        {
            status: "resign",
            winner: opponent,
        }
    );

    await User.updateMany(
        {
            currentGame: game.id,
        },
        {
            currentGame: null,
        }
    );

    await calculateElo(opponent, player, interaction);
    await channel.send(`<@${player}> has resigned.`);
    await interaction.editReply("You have resigned.");
}

export async function calculateElo(
    winner: string,
    loser: string,
    interaction: ChatInputCommandInteraction
) {
    const winnerUser = await User.findOne({ userId: winner });
    const loserUser = await User.findOne({ userId: loser });

    if (!winnerUser || !loserUser) {
        await interaction.editReply("Players not found.");
        return;
    }

    const k = 32;

    const winnerExpected =
        1 / (1 + 10 ** ((loserUser.rating - winnerUser.rating) / 400));
    const loserExpected =
        1 / (1 + 10 ** ((winnerUser.rating - loserUser.rating) / 400));

    const winnerNewRating = winnerUser.rating + k * (1 - winnerExpected);
    const loserNewRating = loserUser.rating + k * (0 - loserExpected);

    winnerUser.rating = winnerNewRating;
    loserUser.rating = loserNewRating;

    await winnerUser.save();
    await loserUser.save();
}

export async function checkState(player: string) {
    const game = await Game.findOne({
        $or: [{ player1: player }, { player2: player }],
        status: "active",
    });
    if (!game || !game.fen) {
        return;
    }
    const chess = new Chess(game.fen);
    if (chess.isCheckmate()) {
        return "checkmate";
    } else if (chess.isDraw()) {
        return "draw";
    } else if (chess.isStalemate()) {
        return "stalemate";
    } else if (chess.isThreefoldRepetition()) {
        return "threefoldRepetition";
    } else if (chess.isInsufficientMaterial()) {
        return "insufficientMaterial";
    }
    return;
}

export async function checkGame(player: string) {
    const game = await Game.findOne({
        $or: [{ player1: player }, { player2: player }],
        status: "active",
    });
    if (!game) {
        return;
    }
    return game;
}

export async function getHistory(player: string) {
    const games = await Game.find({
        $or: [{ player1: player }, { player2: player }],
        status: { $ne: "active" },
    });
    return games;
}

export async function getLeaderboard() {
    const users = await User.find();
    users.sort((a, b) => b.rating - a.rating);
    return users;
}

export async function getPlayer(player: string) {
    const user = await User.findOne({ userId: player });
    const games = await Game.find({
        $or: [{ player1: player }, { player2: player }],
    });
    const wins = games.filter(
        (game) => game.status !== "active" && game.winner === player
    ).length;
    const losses = games.filter((game) => {
        return (
            game.status !== "active" && game.winner && game.winner !== player
        );
    }).length;
    const draws = games.filter(
        (game) => game.status !== "active" && !game.winner
    ).length;

    const result = Object.assign(
        {
            wins,
            losses,
            draws,
        },
        user?.toJSON()
    );
    return result;
}
