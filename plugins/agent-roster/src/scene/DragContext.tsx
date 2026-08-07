import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface DragApi {
  draggingAgentId: string | null;
  setDraggingAgentId: (agentId: string | null) => void;
  startDrag: (agentId: string) => void;
  registerStartDrag: (handler: (agentId: string) => void) => () => void;
}

const DragContext = createContext<DragApi | null>(null);

export function DragProvider({ children }: { children: ReactNode }) {
  const startRef = useRef<((agentId: string) => void) | null>(null);
  const [draggingAgentId, setDraggingAgentId] = useState<string | null>(null);

  const registerStartDrag = useCallback((handler: (agentId: string) => void) => {
    startRef.current = handler;
    return () => {
      if (startRef.current === handler) {
        startRef.current = null;
      }
    };
  }, []);

  const startDrag = useCallback((agentId: string) => {
    startRef.current?.(agentId);
  }, []);

  return (
    <DragContext.Provider
      value={{ draggingAgentId, setDraggingAgentId, startDrag, registerStartDrag }}
    >
      {children}
    </DragContext.Provider>
  );
}

export function useDragApi(): DragApi {
  const api = useContext(DragContext);
  if (!api) {
    throw new Error("useDragApi must be used within DragProvider");
  }
  return api;
}
