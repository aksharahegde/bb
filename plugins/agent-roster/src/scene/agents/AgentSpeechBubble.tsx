import { Html } from "@react-three/drei";
import { AVATAR_Y } from "../constants.js";

export function AgentSpeechBubble({ text }: { text: string }) {
  return (
    <Html
      position={[0, AVATAR_Y + 0.65, 0]}
      center
      distanceFactor={8}
      zIndexRange={[40, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div className="max-w-[160px] rounded-md border border-border bg-popover px-2 py-1 text-[10px] leading-tight text-popover-foreground shadow-sm">
        {text}
      </div>
    </Html>
  );
}
