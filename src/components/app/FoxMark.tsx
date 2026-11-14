import logoTile from "@/assets/cx-logo.png.asset.json";
import logoMark from "@/assets/cx-mark.png.asset.json";
import { cn } from "@/lib/utils";

/** Brand mark: the CX monogram. `tile` = cyan monogram on a dark rounded tile,
 *  `mark` = the monogram alone (transparent) for placement on colored surfaces. */
export function FoxMark({
  className = "",
  variant = "tile",
}: {
  className?: string;
  variant?: "tile" | "mark";
}) {
  return (
    <img
      src={variant === "mark" ? logoMark.url : logoTile.url}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn(
        "select-none object-cover",
        variant === "tile" && "rounded-[26%] ring-1 ring-foreground/10",
        className,
      )}
    />
  );
}
