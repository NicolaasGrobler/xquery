import type { HTMLMotionProps } from "framer-motion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { staggerContainerVariants } from "@/lib/motion";

type StaggerContainerProps = Omit<HTMLMotionProps<"div">, "children"> & {
  children: ReactNode;
};

export function StaggerContainer({
  children,
  className,
  ...props
}: StaggerContainerProps) {
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
      variants={staggerContainerVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}
