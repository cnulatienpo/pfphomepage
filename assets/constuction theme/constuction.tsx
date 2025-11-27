// construction-fx/react.tsx
import React, { CSSProperties, useEffect, useMemo, useRef } from "react";

/** PortRing — circle with a gap */
export function PortRing({
  size = 24,
  thickness = 4,
  gapDeg = 42,
  gapAngle = 28,
  color = "currentColor",
  style,
}: {
  size?: number; thickness?: number; gapDeg?: number; gapAngle?: number; color?: string; style?: CSSProperties;
}) {
  const s: CSSProperties = {
    width: size, height: size, color,
    ["--size" as any]: `${size}px`,
    ["--thickness" as any]: `${thickness}px`,
    ["--gap-deg" as any]: `${gapDeg}deg`,
    ["--gap-angle" as any]: `${gapAngle}deg`,
    ...style
  };
  return <span className="ring-gap" style={s} aria-hidden />;
}

/** PanelPlate — rectangle with seam gap and optional washers/weld */
export function PanelPlate({
  children, className="", washer=true, style
}: {children?: React.ReactNode; className?: string; washer?: boolean; style?: CSSProperties;}) {
  return (
    <div className={`panel panel--gap-tr ${washer? "panel--washer": ""} ${className}`} style={style}>
      {children}
    </div>
  );
}

/** WeldRect — dotted bead around 3.5 edges (respects gap) */
export function WeldRect({ gapLen=22, inset=2, bead=6 }: {gapLen?: number; inset?: number; bead?: number;}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box,setBox] = React.useState<{w:number;h:number}|null>(null);
  useEffect(()=>{
    const r = ref.current?.parentElement?.getBoundingClientRect(); if(!r) return;
    setBox({w:r.width, h:r.height});
  },[]);
  if(!box) return <div ref={ref} />;
  const {w,h} = box;
  const d = `M${inset},${inset} H${w-gapLen-inset} M${w-inset},${inset+gapLen} V${h-inset} H${inset} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}
         style={{position:"absolute", inset:0, pointerEvents:"none"}}>
      <path d={d} fill="none" stroke="rgba(255,255,255,.85)" strokeWidth={3}
            strokeLinecap="round" strokeDasharray={`0 ${bead-2} 1.8 ${bead-2}`} />
    </svg>
  );
}

/** ScribbleOverlay — procedural chalk line */
export function ScribbleOverlay({
  color="rgba(255,255,255,.8)", width=3, seed=7
}:{color?:string;width?:number;seed?:number;}){
  const ref = useRef<SVGSVGElement>(null);
  useEffect(()=>{
    const host = ref.current?.parentElement; if(!host) return;
    const r = host.getBoundingClientRect();
    const d = makeScribblePath(r.width, r.height, seed);
    const p = ref.current!.querySelector("path")!;
    ref.current!.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
    p.setAttribute("d", d);
  },[seed]);
  return (
    <svg ref={ref} style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:1}}>
      <path fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function makeScribblePath(w:number,h:number,seed=1,amp=6,steps=6){
  let t=seed; const rnd=()=> (t=Math.imul(48271,t)%2147483647)/2147483647;
  const pts:number[][]=[]; const y=h*0.75;
  for(let i=0;i<=steps;i++){ const x=(w/steps)*i; const dy=(rnd()-0.5)*amp*(1+(i%2?0.6:1)); pts.push([x,y+dy]); }
  let d=`M ${pts[0][0]} ${pts[0][1]}`;
  for(let i=1;i<pts.length;i++){ const [x,y]=pts[i], [px,py]=pts[i-1]; const cx=(px+x)/2; d += ` Q ${cx} ${py} ${x} ${y}`; }
  return d;
}

/** BlueprintLabel */
export const BlueLabel: React.FC<React.HTMLAttributes<HTMLSpanElement>> = (props) =>
  <span className={`blue-label ${props.className||""}`} style={props.style}>{props.children}</span>;

/** Activate a port ring so its gap faces a target, and route a pipe */
export function useActivation(pipeOuterId:string, pipeInnerId:string){
  return (fromEl:HTMLElement, toEl:HTMLElement)=>{
    const a = center(fromEl), b = center(toEl);
    const theta = Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
    fromEl.style.setProperty('--gap-angle', (theta-90)+'deg');
    const svg = document.getElementById(pipeOuterId)!.ownerSVGElement!;
    const s = svg.getBoundingClientRect();
    const start={x:a.x-s.left,y:a.y-s.top}, end={x:b.x-s.left,y:b.y-s.top}, elbow=24;
    const d=`M ${start.x} ${start.y} h ${elbow} V ${end.y} H ${end.x}`;
    (document.getElementById(pipeOuterId) as SVGPathElement).setAttribute('d',d);
    (document.getElementById(pipeInnerId) as SVGPathElement).setAttribute('d',d);
  };
}
function center(el:Element){ const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; }
