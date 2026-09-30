import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge only knows Tailwind's built-in size names. Without this,
// `text-caption` is read as a colour and silently dropped when merged with
// `text-muted-foreground`. Keep in sync with the type scale in index.css.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "micro", "caption", "body-sm", "body", "title",
            "headline", "display", "hero", "label", "readout",
          ],
        },
      ],
      tracking: [{ tracking: ["label"] }],
    },
  },
});

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
