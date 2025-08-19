"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { MeshGradient } from "@paper-design/shaders-react"
import { useTheme } from "next-themes"

interface ShaderBackgroundProps {
  children: React.ReactNode
}

export default function ShaderBackground({ children }: ShaderBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isActive, setIsActive] = useState(false)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [colors, setColors] = useState<string[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleMouseEnter = () => setIsActive(true)
    const handleMouseLeave = () => setIsActive(false)

    const container = containerRef.current
    if (container) {
      container.addEventListener("mouseenter", handleMouseEnter)
      container.addEventListener("mouseleave", handleMouseLeave)
    }

    return () => {
      if (container) {
        container.removeEventListener("mouseenter", handleMouseLeave)
        container.removeEventListener("mouseleave", handleMouseLeave)
      }
    }
  }, [])

  // Get colors from CSS variables
  useEffect(() => {
    if (!mounted) return
    
    const computedStyle = getComputedStyle(document.documentElement)
    const getColor = (varName: string) => computedStyle.getPropertyValue(varName).trim()
    
    // Use existing CSS variables for shader colors
    const shaderColors = [
      getColor('--background'),
      getColor('--primary'),
      getColor('--secondary'),
      getColor('--muted'),
      getColor('--chart-5') || getColor('--accent')
    ].filter(Boolean) // Remove any empty values
    
    setColors(shaderColors.length >= 4 ? shaderColors : ['#f9f9f9', '#644a40', '#ffdfb5', '#efefef'])
  }, [mounted, resolvedTheme])

  return (
    <div ref={containerRef} className="min-h-screen relative overflow-hidden">
      {/* SVG Filters for glass effects */}
      <svg className="absolute inset-0 w-0 h-0">
        <defs>
          <filter id="glass-effect" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence baseFrequency="0.005" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0.02
                      0 1 0 0 0.02
                      0 0 1 0 0.05
                      0 0 0 0.9 0"
              result="tint"
            />
          </filter>
          <filter id="gooey-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Fixed Background Shader Layers */}
      {colors.length >= 4 && (
        <div className="fixed inset-0 z-0">
          {/* Primary gradient layer */}
          <div className="absolute inset-0 w-full h-full">
            <MeshGradient
              colors={colors.slice(0, 4)}
              speed={isActive ? 0.4 : 0.2}
              distortion={0.8}
              swirl={0.5}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          
          {/* Secondary subtle overlay for depth */}
          <div className="absolute inset-0 w-full h-full opacity-30">
            <MeshGradient
              colors={[colors[0], colors[1], colors[2], colors[0]]}
              speed={0.15}
              distortion={0.5}
              swirl={0.3}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
      )}

      {/* Content layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}