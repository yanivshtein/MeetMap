import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/src/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:shadow-md",
        secondary:
          "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:shadow-sm",
        outline:
          "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:shadow-sm",
        ghost: "text-gray-700 hover:bg-gray-100",
        danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md",
        "danger-ghost": "text-red-600 hover:bg-red-50 hover:text-red-700",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-11 rounded-lg px-3 text-sm",
        lg: "h-11 px-6 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
