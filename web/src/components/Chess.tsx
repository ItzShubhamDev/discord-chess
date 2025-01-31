"use client";

import {
    Chess,
    Color,
    PieceSymbol,
    Square as ChessSquare,
    Move,
} from "chess.js";
import React, { useEffect, useRef, useState } from "react";
import Square from "./Square";
import {
    HardDriveDownload,
    HardDriveUpload,
    RotateCcw,
    Undo,
} from "lucide-react";
import { Tooltip } from "react-tooltip";

const pieces = {
    k: "King",
    q: "Queen",
    r: "Rook",
    b: "Bishop",
    n: "Knight",
    p: "Pawn",
};

const ChessComponent = ({
    blank,
    opponent,
    color,
}: {
    blank: boolean;
    opponent: string;
    color: Color;
}) => {
    const [chess, setChess] = useState<Chess | null>(null);
    const [board, setBoard] = useState<
        ({ square: ChessSquare; type: PieceSymbol; color: Color } | null)[][]
    >([]);
    const [moves, setMoves] = useState<
        { from: ChessSquare; to: ChessSquare; promotion?: PieceSymbol }[]
    >([]);
    const [selectedSquare, setSelectedSquare] = useState<ChessSquare | null>();
    const chessRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<string>("");
    const [result, setResult] = useState<string>("");
    const [promotions, setPromotions] = useState<PieceSymbol[]>([]);

    useEffect(() => {
        const newChess = new Chess();
        if (blank) {
            newChess.clear();
            setChess(newChess);
            setBoard(newChess.board());
            return;
        }
        setChess(newChess);
        setBoard(newChess.board());
    }, [blank]);

    const handleClickOutside = (e: MouseEvent) => {
        if (chessRef.current && !chessRef.current.contains(e.target as Node)) {
            setSelectedSquare(null);
            setMoves([]);
        }
    };

    useEffect(() => {
        document.addEventListener("click", handleClickOutside);
        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, []);

    const cellToSquare = (row: number, col: number) => {
        const sq = String.fromCharCode(97 + col) + (8 - row);
        return sq as ChessSquare;
    };

    const getMoves = (square: ChessSquare) => {
        if (!chess) return;
        const moves = chess.moves({ square, verbose: true });
        setMoves(
            moves.map((move) => {
                return {
                    from: move.from,
                    to: move.to,
                    promotion: move.promotion,
                };
            })
        );
    };

    useEffect(() => {
        if (selectedSquare) {
            getMoves(selectedSquare);
        }
    }, [selectedSquare]);

    const checkStatus = () => {
        if (!chess) return;
        if (chess.isCheckmate()) {
            setStatus("Checkmate");
            setResult(chess.turn() === "w" ? "Black wins" : "White wins");
            return "checkmate";
        } else if (chess.isDraw()) {
            setStatus("Draw");
            return "draw";
        } else if (chess.isCheck()) {
            setStatus("Check");
            return "playing";
        } else if (chess.isInsufficientMaterial()) {
            setStatus("Insufficient material");
            return "draw";
        } else if (chess.isStalemate()) {
            setStatus("Stalemate");
            return "draw";
        } else if (chess.isThreefoldRepetition()) {
            setStatus("Threefold repetition");
            return "draw";
        } else if (chess.isDrawByFiftyMoves()) {
            setStatus("Draw by fifty moves");
            return "draw";
        } else {
            setStatus("");
            return "playing";
        }
    };

    const move = (to: ChessSquare) => {
        if (!chess) return;
        if (!selectedSquare) return;
        const mvs = moves.map((move) => move.to);
        if (!mvs.includes(to)) return;
        const filteredMoves = moves.filter(
            (move) => move.from === selectedSquare && move.to === to
        );
        if (filteredMoves.length > 0 && filteredMoves[0].promotion) {
            setPromotions(["q", "r", "b", "n"]);
            return;
        }
        const status = chessMove({ from: selectedSquare, to });
        setSelectedSquare(null);
        setMoves([]);
        if (status !== "playing") return;
        setTimeout(() => {
            bestMove();
        }, 1000);
    };

    const chessMove = (
        mv:
            | string
            | {
                  from: string;
                  to: string;
                  promotion?: string;
              }
    ) => {
        if (!chess) return;
        try {
            chess.move(mv);
            setBoard(chess.board());
            const status = checkStatus();
            return status;
        } catch (e) {
            console.error(e);
            alert("Invalid move");
        }
    };

    const bestMove = async () => {
        if (!chess) return;
        const moves = chess?.moves();
        if (!moves) return;
        if (opponent === "Computer") {
            const move = moves[Math.floor(Math.random() * moves.length)];
            chessMove(move);
        } else {
            const fen = chess?.fen();
            const moves = chess?.moves({
                verbose: true,
            });
            const model = opponent.split(" ")[1];

            const res = await fetch("/api/move", {
                method: "POST",
                body: JSON.stringify({ fen, moves, model }),
                headers: {
                    "Content-Type": "application/json",
                },
            });
            if (res.status !== 200) {
                alert("Failed to get response");
                return;
            }

            const data = await res.json();

            try {
                const move = JSON.parse(data.move);
                chessMove(move);
            } catch (e) {
                const regex = /```json\n(.*?)\n```/;
                const match = data.move.match(regex);
                if (!match) {
                    alert("Failed to get response");
                    return;
                }
                const move = JSON.parse(match[1]);
                chessMove(move);
            }
        }
    };

    const undo = () => {
        if (!chess) return;
        chess.undo();
        setStatus("");
        setResult("");
        setBoard(chess.board());
    };

    const reset = () => {
        if (!chess) return;
        chess.reset();
        setBoard(chess.board());
    };

    const save = () => {
        if (!chess) return;
        const fen = chess.fen();
        localStorage.setItem("chess", fen);
    };

    const load = () => {
        const fen = localStorage.getItem("chess");
        if (!fen) return;
        const newChess = new Chess(fen);
        setChess(newChess);
        setBoard(newChess.board());
    };

    return (
        <div className="flex justify-center items-center h-full relative">
            <div className="flex flex-col bg-[#454e11] rounded-l-xl overflow-hidden">
                <div
                    className="grid grid-cols-8 grid-rows-8 w-[280px] h-[280px] xs:h-[400px] xs:w-[400px] rounded-l-xl overflow-hidden"
                    ref={chessRef}
                >
                    {board &&
                        board.map((row, i) => {
                            return (
                                <React.Fragment key={i}>
                                    {row.map((square, j) => {
                                        return (
                                            <Square
                                                key={i + j}
                                                onClick={() => {
                                                    if (selectedSquare) {
                                                        move(
                                                            cellToSquare(i, j)
                                                        );
                                                    }
                                                }}
                                                type={
                                                    (i + j + 1) % 2 === 0
                                                        ? "light"
                                                        : "dark"
                                                }
                                                piece={square}
                                                square={cellToSquare(i, j)}
                                                moves={moves}
                                                selected={
                                                    selectedSquare ===
                                                    cellToSquare(i, j)
                                                }
                                            >
                                                {square && (
                                                    <>
                                                        <Tooltip
                                                            id={`${square.color}${square.type}${i}${j}`}
                                                            place="top"
                                                            noArrow
                                                        />
                                                        <img
                                                            src={`/assets/${square.color}${square.type}.png`}
                                                            alt={`${square.color}${square.type}`}
                                                            onClick={() => {
                                                                color ===
                                                                    square.color &&
                                                                    setSelectedSquare(
                                                                        cellToSquare(
                                                                            i,
                                                                            j
                                                                        )
                                                                    );
                                                            }}
                                                            data-tooltip-content={
                                                                pieces[
                                                                    square.type
                                                                ]
                                                            }
                                                            data-tooltip-id={`${square.color}${square.type}${i}${j}`}
                                                            data-tooltip-offset={
                                                                2
                                                            }
                                                        />
                                                    </>
                                                )}
                                            </Square>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                </div>
                {promotions.length > 0 && (
                    <div className="w-full h-[50px] flex justify-center">
                        {promotions.map((promotion) => {
                            return (
                                <button
                                    key={promotion}
                                    onClick={() => {
                                        if (!selectedSquare) return;
                                        const move = moves.find(
                                            (move) =>
                                                move.from === selectedSquare &&
                                                move.promotion === promotion
                                        );
                                        if (!move) return;
                                        chessMove(move);
                                        setSelectedSquare(null);
                                        setMoves([]);
                                        setPromotions([]);
                                        bestMove();
                                    }}
                                    className="w-[50px] h-[50px] bg-[#454e11] text-white"
                                >
                                    <img
                                        src={`/assets/${color}${promotion}.png`}
                                        className="hover:scale-110 transition-transform"
                                        alt={`${color}${promotion}`}
                                    />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            <div
                className={`w-[35px] xs:w-[50px] ${
                    promotions.length > 0
                        ? "h-[450px]"
                        : "h-[280px] xs:h-[400px]"
                } bg-[#bbc585] transition-transform p-2 rounded-r-xl text-white box-border border-l-4 border-[#454e11] flex flex-col items-center`}
            >
                <Tooltip id="undo" place="top" noArrow />
                <Tooltip id="reset" place="top" noArrow />
                <Tooltip id="save" place="top" noArrow />
                <Tooltip id="load" place="top" noArrow />
                <button
                    onClick={undo}
                    className="size-6 xs:size-8 bg-[#454e11] rounded mb-2 p-1"
                    data-tooltip-content={"Undo"}
                    data-tooltip-id="undo"
                    data-tooltip-offset={2}
                >
                    <Undo className="size-4 xs:size-6" />
                </button>
                <button
                    onClick={reset}
                    className="size-6 xs:size-8 bg-[#454e11] rounded p-1"
                    data-tooltip-content={"Reset"}
                    data-tooltip-id="reset"
                    data-tooltip-offset={2}
                >
                    <RotateCcw className="size-4 xs:size-6" />
                </button>
                <button
                    onClick={save}
                    className="size-6 xs:size-8 bg-[#454e11] rounded mt-2 p-1"
                    data-tooltip-content={"Save"}
                    data-tooltip-id="save"
                    data-tooltip-offset={2}
                >
                    <HardDriveDownload className="size-4 xs:size-6" />
                </button>
                <button
                    onClick={load}
                    className="size-6 xs:size-8 bg-[#454e11] rounded mt-2 p-1"
                    data-tooltip-content={"Load"}
                    data-tooltip-id="load"
                    data-tooltip-offset={2}
                >
                    <HardDriveUpload className="size-4 xs:size-6" />
                </button>
            </div>

            {status && (
                <div className="absolute bottom-8 text-white text-center">
                    <h1 className="text-2xl font-bold">{status}</h1>
                    <p className="text-sm text-gray-200">
                        {status === "Checkmate" && result}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ChessComponent;
