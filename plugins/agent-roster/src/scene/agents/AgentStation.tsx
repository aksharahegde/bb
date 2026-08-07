import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { RosterAgent } from "../../types.js";
import { Workstation } from "../furniture/Workstation.js";
import type { SceneTheme } from "../hooks/useSceneTheme.js";
import { AgentAvatar } from "./AgentAvatar.js";
import { AgentSpeechBubble } from "./AgentSpeechBubble.js";
import { AgentStatusEffects } from "./AgentStatusEffects.js";

export function AgentStation({
  agent,
  theme,
  selected,
  reducedMotion,
  onSelect,
}: {
  agent: RosterAgent;
  theme: SceneTheme;
  selected: boolean;
  reducedMotion: boolean;
  onSelect: (agent: RosterAgent) => void;
}) {
  const status = agent.spatial_state.status;
  const dimmed = status === "offline";

  const handleClick = (event: ThreeEvent<MouseEvent>): void => {
    event.stopPropagation();
    onSelect(agent);
  };

  return (
    <group>
      <Workstation
        theme={theme}
        status={status}
        reducedMotion={reducedMotion}
        dimmed={dimmed}
      />
      {!dimmed ? <AgentAvatar avatar={agent.avatar} /> : null}
      <AgentStatusEffects
        theme={theme}
        status={status}
        selected={selected}
        reducedMotion={reducedMotion}
      />
      {agent.speech_bubble ? (
        <AgentSpeechBubble text={agent.speech_bubble} />
      ) : null}
      <mesh
        position={[0, 0.8, 0]}
        onClick={handleClick}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <boxGeometry args={[1.5, 1.8, 1.2]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <Html transform position={[0, 0.05, 0]} style={{ pointerEvents: "none" }}>
        <span
          data-testid={`roster-agent-sprite-${agent.id}`}
          className="sr-only"
        >
          {agent.name}
        </span>
      </Html>
    </group>
  );
}
