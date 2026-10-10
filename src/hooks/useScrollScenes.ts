import { useEffect } from 'react';
import { scrollScenePose } from '../interaction/scroll-scenes.mjs';

const targets = [
  ['#about', 'about'], ['.journey-workspace', 'journey'],
  ['.technology-stack', 'stack'], ['.anime-gallery', 'gallery'],
  ['.video-banner', 'video'], ['.royal-scene', 'royal'],
  ['.lab-layout', 'relay'], ['.people-roster', 'people'],
  ['.communities', 'community'], ['#ethos', 'ethos'],
  ['.rating-layout', 'rating'], ['#contact', 'footer']
];
const properties = ['--scene-progress','--scene-balance','--scene-spread','--scene-lift','--scene-drift','--scene-turn','--scene-yaw','--scene-fan','--scene-gap'];
/** Static flow geometry ignores our own transforms and the Journey sticky position. */
function flowTop(element:HTMLElement) {
  let top=0,node:HTMLElement|null=element;
  while(node){top+=node.offsetTop;node=node.offsetParent as HTMLElement|null;}
  return top;
}

export function useScrollScenes(enabled:boolean) {
  useEffect(()=>{
    if(!enabled)return;
    const root=document.documentElement;
    const scenes=targets.flatMap(([selector,name])=>{
      const element=document.querySelector<HTMLElement>(selector);
      return element?[{element,name,top:0,height:1,visible:false}]:[];
    });
    let frame=0,dirty=true,alive=true;
    const blocked=()=>document.hidden||root.hasAttribute('data-intro')||root.hasAttribute('data-panel-open');
    const update=()=>{
      frame=0;if(blocked())return;
      if(dirty){scenes.forEach(scene=>{scene.top=flowTop(scene.element);scene.height=scene.element.offsetHeight;});dirty=false;}
      const y=window.scrollY,height=window.innerHeight,width=window.innerWidth;
      scenes.forEach(scene=>{
        if(!scene.visible)return;
        const pose=scrollScenePose(scene.top,scene.height,height,y,width);
        // No React state updates or layout reads on scroll; only local CSS variables.
        const values=[pose.progress,pose.balance,pose.spread,pose.lift+'px',pose.drift+'px',pose.turn+'deg',pose.yaw+'deg',pose.fan+'deg',pose.gap+'px'];
        properties.forEach((property,index)=>scene.element.style.setProperty(property,String(values[index])));
        scene.element.dataset.scrollScene=scene.name;
      });
    };
    const request=()=>{if(alive&&!frame&&!blocked())frame=requestAnimationFrame(update);};
    const measure=()=>{dirty=true;request();};
    // Observe static sections, not animated cards, so 3D motion cannot trigger IO feedback.
    const parents=new Map<Element,typeof scenes>();
    scenes.forEach(scene=>{const parent=scene.element.closest('section,footer')||scene.element;parents.set(parent,[...(parents.get(parent)||[]),scene]);});
    const activity=new IntersectionObserver(entries=>{
      entries.forEach(entry=>parents.get(entry.target)?.forEach(scene=>{scene.visible=entry.isIntersecting;}));request();
    },{rootMargin:'80px'});
    parents.forEach((_,parent)=>activity.observe(parent));
    const geometry=new ResizeObserver(measure);
    geometry.observe(document.body);scenes.forEach(scene=>geometry.observe(scene.element));
    const gates=new MutationObserver(request);
    gates.observe(root,{attributes:true,attributeFilter:['data-intro','data-panel-open']});
    window.addEventListener('scroll',request,{passive:true});window.addEventListener('resize',measure);
    document.addEventListener('visibilitychange',request);document.fonts.ready.then(measure);
    request();
    return()=>{
      alive=false;cancelAnimationFrame(frame);activity.disconnect();geometry.disconnect();gates.disconnect();
      window.removeEventListener('scroll',request);window.removeEventListener('resize',measure);document.removeEventListener('visibilitychange',request);
      scenes.forEach(({element})=>{delete element.dataset.scrollScene;properties.forEach(property=>element.style.removeProperty(property));});
    };
  },[enabled]);
}
