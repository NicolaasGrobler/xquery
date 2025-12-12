import type { Transition, Variants } from "framer-motion";

const DURATION_FAST = 0.15;
const DURATION_NORMAL = 0.2;
const EASE_DEFAULT: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

export const defaultTransition: Transition = {
  duration: DURATION_NORMAL,
  ease: EASE_DEFAULT,
};

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: defaultTransition,
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION_FAST },
  },
};

export const fadeUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: defaultTransition,
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: DURATION_FAST },
  },
};

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION_NORMAL,
      ease: EASE_DEFAULT,
    },
  },
};

export const slideFromLeftVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -16,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: defaultTransition,
  },
};

export const slideFromRightVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 16,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: defaultTransition,
  },
};

export const scaleFadeVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: defaultTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: DURATION_FAST },
  },
};
