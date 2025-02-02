"use client";

import { useEffect, useState } from "react";

type leaderboardUser = {
    userId: string;
    name: string;
    avatar: string;
    rating: number;
};

export default function Page() {
    const [leaderboard, setLeaderboard] = useState<leaderboardUser[]>([]);

    useEffect(() => {
        const getLeaderboard = async () => {
            const res = await fetch("/api/leaderboard");
            const { leaderboard } = await res.json();
            setLeaderboard(leaderboard);
        };
        getLeaderboard();
    }, []);
    return (
        <div className="p-4 w-full flex flex-col items-center justify-center">
            <h1 className="text-gray-200 font-bold text-2xl w-full text-center">
                Leaderboard
            </h1>
            <div className="flex flex-col space-y-2 py-4 w-full max-w-xl">
                {leaderboard.map((user: leaderboardUser) => (
                    <div
                        key={user.userId}
                        className="flex items-center text-gray-200 space-x-2 justify-between"
                    >
                        <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-12 h-12 rounded-full"
                        />
                        <span>{user.name}</span>
                        <span>{user.rating}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
