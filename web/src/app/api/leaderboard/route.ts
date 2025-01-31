import dbConnect from "@/lib/mongodb";
import { User } from "@/schemas/User";
import { NextResponse } from "next/server";

export const GET = async () => {
    await dbConnect();

    const users = await User.find();
    const sortedUsers = users.sort((a, b) => b.rating - a.rating);

    const leaderboard = sortedUsers.map((user) => ({
        userId: user.userId,
        name: user.name || capitalizeFirstLetter(user.userId),
        avatar: user.avatar || "/assets/wn.png",
        rating: user.rating,
    }));

    return NextResponse.json({ leaderboard });
};

function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
