// construction-fx/vue.ts
import { defineComponent, h, onMounted, ref } from "vue";
import { scribble, ScribbleOptions } from "./scribble";

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

export { scribble, ScribbleOptions };
