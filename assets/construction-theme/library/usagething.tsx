import * as React from "react";
import { aimPort, setSeam, connectPorts } from "../../../src/lib/construction-fx/ports";
import { Scribble, BlueprintLabel } from "../../../src/lib/construction-fx/react-wrappers";

export function Card(){
  const panelRef = React.useRef<HTMLDivElement>(null);
  const portA = React.useRef<HTMLSpanElement>(null);
  const portB = React.useRef<HTMLSpanElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  function activate(){
    if(!panelRef.current || !portA.current || !portB.current || !svgRef.current) return;
    setSeam(panelRef.current, 48);
    aimPort(portA.current, panelRef.current);
    aimPort(portB.current, panelRef.current);
    connectPorts(portA.current, portB.current, svgRef.current);
  }

  return (
    <div className="panel panel--washer weld weld--top" ref={panelRef} style={{position:"relative"}}>
      <BlueprintLabel>A‑BAY 04</BlueprintLabel>
      <Scribble type="underline"><h3>Beam schedule</h3></Scribble>
      <span ref={portA} className="ring-gap" style={{["--size" as any]:"22px", color:"var(--accent)"}}/>
      <button className="btn" onClick={activate}>Activate</button>
      <span ref={portB} className="ring-gap" style={{["--size" as any]:"22px", color:"var(--accent)"}}/>
      <svg ref={svgRef} className="pipe" width="100%" height="120">
        <path className="outer" fill="none" stroke="var(--shape)" strokeWidth="8" strokeLinecap="round"/>
        <path className="flow"  fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 10"/>
      </svg>
    </div>
  );
}
