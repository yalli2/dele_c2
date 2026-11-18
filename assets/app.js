/* DELE prep — shared engine (main page + exam page) */
(function(){
"use strict";
const D = window.DELE = window.DELE || {};
const $ = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>Array.from(el.querySelectorAll(s));
const h = (tag,attrs={},...kids)=>{const e=document.createElement(tag);for(const k in attrs){const v=attrs[k];if(v==null||v===false)continue;if(k==="class")e.className=v;else if(k==="html")e.innerHTML=v;else if(k.startsWith("on"))e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?"":v);}for(const c of kids.flat()){if(c==null||c===false)continue;e.append(c.nodeType?c:document.createTextNode(c));}return e;};
const esc = s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const store = {
  get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
};
function toast(msg){let t=$(".toast");if(!t){t=h("div",{class:"toast",role:"status"});document.body.append(t);}t.textContent=msg;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),1800);}

/* ---------- light markup ---------- */
function inline(s){
  return esc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\*(.+?)\*/g,"<i>$1</i>").replace(/\[\[(\d+)\]\]/g,'<span class="gapslot" data-g="$1"></span>');
}
function md(text){
  if(!text) return "";
  return String(text).trim().split(/\n\s*\n/).map(b=>{
    b=b.trim();
    if(b.startsWith("## ")) return "<h4>"+inline(b.slice(3))+"</h4>";
    if(b.startsWith("> ")) return '<p class="src">'+inline(b.slice(2))+"</p>";
    if(/^\|/.test(b)){const rows=b.split(/\n/).filter(l=>!/^\|[\s\-|:]+\|$/.test(l)).map(l=>l.replace(/^\||\|$/g,"").split("|"));return '<table class="mdt">'+rows.map((r,i)=>"<tr>"+r.map(c=>(i?"<td>":"<th>")+inline(c.trim())+(i?"</td>":"</th>")).join("")+"</tr>").join("")+"</table>";}
    if(/^- /.test(b)) return "<ul>"+b.split(/\n/).map(l=>"<li>"+inline(l.replace(/^- /,""))+"</li>").join("")+"</ul>";
    return "<p>"+inline(b).replace(/\n/g,"<br>")+"</p>";
  }).join("");
}
const plain = t=>String(t||"").replace(/\*\*|\*/g,"").replace(/^## |^> |^- /gm,"").replace(/\[\[\d+\]\]/g," ... ");

/* ---------- TTS ---------- */
const FEM=/elvira|abril|laura|helena|m[oó]nica|paulina|dalia|marisol|luc[ií]a|sabina|elena|ximena|estrella|irene|triana|vera|camila|paloma|esperanza|nuria|larissa|renata|beatriz|candela|\blia\b|teresa|carlota|valentina|yolanda|sof[ií]a|ang[eé]lica|isabel|catalina|francisca|andrea|carmen|marta|silvia|montserrat|pen[eé]lope|lupe|\bmia\b|female|mujer|google espa/i;
const MAL=/[aá]lvaro|jorge|pablo|ra[uú]l|diego|gonzalo|arnau|tom[aá]s|juan|carlos|enrique|gerardo|liberto|dar[ií]o|alonso|sa[uú]l|jos[eé]|cristian|\bnil\b|el[ií]as|emilio|federico|gilberto|jaime|luciano|mateo|pedro|sebasti[aá]n|rodrigo|alberto|andr[eé]s|antonio|eduardo|\bmale\b|hombre|miguel|cecilio|yago|rocko|reed|eddy|grandpa/i;
const NOVELTY=/grandma|grandpa|eddy|flo\b|reed|rocko|sandy|shelley|espeak|eloquence|compact/i;
const TTS = D.TTS = {
  voices:[], cfg:store.get("dele_tts",{f:"",m:"",rate:0.95}),
  load(){
    if(!("speechSynthesis" in window)) return;
    const all=speechSynthesis.getVoices().filter(v=>/^es/i.test(v.lang));
    const score=v=>{let s=0;const n=v.name;if(/natural|neural|online/i.test(n))s+=60;if(/premium|enhanced|mejorad|siri/i.test(n))s+=40;if(/google/i.test(n))s+=30;if(/^es[-_]ES/i.test(v.lang))s+=12;else if(/^es[-_](MX|US|419)/i.test(v.lang))s+=6;if(NOVELTY.test(n))s-=80;if(v.localService===false)s+=5;return s;};
    this.voices=all.sort((a,b)=>score(b)-score(a));
  },
  gender(v){if(MAL.test(v.name)&&!FEM.test(v.name))return"m";if(FEM.test(v.name))return"f";return"?";},
  pick(g,second){
    const pref=g==="m"?this.cfg.m:this.cfg.f;
    let list=this.voices.filter(v=>this.gender(v)===g);
    if(pref){const p=this.voices.find(v=>v.name===pref);if(p)list=[p,...list.filter(v=>v!==p)];}
    if(second&&list.length>1) return {v:list[1],pitch:1};
    if(list.length) return {v:list[0],pitch:second?(g==="m"?.9:1.12):1};
    const any=this.voices[0];
    return {v:any,pitch:g==="m"?(second?.72:.8):(second?1.15:1)};
  },
  parse(script){
    return String(script).trim().split(/\n+/).map(l=>{const m=l.match(/^(F2|M2|F|M|N)(?:\s+([^:]{1,30}))?:\s*(.*)$/);return m?{spk:m[1],name:m[2]||"",text:m[3]}:{spk:"N",name:"",text:l.trim()};}).filter(s=>s.text);
  },
  chunks(text){return (String(text).match(/[^.!?¡¿…;]+[.!?…;]*["»”)]*\s*|[¡¿][^.!?]+[.!?]*\s*/g)||[text]).map(s=>s.trim()).filter(Boolean).reduce((a,s)=>{if(a.length&&(a[a.length-1].length<40))a[a.length-1]+=" "+s;else a.push(s);return a;},[]);},
  token:0,
  stop(){this.token++;if("speechSynthesis" in window)speechSynthesis.cancel();document.dispatchEvent(new CustomEvent("tts-stop"));},
  play(script,{onprogress,onend,rate}={}){
    if(!("speechSynthesis" in window)){toast("이 브라우저는 음성 재생을 지원하지 않아요. Edge나 Chrome을 사용해 주세요.");onend&&onend();return;}
    this.stop();if(!this.voices.length)this.load();
    const my=++this.token;
    const segs=(typeof script==="string"?this.parse(script):script);
    const queue=[];segs.forEach((s,si)=>this.chunks(s.text).forEach((c,ci)=>queue.push({spk:s.spk,text:c,gapBefore:ci===0&&si>0})));
    let i=0;const total=queue.length;
    const next=()=>{
      if(my!==this.token)return;
      if(i>=total){onend&&onend();return;}
      const q=queue[i++];
      const g=q.spk[0]==="M"?"m":"f";const sec=q.spk.length>1||q.spk==="N";
      const pk=q.spk==="N"?this.pick("f",false):this.pick(g,sec&&q.spk!=="N");
      const u=new SpeechSynthesisUtterance(q.text);
      if(pk.v){u.voice=pk.v;u.lang=pk.v.lang;}else u.lang="es-ES";
      u.pitch=pk.pitch;u.rate=rate||this.cfg.rate||0.95;
      u.onend=()=>{onprogress&&onprogress(i/total);setTimeout(next,q.spk!==(queue[i]||{}).spk?380:60);};
      u.onerror=e=>{if(e.error==="interrupted"||e.error==="canceled")return;setTimeout(next,50);};
      speechSynthesis.speak(u);
    };
    setTimeout(next,q0delay);
  }
};
const q0delay=120;
if("speechSynthesis" in window){TTS.load();speechSynthesis.onvoiceschanged=()=>TTS.load();}

/* speak button helper */
function speakBtn(getText,label="🔊 듣기",cls="mini"){
  const b=h("button",{class:cls,type:"button"},label);
  b.addEventListener("click",()=>{
    if(b.classList.contains("on")){TTS.stop();return;}
    $$(".mini.on").forEach(x=>x.classList.remove("on"));
    b.classList.add("on");
    TTS.play(getText(),{onend:()=>b.classList.remove("on")});
  });
  document.addEventListener("tts-stop",()=>b.classList.remove("on"));
  return b;
}

/* settings modal */
function settingsModal(){
  let m=$("#ttsModal");
  if(!m){
    m=h("div",{class:"modal",id:"ttsModal",role:"dialog","aria-modal":"true","aria-labelledby":"ttsT"});
    const box=h("div",{class:"box"});
    box.append(h("h3",{id:"ttsT"},"음성 설정"),
      h("p",{class:"hint"},"듣기 문제는 여성·남성 원어민 목소리로 대화를 재생합니다. Microsoft Edge에서는 ‘Natural’ 신경망 음성(예: Elvira, Álvaro)이, Chrome에서는 Google español 음성이 가장 자연스럽습니다."),
      h("label",{for:"vF"},"여성 목소리"),h("select",{id:"vF"}),
      h("label",{for:"vM"},"남성 목소리"),h("select",{id:"vM"}),
      h("label",{for:"vR"},"속도 ",h("span",{id:"vRv"})),h("input",{type:"range",id:"vR",min:"0.7",max:"1.2",step:"0.05"}),
      h("div",{class:"actions"},
        h("button",{class:"btn plain",type:"button",onclick:()=>TTS.play("F: Hola, ¿qué tal? Soy la voz femenina del examen.\nM: Y yo soy la voz masculina. ¡Mucha suerte con el DELE!")},"🔊 테스트"),
        h("button",{class:"btn",type:"button",onclick:()=>{m.classList.remove("show");}},"닫기")));
    m.append(box);document.body.append(m);
    m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("show");});
    document.addEventListener("keydown",e=>{if(e.key==="Escape")m.classList.remove("show");});
    const save=()=>{TTS.cfg={f:$("#vF").value,m:$("#vM").value,rate:+$("#vR").value};$("#vRv").textContent="×"+TTS.cfg.rate;store.set("dele_tts",TTS.cfg);};
    ["vF","vM","vR"].forEach(id=>$("#"+id).addEventListener("change",save));
    $("#vR").addEventListener("input",save);
  }
  TTS.load();
  const fill=(sel,g)=>{sel.innerHTML="";sel.append(h("option",{value:""},"자동 선택 (권장)"));
    TTS.voices.forEach(v=>{const tag=TTS.gender(v);sel.append(h("option",{value:v.name},`${v.name} (${v.lang})${tag===g?"":tag==="?"?"":" ·"+(tag==="m"?"남":"여")}`));});
    sel.value=(g==="f"?TTS.cfg.f:TTS.cfg.m)||"";};
  fill($("#vF"),"f");fill($("#vM"),"m");
  $("#vR").value=TTS.cfg.rate||0.95;$("#vRv").textContent="×"+(TTS.cfg.rate||0.95);
  if(!TTS.voices.length) $(".hint",m).textContent="이 기기에서 스페인어 음성을 찾지 못했어요. Microsoft Edge 또는 Chrome 최신 버전을 사용하거나, 기기 설정에서 스페인어 음성을 설치해 주세요.";
  m.classList.add("show");$("#vF").focus();
}
D.settings=settingsModal;

/* ---------- book registration ---------- */
D.book=function(b){D.B=b;};
D.exam=function(e){D.E=e;};
function topbar(){
  const B=D.B;
  return h("header",{class:"bar"},h("div",{class:"wrap"},
    h("a",{class:"brand",href:"index.html"},h("span",{class:"seal"},B.level),h("span",{},"DELE "+B.level+" 대비 학습실")),
    h("span",{class:"sp"}),
    h("button",{class:"iconbtn",type:"button",onclick:settingsModal},"🔊 음성 설정")));
}
const sumKey=()=>`dele_${D.B.lv}_sum`;

/* ---------- MAIN PAGE ---------- */
D.main=function(){
  const B=D.B;document.body.classList.add("lv-"+B.lv);
  const sum=store.get(sumKey(),{});
  const root=$("#app");root.innerHTML="";
  root.append(topbar());
  const w=h("main",{class:"wrap"});root.append(w);
  w.append(h("section",{class:"hero"},
    h("div",{class:"hero-grid"},
      h("div",{class:"bigseal","aria-hidden":"true"},B.level,h("small",{},B.cefr)),
      h("div",{},
        h("h1",{},B.headline),
        h("p",{},B.intro),
        h("p",{class:"book"},B.bookNote))),
    h("div",{class:"timeline"},B.pruebas.map((p,i)=>h("div",{},h("i",{},p.label||("Prueba "+(i+1))),h("b",{},p.name),h("span",{},p.ko+" · "+p.min+"분"+(p.note?" · "+p.note:"")))))));
  const sh=h("div",{class:"sec-h"},h("h2",{},"모의시험 "+B.exams.length+"회"),h("p",{},"막대는 시험별 영역 점수(채점한 문항 기준)예요. 60% 이상이면 초록색."));
  w.append(sh);
  const ul=h("ul",{class:"exams"});
  B.exams.forEach(ex=>{
    const s=sum[ex.n]||{};
    const meter=h("div",{class:"meter"},B.pruebas.map(p=>{
      const r=s[p.key];let pct=0,lab=p.short||p.ko;
      if(r&&r[1]){pct=Math.round(r[0]/r[1]*100);lab+=" "+pct+"%";}
      const d=h("div",{class:pct>=60?"pass":"p1"},lab);d.style.setProperty("--v",pct+"%");return d;}));
    ul.append(h("li",{},h("a",{href:"examen.html?n="+ex.n},
      h("span",{class:"n"},String(ex.n)),
      h("span",{class:"t"},h("b",{},ex.title),h("span",{},ex.ko)),
      meter)));
  });
  w.append(ul);
  w.append(h("div",{class:"sec-h"},h("h2",{},"수업에서 이렇게 쓰세요")));
  w.append(h("div",{class:"howto"},
    h("div",{},h("h3",{},"풀고 바로 채점"),h("p",{},"각 Tarea 아래 ‘채점하기’를 누르면 정답·오답과 해설, 점수가 바로 나와요. 기록은 이 기기의 브라우저에 저장됩니다.")),
    h("div",{},h("h3",{},"원어민 음성 듣기"),h("p",{},"듣기 문제는 실제 시험처럼 두 번 재생을 권장해요. 우측 상단 ‘음성 설정’에서 목소리와 속도를 고를 수 있어요.")),
    h("div",{},h("h3",{},"쓰기·말하기 연습"),h("p",{},"쓰기는 단어 수를 자동으로 세고, 말하기는 준비 타이머와 녹음 기능으로 스스로 들어 볼 수 있어요. 모범답안도 음성으로 들을 수 있습니다."))));
  if(B.structure){
    w.append(h("div",{class:"sec-h"},h("h2",{},"시험 구성 한눈에 보기")));
    const t=h("table",{class:"structure"},h("thead",{},h("tr",{},h("th",{},"영역"),h("th",{},"Tarea"),h("th",{},"무엇을 하나요"))),h("tbody"));
    B.structure.forEach(r=>t.tBodies[0].append(h("tr",{},h("td",{},r[0]),h("td",{},r[1]),h("td",{},r[2]))));
    w.append(t);
  }
  w.append(h("footer",{},h("p",{},B.footer||""),h("p",{},h("button",{class:"btn plain sm",type:"button",onclick:()=>{if(confirm("이 기기에 저장된 "+B.level+" 점수와 답안을 모두 지울까요?")){Object.keys(localStorage).filter(k=>k.startsWith("dele_"+B.lv+"_")).forEach(k=>localStorage.removeItem(k));location.reload();}}},"내 기록 초기화"))));
};

/* ---------- EXAM PAGE ---------- */
D.examPage=function(){
  const B=D.B;document.body.classList.add("lv-"+B.lv);
  const n=+(new URLSearchParams(location.search).get("n")||1);
  const meta=B.exams.find(e=>e.n===n);
  const root=$("#app");root.innerHTML="";root.append(topbar());
  if(!meta){root.append(h("main",{class:"wrap"},h("p",{},"시험을 찾을 수 없어요. ",h("a",{href:"index.html"},"메인으로 돌아가기"))));return;}
  const s=document.createElement("script");s.src="data/examen"+n+".js";
  s.onload=()=>renderExam(n,meta);
  s.onerror=()=>root.append(h("main",{class:"wrap"},h("p",{},"시험 데이터를 불러오지 못했어요.")));
  document.head.append(s);
};

function renderExam(n,meta){
  const B=D.B,E=D.E;const KEY=`dele_${B.lv}_e${n}`;
  const st=store.get(KEY,{a:{},c:{},w:{},k:{}});
  const save=()=>store.set(KEY,st);
  const root=$("#app");
  const w=h("main",{class:"wrap"});root.append(w);
  document.title=`DELE ${B.level} · Examen ${n} · ${E.title}`;
  const prev=B.exams.find(e=>e.n===n-1),next=B.exams.find(e=>e.n===n+1);
  w.append(h("section",{class:"ex-head"},
    h("div",{class:"crumb"},h("a",{href:"index.html"},"모의시험 목록"),prev?[" · ",h("a",{href:"examen.html?n="+prev.n},"← "+prev.n+"회")]:null,next?[" · ",h("a",{href:"examen.html?n="+next.n},next.n+"회 →")]:null),
    h("h1",{},`Examen ${n}. ${E.title}`),
    h("p",{},E.ko||meta.ko)));
  const tabs=h("div",{class:"tabs",role:"tablist"});w.append(tabs);
  const lay=h("div",{class:"layout"});w.append(lay);
  const side=h("aside",{class:"side"}),body=h("div",{class:"tbody"});lay.append(side,body);
  const panes=[...E.pruebas.map((p,i)=>({kind:"p",p,i})),...(E.vocab&&E.vocab.length?[{kind:"v"}]:[])];
  let cur=+(location.hash.match(/p(\d)/)||[0,0])[1];if(!panes[cur])cur=0;
  panes.forEach((pn,i)=>{
    const pm=pn.kind==="p"?B.pruebas.find(x=>x.key===pn.p.key):null;
    tabs.append(h("button",{role:"tab","aria-selected":i===cur?"true":"false",type:"button",onclick:()=>{cur=i;history.replaceState(null,"","#p"+i);draw();}},pn.kind==="v"?"어휘":`${i+1}. ${pm.ko} · ${({lectura:"Lectura",auditiva:"Audición",escrita:"Escritura",oral:"Oral"})[pm.key]||pm.name}`));
  });
  let timerInt=null;
  function draw(){
    TTS.stop();clearInterval(timerInt);
    $$("button",tabs).forEach((b,i)=>b.setAttribute("aria-selected",i===cur?"true":"false"));
    side.innerHTML="";body.innerHTML="";
    const pn=panes[cur];
    if(pn.kind==="v"){drawVocab();return;}
    const P=pn.p,pi=pn.i,pm=B.pruebas.find(x=>x.key===P.key);
    const auto=P.tasks.some(t=>["choice","match","cloze"].includes(t.type));
    // side
    const ol=h("ol");
    side.append(h("h4",{},pm.name),ol);
    const sb=h("div",{class:"scorebox"});side.append(sb);
    let num=(P.start||1)-1;
    P.tasks.forEach((t,ti)=>{
      const id=`${pi}-${ti}`;
      const cnt=countItems(t);const start=num+1;num+=cnt;
      const sc=st.c[id];
      ol.append(h("li",{},h("a",{href:"#t"+id},h("span",{},t.t||("Tarea "+(ti+1))),h("span",{class:"sc"},sc?`${sc[0]}/${sc[1]}`:""))));
      body.append(renderTask(t,id,start,pi));
    });
    // score box
    const upd=()=>{
      if(auto){
        let got=0,tot=0,all=0;
        P.tasks.forEach((t,ti)=>{const c=st.c[`${pi}-${ti}`];all+=countItems(t);if(c){got+=c[0];tot+=c[1];}});
        const pct=tot?Math.round(got/tot*100):0;
        sb.innerHTML="";
        sb.append(h("div",{class:"big"},`${got}`,h("small",{}," / "+tot+" 채점")),h("div",{class:"bar2"},h("i",{style:`width:${pct}%;background:${pct>=60?"var(--ok)":"var(--accent)"}`})),h("div",{class:"note"},tot?`정답률 ${pct}% · 전체 ${all}문항`:`전체 ${all}문항 · 채점하면 점수가 표시돼요`));
        const sum=store.get(sumKey(),{});sum[n]=sum[n]||{};sum[n][P.key]=[got,all];store.set(sumKey(),sum);
        $$("li a .sc",ol).forEach((el,ti)=>{const c=st.c[`${pi}-${ti}`];el.textContent=c?`${c[0]}/${c[1]}`:"";});
      }else{
        let done=0,tot=0;P.tasks.forEach((t,ti)=>{(t.parts||[]).forEach((p,pj)=>{tot++;const k=`${pi}-${ti}-${pj}`;if(st.k[k]&&st.k[k].done)done++;});});
        sb.innerHTML="";
        sb.append(h("div",{class:"big"},`${done}`,h("small",{}," / "+tot+" 과제 완료")),h("div",{class:"bar2"},h("i",{style:`width:${tot?done/tot*100:0}%`})),h("div",{class:"note"},"자기 점검표를 모두 체크하면 완료로 표시돼요."));
        const sum=store.get(sumKey(),{});sum[n]=sum[n]||{};sum[n][P.key]=[done,tot];store.set(sumKey(),sum);
      }
    };
    upd();body.addEventListener("scored",upd);
    // timer
    const tm=h("div",{class:"timer"},h("span",{class:"clock"},fmt(pm.min*60)),h("button",{class:"btn ghost sm",type:"button"},"⏱ 실전 타이머"));
    sb.append(tm);
    let left=pm.min*60,running=false;
    $("button",tm).addEventListener("click",e=>{
      if(running){clearInterval(timerInt);running=false;e.target.textContent="⏱ 계속";return;}
      running=true;e.target.textContent="⏸ 일시정지";
      timerInt=setInterval(()=>{left--;$(".clock",tm).textContent=fmt(Math.max(left,0));tm.classList.toggle("low",left<300);if(left<=0){clearInterval(timerInt);toast("시간 종료! 답안을 채점해 보세요.");}},1000);
    });
    if(auto) sb.append(h("div",{class:"actions"},h("button",{class:"btn sm",type:"button",onclick:()=>{$$(".task [data-check]",body).forEach(b=>b.click());toast("모든 Tarea를 채점했어요.");}},"전체 채점"),h("button",{class:"btn plain sm",type:"button",onclick:()=>{if(confirm("이 영역의 답안을 모두 지울까요?")){P.tasks.forEach((t,ti)=>{delete st.a[`${pi}-${ti}`];delete st.c[`${pi}-${ti}`];});save();draw();}}},"다시 풀기")));
    window.scrollTo({top:0});
  }
  function drawVocab(){
    side.append(h("h4",{},"어휘 · Vocabulario"),h("div",{class:"scorebox"},h("div",{class:"note"},"단어를 누르면 원어민 발음이 나와요. ‘뜻 가리기’로 스스로 확인해 보세요.")));
    const hide=h("button",{class:"btn ghost sm",type:"button"},"뜻 가리기");
    const all=speakBtn(()=>E.vocab.map(v=>v[0]).join(". "),"🔊 전체 듣기","btn plain sm");
    const g=h("div",{class:"vgrid"});
    E.vocab.forEach(v=>{const it=h("div",{class:"vitem"},h("div",{},h("div",{},v[0]),h("div",{class:"ko"},v[1]||"")),speakBtn(()=>v[0],"🔊","vbtn"));g.append(it);});
    hide.addEventListener("click",()=>{const on=hide.classList.toggle("on");$$(".vitem .ko",g).forEach(k=>k.style.visibility=on?"hidden":"visible");hide.textContent=on?"뜻 보이기":"뜻 가리기";});
    body.append(h("section",{class:"task"},h("div",{class:"task-h"},h("h3",{},"Vocabulario del tema"),h("span",{class:"meta"},E.vocab.length+"개")),h("div",{class:"task-b"},h("div",{class:"actions",style:"border:0;margin:0 0 12px;padding:0"},hide,all),g)));
  }

  /* ----- task renderers ----- */
  function countItems(t){
    if(t.type==="choice")return t.qs.length;
    if(t.type==="match")return t.items.length;
    if(t.type==="cloze")return t.gaps.length;
    return 0;
  }
  function renderTask(t,id,start,pi){
    const sec=h("section",{class:"task",id:"t"+id});
    const cnt=countItems(t);
    const res=h("span",{class:"res"});
    sec.append(h("div",{class:"task-h"},h("h3",{},t.t||"Tarea"),h("span",{class:"meta"},cnt?`${start}–${start+cnt-1}번 · ${cnt}문항`:(t.meta||"")),res));
    const b=h("div",{class:"task-b"});sec.append(b);
    if(t.instr) b.append(h("div",{class:"instr",html:inline(t.instr)+(t.ko?'<span class="ko">'+esc(t.ko)+"</span>":"")}));
    if(t.type==="write"||t.type==="speak"){renderProd(t,id,b);return sec;}
    st.a[id]=st.a[id]||{};
    const ans=st.a[id];
    const items=[]; // {get(),a,mark(ok,state),fb,ex}
    let scriptBox=null;
    if(t.audio){
      const segs=TTS.parse(t.audio);
      b.append(player(segs,t.audioLabel||"Audición"));
      scriptBox=h("div",{class:"script"},segs.map(s=>h("p",{},h("span",{class:"sp"},s.name||spkName(s.spk)),s.text)));
    }
    if(t.passage&&t.type!=="cloze"&&!(t.type==="match"&&/\[\[\d+\]\]/.test(t.passage))) b.append(passage(t.passage,t.ptitle));
    if(t.passages) t.passages.forEach(p=>b.append(passage(p.text,p.title)));
    if(scriptBox) b.append(scriptBox);
    const L=k=>(typeof k==="number"?k:("abcdefghij".indexOf(String(k).toLowerCase())));
    if(t.type==="choice"){
      t.qs.forEach((q,qi)=>{
        const qn=start+qi;
        const box=h("div",{class:"q"});
        const qt=h("div",{class:"qt"},h("span",{class:"qn"},String(qn)),h("span",{html:inline(q.q||"")}));
        box.append(qt);
        if(q.audio){const segs=TTS.parse(q.audio);box.append(h("div",{style:"margin:0 0 8px 38px;display:flex;gap:8px;flex-wrap:wrap"},miniPlay(segs),scriptToggle(segs)));}
        const opts=h("div",{class:"opts",role:"radiogroup"});
        const name="r"+id+"_"+qi;
        q.o.forEach((o,oi)=>{
          const inp=h("input",{type:"radio",name,value:oi});
          if(ans[qi]===oi)inp.checked=true;
          const lab=h("label",{class:"opt"+(ans[qi]===oi?" sel":"")},inp,h("span",{html:"<b>"+"abcd"[oi]+")</b> "+inline(o)}));
          inp.addEventListener("change",()=>{ans[qi]=oi;save();$$(".opt",opts).forEach(x=>x.classList.remove("sel","right","wrong"));lab.classList.add("sel");fb.classList.remove("show");});
          opts.append(lab);
        });
        const fb=h("div",{class:"fb"});
        box.append(opts,fb);b.append(box);
        const a=L(q.a);
        items.push({get:()=>ans[qi],a,mark(){const labs=$$(".opt",opts);labs.forEach((x,oi)=>{x.classList.remove("right","wrong");if(oi===a)x.classList.add("right");else if(oi===ans[qi])x.classList.add("wrong");});},fb,ex:q.ex,show:"abcd"[a]+") "+plain(q.o[a])});
      });
    }
    if(t.type==="match"){
      const keys=t.options.map(o=>o[0]);
      const optText=k=>{const o=t.options.find(x=>x[0]===k);return o?o[1]:"";};
      const label=o=>o[0].toUpperCase()+") "+(o[2]?o[2]:(!o[1]?"":o[1].length<=60?plain(o[1]):plain(o[1]).slice(0,50)+"…"));
      const small=t.options.length<=4&&t.options.every(o=>!o[1]||o[1].length<=24);
      const optsBlock=()=>{
        if(t.show==="none"||small) return null;
        if(t.show==="passages") return h("div",{},t.options.map(o=>passage(o[1],(o[0].toUpperCase())+") "+(o[2]||""))));
        return h("div",{class:"cards"},t.options.map(o=>h("div",{class:"card"+((o[1]||"").length>320?" long":""),html:'<b class="k">'+esc(o[0].toUpperCase())+")</b>"+(o[2]?"<b>"+esc(o[2])+"</b><br>":"")+inline(o[1]||"")})));
      };
      const mkSelect=(qi,cls)=>{
        const wrap=h("span",{class:cls});
        const sel=h("select",{"aria-label":"답 선택 "+(start+qi)},h("option",{value:""},"— 선택 —"),t.options.map(o=>h("option",{value:o[0]},label(o))));
        if(ans[qi])sel.value=ans[qi];
        sel.addEventListener("change",()=>{ans[qi]=sel.value;save();wrap.classList.remove("ok","bad");});
        wrap.append(sel);return {wrap,sel};
      };
      if(t.passage&&/\[\[\d+\]\]/.test(t.passage)){
        // gap-insert: options shown first, then text with inline selects
        const ob=optsBlock();if(ob)b.append(h("p",{style:"font-weight:600;margin:0 0 8px"},"Fragmentos"),ob);
        const ps=passage(t.passage,t.ptitle);b.append(ps);
        $$(".gapslot",ps).forEach(slot=>{
          const qi=+slot.dataset.g-1;const it=t.items[qi];if(!it)return;
          const {wrap,sel}=mkSelect(qi,"gap");wrap.prepend(h("span",{class:"gn"},String(start+qi)));slot.replaceWith(wrap);
          const fb=h("div",{class:"fb"});
          items.push({get:()=>ans[qi],a:it.a,mark(ok){wrap.classList.add(ok?"ok":"bad");},fb,ex:it.ex,show:it.a.toUpperCase()+") "+plain(optText(it.a)),inlineFb:true,qn:start+qi});
        });
        const fbs=h("div",{class:"gapfb"});b.append(fbs);items.forEach(it=>{it.fb.style.marginLeft="0";fbs.append(it.fb);});
      }else{
        const ob=optsBlock();if(ob)b.append(ob);
        t.items.forEach((it,qi)=>{
          const box=h("div",{class:"q"});
          box.append(h("div",{class:"qt"},h("span",{class:"qn"},String(start+qi)),h("span",{html:inline(it.q||"")})));
          if(it.audio){const segs=TTS.parse(it.audio);box.append(h("div",{style:"margin:0 0 8px 38px;display:flex;gap:8px;flex-wrap:wrap"},miniPlay(segs),scriptToggle(segs)));}
          let mark;
          if(small){
            const pills=h("div",{class:"pills"});
            t.options.forEach(o=>{const p=h("button",{type:"button",class:"pill"+(ans[qi]===o[0]?" sel":"")},o[1]?o[1]:o[0].toUpperCase());p.addEventListener("click",()=>{ans[qi]=o[0];save();$$(".pill",pills).forEach(x=>x.classList.remove("sel","right","wrong"));p.classList.add("sel");});pills.append(p);});
            box.append(pills);
            mark=()=>{$$(".pill",pills).forEach((p,oi)=>{p.classList.remove("right","wrong");if(t.options[oi][0]===it.a)p.classList.add("right");else if(t.options[oi][0]===ans[qi])p.classList.add("wrong");});};
          }else{
            const {wrap}=mkSelect(qi,"sel1");box.append(wrap);
            mark=ok=>{wrap.classList.add(ok?"ok":"bad");};
          }
          const fb=h("div",{class:"fb"});box.append(fb);b.append(box);
          const o=t.options.find(x=>x[0]===it.a)||[it.a,""];
          items.push({get:()=>ans[qi],a:it.a,mark,fb,ex:it.ex,show:o[0].toUpperCase()+(o[1]?") "+plain(o[1]).slice(0,140):"")});
        });
      }
    }
    if(t.type==="cloze"){
      const ps=passage(t.passage,t.ptitle);b.append(ps);
      $$(".gapslot",ps).forEach(slot=>{
        const qi=+slot.dataset.g-1;const g=t.gaps[qi];if(!g)return;
        const wrap=h("span",{class:"gap"},h("span",{class:"gn"},String(start+qi)));
        const sel=h("select",{"aria-label":"빈칸 "+(start+qi)},h("option",{value:""},"———"),g.o.map((o,oi)=>h("option",{value:oi},"abc"[oi]+") "+o)));
        if(ans[qi]!=null)sel.value=ans[qi];
        sel.addEventListener("change",()=>{ans[qi]=sel.value===""?undefined:+sel.value;save();wrap.classList.remove("ok","bad");});
        wrap.append(sel);slot.replaceWith(wrap);
        const a=L(g.a);
        items.push({get:()=>ans[qi],a,mark(ok){wrap.classList.add(ok?"ok":"bad");},fb:h("div",{class:"fb"}),ex:g.ex,show:"abc"[a]+") "+g.o[a],qn:start+qi});
      });
      const fbs=h("div",{class:"gapfb"});b.append(fbs);items.forEach(it=>{it.fb.style.marginLeft="0";fbs.append(it.fb);});
    }
    // actions
    const chk=h("button",{class:"btn",type:"button","data-check":""},"채점하기");
    const rst=h("button",{class:"btn plain",type:"button"},"다시 풀기");
    const showA=h("button",{class:"btn ghost",type:"button"},"정답 보기");
    const act=h("div",{class:"actions"},chk,showA,rst);
    if(scriptBox){act.append(h("button",{class:"btn plain",type:"button",onclick:e=>{const on=scriptBox.classList.toggle("show");e.target.textContent=on?"스크립트 숨기기":"스크립트 보기";}},"스크립트 보기"));}
    b.append(act);
    const grade=(reveal)=>{
      let ok=0;
      items.forEach(it=>{
        const v=it.get();const good=v!=null&&v!==""&&String(v)===String(it.a);
        if(good)ok++;
        if(v==null||v===""){if(!reveal){it.fb.className="fb show no";it.fb.innerHTML=(it.qn?"<b>"+it.qn+"번</b> ":"")+"답을 선택하지 않았어요. 정답: <b>"+esc(it.show)+"</b>"+(it.ex?"<br>"+inline(it.ex):"");it.mark(false);}else{it.fb.className="fb show okk";it.fb.innerHTML=(it.qn?"<b>"+it.qn+"번</b> ":"")+"정답: <b>"+esc(it.show)+"</b>"+(it.ex?"<br>"+inline(it.ex):"");} return;}
        it.mark(good);
        it.fb.className="fb show "+(good?"okk":"no");
        it.fb.innerHTML=(it.qn?"<b>"+it.qn+"번</b> ":"")+(good?"정답이에요! ":"아쉬워요. 정답: <b>"+esc(it.show)+"</b>")+(it.ex?"<br>"+inline(it.ex):"");
      });
      if(!reveal){st.c[id]=[ok,items.length];save();res.textContent=`${ok} / ${items.length}`;res.style.color=ok/items.length>=.6?"var(--ok)":"var(--bad)";body.dispatchEvent(new Event("scored"));}
    };
    chk.addEventListener("click",()=>{grade(false);if(scriptBox)scriptBox.classList.add("show");});
    showA.addEventListener("click",()=>grade(true));
    rst.addEventListener("click",()=>{delete st.a[id];delete st.c[id];save();const nsec=renderTask(t,id,start,pi);sec.replaceWith(nsec);body.dispatchEvent(new Event("scored"));});
    if(st.c[id]){res.textContent=`${st.c[id][0]} / ${st.c[id][1]}`;res.style.color=st.c[id][0]/st.c[id][1]>=.6?"var(--ok)":"var(--bad)";}
    return sec;
  }
  function spkName(s){return {N:"Narrador",F:"Mujer",M:"Hombre",F2:"Mujer 2",M2:"Hombre 2"}[s]||s;}
  function passage(text,title){
    const d=h("div",{class:"passage",html:(title?"<h4>"+inline(title)+"</h4>":"")+md(text)});
    const sb=speakBtn(()=>"N: "+plain((title?title+". ":"")+text).replace(/\n+/g," "),"🔊","mini speak");sb.setAttribute("aria-label","본문 읽어주기");sb.title="본문 읽어주기";d.prepend(sb);
    return d;
  }
  function player(segs,label){
    const btn=h("button",{class:"play",type:"button","aria-label":"재생"},"▶");
    const wave=h("div",{class:"wave"},h("i"));
    let count=0;const cnt=h("span",{class:"cnt"},"재생 0회 (시험에서는 2회)");
    const p=h("div",{class:"player"},btn,h("span",{class:"lbl"},label),wave,cnt);
    btn.addEventListener("click",()=>{
      if(btn.classList.contains("on")){TTS.stop();return;}
      $$(".play.on").forEach(x=>{x.classList.remove("on");x.textContent="▶";});
      btn.classList.add("on");btn.textContent="■";count++;cnt.textContent=`재생 ${count}회 (시험에서는 2회)`;
      $("i",wave).style.width="0";
      TTS.play(segs,{onprogress:f=>$("i",wave).style.width=(f*100)+"%",onend:()=>{btn.classList.remove("on");btn.textContent="▶";}});
    });
    document.addEventListener("tts-stop",()=>{btn.classList.remove("on");btn.textContent="▶";});
    return p;
  }
  function miniPlay(segs){
    const b=h("button",{class:"mini",type:"button"},"▶ 듣기");
    b.addEventListener("click",()=>{if(b.classList.contains("on")){TTS.stop();return;}$$(".mini.on").forEach(x=>x.classList.remove("on"));b.classList.add("on");b.textContent="■ 정지";TTS.play(segs,{onend:()=>{b.classList.remove("on");b.textContent="▶ 듣기";}});});
    document.addEventListener("tts-stop",()=>{b.classList.remove("on");b.textContent="▶ 듣기";});
    return b;
  }
  function scriptToggle(segs){
    const box=h("div",{class:"script",style:"flex-basis:100%;margin:6px 0 0"},segs.map(s=>h("p",{},h("span",{class:"sp"},s.name||spkName(s.spk)),s.text)));
    const b=h("button",{class:"mini",type:"button",style:"border-color:var(--line2);color:var(--ink2)"},"스크립트");
    b.addEventListener("click",()=>box.classList.toggle("show"));
    const f=document.createDocumentFragment();f.append(b,box);return f;
  }
  function renderProd(t,id,b){
    (t.parts||[]).forEach((p,pj)=>{
      const k=`${id}-${pj}`;st.k[k]=st.k[k]||{};const ks=st.k[k];
      const box=h("div",{class:t.parts.length>1?"subopt":""});
      if(p.label) box.append(h("h5",{},p.label));
      if(p.pic||p.lamina) box.append(h("div",{class:"lamina"},h("div",{class:"pic","aria-hidden":"true"},p.pic||"🖼️"),h("div",{class:"desc",html:"<em>"+(t.type==="speak"?"Lámina · 사진 설명":"Lámina")+"</em>"+md(p.lamina||"")})));
      if(p.stim){const s=h("div",{class:"stim",html:md(p.stim)});s.prepend(h("div",{style:"float:right"},speakBtn(()=>"N: "+plain(p.stim))));box.append(s);}
      if(p.audio){const segs=TTS.parse(p.audio);box.append(player(segs,p.audioLabel||"Audición"));const sc=h("div",{class:"script"},segs.map(s=>h("p",{},h("span",{class:"sp"},s.name||spkName(s.spk)),s.text)));box.append(sc,h("div",{style:"margin:-6px 0 12px"},h("button",{class:"mini",type:"button",onclick:()=>sc.classList.toggle("show")},"스크립트")));}
      if(p.prompt) box.append(h("div",{class:"prompt",html:md(p.prompt)}));
      const bullets=(p.prompt||"").split("\n").filter(l=>/^- /.test(l)).map(l=>plain(l.slice(2)));
      if(t.type==="write"){
        const ta=h("textarea",{class:"wr",placeholder:"여기에 스페인어로 작성하세요…","aria-label":"작문"});
        ta.value=st.w[k]||"";
        const wc=h("div",{class:"wc"});
        const [mn,mx]=p.words||[0,0];
        const upd=()=>{const c=(ta.value.trim().match(/\S+/g)||[]).length;wc.innerHTML=`<span>단어 수: <b class="${mn&&(c<mn||c>mx)?"no":"ok"}">${c}</b>${mn?` / 목표 ${mn}–${mx}단어`:""}</span><span>${ta.value.trim()?"자동 저장됨":""}</span>`;};
        ta.addEventListener("input",()=>{st.w[k]=ta.value;save();upd();});upd();
        box.append(ta,wc);
      }else{
        if(p.qs&&p.qs.length){
          const ql=h("div",{class:"stim"},h("p",{},h("b",{},"Preguntas del entrevistador · 면접관 질문")));
          p.qs.forEach(q=>ql.append(h("p",{},speakBtn(()=>"M: "+q,"🔊"),"  "+q)));
          box.append(ql);
        }
        box.append(recorder(p.prep||0,p.time||120));
      }
      const checks=[...bullets,...(t.type==="write"?(B.writeCheck||[]):(B.speakCheck||[]))];
      const cl=h("ul",{class:"check"});
      checks.forEach((c,ci)=>{const cb=h("input",{type:"checkbox"});cb.checked=!!(ks.cb&&ks.cb[ci]);cb.addEventListener("change",()=>{ks.cb=ks.cb||{};ks.cb[ci]=cb.checked;ks.done=checks.every((_,j)=>ks.cb[j]);save();b.closest(".tbody").dispatchEvent(new Event("scored"));});cl.append(h("li",{},h("label",{},cb,h("span",{},c))));});
      box.append(h("p",{style:"font-weight:700;margin:6px 0"},"자기 점검표 ✔"),cl);
      if(p.model){
        const m=h("div",{class:"model",html:"<p><b>Modelo de respuesta · 모범답안</b></p>"+md(p.model)});
        const mb=h("button",{class:"btn ghost",type:"button"},"모범답안 보기");
        mb.addEventListener("click",()=>{const on=m.classList.toggle("show");mb.textContent=on?"모범답안 숨기기":"모범답안 보기";});
        box.append(h("div",{class:"actions"},mb,speakBtn(()=>"N: "+plain(p.model),"🔊 모범답안 듣기","btn plain")),m);
      }
      b.append(box);
    });
  }
  function recorder(prep,time){
    const wrap=h("div",{});
    const tEl=h("span",{class:"t"},fmt(prep||time));
    const rec=h("div",{class:"rec"},h("span",{class:"recdot"}),tEl);
    let iv=null;
    const run=(sec,done)=>{clearInterval(iv);let l=sec;tEl.textContent=fmt(l);iv=setInterval(()=>{l--;tEl.textContent=fmt(Math.max(0,l));if(l<=0){clearInterval(iv);done&&done();}},1000);};
    if(prep){rec.append(h("button",{class:"btn plain sm",type:"button",onclick:()=>{run(prep,()=>toast("준비 시간 끝! 이제 말해 보세요."));}},`준비 ${Math.round(prep/60)}분 타이머`));}
    let mr=null,chunks=[];const au=h("audio",{controls:true,style:"display:none"});
    const rb=h("button",{class:"btn sm",type:"button"},"🎙 녹음 시작");
    rb.addEventListener("click",async()=>{
      if(mr&&mr.state==="recording"){mr.stop();return;}
      try{
        const s=await navigator.mediaDevices.getUserMedia({audio:true});
        mr=new MediaRecorder(s);chunks=[];
        mr.ondataavailable=e=>chunks.push(e.data);
        mr.onstop=()=>{s.getTracks().forEach(x=>x.stop());au.src=URL.createObjectURL(new Blob(chunks,{type:mr.mimeType||"audio/webm"}));au.style.display="";rec.classList.remove("on");rb.textContent="🎙 다시 녹음";clearInterval(iv);};
        mr.start();rec.classList.add("on");rb.textContent="■ 녹음 끝내기";
        run(time,()=>{if(mr.state==="recording")mr.stop();});
      }catch(e){toast("마이크를 사용할 수 없어요. 브라우저 권한을 확인해 주세요.");}
    });
    rec.append(rb,h("span",{style:"font-size:13px;color:var(--ink2)"},`권장 ${time>=60?Math.round(time/60)+"분":time+"초"}`),au);
    wrap.append(rec);return wrap;
  }
  draw();
}
function fmt(s){s=Math.max(0,s|0);return String(s/60|0).padStart(2,"0")+":"+String(s%60).padStart(2,"0");}
})();
