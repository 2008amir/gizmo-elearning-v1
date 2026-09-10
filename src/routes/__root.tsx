import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import { ActivityTracker } from "@/lib/activity-tracker";
import { ThemeProvider } from "@/lib/theme";

import "../styles.css";

interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass-strong rounded-2xl p-8">
        <h1 className="text-7xl font-bold gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md gradient-bg px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sign in or Create Account — Gizmo Office Plus" },
      { name: "description", content: "Sign in to Gizmo Office Plus or create your free researcher account." },
      { name: "author", content: "Gizmo Office Plus" },
      { name: "application-name", content: "Gizmo Office Plus" },
      { property: "og:title", content: "Sign in or Create Account — Gizmo Office Plus" },
      { property: "og:description", content: "Sign in to Gizmo Office Plus or create your free researcher account." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Gizmo Office Plus" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sign in or Create Account — Gizmo Office Plus" },
      { name: "twitter:description", content: "Sign in to Gizmo Office Plus or create your free researcher account." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3fd77744-aa02-40e9-9a4e-11d8d16acef5/id-preview-7058d247--c88f10a6-33ee-49b7-954d-f35e39979d1d.lovable.app-1783781943522.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3fd77744-aa02-40e9-9a4e-11d8d16acef5/id-preview-7058d247--c88f10a6-33ee-49b7-954d-f35e39979d1d.lovable.app-1783781943522.png" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "https://plain-weur-prod-public.komododecks.com/202604/27/xyjki78OX6s1cXUslODP/image.png" },
      { rel: "apple-touch-icon", href: "https://plain-weur-prod-public.komododecks.com/202604/27/xyjki78OX6s1cXUslODP/image.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap" },
      { rel: "preconnect", href: "https://challenges.cloudflare.com" },
      { rel: "preload", as: "script", href: "https://challenges.cloudflare.com/turnstile/v0/api.js" },
    ],
    scripts: [
      { src: "https://challenges.cloudflare.com/turnstile/v0/api.js", async: true, defer: true },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ActivityTracker />
          <Outlet />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
