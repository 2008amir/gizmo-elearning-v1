// POST /api/public/broadcast-post-push
// Body: { postId: string, accessToken: string }
// Verifies the access token belongs to an admin, then fans out a web-push
// notification to every stored push_subscriptions row for the post.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { sendWebPush, type PushSub } from "@/lib/webpush.server";

const bodySchema = z.object({
  postId: z.string().uuid(),
  accessToken: z.string().min(10),
});

export const Route = createFileRoute("/api/public/broadcast-post-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        const { postId, accessToken } = parsed;

        // Verify caller is an admin using the publishable-key client with the user's token
        const supabaseAsUser = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${accessToken}` } },
          },
        );
        const { data: userData, error: userErr } = await supabaseAsUser.auth.getUser(accessToken);
        if (userErr || !userData?.user) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { data: isAdmin, error: roleErr } = await supabaseAsUser.rpc("has_role", {
          _user_id: userData.user.id,
          _role: "admin",
        });
        if (roleErr || !isAdmin) {
          return new Response("Forbidden", { status: 403 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: post } = await supabaseAdmin
          .from("posts")
          .select("id, title, description, header_image_url")
          .eq("id", postId)
          .maybeSingle();
        if (!post) return new Response("Post not found", { status: 404 });

        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth_key");
        const list = (subs ?? []) as Array<{ endpoint: string; p256dh: string; auth_key: string }>;

        const payload = {
          title: post.title as string,
          body: (post.description as string | null) ?? "",
          link: `/posts/${post.id}`,
          image: (post.header_image_url as string | null) ?? undefined,
        };

        let sent = 0;
        let failed = 0;
        const stale: string[] = [];
        await Promise.all(
          list.map(async (row) => {
            const sub: PushSub = { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth_key };
            try {
              const r = await sendWebPush(sub, payload);
              if (r.ok) sent++;
              else {
                failed++;
                if (r.status === 404 || r.status === 410) stale.push(row.endpoint);
              }
            } catch {
              failed++;
            }
          }),
        );

        if (stale.length) {
          await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
        }

        return Response.json({ sent, failed, total: list.length });
      },
    },
  },
});
