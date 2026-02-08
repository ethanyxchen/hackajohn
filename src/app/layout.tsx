import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pressStart2P = Press_Start_2P({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-pixel",
    display: "swap",
});

export const metadata: Metadata = {
    title: "SnugBox",
    description: "Turn floor plans into playful isometric rooms and move furniture around.",
    icons: {
        icon: "/favicon.png",
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={pressStart2P.variable}>
            <body>{children}</body>
        </html>
    );
}
