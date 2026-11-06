import { useEffect } from 'react';
import { coverProgress, heroPinTop } from '../interaction/chapters.mjs';
/** Native scroll controls chapter transforms; work is batched into one frame per event. */
export function useExperience(enabled:boolean) {
  useEffect(()=>{
    const root=document.documentElement;root.dataset.motion=enabled?'on':'off';
    const hero=document.querySelector<HTMLElement>('.hero'),archive=document.querySelector<HTMLElement>('.archive'),journey=document.querySelector<HTMLElement>('.journey'),header=document.querySelector<HTMLElement>('.site-header');
    let frame=0,settleTimer=0,lastY=scrollY,lastAt=performance.now(),headerHeight=header?.offsetHeight||72,initialArchiveTop=innerHeight;
    const measure=()=>{headerHeight=header?.offsetHeight||72;if(hero){const height=hero.offsetHeight;initialArchiveTop=headerHeight+height;root.style.setProperty('--hero-pin-top',`${heroPinTop(height,innerHeight,headerHeight)}px`);}};
    const settle=()=>{root.style.setProperty('--scroll-velocity','0deg');root.style.setProperty('--scroll-impulse','0px');journey?.style.setProperty('--scroll-velocity','0deg');};
    const update=()=>{frame=0;const total=root.scrollHeight-innerHeight;root.style.setProperty('--read-progress',String(total>0?scrollY/total:0));
      const ar=archive?.getBoundingClientRect(),cover=ar?coverProgress(ar.top,innerHeight,headerHeight,initialArchiveTop):0;
      const covered=enabled&&cover>=1?'true':'false';if(root.dataset.heroCovered!==covered)root.dataset.heroCovered=covered;
      hero?.style.setProperty('--chapter-cover',String(enabled?cover:0));hero?.style.setProperty('--chapter-scale',String(enabled?1-cover*.045:1));hero?.style.setProperty('--chapter-fold',`${enabled?cover*-4:0}deg`);hero?.style.setProperty('--chapter-shade',String(enabled?cover*.58:0));archive?.style.setProperty('--cover-edge',String(enabled?Math.sin(cover*Math.PI):0));
      if(!enabled)return;
      const now=performance.now(),velocity=Math.max(-1,Math.min(1,(scrollY-lastY)/Math.max(1,now-lastAt)/4));lastY=scrollY;lastAt=now;
      root.style.setProperty('--scroll-velocity',`${(velocity*2.2).toFixed(2)}deg`);root.style.setProperty('--scroll-impulse',`${(velocity*-10).toFixed(2)}px`);
      clearTimeout(settleTimer);if(Math.abs(velocity)>.01)settleTimer=window.setTimeout(settle,110);
      const rect=hero?.getBoundingClientRect();if(rect&&cover<1){const progress=Math.min(1,Math.max(0,-rect.top/rect.height));hero?.style.setProperty('--hero-scroll',String(progress));hero?.style.setProperty('--hero-shift',`${progress*45}px`);hero?.style.setProperty('--hero-scroll-turn',`${(progress+cover)*-4}deg`);}
      const jr=journey?.getBoundingClientRect();if(jr&&jr.bottom>0&&jr.top<innerHeight){const progress=Math.min(1,Math.max(0,(innerHeight*.65-jr.top)/jr.height));journey?.style.setProperty('--journey-progress',String(progress));journey?.style.setProperty('--journey-turn',`${(progress-.5)*14}deg`);journey?.style.setProperty('--journey-float',`${(progress-.5)*-28}px`);journey?.style.setProperty('--scroll-velocity',`${(velocity*2.4).toFixed(2)}deg`);}
    };
    const request=()=>{if(!frame)frame=requestAnimationFrame(update);};const resize=()=>{measure();request();};window.addEventListener('scroll',request,{passive:true});window.addEventListener('resize',resize);const geometry=new ResizeObserver(resize);if(hero)geometry.observe(hero);if(header)geometry.observe(header);measure();update();
    const visibility=()=>{root.dataset.pageHidden=document.hidden?'true':'false';};document.addEventListener('visibilitychange',visibility);visibility();
    const activity=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('motion-outside',!entry.isIntersecting)),{rootMargin:'60px'});document.querySelectorAll('main section').forEach(el=>activity.observe(el));
    const cards=Array.from(document.querySelectorAll<HTMLElement>('[data-depth]'));
    const tilt=(event:PointerEvent)=>{if(!enabled||event.pointerType!=='mouse')return;const el=event.currentTarget as HTMLElement,r=el.getBoundingClientRect();el.style.setProperty('--card-x',`${-(event.clientY-r.top-r.height/2)/r.height*6}deg`);el.style.setProperty('--card-y',`${(event.clientX-r.left-r.width/2)/r.width*8}deg`);};
    const reset=(event:PointerEvent)=>{const el=event.currentTarget as HTMLElement;el.style.setProperty('--card-x','0deg');el.style.setProperty('--card-y','0deg');};
    if(enabled)cards.forEach(card=>{card.addEventListener('pointermove',tilt);card.addEventListener('pointerleave',reset);});
    return()=>{cancelAnimationFrame(frame);clearTimeout(settleTimer);geometry.disconnect();activity.disconnect();delete root.dataset.heroCovered;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('scroll',request);window.removeEventListener('resize',resize);cards.forEach(card=>{card.removeEventListener('pointermove',tilt);card.removeEventListener('pointerleave',reset);card.style.removeProperty('--card-x');card.style.removeProperty('--card-y');});};
  },[enabled]);
}
