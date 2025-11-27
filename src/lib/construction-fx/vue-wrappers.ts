import { defineComponent, h, onMounted, onBeforeUnmount, ref, watch, nextTick } from "vue";
import { scribble, ScribbleOptions } from "./scribble";

export const Scribble = defineComponent({
  name: "Scribble",
  props: { type:{type:String,default:"underline"}, color:{type:String,default:"white"}, stroke:{type:Number,default:3}, roughness:{type:Number,default:.6}, padding:{type:Number,default:6} },
  setup(props: ScribbleOptions & {type:string}, {slots}){
    const root = ref<HTMLElement|null>(null);
    let svg: SVGElement | null = null;
    const draw = async ()=>{ await nextTick(); if(root.value){ svg?.remove?.(); svg = scribble(root.value, props); } };
    onMounted(draw); watch(props, draw); onBeforeUnmount(()=> svg?.remove?.());
    return ()=> h("span", { ref:root, class: props.type==="underline" ? "scribble-underline" : "" }, slots.default?.());
  }
});

export const BlueprintLabel = defineComponent({
  name:"BlueprintLabel",
  props:{ pos:{type:String,default:"tr"} },
  setup(props,{slots}){
    const style:any = { position:"absolute" };
    if(props.pos.includes("t")) style.top="8px"; else style.bottom="8px";
    if(props.pos.includes("r")) style.right="8px"; else style.left="8px";
    return ()=> h("span", { class:"blue-label", style }, slots.default?.());
  }
});
