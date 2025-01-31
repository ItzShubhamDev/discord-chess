"use client";

import ChessComponent from "@/components/Chess";
import { getModels } from "@/lib/ai";
import { useEffect, useState } from "react";

export default function Home() {
    const [opponents, setOpponents] = useState(["Computer"]);
    const [blank, setBlank] = useState(true);
    const [opponent, setOpponent] = useState("Computer");
    const [color, setColor] = useState<"w" | "b">("w");

    useEffect(() => {
        const fn = async () => {
            const models = await getModels();
            const m = models.map((model) => `AI: ${model}`);
            setOpponents(["Computer", ...m]);
        };
        fn();
    }, []);

    return (
        <div className="flex flex-col h-full w-full items-center">
            <div className="w-full h-full flex flex-col md:flex-row items-center md:justify-center p-6">
                <div className="w-fit">
                    <ChessComponent
                        blank={blank}
                        opponent={opponent}
                        color={color}
                    />
                </div>
                <div className="mt-4 md:mt-0 md:ml-4 w-[315px] xs:w-[450px] md:w-fit md:h-[400px] bg-gray-800 rounded-xl p-4">
                    <h1 className="text-white text-xl font-semibold text-center">
                        Menu
                    </h1>
                    <label
                        htmlFor="opponent"
                        className="text-white font-semibold mt-2 block"
                    >
                        Opponent
                    </label>
                    <select
                        id="opponent"
                        className="w-full mt-2 p-2 bg-gray-700 text-white rounded-md focus:outline-none"
                        value={opponent}
                        onChange={(e) => setOpponent(e.target.value)}
                        disabled={!blank}
                    >
                        {opponents.map((opponent) => (
                            <option key={opponent}>{opponent}</option>
                        ))}
                    </select>
                    <div className="flex mt-4">
                        <button
                            className={`w-1/2 p-2 text-white rounded-md focus:outline-none mr-1 ${
                                color === "w" ? "bg-[#454e11]" : "bg-gray-700"
                            }`}
                            onClick={() => setColor("w")}
                        >
                            White
                        </button>
                        <button
                            className={`w-1/2 p-2 text-white rounded-md focus:outline-none ml-1 ${
                                color === "b" ? "bg-[#454e11]" : "bg-gray-700"
                            }`}
                            onClick={() => setColor("b")}
                        >
                            Black
                        </button>
                    </div>
                    <button
                        className="w-full mt-4 p-2 bg-[#bbc585] text-white rounded-md focus:outline-none"
                        onClick={() => setBlank(!blank)}
                    >
                        {blank ? "Start Game" : "Clear Board"}
                    </button>
                </div>
            </div>
        </div>
    );
}
