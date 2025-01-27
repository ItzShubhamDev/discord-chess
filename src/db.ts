import mongoose from "mongoose";
import { config } from "dotenv";

config();

const uri = process.env.MONGODB_URI;

export async function connect() {
    if (!uri) {
        console.error("Missing MONGODB_URI");
        process.exit(1);
    }
    mongoose
        .connect(uri)
        .then(() => {
            console.log("Connected to MongoDB");
        })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
