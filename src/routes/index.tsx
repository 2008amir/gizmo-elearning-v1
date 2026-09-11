import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/AuthScreen";

const TITLE = "Gizmo Dan Kaita — Learning & Research Platform";
const DESCRIPTION = "Learn, research, collaborate, and build practical skills with Gizmo Dan Kaita Office Plus by CodeBreakers.";
const PREVIEW_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3fd77744-aa02-40e9-9a4e-11d8d16acef5/id-preview-7058d247--c88f10a6-33ee-49b7-954d-f35e39979d1d.lovable.app-1783781943522.png";

export const Route = createFileRoute("/")({
  component: AuthScreen,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://friendly-core-helper.lovable.app/" },
      { property: "og:image", content: PREVIEW_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: PREVIEW_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://friendly-core-helper.lovable.app/" }],
  }),
});
