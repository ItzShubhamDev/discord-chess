import mongoose, { Schema } from "mongoose";

const leaderboardSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    rating: { type: Number, default: 1200 },
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
});

export const Leaderboard = mongoose.model("Leaderboard", leaderboardSchema);
