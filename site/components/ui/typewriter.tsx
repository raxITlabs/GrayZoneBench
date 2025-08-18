"use client";

import { motion, useAnimate } from "framer-motion";
import { useEffect } from "react";
import { LucideIcon } from "lucide-react";

interface TypewriterSequence {
    text: string;
    deleteAfter?: boolean;
    pauseAfter?: number;
    icon?: LucideIcon;
}

interface TypewriterTextProps {
    sequences?: TypewriterSequence[];
    typingSpeed?: number;
    startDelay?: number;
    autoLoop?: boolean;
    loopDelay?: number;
    className?: string;
}

export function TypewriterText({
    sequences = [
        { text: "Loading insights...", deleteAfter: false },
    ],
    typingSpeed = 30,
    startDelay = 100,
    autoLoop = false,
    loopDelay = 2000,
    className = "",
}: TypewriterTextProps) {
    const [scope, animate] = useAnimate();

    useEffect(() => {
        let isActive = true;

        const typeText = async () => {
            const titleElement =
                scope.current?.querySelector("[data-typewriter]");
            if (!titleElement) return;

            do {
                // Reset the text content
                await animate(scope.current, { opacity: 1 });
                titleElement.textContent = "";

                // Wait for initial delay on first run
                await new Promise((resolve) => setTimeout(resolve, startDelay));

                // Process each sequence
                for (const sequence of sequences) {
                    if (!isActive) break;

                    // Type out the sequence text
                    for (let i = 0; i < sequence.text.length; i++) {
                        if (!isActive) break;
                        titleElement.textContent = sequence.text.slice(
                            0,
                            i + 1
                        );
                        await new Promise((resolve) =>
                            setTimeout(resolve, typingSpeed)
                        );
                    }

                    // Pause after typing if specified
                    if (sequence.pauseAfter) {
                        await new Promise((resolve) =>
                            setTimeout(resolve, sequence.pauseAfter)
                        );
                    }

                    // Delete the text if specified
                    if (sequence.deleteAfter) {
                        // Small pause before deleting
                        await new Promise((resolve) =>
                            setTimeout(resolve, 500)
                        );

                        for (let i = sequence.text.length; i > 0; i--) {
                            if (!isActive) break;
                            titleElement.textContent = sequence.text.slice(
                                0,
                                i
                            );
                            await new Promise((resolve) =>
                                setTimeout(resolve, typingSpeed / 2)
                            );
                        }
                    }
                }

                if (!autoLoop || !isActive) break;

                // Wait before starting next loop
                await new Promise((resolve) => setTimeout(resolve, loopDelay));
            } while (autoLoop && isActive);
        };

        typeText();

        // Cleanup function to stop the animation when component unmounts
        return () => {
            isActive = false;
        };
    }, [
        sequences,
        typingSpeed,
        startDelay,
        autoLoop,
        loopDelay,
        animate,
        scope,
    ]);

    return (
        <div className={`relative ${className}`} ref={scope}>
            <motion.div
                className="text-base"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="flex items-start gap-2">
                    {sequences[0]?.icon && (() => {
                        const IconComponent = sequences[0].icon;
                        return <IconComponent className="w-4 h-4 text-chart-1 mt-0.5 flex-shrink-0" />;
                    })()}
                    <div className="flex-1">
                        <span
                            data-typewriter
                            className="inline-block text-chart-1"
                        >
                            {sequences[0]?.text || ""}
                        </span>
                        <span className="inline-block w-[2px] h-5 bg-chart-1 animate-pulse ml-0.5" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}