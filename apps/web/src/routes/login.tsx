import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { scaleFadeVariants } from "@/lib/motion";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const [showSignIn, setShowSignIn] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      {showSignIn ? (
        <motion.div
          animate="visible"
          exit={prefersReducedMotion ? undefined : "exit"}
          initial={prefersReducedMotion ? false : "hidden"}
          key="signin"
          variants={prefersReducedMotion ? undefined : scaleFadeVariants}
        >
          <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
        </motion.div>
      ) : (
        <motion.div
          animate="visible"
          exit={prefersReducedMotion ? undefined : "exit"}
          initial={prefersReducedMotion ? false : "hidden"}
          key="signup"
          variants={prefersReducedMotion ? undefined : scaleFadeVariants}
        >
          <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
