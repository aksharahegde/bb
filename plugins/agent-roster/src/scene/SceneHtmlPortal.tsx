import { Html } from "@react-three/drei";
import {
  createContext,
  useContext,
  useRef,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";

const SceneHtmlPortalContext =
  createContext<RefObject<HTMLElement | null> | null>(null);

export function OfficeSceneShell({ children }: { children: ReactNode }) {
  const portalRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative h-full w-full">
      <div
        ref={portalRef}
        className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
        data-testid="roster-scene-html-portal"
      />
      <SceneHtmlPortalContext.Provider value={portalRef}>
        {children}
      </SceneHtmlPortalContext.Provider>
    </div>
  );
}

function useSceneHtmlPortal(): RefObject<HTMLElement | null> | null {
  return useContext(SceneHtmlPortalContext);
}

type SceneHtmlProps = ComponentProps<typeof Html>;

const SCENE_HTML_Z_INDEX: SceneHtmlProps["zIndexRange"] = [10, 0];

export function SceneHtml({
  portal: portalOverride,
  pointerEvents = "none",
  ...props
}: SceneHtmlProps) {
  const portal = useSceneHtmlPortal();
  const target = portalOverride ?? portal;
  if (!target) return null;

  return (
    <Html
      {...props}
      portal={target as RefObject<HTMLElement>}
      pointerEvents={pointerEvents}
      zIndexRange={props.zIndexRange ?? SCENE_HTML_Z_INDEX}
    />
  );
}
