import type { HTMLMotionProps } from "framer-motion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { staggerItemVariants } from "@/lib/motion";

type StaggerItemProps = Omit<HTMLMotionProps<"div">, "children"> & {
  children: ReactNode;
};

export function StaggerItem({
  children,
  className,
  ...props
}: StaggerItemProps) {
  return (
    <motion.div className={className} variants={staggerItemVariants} {...props}>
      {children}
    </motion.div>
  );
}
