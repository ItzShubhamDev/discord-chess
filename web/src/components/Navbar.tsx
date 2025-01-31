"use client";

import { ExternalLink, LinkIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname();
    console.log(pathname);
    return (
        <div className="w-full bg-[#454e11] text-white flex items-center justify-center p-4 space-x-4">
            <Link
                href="/demo"
                className={`hover:text-gray-300 p-2 px-4 rounded-lg ${
                    pathname === "/demo" ? "bg-gray-900" : "bg-gray-800"
                }`}
            >
                Bot Demo
            </Link>
            <Link
                href="/"
                className={`hover:text-gray-300 p-2 px-4 rounded-lg ${
                    pathname === "/" ? "bg-gray-900" : "bg-gray-800"
                }`}
            >
                Play
            </Link>
            <Link
                href="/leaderboard"
                className={`hover:text-gray-300 p-2 px-4 rounded-lg ${
                    pathname === "/leaderboard" ? "bg-gray-900" : "bg-gray-800"
                }`}
            >
                Leaderboard
            </Link>
            <Link
                href={
                    process.env.NEXT_PUBLIC_BOT_INVITE_URL ||
                    "https://discord.com/oauth2/authorize?client_id=1333282728954691655&permissions=2048&integration_type=0&scope=bot+applications.commands"
                }
                className="hover:text-gray-300 p-2 px-4 rounded-lg bg-gray-800 flex space-x-2 items-center"
                target="_blank"
            >
                <ExternalLink className="size-4" />
                <span>Invite</span>
            </Link>
            {process.env.NEXT_PUBLIC_SERVER_INVITE_URL && (
                <Link
                    href={process.env.NEXT_PUBLIC_SERVER_INVITE_URL}
                    className="hover:text-gray-300 p-2 px-4 rounded-lg bg-gray-800 flex space-x-2 items-center"
                    target="_blank"
                >
                    <ExternalLink className="size-4" />
                    <span>Server</span>
                </Link>
            )}
            {process.env.NEXT_PUBLIC_GITHUB_URL && (
                <Link
                    href={process.env.NEXT_PUBLIC_GITHUB_URL}
                    className="hover:text-gray-300 p-2 px-4 rounded-lg bg-gray-800 flex space-x-2 items-center"
                    target="_blank"
                >
                    <ExternalLink className="size-4" />
                    <span>Github</span>
                </Link>
            )}
        </div>
    );
}
