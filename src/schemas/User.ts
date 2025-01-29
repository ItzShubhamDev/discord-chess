import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            default: null,
        },
        avatar: {
            type: String,
            default: null,
        },
        rating: {
            type: Number,
            default: 1200,
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
