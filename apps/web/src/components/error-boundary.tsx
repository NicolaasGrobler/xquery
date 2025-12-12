import { type ErrorComponentProps, Link } from "@tanstack/react-router";
import { AlertCircle, Home, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ErrorBoundary({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            {error.message || "An unexpected error occurred"}
          </CardDescription>
        </CardHeader>
        {import.meta.env.DEV && error.stack && (
          <CardContent>
            <pre className="max-h-[150px] overflow-auto rounded-md bg-muted p-3 font-mono text-xs">
              {error.stack}
            </pre>
          </CardContent>
        )}
        <CardFooter className="flex justify-center gap-2">
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="h-4 w-4" />
            Reload
          </Button>
          {reset && (
            <Button onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Try again
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 font-bold text-6xl text-muted-foreground/50">
            404
          </div>
          <CardTitle className="text-xl">Page not found</CardTitle>
          <CardDescription>
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center gap-2">
          <Button onClick={() => window.history.back()} variant="outline">
            <RotateCcw className="h-4 w-4" />
            Go back
          </Button>
          <Button asChild>
            <Link to="/dashboard">
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
