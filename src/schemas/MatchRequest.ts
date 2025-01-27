import mongoose, { Schema } from "mongoose";

const MatchRequestSchema = new Schema(
    {
        requestBy: {
            type: String,
            required: true,
        },
        requestTo: {
            type: String,
            required: true,
        },
        channel: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export const MatchRequest = mongoose.model("MatchRequest", MatchRequestSchema);
