import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
        },
        gamesPlayed: {
            type: Number,
            default: 0,
        },
        gamesWon: {
            type: Number,
            default: 0,
        },
        currentGame: {
            type: Schema.Types.ObjectId, 
            ref: "Game",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

export const User = mongoose.model("User", userSchema);
