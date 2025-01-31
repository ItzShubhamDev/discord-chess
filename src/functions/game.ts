import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    MessageFlags,
    TextChannel,
} from "discord.js";
import { User } from "../schemas/User";
import { Game } from "../schemas/Game";
import { Chess, Color, Move, PieceSymbol, Square } from "chess.js";
import { drawBoard } from "./board";
import { aiMove, checkAI } from "./ai";

const labels = {
    bb: "Bishop",
    bk: "King",
    bn: "Knight",
    bp: "Pawn",
    bq: "Queen",
    br: "Rook",
    wb: "Bishop",
    wk: "King",
    wn: "Knight",
    wp: "Pawn",
    wq: "Queen",
    wr: "Rook",
} as Record<string, string>;

const emojis = {
    bb: "<:blackbishop:1333283975866875977>",
    bk: "<:blackking:1333283997014294620>",
    bn: "<:blackknight:1333285740372557949>",
    bp: "<:blackpawn:1333285750724104212>",
    bq: "<:blackqueen:1333285759628869662>",
    br: "<:blackrook:1333285793405468672>",
    wb: "<:whitebishop:1333285803601694811>",
    wk: "<:whiteking:1333285817648418907>",
    wn: "<:whiteknight:1333285910837461133>",
    wp: "<:whitepawn:1333285922556608592>",
    wq: "<:whitequeen:1333285935760277565>",
    wr: "<:whiterook:1333285946602291274>",
} as Record<string, string>;

export async function getChannel(
    interaction: ChatInputCommandInteraction | ButtonInteraction,
    channelId?: string
) {
    const channel = (await interaction.client.channels.fetch(
        channelId || interaction.channelId
    )) as TextChannel;

    if (!channel) {
        await interaction.editReply({
            content: "Could not find channel!",
        });
        return;
    }
    if (!channel.isTextBased()) {
        await interaction.editReply({
            content: "Channel is not a text channel!",
        });
        return;
    }
    if (!channel.isSendable()) {
        await interaction.editReply({
            content: "Cannot send messages in this channel!",
        });
        return;
    }

    return channel;
}

export async function play(p1: string, p2: string, channel: TextChannel) {
    const isAi = checkAI(p2);
    const player1 = await User.findOne({ userId: p1 });
    let player2 = await User.findOne({ userId: p2 });
    if (isAi) {
        if (!player2) {
            player2 = await User.create({
                userId: p2,
            });
        }
        if (!player1) {
            await channel.send("Player not found.");
            return;
        }
        const game = await Game.create({
            player1: p1,
            player2: p2,
            status: "active",
        });
        player1.currentGame = game.id;
        await player1.save();
    }
    if (!player1 || !player2) {
        await channel.send("Players not found.");
        return;
    }

    if (!player1.currentGame.equals(player2.currentGame) && !isAi) {
        await channel.send("Players are not in same game.");
        return;
    }

    const game = await Game.findOne({
        $or: [{ player1: p1 }, { player2: p1 }],
        status: "active",
    });

    if (!game) {
        await channel.send("Game not found.");
        return;
    }

    const chess = new Chess();
    const board = chess.board();

    game.fen = chess.fen();

    const message = await sendChessBoard(board, channel, game.message);
    if (!message) {
        game.channel = channel.id;
        await game.save();
        return;
    }
    game.message = message.id;
    game.channel = channel.id;
    await game.save();
}

export async function legalMoves(
    player: string,
    interaction: ChatInputCommandInteraction | ButtonInteraction
) {
    const res = await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
        withResponse: true,
    });
    const game = await Game.findOne({
        $or: [{ player1: player }, { player2: player }],
        status: "active",
    });
    const channel = (await interaction.client.channels.fetch(
        interaction.channelId
    )) as TextChannel;
    if (!game || !game.fen) {
        await channel.send("Game not found.");
        return;
    }
    const color = game.player1 === player ? "w" : "b";
    const isAi = checkAI(game.player2);

    const chess = new Chess(game.fen);

    const status = await checkState(chess);
    if (status) {
        await Game.updateOne(
            {
                _id: game.id,
            },
            {
                status,
                winner:
                    status === "checkmate"
                        ? color === "w"
                            ? game.player2
                            : game.player1
                        : null,
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
        let text = `Game ended in ${status}.`;
        if (status === "checkmate") {
            const winner = color === "w" ? game.player2 : game.player1;
            await calculateElo(winner, player, interaction);
            text = `<@${winner}> has won.`;
        }
        await interaction.editReply("Game ended.");
        const board = chess.board();
        await sendChessBoard(board, channel, game.message, text);
        await game.save();
        return;
    }

    if (chess.turn() !== color) {
        await interaction.editReply("It's not your turn.");
        return;
    }
    const moves = chess.moves({
        verbose: true,
    });

    if (moves.length === 0) {
        await interaction.editReply("No legal moves.");
        return;
    }

    const groupedMoves: Record<string, Move[]> = {};

    for (const mv of moves) {
        if (!groupedMoves[mv.color + mv.piece]) {
            groupedMoves[mv.color + mv.piece] = [];
        }
        groupedMoves[mv.color + mv.piece].push(mv);
    }

    const pieces = Object.keys(groupedMoves).map((piece) => {
        return new ButtonBuilder()
            .setCustomId(piece)
            .setLabel(labels[piece])
            .setStyle(ButtonStyle.Primary)
            .setEmoji(emojis[piece]);
    });

    let piecesRows = [] as ActionRowBuilder<ButtonBuilder>[];
    for (let i = 0; i < pieces.length; i += 5) {
        piecesRows.push(
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                pieces.slice(i, i + 5)
            )
        );
    }

    await interaction.editReply({
        content: "Select a piece to move.",
        components: piecesRows,
    });

    const collectorFilter = (i: any) => i.user.id === player;

    try {
        const r = await res.resource?.message?.awaitMessageComponent({
            filter: collectorFilter,
            time: 60_000,
        });
        await r?.deferUpdate();

        if (!r) return;
        const customId = r.customId as PieceSymbol;
        const selectedPiece = groupedMoves[customId];

        if (!selectedPiece) {
            return await interaction.editReply({
                content: "No moves found for this piece.",
                components: [],
            });
        }

        let buttons: ButtonBuilder[] = [];

        for (const move of selectedPiece) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`${move.from}-${move.to}`)
                    .setLabel(`${move.from} -> ${move.to}`)
                    .setEmoji(emojis[move.color + move.piece])
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(false)
            );
        }

        const rows: ActionRowBuilder<ButtonBuilder>[] = [];

        for (let i = 0; i < buttons.length; i += 5) {
            rows.push(
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    buttons.slice(i, i + 5)
                )
            );
        }

        await interaction.editReply({
            components: rows,
        });

        try {
            const mv = (await res.resource?.message?.awaitMessageComponent({
                filter: collectorFilter,
                time: 60_000,
            })) as ButtonInteraction;

            if (!mv) return;

            const selectedMove = selectedPiece.find(
                (m) => `${m.from}-${m.to}` === mv.customId
            );

            if (!selectedMove) {
                await interaction.editReply("No moves selected.");
                return;
            }

            await move(player, selectedMove, interaction);
            if (isAi) {
                await aiMove(game._id.toString(), interaction);
            } else {
                const opponent =
                    game.player1 === player ? game.player2 : game.player1;
                const msg = await channel.send(
                    `<@${player}> moved \`${selectedMove.from} -> ${selectedMove.to}\` <@${opponent}> your turn.`
                );

                setTimeout(() => {
                    msg.delete();
                }, 2000);

                await interaction.deleteReply();
            }
        } catch (e) {
            await interaction.editReply("No moves selected.");
        }
    } catch (e) {
        await interaction.editReply("No moves selected.");
    }
}

export async function move(
    player: string,
    move: {
        from: string;
        to: string;
        promotion?: string;
    },
    interaction: ChatInputCommandInteraction | ButtonInteraction
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
    const channel = await getChannel(interaction, game.channel);
    if (!channel) return;

    const chess = new Chess(game.fen);

    const status = await checkState(chess);
    if (status) {
        await Game.updateOne(
            {
                _id: game.id,
            },
            {
                status,
                winner:
                    status === "checkmate"
                        ? color === "w"
                            ? game.player2
                            : game.player1
                        : null,
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
        let text = `Game ended in ${status}.`;
        if (status === "checkmate") {
            const winner = color === "w" ? game.player2 : game.player1;
            await calculateElo(winner, player, interaction);
            text = `<@${winner}> has won.`;
        }
        await interaction.editReply("Game ended.");
        const board = chess.board();
        await sendChessBoard(board, channel, game.message, text);
        await game.save();
        return;
    }

    if (chess.turn() !== color) {
        await interaction.editReply("It's not your turn.");
        return;
    }

    chess.move(move);
    const board = chess.board();
    await sendChessBoard(board, channel, game.message);

    game.fen = chess.fen();
    await game.save();
}

export async function sendChessBoard(
    board: ({
        square: Square;
        type: PieceSymbol;
        color: Color;
    } | null)[][],
    channel: TextChannel,
    messageId?: string | null,
    content?: string,
    status?: boolean,
    interaction?: ChatInputCommandInteraction | ButtonInteraction
) {
    const image = await drawBoard(board);
    const attachment = new AttachmentBuilder(image, {
        name: "board.png",
    });

    const button = new ButtonBuilder()
        .setCustomId("moves")
        .setLabel("Moves")
        .setStyle(ButtonStyle.Primary);
    const drawButton = new ButtonBuilder()
        .setCustomId("draw")
        .setLabel("Draw")
        .setStyle(ButtonStyle.Secondary);
    const resignButton = new ButtonBuilder()
        .setCustomId("resign")
        .setLabel("Resign")
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
        button,
        drawButton,
        resignButton,
    ]);

    if (status && interaction) {
        await interaction.editReply({
            content,
            files: [attachment],
        });
        return;
    }

    if (messageId) {
        const message = await channel.messages.fetch(messageId);
        await message.edit({
            content,
            files: [attachment],
            components: [row],
        });
        return;
    }
    const r = await channel.send({
        content,
        files: [attachment],
        components: [row],
    });
    return r;
}

export async function showGame(
    player: string,
    interaction: ChatInputCommandInteraction
) {
    const game = await Game.findOne({
        $or: [{ player1: player }, { player2: player }],
        status: "active",
    });
    if (!game || !game.fen || !game.channel) {
        await interaction.editReply("Game not found.");
        return;
    }
    const chess = new Chess(game.fen);
    const board = chess.board();

    const channel = await getChannel(interaction, game.channel);
    if (!channel) return;

    await sendChessBoard(
        board,
        channel,
        game.message,
        undefined,
        true,
        interaction
    );
}

export async function drawGame(
    player: string,
    interaction: ChatInputCommandInteraction | ButtonInteraction
) {
    const game = await Game.findOne({
        $or: [{ player1: player }, { player2: player }],
        status: "active",
    });
    const channel = await getChannel(interaction);
    if (!channel) return;
    if (!game) {
        await channel.send("Game not found.");
        return;
    }
    const opponent = game.player1 === player ? game.player2 : game.player1;
    const isAi = checkAI(opponent);

    if (isAi) {
        await Game.updateOne(
            {
                _id: game.id,
            },
            {
                status: "draw",
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
        await channel.send("Game ended in a draw.");
        if (interaction.replied) {
            await interaction.deleteReply();
        }
        return;
    }

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

        await User.updateMany(
            {
                currentGame: game.id,
            },
            {
                currentGame: null,
            }
        );
    } catch (e) {
        await channel.send("Draw request timed out.");
    }
    await r.delete();
}

export async function resign(
    player: string,
    interaction: ChatInputCommandInteraction | ButtonInteraction
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

    const channel = await getChannel(interaction, game.channel);
    if (!channel) return;

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
    interaction: ChatInputCommandInteraction | ButtonInteraction
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

    winnerUser.rating = parseFloat(winnerNewRating.toFixed(2));
    loserUser.rating = parseFloat(loserNewRating.toFixed(2));

    await winnerUser.save();
    await loserUser.save();
}

export async function checkState(chess: Chess) {
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
