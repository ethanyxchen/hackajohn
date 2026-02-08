"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

function getSystemTheme(): "light" | "dark" {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
    if (theme === "dark") {
        document.documentElement.dataset.theme = "dark";
    } else {
        delete document.documentElement.dataset.theme;
    }
}

export function ThemeToggle() {
    // null = follow system, "light"/"dark" = explicit user choice
    const [userChoice, setUserChoice] = useState<"light" | "dark" | null>(null);
    const [resolved, setResolved] = useState<"light" | "dark">("light");

    const resolve = useCallback((choice: "light" | "dark" | null) => {
        const theme = choice ?? getSystemTheme();
        setResolved(theme);
        applyTheme(theme);
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem("theme");
        if (stored === "dark" || stored === "light") {
            setUserChoice(stored);
            resolve(stored);
        } else {
            resolve("light");
        }
    }, [resolve]);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            if (userChoice === null) {
                resolve(null);
            }
        };
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [userChoice, resolve]);

    const toggle = useCallback(() => {
        const next = resolved === "light" ? "dark" : "light";
        setUserChoice(next);
        resolve(next);
        localStorage.setItem("theme", next);
    }, [resolved, resolve]);

    return (
        <button className="theme-toggle" onClick={toggle} type="button" aria-label="Toggle theme">
            <Image
                src={resolved === "light" ? "/pixel_moon.png" : "/pixel_sun.png"}
                alt={resolved === "light" ? "Switch to dark mode" : "Switch to light mode"}
                width={20}
                height={20}
            />
        </button>
    );
}
