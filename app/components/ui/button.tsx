import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 live-element",
  {
    variants: {
      variant: {
        default: "btn-underground",
        destructive: "bg-red-500 text-white border-2 border-red-700 transform skew-x-1 hover:skew-x-0 hover:scale-105 box-shadow-brutal",
        // Force explicit foreground colors to avoid contrast loss when parent sets a light text color
        outline: "border-2 border-foreground text-foreground bg-transparent hover:bg-foreground hover:text-background transform -skew-y-1 hover:skew-y-0",
        secondary: "bg-bauhaus-concrete text-bauhaus-white border-2 border-bauhaus-white transform skew-y-1 hover:skew-y-0",
        ghost: "hover:bg-bauhaus-concrete hover:text-bauhaus-white transform rotate-1 hover:rotate-0",
        link: "text-bauhaus-red underline-offset-4 hover:underline graffiti-underline",
        minimal: "bg-transparent text-foreground hover:bg-bauhaus-concrete/20 transform -rotate-0.5 hover:rotate-0",
        underground: "btn-underground",
        // Keep electric readable on hover without changing text color
        electric: "bg-bauhaus-electric text-bauhaus-black border-2 border-bauhaus-black hover:brightness-95",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
