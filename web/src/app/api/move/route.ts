import { getModelClient } from "@/lib/ai";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
    const body = (await req.json()) as {
        fen: string;
        moves: string[];
        model: string;
    };
    if (!body.fen || !body.moves || !body.model) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const prompt = {
        body: {
            messages: [
                {
                    role: "system",
                    content: `You are a chess grandmaster, You will be provided with game fen and available moves. 
                    Provide the move you want to play in the following json format { "from": "<from square>", "to": "<to square>", "promotion": "if any promotion piece" } 
                    Example: { "from": "e2", "to": "e4" }`,
                },
                {
                    role: "user",
                    content: `FEN: ${body.fen}\n Moves: ${JSON.stringify(
                        body.moves
                    )}`,
                },
            ],
            temperature: 1.0,
            top_p: 1.0,
            max_tokens: 1000,
            model: body.model,
        },
    };

    const client = await getModelClient();

    const res = await client.path("/chat/completions").post(prompt);
    if (res.status !== "200") {
        return NextResponse.json(
            { error: "Failed to get response" },
            { status: 500 }
        );
    }

    const resBody = res.body as { choices: { message: { content: string } }[] };
    if (resBody.choices) {
        const move = resBody.choices[0].message.content;
        return NextResponse.json({ move });
    }

    return NextResponse.json(
        { error: "Failed to get response" },
        { status: 500 }
    );
};
