"use client";

import { motion, useAnimate } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { LucideIcon, Pause, Play } from "lucide-react";
import { Button } from "./button";

interface TypewriterSequence {
    text: string;
    deleteAfter?: boolean;
    pauseAfter?: number;
    icon?: LucideIcon;
    modelName?: string;
    provider?: string;
}

interface TypewriterTextProps {
    sequences?: TypewriterSequence[];
    typingSpeed?: number;
    startDelay?: number;
    autoLoop?: boolean;
    loopDelay?: number;
    className?: string;
    allowPause?: boolean;
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
    allowPause = true,
}: TypewriterTextProps) {
    const [scope, animate] = useAnimate();
    const [isPaused, setIsPaused] = useState(false);
    const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);

    const waitForUnpause = useCallback(async () => {
        while (isPaused) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }, [isPaused]);

    useEffect(() => {
        let isActive = true;

        const typeText = async () => {
            const titleElement = scope.current?.querySelector("[data-typewriter]");
            if (!titleElement) return;

            do {
                // Reset the text content
                await animate(scope.current, { opacity: 1 });
                titleElement.textContent = "";

                // Wait for initial delay on first run
                await new Promise((resolve) => setTimeout(resolve, startDelay));

                // Process each sequence
                for (let seqIndex = 0; seqIndex < sequences.length; seqIndex++) {
                    if (!isActive) break;
                    
                    const sequence = sequences[seqIndex];
                    setCurrentSequenceIndex(seqIndex);

                    // Wait if paused
                    await waitForUnpause();
                    if (!isActive) break;

                    // Type out the sequence text
                    for (let i = 0; i < sequence.text.length; i++) {
                        await waitForUnpause();
                        if (!isActive) break;
                        
                        titleElement.textContent = sequence.text.slice(0, i + 1);
                        await new Promise((resolve) => setTimeout(resolve, typingSpeed));
                    }

                    // Pause after typing if specified
                    if (sequence.pauseAfter) {
                        await new Promise((resolve) => setTimeout(resolve, sequence.pauseAfter));
                    }

                    // Delete the text if specified
                    if (sequence.deleteAfter) {
                        // Small pause before deleting
                        await new Promise((resolve) => setTimeout(resolve, 500));

                        for (let i = sequence.text.length; i > 0; i--) {
                            await waitForUnpause();
                            if (!isActive) break;
                            
                            titleElement.textContent = sequence.text.slice(0, i);
                            await new Promise((resolve) => setTimeout(resolve, typingSpeed / 2));
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
    }, [sequences, typingSpeed, startDelay, autoLoop, loopDelay, animate, scope, waitForUnpause]);

    const currentSequence = sequences[currentSequenceIndex] || sequences[0];

    return (
        <div className={`relative ${className}`} ref={scope}>
            <div className="flex items-start gap-2">
                {/* Icon */}
                {currentSequence?.icon && (() => {
                    const IconComponent = currentSequence.icon;
                    return <IconComponent className="w-4 h-4 text-chart-1 mt-0.5 flex-shrink-0" />;
                })()}
                
                {/* Text content */}
                <motion.div
                    className="flex-1 text-base"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <span
                        data-typewriter
                        className="inline-block text-chart-1"
                    >
                        {currentSequence?.text || ""}
                    </span>
                    <span className="inline-block w-[2px] h-5 bg-chart-1 animate-pulse ml-0.5" />
                </motion.div>

                {/* Pause/Play control */}
                {allowPause && sequences.length > 1 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                        onClick={() => setIsPaused(!isPaused)}
                    >
                        {isPaused ? 
                            <Play className="w-3 h-3" /> : 
                            <Pause className="w-3 h-3" />
                        }
                    </Button>
                )}
            </div>
        </div>
    );
}