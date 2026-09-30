import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import path from "node:path";

test("demo onboarding, translation, stop/start and request guards",async () => {
  const probe=net.createServer();probe.listen(0,"127.0.0.1");await once(probe,"listening");const port=probe.address().port;await new Promise(r=>probe.close(r));
  const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const child=spawn(process.execPath,["server.mjs","--demo","--no-open"],{cwd:root,env:{...process.env,KAKAO_LIVE_PORT:String(port)},stdio:["ignore","ignore","ignore"]});
  try {
    const base="http://127.0.0.1:"+port;
    let ready=false;
    for(let i=0;i<60;i++){try{const r=await fetch(base+"/api/state");ready=r.ok;if(ready)break;}catch{}await new Promise(r=>setTimeout(r,100));}
    assert.equal(ready,true,"demo server starts without KakaoTalk");
    const initial=await(await fetch(base+"/api/state")).json();assert.equal(initial.demo,true);assert.equal(initial.agent,"demo");assert.equal(initial.running,false);
    const page=await fetch(base+"/");assert.equal(page.status,200);const html=await page.text();assert.match(html,/<html lang="en"/);assert.match(html,/data-theme="dark"/);assert.match(html,/Light<\/button>/);assert.doesNotMatch(html,/샤인|랜드|Antigravity/);
    assert.match(html,/body\s*\{\s*height:100dvh;\s*overflow:hidden;/);
    assert.match(html,/\.conversation-scroll\s*\{[^}]*overflow-y:auto;/);
    assert.match(html,/id="conversation" class="conversation-scroll"/);
    assert.doesNotMatch(html,/window\.scrollTo|window\.addEventListener\("scroll"/);
    const forbidden=await fetch(base+"/api/start",{method:"POST"});assert.equal(forbidden.status,403);
    const post=(route,data,origin)=>fetch(base+route,{method:"POST",headers:{"X-Kakao-Live":"1","Content-Type":"application/json",...(origin?{Origin:origin}:{})},body:JSON.stringify(data)});
    assert.equal((await post("/api/start",{},"https://example.com")).status,403);
    assert.equal((await post("/api/start",{})).status,200);
    let data;
    for(let i=0;i<30;i++){data=await(await fetch(base+"/api/messages?after=0")).json();if(data.state.translationCounts.done)break;await new Promise(r=>setTimeout(r,100));}
    assert.equal(data.messages.length,2);assert.equal(data.state.translationCounts.done,1);assert.equal(data.state.lastError,null);
    const done=data.messages.find(m=>m.tstate==="done");assert.ok(done.translation.length>0);
    await post("/api/config",{agent:"none"});await post("/api/config",{agent:"demo"});
    const retained=await(await fetch(base+"/api/messages?after=0")).json();assert.equal(retained.messages.find(m=>m.id===done.id).translation,done.translation);
    const oldStream=retained.state.streamId;const changed=await(await post("/api/config",{chat:"Another sample"})).json();assert.notEqual(changed.streamId,oldStream);
    assert.equal((await post("/api/stop",{})).status,200);assert.equal((await(await fetch(base+"/api/state")).json()).running,false);
  } finally {
    const exited=once(child,"exit");child.kill("SIGTERM");await Promise.race([exited,new Promise(r=>setTimeout(r,2500))]);if(child.exitCode===null)child.kill("SIGKILL");
  }
});
