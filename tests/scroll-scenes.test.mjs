import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollScenePose } from '../src/interaction/scroll-scenes.mjs';

test('poses settle into the exact reading position and reverse without accumulating drift',()=>{
  const top=1200,height=700,viewport=800;
  const positions=[0,500,850,1150,1500,2000,1500,1150,850,500,0];
  const forward=new Map();
  for(const y of positions){const pose=scrollScenePose(top,height,viewport,y,1200);if(forward.has(y))assert.deepEqual(pose,forward.get(y));forward.set(y,pose);}
  const centered=scrollScenePose(top,height,viewport,top+(height-viewport)/2,1200);
  assert.equal(centered.balance,0);assert.equal(centered.lift,0);assert.equal(centered.turn,0);assert.equal(centered.spread,1);
});

test('all responsive poses stay finite and within smaller mobile travel budgets',()=>{
  for(const width of [320,360,390,480,600,601,1024,1440,1920]){
    const mobile=width<=600;
    for(const viewport of [480,720,900])for(const height of [0,240,700,2000])for(let y=-1000;y<=5000;y+=73){
      const pose=scrollScenePose(1000,height,viewport,y,width);
      for(const value of Object.values(pose))assert.ok(Number.isFinite(value));
      assert.ok(pose.progress>=0&&pose.progress<=1&&pose.spread>=0&&pose.spread<=1);
      assert.ok(Math.abs(pose.lift)<=(mobile?18:36));assert.ok(Math.abs(pose.drift)<=(mobile?8:22));
      assert.ok(Math.abs(pose.yaw)<=(mobile?10:20));assert.ok(pose.gap<=(mobile?14:26));
    }
  }
});

test('native deep links and skipped frames give the same scene pose as slow scrolling',()=>{
  for(const width of [360,1440]){
    let previous;
    for(let scroll=0;scroll<=1800;scroll+=1){
      const pose=scrollScenePose(900,600,720,scroll,width);
      if(previous){assert.ok(Math.abs(pose.lift-previous.lift)<.4);assert.ok(Math.abs(pose.gap-previous.gap)<.1);}
      previous=pose;
    }
    assert.deepEqual(previous,scrollScenePose(900,600,720,1800,width));
    assert.equal(previous.progress,1);
  }
});
