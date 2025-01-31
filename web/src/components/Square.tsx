import { Color, PieceSymbol, Square as ChessSquare } from "chess.js";
import { useEffect } from "react";

const Square = ({
    type,
    onClick,
    piece,
    children,
    square,
    moves,
    selected,
}: {
    type: "light" | "dark";
    onClick?: () => void;
    piece?: { square: ChessSquare; type: PieceSymbol; color: Color } | null;
    children?: React.ReactNode;
    square?: ChessSquare;
    moves?: {
        to: ChessSquare;
        promotion?: PieceSymbol;
    }[];
    selected?: boolean;
}) => {
    const mvs = moves?.map((m) => m.to);
    const isMove = mvs?.includes(square!);
    useEffect(() => {}, [moves]);
    return (
        <>
            <div
                className={`w-[35px] h-[35px] xs:w-[50px] xs:h-[50px] block ${
                    type === "light" ? "bg-[#454e11]" : "bg-[#bbc585]"
                } ${
                    piece?.color === "w"
                        ? "hover:ring ring-gray-100 ring-inset"
                        : ""
                } ${
                    isMove
                        ? "ring ring-[#f9a825] ring-inset bg-[#f9a82553]"
                        : ""
                } ${selected ? "ring ring-gray-100 ring-inset" : ""}`}
                onClick={onClick}
            >
                {children}
            </div>
        </>
    );
};

export default Square;
