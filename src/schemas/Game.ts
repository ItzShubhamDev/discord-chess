import mongoose, { Schema } from "mongoose";

const gameSchema = new Schema(
    {
        player1: {
            type: String,
            required: true,
        },
        player2: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            required: true,
        },
        winner: {
            type: String,
        },
        fen: {
            type: String,
        },
        message: {
            type: String,
        },
        channel: {
            type: String,
        },
    },
    { timestamps: true }
);

export const Game = mongoose.model("Game", gameSchema);
