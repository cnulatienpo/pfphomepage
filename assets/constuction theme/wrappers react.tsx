import React, {useEffect, useLayoutEffect, useRef} from "react";
import type { ScribbleOptions } from "./index";
import { scribble } from "./index";

export function Scribble({children, ...opts}: ScribbleOptions & {children: React.ReactNode}){
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(()=>{
    if(!ref.current) return;
    const svg = scribble(ref.current, opts);
    return ()=> svg?.remove?.();
  }, [opts.type, opts.color, opts.stroke, opts.roughness, opts.padding]);
  return <span ref={ref} className={opts.type==="underline" ? "scribble-underline" : ""}>{children}</span>;
}

export const BlueprintLabel: React.FC<{pos?: "tr"|"tl"|"br"|"bl"; className?: string;}> = ({pos="tr", className="", children})=>{
  const style: React.CSSProperties = { position:"absolute" };
  if(pos.includes("t")) style.top="8px"; else style.bottom="8px";
  if(pos.includes("r")) style.right="8px"; else style.left="8px";
  return <span className={`bp-label ${className}`} style={style}>{children}</span>;
};
