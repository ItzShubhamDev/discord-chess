import {
    ButtonInteraction,
    ChatInputCommandInteraction,
    TextChannel,
} from "discord.js";
import { Game } from "../schemas/Game";
import { Chess, Move } from "chess.js";
import { drawBoard } from "./board";
import { client } from "../ai";
import { sendChessBoard } from "./game";

export function checkAI(player: string) {
    return isNaN(parseInt(player));
}

export async function aiMove(
    gameId: string,
    interaction: ChatInputCommandInteraction | ButtonInteraction
) {
    const game = await Game.findById(gameId);
    if (!game || !game.fen) {
        return await interaction.editReply({
            content: "Game not found!",
        });
    }

    const channel = (await interaction.client.channels.fetch(
        game.channel || interaction.channelId
    )) as TextChannel;

    await interaction.deleteReply();

    const chess = new Chess();
    chess.load(game.fen);

    const moves = chess.moves({
        verbose: true,
    });

    const move = await aiResponse(game.fen, moves, game.player2);
    if (!move) {
        chess.move(moves[Math.floor(Math.random() * moves.length)]);
    } else {
        try {
            const mv = JSON.parse(move);
            const chessMove = chess.move(mv);
            if (!chessMove) {
                chess.move(moves[Math.floor(Math.random() * moves.length)]);
            }
        } catch {
            const regex = /```json\n(.*?)\n```/s;
            const match = move.match(regex);
            let mv: Move | null = null;
            if (match) {
                const jsonString = match[1];
                const jsonData = JSON.parse(jsonString);
                mv = chess.move(jsonData);
            }
            if (!mv) {
                chess.move(moves[Math.floor(Math.random() * moves.length)]);
            }
        }
    }

    const board = chess.board();
    const image = await drawBoard(board);

    await sendChessBoard(image, channel, game.message, "AI Made Move!");

    game.fen = chess.fen();
    await game.save();
}

export async function aiResponse(fen: string, moves: Move[], model: string) {
    const res = await client.path("/chat/completions").post({
        body: {
            messages: [
                {
                    role: "system",
                    content: `You are a chess grandmaster, You will be provided with game fen and available moves. 
                        Provide the move you want to play in the following json format { "from": "<from square>", "to": "<to square>", "promotion": "if any promotion piece" } 
                        Example: { "from": "e2", "to": "e4" }`,
                },
                {
                    role: "user",
                    content: `FEN: ${fen}\n Moves: ${JSON.stringify(moves)}`,
                },
            ],
            temperature: 1.0,
            top_p: 1.0,
            max_tokens: 1000,
            model: model,
        },
    });

    if (res.status !== "200") {
        return;
    }

    const responseBody = res.body as any;
    if (responseBody.choices) {
        return responseBody.choices[0].message.content;
    }
}
