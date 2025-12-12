import type { HTMLMotionProps } from "framer-motion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { fadeUpVariants } from "@/lib/motion";

type FadeInProps = Omit<HTMLMotionProps<"div">, "children"> & {
  children: ReactNode;
  delay?: number;
};

export function FadeIn({
  children,
  delay = 0,
  className,
  ...props
}: FadeInProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div
        className={className}
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      animate="visible"
      className={className}
      initial="hidden"
      transition={{ delay }}
      variants={fadeUpVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}
