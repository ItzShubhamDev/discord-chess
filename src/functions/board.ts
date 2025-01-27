import { Color, PieceSymbol, Square } from "chess.js";
import Canvas from "@napi-rs/canvas";
import fs from "fs";
import path from "path";

export async function drawBoard(
    board: ({
        square: Square;
        type: PieceSymbol;
        color: Color;
    } | null)[][]
) {
    const canvas = Canvas.createCanvas(430, 430);
    const ctx = canvas.getContext("2d");

    const bg = fs.readFileSync(path.join(__dirname, "../assets/board.png"));
    const background = await Canvas.loadImage(bg);
    const plain = fs.readFileSync(path.join(__dirname, "../assets/bg.png"));
    const plainBackground = await Canvas.loadImage(plain);

    ctx.drawImage(background, 0, 0, 400, 400);

    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (i === 8 || j === 8) {
                ctx.fillStyle = "#000000";
                ctx.font = "20px Arial";
                if (i === 8 && j !== 8) {
                    ctx.drawImage(plainBackground, j * 50, i * 50, 50, 50);
                    ctx.fillText(String.fromCharCode(97 + j), j * 50 + 20, 420);
                }
                if (j === 8 && i !== 8) {
                    ctx.drawImage(plainBackground, j * 50, i * 50, 50, 50);
                    ctx.fillText(String(8 - i), 410, i * 50 + 35);
                }
                continue;
            }
            const square = board[i][j];
            if (square) {
                const pieceImage = fs.readFileSync(
                    path.join(
                        __dirname,
                        `../assets/${square.color}${square.type}.png`
                    )
                );
                const piece = await Canvas.loadImage(pieceImage);
                ctx.drawImage(piece, j * 50, i * 50, 50, 50);
            }
        }
    }

    const buffer = await canvas.encode("png");
    return buffer;
}
