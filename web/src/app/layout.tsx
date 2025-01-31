import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
    title: "Chess Web",
    description: "A web app for playing chess",
    icons: [
        {
            media: "(prefers-color-scheme: light)",
            url: "/assets/bn.png",
            href: "/assets/bn.png",
        },
        {
            media: "(prefers-color-scheme: dark)",
            url: "/assets/wn.png",
            href: "/assets/wn.png",
        },
    ],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="w-full h-screen bg-gray-900 flex flex-col">
                <Navbar />
                {children}
            </body>
        </html>
    );
}
