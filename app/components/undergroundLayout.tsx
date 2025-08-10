'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

// Nonsense quotes - hand-written chaos on digital walls
const nonsenseQuotes = [
  "time dissolves when creativity explodes",
  "reality is a collaborative fiction anyway",
  "the stage eats the performer who feeds the audience",
  "every word spoken live dies and is reborn",
  "chaos is just order waiting to be discovered",
  "authentic voice breaks through digital noise",
  "improvisation is conversation with the unknown",
  "the mic doesn't make you heard, presence does",
  "boundaries exist only to be artistically destroyed",
  "live performance is democracy in action"
]

// Asymmetric grid system - geometric rebellion
export function ChaosGrid({ 
  children, 
  className = "" 
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`
      chaos-grid
      section-chaos 
      ${className}
    `}>
      {children}
    </div>
  )
}

// Underground section with parallax and disruption
export function UndergroundSection({ 
  children, 
  title, 
  quote,
  className = "",
  has3D = false
}: {
  children: React.ReactNode
  title?: string
  quote?: string
  className?: string
  has3D?: boolean
}) {
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: false
  })

  const randomQuote = React.useMemo(() => 
    nonsenseQuotes[Math.floor(Math.random() * nonsenseQuotes.length)], 
    []
  )

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 50, rotateX: -10 }}
      animate={inView ? { 
        opacity: 1, 
        y: 0, 
        rotateX: 0,
        transition: { duration: 0.8, ease: "easeOut" }
      } : {}}
      className={`
        relative 
        py-12 md:py-16
        section-chaos
        ${className}
      `}
    >
      {/* Underground texture background */}
      <div className="absolute inset-0 texture-bg opacity-30" />
      
      {/* Graffiti elements */}
      <div className="absolute top-4 right-4 transform rotate-12">
        <div className="w-16 h-16 scribble-bg opacity-20" />
      </div>
      
      {/* Title with brutal styling */}
      {title && (
        <motion.h2 
          className="underground-title mb-8 graffiti-underline"
          initial={{ x: -100, opacity: 0 }}
          animate={inView ? { x: 0, opacity: 1 } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {title}
        </motion.h2>
      )}

      {/* 3D Canvas integration */}
      {has3D && (
        <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-4xl font-black text-bauhaus-red transform rotate-12 opacity-30">
              {title?.charAt(0) || "h"}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        {children}
      </motion.div>

      {/* Nonsense quote - hand-written wisdom */}
      <motion.div 
        className="
          absolute 
          bottom-4 
          left-8 
          nonsense-quote 
          text-sm 
          max-w-xs
          opacity-60
        "
        initial={{ opacity: 0, rotate: -5 }}
        animate={inView ? { opacity: 0.6, rotate: 2 } : {}}
        transition={{ delay: 0.8, duration: 1 }}
      >
        "{quote || randomQuote}"
      </motion.div>
      
      {/* Disruption lines */}
      <div className="absolute bottom-0 left-0 right-0 h-px graffiti-line" />
    </motion.section>
  )
}

// Asymmetric content layout - breaks the grid
export function AsymmetricContent({ 
  children,
  variant = "default" 
}: {
  children: React.ReactNode
  variant?: "default" | "reverse" | "chaos"
}) {
  const layouts = {
    default: "grid-cols-1 md:grid-cols-3 gap-8",
    reverse: "grid-cols-1 md:grid-cols-3 gap-8 [&>*:nth-child(1)]:md:col-start-2 [&>*:nth-child(2)]:md:col-start-1 [&>*:nth-child(2)]:md:row-start-1",
    chaos: "grid-cols-1 md:grid-cols-4 gap-6 [&>*:nth-child(odd)]:md:col-span-2 [&>*:nth-child(even)]:md:col-span-1"
  }

  return (
    <div className={`
      grid 
      ${layouts[variant]}
      items-start
    `}>
      {children}
    </div>
  )
}

// Underground parallax wrapper
export function ParallaxWrapper({ 
  children,
  speed = 0.5,
  className = ""
}: {
  children: React.ReactNode
  speed?: number
  className?: string
}) {
  const [ref, inView] = useInView({
    threshold: 0,
    triggerOnce: false
  })

  return (
    <motion.div
      ref={ref}
      className={className}
      animate={{
        y: inView ? speed * -50 : 0
      }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}

// Hand-drawn element container
export function HandDrawnContainer({ 
  children,
  scribble = true,
  className = ""
}: {
  children: React.ReactNode
  scribble?: boolean
  className?: string
}) {
  return (
    <div className={`
      relative 
      handdrawn-box 
      p-6
      ${scribble ? 'scribble-bg' : ''}
      ${className}
    `}>
      {children}
      
      {/* Hand-drawn corner elements */}
      <div className="absolute -top-1 -left-1 w-4 h-4 border-l-2 border-t-2 border-red-500 transform -rotate-2" />
      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-r-2 border-b-2 border-green-500 transform rotate-1" />
    </div>
  )
}

// Electric accent wrapper for highlighting elements
export function ElectricAccent({ 
  children,
  intensity = "normal" 
}: {
  children: React.ReactNode
  intensity?: "subtle" | "normal" | "intense"
}) {
  const intensityClasses = {
    subtle: "electric-accent opacity-60",
    normal: "electric-accent",
    intense: "electric-accent text-lg font-black"
  }

  return (
    <span className={intensityClasses[intensity]}>
      {children}
    </span>
  )
}

// Underground navigation that breaks conventional patterns
export function UndergroundNav({ 
  items,
  className = ""
}: {
  items: Array<{ label: string; href: string; active?: boolean }>
  className?: string
}) {
  return (
    <nav className={`
      flex 
      flex-wrap 
      gap-6 
      items-center
      transform 
      -skew-y-1
      ${className}
    `}>
      {items.map((item, index) => (
        <motion.a
          key={item.href}
          href={item.href}
          className={`
            px-4 
            py-2 
            border-2 
            border-current 
            transition-all 
            duration-300
            transform
            hover:skew-x-2
            hover:scale-105
            ${item.active ? 'bg-red-500 text-white' : 'text-current'}
            ${index % 2 === 0 ? 'rotate-1' : '-rotate-1'}
          `}
          whileHover={{ scale: 1.05, rotate: index % 2 === 0 ? 2 : -2 }}
          whileTap={{ scale: 0.95 }}
        >
          {item.label}
        </motion.a>
      ))}
    </nav>
  )
}
