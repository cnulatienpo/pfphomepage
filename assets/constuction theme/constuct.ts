// construction-fx/vue.ts
import { defineComponent, h, onMounted, ref } from "vue";

/** PortRing */
export const PortRing = defineComponent({
  name: "PortRing",
  props: { size:{type:Number,default:24}, thickness:{type:Number,default:4}, gapDeg:{type:Number,default:42}, gapAngle:{type:Number,default:28}, color:{type:String,default:"currentColor"} },
  setup(props){
    return ()=> h("span", {
      class:"ring-gap",
      style:{
        width: props.size+"px", height: props.size+"px", color: props.color,
        "--size": props.size+"px", "--thickness": props.thickness+"px",
        "--gap-deg": props.gapDeg+"deg", "--gap-angle": props.gapAngle+"deg",
      } as any, "aria-hidden": "true"
    });
  }
});

/** PanelPlate */
export const PanelPlate = defineComponent({
  name: "PanelPlate",
  props: { washer:{type:Boolean, default:true} },
  setup(props,{slots}){
    return ()=> h("div", { class:["panel","panel--gap-tr", props.washer && "panel--washer"] }, slots.default?.());
  }
});

/** WeldRect */
export const WeldRect = defineComponent({
  name:"WeldRect",
  props:{ gapLen:{type:Number,default:22}, inset:{type:Number,default:2}, bead:{type:Number,default:6} },
  setup(props){
    const svgRef = ref<SVGSVGElement|null>(null);
    onMounted(()=>{
      const host = (svgRef.value as any).parentElement as HTMLElement;
      const r = host.getBoundingClientRect();
      const w=r.width, h=r.height, s=props.inset, g=props.gapLen;
      const d = `M${s},${s} H${w-g-s} M${w-s},${s+g} V${h-s} H${s} Z`;
      svgRef.value!.setAttribute("viewBox", `0 0 ${w} ${h}`);
      (svgRef.value!.querySelector("path") as SVGPathElement).setAttribute("d", d);
    });
    return ()=> h("svg", { ref: svgRef, style:{position:"absolute", inset:"0", pointerEvents:"none"} }, [
      h("path", { fill:"none", stroke:"rgba(255,255,255,.85)", strokeWidth:3, strokeLinecap:"round", strokeDasharray:`0 ${props.bead-2} 1.8 ${props.bead-2}` })
    ]);
  }
});

/** ScribbleOverlay */
export const ScribbleOverlay = defineComponent({
  name:"ScribbleOverlay",
  props:{ color:{type:String,default:"rgba(255,255,255,.8)"}, width:{type:Number,default:3}, seed:{type:Number,default:5} },
  setup(props){
    const svgRef = ref<SVGSVGElement|null>(null);
    onMounted(()=>{
      const host = (svgRef.value as any).parentElement as HTMLElement;
      const r = host.getBoundingClientRect();
      svgRef.value!.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
      (svgRef.value!.querySelector("path") as SVGPathElement)
        .setAttribute("d", makeScribblePath(r.width, r.height, props.seed));
    });
    return ()=> h("svg", { ref: svgRef, style:{position:"absolute",inset:"0",pointerEvents:"none",zIndex:1}}, [
      h("path",{ fill:"none", stroke:props.color, strokeWidth:props.width, strokeLinecap:"round", strokeLinejoin:"round" })
    ]);
  }
});

/** BlueLabel */
export const BlueLabel = defineComponent({
  name:"BlueLabel",
  setup(_, {slots}){ return ()=> h("span",{class:"blue-label"}, slots.default?.()); }
});

// helpers
function makeScribblePath(w:number,h:number,seed=1,amp=6,steps=6){
  let t=seed; const rnd=()=> (t=Math.imul(48271,t)%2147483647)/2147483647;
  const pts:number[][]=[]; const y=h*0.75;
  for(let i=0;i<=steps;i++){ const x=(w/steps)*i; const dy=(rnd()-0.5)*amp*(1+(i%2?0.6:1)); pts.push([x,y+dy]); }
  let d=`M ${pts[0][0]} ${pts[0][1]}`;
  for(let i=1;i<pts.length;i++){ const [x,y]=pts[i], [px,py]=pts[i-1]; const cx=(px+x)/2; d += ` Q ${cx} ${py} ${x} ${y}`; }
  return d;
}

/** Activation composable */
export function useActivation(pipeOuterId:string, pipeInnerId:string){
  return (fromEl:HTMLElement, toEl:HTMLElement)=>{
    const a=center(fromEl), b=center(toEl);
    const theta = Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
    fromEl.style.setProperty('--gap-angle', (theta-90)+'deg');
    const svg = (document.getElementById(pipeOuterId) as SVGPathElement).ownerSVGElement!;
    const s = svg.getBoundingClientRect();
    const start={x:a.x-s.left,y:a.y-s.top}, end={x:b.x-s.left,y:b.y-s.top}, elbow=24;
    const d=`M ${start.x} ${start.y} h ${elbow} V ${end.y} H ${end.x}`;
    (document.getElementById(pipeOuterId) as SVGPathElement).setAttribute('d',d);
    (document.getElementById(pipeInnerId) as SVGPathElement).setAttribute('d',d);
  };
}
function center(el:Element){ const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; }
export type ScribbleOptions = {
  type?: "underline" | "bracket" | "circle";
  color?: string; stroke?: number; roughness?: number; padding?: number;
};

/** Create an SVG scribble overlay on an element */
export function scribble(el:HTMLElement, opts: ScribbleOptions = {}){
  const { type="underline", color="white", stroke=3, roughness=.6, padding=6 } = opts;
  const r = el.getBoundingClientRect();
  const w = Math.max(40, r.width);
  const h = type === "underline" ? Math.max(16, padding*3) : Math.max(r.height + padding*2, 60);
  const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  Object.assign(svg.style, {position:"absolute", pointerEvents:"none", mixBlendMode:"screen"});
  if(type==="underline"){ svg.style.left="0"; svg.style.right="0"; svg.style.bottom=`-${padding}px`; }
  else { svg.style.left="0"; svg.style.top=`-${padding}px`; svg.style.right="0"; svg.style.bottom=`-${padding}px`; }

  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("fill","none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", String(stroke));
  path.setAttribute("stroke-linecap","round");
  path.setAttribute("stroke-linejoin","round");

  function jitter(y:number, amp:number){ return y + (Math.random()*2-1)*amp; }
  if(type==="underline"){
    const y = h - stroke;
    const steps = Math.max(6, Math.floor(w/40));
    const amp = roughness*6;
    let d = "";
    for(let i=0;i<=steps;i++){
      const x = (i/steps)*w;
      const yj = jitter(y, amp);
      d += (i? " L":"M") + ` ${x.toFixed(1)} ${yj.toFixed(1)}`;
    }
    path.setAttribute("d", d);
  }else if(type==="bracket"){
    const inset=6;
    const d = `M ${inset} ${inset} L ${inset} ${h-inset} M ${w-inset} ${inset} L ${w-inset} ${h-inset}`;
    path.setAttribute("d", d);
  }else{
    const cx=w/2, cy=h/2, rx=w/2-4, ry=h/2-4;
    const d = `M ${cx+rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx-rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx+rx} ${cy}`;
    path.setAttribute("d", d);
  }
  svg.appendChild(path);
  const hostPos = getComputedStyle(el).position;
  if(hostPos === "static") el.style.position = "relative";
  el.appendChild(svg);
  return svg;
}

/** Rotate a port’s gap to face target */
export function aimPort(portEl:HTMLElement, targetEl:HTMLElement){
  const a = portEl.getBoundingClientRect(), b = targetEl.getBoundingClientRect();
  const ax=a.left+a.width/2, ay=a.top+a.height/2, bx=b.left+b.width/2, by=b.top+b.height/2;
  const deg = Math.atan2(by-ay, bx-ax)*180/Math.PI;
  portEl.style.setProperty("--gap-angle", (deg+90)+"deg");
}

/** Change seam opening length on a panel */
export function setSeam(el:HTMLElement, px:number){ el.style.setProperty("--gap-len", px+"px"); }

/** Draw an elbow pipe between two ports inside a given SVG */
export function connectPorts(from:HTMLElement, to:HTMLElement, svg:SVGSVGElement){
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect(), s = svg.getBoundingClientRect();
  const P = {x:a.left+a.width/2 - s.left, y:a.top+a.height/2 - s.top};
  const Q = {x:b.left+b.width/2 - s.left, y:b.top+b.height/2 - s.top};
  const elbow = 24;
  const d = `M ${P.x} ${P.y} h ${elbow} V ${Q.y} H ${Q.x}`;
  const outer = svg.querySelector<SVGPathElement>(".outer")!;
  const inner = svg.querySelector<SVGPathElement>(".flow")!;
  outer.setAttribute("d", d); inner.setAttribute("d", d);
}

/** Keep connections correct when layout changes */
export function watchConnections(
  pairs: Array<{from:HTMLElement; to:HTMLElement; svg:SVGSVGElement;}>,
  reroute: (p:{from:HTMLElement;to:HTMLElement;svg:SVGSVGElement;})=>void = ({from,to,svg})=>connectPorts(from,to,svg)
){
  const ro = new ResizeObserver(()=> pairs.forEach(reroute));
  pairs.forEach(({from,to,svg})=>{ ro.observe(document.body); ro.observe(svg); ro.observe(from); ro.observe(to); });
  return ()=> ro.disconnect();
}
