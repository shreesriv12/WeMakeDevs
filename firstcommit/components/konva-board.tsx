"use client";
import { useEffect, useRef, useState } from "react";
import Konva from "konva";

type Tool = "pen" | "note" | "rectangle" | "circle";
type Shape = { id:string; type:Tool; x:number; y:number; text?:string; points?:number[]; width?:number; height?:number; radius?:number };
const storageKey = "shikshamesh.konva-canvas.v4";

export default function KonvaBoard({ onChange }: { onChange: (description:string) => void }) {
  const container = useRef<HTMLDivElement>(null), stage = useRef<Konva.Stage | null>(null), layer = useRef<Konva.Layer | null>(null), shapesRef = useRef<Shape[]>([]), toolRef = useRef<Tool>("pen"), drawingRef = useRef<string | null>(null);
  const [tool,setTool] = useState<Tool>("pen"), [shapes,setShapes] = useState<Shape[]>([]), [saved,setSaved] = useState("");
  function commit(next:Shape[]) { shapesRef.current=next; setShapes(next); localStorage.setItem(storageKey,JSON.stringify(next)); onChange(next.at(-1)?.type ?? "empty workspace"); setSaved(navigator.onLine ? "Saved locally" : "Saved locally — offline mode"); }
  useEffect(() => { const raw=localStorage.getItem(storageKey); if (!raw) return; try { commit(JSON.parse(raw) as Shape[]); setSaved("Restored local canvas workspace"); } catch {} }, []);
  useEffect(() => { toolRef.current=tool; },[tool]);
  useEffect(() => { if (!container.current) return; const nextStage=new Konva.Stage({container:container.current,width:820,height:420}); const nextLayer=new Konva.Layer(); nextStage.add(nextLayer); stage.current=nextStage; layer.current=nextLayer;
    const pointer=()=>nextStage.getPointerPosition();
    nextStage.on("mousedown touchstart",()=>{const p=pointer();if(!p)return;const id=crypto.randomUUID();if(toolRef.current==="pen"){drawingRef.current=id;commit([...shapesRef.current,{id,type:"pen",x:0,y:0,points:[p.x,p.y]}]);return;}const item:Shape=toolRef.current==="note"?{id,type:"note",x:p.x,y:p.y,text:"Double-click to edit"}:toolRef.current==="rectangle"?{id,type:"rectangle",x:p.x,y:p.y,width:150,height:90}:{id,type:"circle",x:p.x,y:p.y,radius:48};commit([...shapesRef.current,item]);});
    nextStage.on("mousemove touchmove",()=>{const p=pointer(),id=drawingRef.current;if(!p||!id)return;commit(shapesRef.current.map((item)=>item.id===id?{...item,points:[...(item.points??[]),p.x,p.y]}:item));}); nextStage.on("mouseup touchend",()=>{drawingRef.current=null;});
    return()=>{ nextStage.destroy(); };
  },[]);
  useEffect(()=>{const current=layer.current;if(!current)return;current.destroyChildren();current.add(new Konva.Rect({x:0,y:0,width:820,height:420,fill:"#f8fbff"}));for(const item of shapes){let node:Konva.Shape;if(item.type==="pen")node=new Konva.Line({points:item.points,stroke:"#102337",strokeWidth:3,lineCap:"round",lineJoin:"round"});else if(item.type==="note"){node=new Konva.Text({x:item.x,y:item.y,text:item.text,fill:"#102337",fontSize:18,draggable:true});node.on("dblclick",()=>{const text=window.prompt("Note text",item.text??"");if(text!==null)commit(shapesRef.current.map((shape)=>shape.id===item.id?{...shape,text}:shape));});}else if(item.type==="rectangle")node=new Konva.Rect({x:item.x,y:item.y,width:item.width,height:item.height,fill:"#d7f4ef",stroke:"#187a70",strokeWidth:2,cornerRadius:8,draggable:true});else node=new Konva.Circle({x:item.x,y:item.y,radius:item.radius,fill:"#dceaff",stroke:"#397ac4",strokeWidth:2,draggable:true});if(item.type!=="pen")node.on("dragend",()=>commit(shapesRef.current.map((shape)=>shape.id===item.id?{...shape,x:node.x(),y:node.y()}:shape)));current.add(node);}current.draw();},[shapes]);
  function exportPng(){const uri=stage.current?.toDataURL({pixelRatio:2});if(!uri)return;const anchor=document.createElement("a");anchor.href=uri;anchor.download="shikshamesh-canvas.png";anchor.click();}
  return <section className="result"><div className="canvas-toolbar"><b>Canvas</b>{(["pen","note","rectangle","circle"] as Tool[]).map((item)=><button type="button" key={item} className={tool===item?"active":""} onClick={()=>setTool(item)}>{item}</button>)}<button type="button" onClick={()=>commit([])}>Clear</button><button type="button" onClick={exportPng}>Export PNG</button></div><div className="konva-shell"><div ref={container}/></div><small>Pen draws. Shapes drag. Double-click notes to edit. {saved}</small></section>;
}
