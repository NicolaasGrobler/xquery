import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  User,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import Loader from "./loader";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const nameSchema = z.string().min(2, "Name must be at least 2 characters");
const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");
const invitationCodeSchema = z.string().min(1, "Invitation code is required");

export default function SignUpForm({
  onSwitchToSignIn,
}: {
  onSwitchToSignIn: () => void;
}) {
  const navigate = useNavigate({
    from: "/",
  });
  const { isPending } = authClient.useSession();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      name: "",
      invitationCode: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          password: value.password,
          name: value.name,
        },
        {
          onSuccess: () => {
            navigate({
              to: "/dashboard",
            });
            toast.success("Sign up successful");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
          body: {
            invitationCode: value.invitationCode,
          },
        }
      );
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center">
          <div className="mb-2 font-bold text-2xl text-foreground">XQuery</div>
          <CardTitle className="text-foreground text-xl">
            Create Account
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your details to create a new account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <form.Field
              name="name"
              validators={{
                onChange: nameSchema,
              }}
            >
              {(field) => {
                const hasValue = field.state.value.length > 0;
                const hasErrors = field.state.meta.errors.length > 0;
                const isValid = hasValue && !hasErrors;
                return (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Name</Label>
                    <div className="relative">
                      <User className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        className={cn(
                          "bg-background pr-10 pl-10 text-foreground",
                          hasErrors && "border-destructive",
                          isValid && "border-primary"
                        )}
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="John Doe"
                        value={field.state.value}
                      />
                      {hasValue && (
                        <div className="-translate-y-1/2 absolute top-1/2 right-3">
                          {isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      )}
                    </div>
                    {field.state.meta.errors.map((error) => (
                      <p
                        className="text-destructive text-sm"
                        key={error?.message}
                      >
                        {error?.message}
                      </p>
                    ))}
                  </div>
                );
              }}
            </form.Field>

            <form.Field
              name="email"
              validators={{
                onChange: emailSchema,
              }}
            >
              {(field) => {
                const hasValue = field.state.value.length > 0;
                const hasErrors = field.state.meta.errors.length > 0;
                const isValid = hasValue && !hasErrors;
                return (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Email</Label>
                    <div className="relative">
                      <Mail className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        className={cn(
                          "bg-background pr-10 pl-10 text-foreground",
                          hasErrors && "border-destructive",
                          isValid && "border-primary"
                        )}
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="you@example.com"
                        type="email"
                        value={field.state.value}
                      />
                      {hasValue && (
                        <div className="-translate-y-1/2 absolute top-1/2 right-3">
                          {isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      )}
                    </div>
                    {field.state.meta.errors.map((error) => (
                      <p
                        className="text-destructive text-sm"
                        key={error?.message}
                      >
                        {error?.message}
                      </p>
                    ))}
                  </div>
                );
              }}
            </form.Field>

            <form.Field
              name="password"
              validators={{
                onChange: passwordSchema,
              }}
            >
              {(field) => {
                const hasValue = field.state.value.length > 0;
                const hasErrors = field.state.meta.errors.length > 0;
                const isValid = hasValue && !hasErrors;
                return (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Password</Label>
                    <div className="relative">
                      <Lock className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        className={cn(
                          "bg-background pr-16 pl-10 text-foreground",
                          hasErrors && "border-destructive",
                          isValid && "border-primary"
                        )}
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Enter your password"
                        type={showPassword ? "text" : "password"}
                        value={field.state.value}
                      />
                      <div className="-translate-y-1/2 absolute top-1/2 right-3 flex items-center gap-1">
                        {hasValue &&
                          (isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ))}
                        <button
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                          type="button"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    {field.state.meta.errors.map((error) => (
                      <p
                        className="text-destructive text-sm"
                        key={error?.message}
                      >
                        {error?.message}
                      </p>
                    ))}
                  </div>
                );
              }}
            </form.Field>

            <form.Field
              name="invitationCode"
              validators={{
                onChange: invitationCodeSchema,
              }}
            >
              {(field) => {
                const hasValue = field.state.value.length > 0;
                const hasErrors = field.state.meta.errors.length > 0;
                const isValid = hasValue && !hasErrors;
                return (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Invitation Code</Label>
                    <div className="relative">
                      <KeyRound className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        className={cn(
                          "bg-background pr-10 pl-10 text-foreground",
                          hasErrors && "border-destructive",
                          isValid && "border-primary"
                        )}
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Enter your invitation code"
                        value={field.state.value}
                      />
                      {hasValue && (
                        <div className="-translate-y-1/2 absolute top-1/2 right-3">
                          {isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      )}
                    </div>
                    {field.state.meta.errors.map((error) => (
                      <p
                        className="text-destructive text-sm"
                        key={error?.message}
                      >
                        {error?.message}
                      </p>
                    ))}
                  </div>
                );
              }}
            </form.Field>

            <form.Subscribe>
              {(state) => (
                <Button
                  className="w-full"
                  disabled={!state.canSubmit || state.isSubmitting}
                  type="submit"
                >
                  {state.isSubmitting
                    ? "Creating account..."
                    : "Create Account"}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Already have an account?{" "}
              <Button
                className="h-auto p-0 font-semibold"
                onClick={onSwitchToSignIn}
                variant="link"
              >
                Sign In
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
