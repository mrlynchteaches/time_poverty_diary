(() => {
"use strict";
const STORAGE_KEY="timePovertyDiary.v1";
const DEFAULT_CATEGORIES=["Grading","Planning & Prepping","Email","Administrative Work","Meetings","Student Support","Parent/Family Communication","Professional Development","Teaching/Instruction","Other"];
const COLORS=["#6f42c1","#ef8b00","#3fb15b","#df3c32","#1677d2","#0e9f9a","#d14b9b","#7b8794","#795548","#9c27b0"];
const $=id=>document.getElementById(id);
const uid=()=>crypto.randomUUID?crypto.randomUUID():"id-"+Date.now()+"-"+Math.random().toString(16).slice(2);
const pad=n=>String(n).padStart(2,"0");
const localDateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseLocalDate=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const dayStart=s=>parseLocalDate(s).getTime();
const dayEnd=s=>{const d=parseLocalDate(s);d.setDate(d.getDate()+1);return d.getTime()};
const fmtDuration=ms=>{ms=Math.max(0,Math.round(ms/1000)*1000);const t=Math.floor(ms/1000);return `${pad(Math.floor(t/3600))}:${pad(Math.floor((t%3600)/60))}:${pad(t%60)}`};
const fmtTime=ms=>new Date(ms).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
const fmtDate=s=>parseLocalDate(s).toLocaleDateString([], {weekday:"long",year:"numeric",month:"long",day:"numeric"});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
let state=loadState();
let selectedDate=localDateKey(new Date());

function loadState(){
  try{
    const x=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(x && Array.isArray(x.activities)) return {categories:Array.isArray(x.categories)&&x.categories.length?x.categories:DEFAULT_CATEGORIES.slice(),activities:x.activities,workdayEnds:x.workdayEnds||{}};
  }catch(e){}
  return {categories:DEFAULT_CATEGORIES.slice(),activities:[],workdayEnds:{}};
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove("show"),2800)}
function allSegments(a, now=Date.now()){
  const segs=(a.segments||[]).map(s=>({...s}));
  if(a.status==="running"&&a.currentStart) segs.push({id:"live",start:a.currentStart,end:now});
  return segs;
}
function overlapMs(seg,date){
  const s=Math.max(seg.start,dayStart(date)),e=Math.min(seg.end,dayEnd(date));
  return Math.max(0,e-s);
}
function activityDayMs(a,date,now=Date.now()){
  return allSegments(a,now).reduce((sum,s)=>sum+overlapMs(s,date),0);
}
function daySegments(date,now=Date.now()){
  const rows=[];
  state.activities.forEach(a=>allSegments(a,now).forEach(s=>{
    const start=Math.max(s.start,dayStart(date)),end=Math.min(s.end,dayEnd(date));
    if(end>start) rows.push({activity:a,segment:s,start,end,duration:end-start,originalDuration:s.durationOverrideMs});
  }));
  return rows.sort((a,b)=>a.start-b.start);
}
function effectiveSegmentDuration(row){
  if(row.segment.id!=="live" && Number.isFinite(row.segment.durationOverrideMs)) return row.segment.durationOverrideMs;
  return row.duration;
}
function pauseRunning(exceptId=null){
  const now=Date.now();
  state.activities.forEach(a=>{
    if(a.status==="running"&&a.id!==exceptId){
      a.segments=a.segments||[];
      a.segments.push({id:uid(),start:a.currentStart,end:now});
      a.currentStart=null;a.status="paused";
    }
  });
}
function startActivity(id){
  pauseRunning(id);const a=state.activities.find(x=>x.id===id);if(!a)return;
  a.status="running";a.currentStart=Date.now();a.completedAt=null;saveState();render();
}
function pauseActivity(id){
  const a=state.activities.find(x=>x.id===id);if(!a||a.status!=="running")return;
  a.segments=a.segments||[];a.segments.push({id:uid(),start:a.currentStart,end:Date.now()});a.currentStart=null;a.status="paused";saveState();render();
}
function completeActivity(id){
  const a=state.activities.find(x=>x.id===id);if(!a)return;
  if(a.status==="running"){a.segments=a.segments||[];a.segments.push({id:uid(),start:a.currentStart,end:Date.now()});}
  a.currentStart=null;a.status="completed";a.completedAt=Date.now();saveState();render();
}
function deleteActivity(id){
  if(!confirm("Delete this activity and all of its recorded time?"))return;
  state.activities=state.activities.filter(a=>a.id!==id);saveState();render();
}
function openActivity(a=null){
  $("activityDialogTitle").textContent=a?"Edit Activity":"New Activity";
  $("activityId").value=a?.id||"";$("activityDescription").value=a?.description||"";
  fillCategorySelect($("activityCategory"),a?.category);$("activityDialog").showModal();$("activityDescription").focus();
}
function fillCategorySelect(el,value){
  const cats=[...state.categories];if(value&&!cats.includes(value))cats.push(value);
  el.innerHTML=cats.map(c=>`<option ${c===value?"selected":""}>${esc(c)}</option>`).join("");
}
function render(){
  $("datePicker").value=selectedDate;$("selectedDateLabel").textContent=fmtDate(selectedDate);
  $("dayStatus").textContent=state.workdayEnds[selectedDate]?`Workday ended at ${fmtTime(state.workdayEnds[selectedDate])}`:"";
  const active=state.activities.filter(a=>a.status!=="completed");
  $("activityCards").innerHTML=active.length?active.map(a=>{
    const ms=activityDayMs(a,selectedDate);
    return `<article class="activity-card">
      <div class="activity-top"><div class="activity-main"><div class="activity-description">${esc(a.description)}</div>
      <span class="category-pill">${esc(a.category)}</span><span class="status-pill ${a.status==="running"?"status-running":"status-paused"}">${a.status==="running"?"Running":"Paused"}</span></div>
      <div class="timer" data-timer-id="${a.id}">${fmtDuration(ms)}</div></div>
      <div class="activity-actions">
        <button class="btn btn-secondary" data-action="edit" data-id="${a.id}">Edit</button>
        ${a.status==="running"?`<button class="btn btn-secondary" data-action="pause" data-id="${a.id}">Pause</button>`:`<button class="btn btn-primary" data-action="start" data-id="${a.id}">Resume</button>`}
        <button class="btn btn-secondary" data-action="complete" data-id="${a.id}">Complete</button>
        <button class="btn btn-secondary" data-action="delete" data-id="${a.id}">Delete</button>
      </div></article>`;
  }).join(""):`<div class="empty">No active activities. Select <strong>+ New Activity</strong> to begin.</div>`;

  const completed=state.activities.filter(a=>a.status==="completed"&&activityDayMs(a,selectedDate)>0);
  $("completedList").innerHTML=completed.length?completed.map(a=>`<div class="completed-item">
    <div><strong>${esc(a.description)}</strong><span class="muted">${esc(a.category)}</span></div>
    <div><strong>${fmtDuration(activityDayMs(a,selectedDate))}</strong><span class="muted">tracked this day</span></div>
    <div><strong>${a.completedAt?fmtTime(a.completedAt):"—"}</strong><span class="muted">completed</span></div>
    <div><button class="btn btn-secondary" data-action="correct" data-id="${a.id}">Correct</button> <button class="btn btn-secondary" data-action="resume" data-id="${a.id}">Resume</button> <button class="btn btn-secondary" data-action="delete" data-id="${a.id}">Delete</button></div>
  </div>`).join(""):`<div class="empty">No completed activities for this day.</div>`;
  renderSummary();renderLog();
}
function renderSummary(){
  const rows=daySegments(selectedDate), total=rows.reduce((s,r)=>s+effectiveSegmentDuration(r),0);
  const cats={};rows.forEach(r=>cats[r.activity.category]=(cats[r.activity.category]||0)+effectiveSegmentDuration(r));
  $("summaryTotal").textContent=fmtDuration(total);
  $("summaryActivities").textContent=new Set(rows.map(r=>r.activity.id)).size;
  $("summaryCategories").textContent=Object.keys(cats).length;
  $("summaryStarted").textContent=rows.length?fmtTime(Math.min(...rows.map(r=>r.start))):"—";
  drawPie(cats,total);
}
function drawPie(cats,total){
  const c=$("categoryChart"),ctx=c.getContext("2d"),cx=c.width/2,cy=c.height/2,r=125;ctx.clearRect(0,0,c.width,c.height);
  let angle=-Math.PI/2,i=0;const entries=Object.entries(cats);
  if(!entries.length){ctx.fillStyle="#e7ecf2";ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();}
  entries.forEach(([name,val])=>{const next=angle+(val/total)*Math.PI*2;ctx.fillStyle=COLORS[i%COLORS.length];ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,angle,next);ctx.closePath();ctx.fill();angle=next;i++;});
  $("chartLegend").innerHTML=entries.map(([n,v],idx)=>`<div class="legend-row"><span class="legend-swatch" style="background:${COLORS[idx%COLORS.length]}"></span><span>${esc(n)} — ${fmtDuration(v)} (${total?((v/total)*100).toFixed(1):0}%)</span></div>`).join("")||'<span class="muted">No tracked time for this day.</span>';
}
function renderLog(){
  const rows=daySegments(selectedDate);
  $("activityLogBody").innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(r.activity.description)}</td><td>${esc(r.activity.category)}</td><td>${fmtTime(r.start)}</td><td>${r.segment.id==="live"?"—":fmtTime(r.end)}</td><td>${fmtDuration(effectiveSegmentDuration(r))}</td></tr>`).join(""):`<tr><td colspan="5" class="muted">No entries for this day.</td></tr>`;
}
function openCorrection(activityId){
  const a=state.activities.find(x=>x.id===activityId);if(!a)return;
  const candidates=(a.segments||[]).filter(s=>overlapMs(s,selectedDate)>0);
  if(!candidates.length){toast("This activity has no completed time segment to correct on this day.");return;}
  const s=candidates[candidates.length-1];
  $("editActivityId").value=a.id;$("editSegmentId").value=s.id;$("editDescription").value=a.description;
  fillCategorySelect($("editCategory"),a.category);
  $("editDate").value=localDateKey(new Date(s.start));
  $("editStart").value=`${pad(new Date(s.start).getHours())}:${pad(new Date(s.start).getMinutes())}:${pad(new Date(s.start).getSeconds())}`;
  $("editEnd").value=`${pad(new Date(s.end).getHours())}:${pad(new Date(s.end).getMinutes())}:${pad(new Date(s.end).getSeconds())}`;
  $("editDurationOverride").value=Number.isFinite(s.durationOverrideMs)?(s.durationOverrideMs/60000).toFixed(2):"";
  $("editEntryDialog").showModal();
}
function renderCategoryManager(){
  $("categoryManager").innerHTML=state.categories.map((c,i)=>`<div class="category-row"><input value="${esc(c)}" data-cat-index="${i}" aria-label="Category name"><button type="button" class="btn btn-secondary" data-remove-cat="${i}">Remove</button></div>`).join("");
}
function addManual(){
  $("manualDescription").value="";fillCategorySelect($("manualCategory"));$("manualDate").value=selectedDate;$("manualStart").value="";$("manualEnd").value="";$("manualDialog").showModal();
}
function combineDateTime(date,time){return new Date(`${date}T${time}`).getTime()}
async function exportExcel(){
  if(!window.ExcelJS){toast("Excel export library could not load. Check your internet connection.");return;}
  const rows=daySegments(selectedDate).map(r=>({...r,duration:effectiveSegmentDuration(r)}));
  if(!rows.length){toast("There is no tracked time to export for this day.");return;}
  const wb=new ExcelJS.Workbook();wb.creator="Time Poverty Diary";wb.created=new Date();
  const ws=wb.addWorksheet("Daily Activity Log");
  ws.columns=[{header:"Activity",key:"activity",width:42},{header:"Category",key:"category",width:30},{header:"Start Time",key:"start",width:18},{header:"End Time",key:"end",width:18},{header:"Duration",key:"duration",width:16}];
  rows.forEach(r=>ws.addRow({activity:r.activity.description,category:r.activity.category,start:new Date(r.start),end:r.segment.id==="live"?new Date(r.end):new Date(r.end),duration:r.duration/86400000}));
  ws.getRow(1).font={bold:true};ws.getRow(1).alignment={vertical:"middle"};ws.views=[{state:"frozen",ySplit:1}];ws.autoFilter={from:"A1",to:"E1"};
  ws.getColumn("start").numFmt="h:mm AM/PM";ws.getColumn("end").numFmt="h:mm AM/PM";ws.getColumn("duration").numFmt="[h]:mm:ss";
  const summary=wb.addWorksheet("Category Summary");summary.columns=[{header:"Category",key:"category",width:32},{header:"Total Time",key:"time",width:18},{header:"Percentage",key:"pct",width:15}];
  const byCat={};rows.forEach(r=>byCat[r.activity.category]=(byCat[r.activity.category]||0)+r.duration);const total=Object.values(byCat).reduce((a,b)=>a+b,0);
  Object.entries(byCat).sort((a,b)=>b[1]-a[1]).forEach(([category,time])=>summary.addRow({category,time:time/86400000,pct:total?time/total:0}));
  summary.getRow(1).font={bold:true};summary.getColumn("time").numFmt="[h]:mm:ss";summary.getColumn("pct").numFmt="0.0%";
  summary.addRow({});summary.addRow({category:"Total",time:total/86400000,pct:1});summary.lastRow.font={bold:true};summary.getCell(`B${summary.rowCount}`).numFmt="[h]:mm:ss";summary.getCell(`C${summary.rowCount}`).numFmt="0.0%";
  // ExcelJS does not create native charts in browser workbooks, so embed the app's pie chart as an image.
  const imageId=wb.addImage({base64:$("categoryChart").toDataURL("image/png"),extension:"png"});
  summary.addImage(imageId,{tl:{col:4,row:1},ext:{width:430,height:430}});
  summary.getCell("E1").value=`Time by Category — ${selectedDate}`;summary.getCell("E1").font={bold:true,size:14};
  const buf=await wb.xlsx.writeBuffer();const blob=new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  downloadBlob(blob,`Time_Poverty_Diary_${selectedDate}.xlsx`);toast("Excel file created.");
}
function downloadBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function backup(){downloadBlob(new Blob([JSON.stringify({app:"Time Poverty Diary",version:1,exportedAt:new Date().toISOString(),data:state},null,2)],{type:"application/json"}),`Time_Poverty_Diary_Backup_${localDateKey(new Date())}.json`)}
function endWorkday(){pauseRunning();state.workdayEnds[localDateKey(new Date())]=Date.now();saveState();render();toast("Workday ended. Any running activity was paused.");}

$("activityForm").addEventListener("submit",e=>{e.preventDefault();const id=$("activityId").value,description=$("activityDescription").value.trim(),category=$("activityCategory").value;if(!description)return;
  if(id){const a=state.activities.find(x=>x.id===id);a.description=description;a.category=category;}else state.activities.push({id:uid(),description,category,status:"paused",segments:[],currentStart:null,createdAt:Date.now(),completedAt:null});
  saveState();$("activityDialog").close();render();
});
$("manualForm").addEventListener("submit",e=>{e.preventDefault();const start=combineDateTime($("manualDate").value,$("manualStart").value),end=combineDateTime($("manualDate").value,$("manualEnd").value);if(end<=start){toast("End time must be after start time.");return;}
  state.activities.push({id:uid(),description:$("manualDescription").value.trim(),category:$("manualCategory").value,status:"completed",segments:[{id:uid(),start,end}],currentStart:null,createdAt:start,completedAt:end});saveState();$("manualDialog").close();render();
});
$("editEntryForm").addEventListener("submit",e=>{e.preventDefault();const a=state.activities.find(x=>x.id===$("editActivityId").value),s=a?.segments.find(x=>x.id===$("editSegmentId").value);if(!a||!s)return;
  const start=combineDateTime($("editDate").value,$("editStart").value),end=combineDateTime($("editDate").value,$("editEnd").value);if(end<=start){toast("End time must be after start time.");return;}
  a.description=$("editDescription").value.trim();a.category=$("editCategory").value;s.start=start;s.end=end;const ov=$("editDurationOverride").value;s.durationOverrideMs=ov===""?undefined:Number(ov)*60000;saveState();$("editEntryDialog").close();render();
});
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-action]");if(b){const {action,id}=b.dataset;if(action==="start"||action==="resume")startActivity(id);if(action==="pause")pauseActivity(id);if(action==="complete")completeActivity(id);if(action==="delete")deleteActivity(id);if(action==="edit")openActivity(state.activities.find(a=>a.id===id));if(action==="correct")openCorrection(id);}
  const close=e.target.closest("[data-close]");if(close)$(close.dataset.close).close();
  const rem=e.target.closest("[data-remove-cat]");if(rem){const i=Number(rem.dataset.removeCat);if(confirm(`Remove "${state.categories[i]}" from future choices? Historical entries will remain unchanged.`)){state.categories.splice(i,1);if(!state.categories.length)state.categories.push("Other");saveState();renderCategoryManager();}}
});
$("newActivityBtn").onclick=()=>openActivity();$("manualEntryBtn").onclick=addManual;$("exportExcelBtn").onclick=exportExcel;$("backupBtn").onclick=backup;$("endWorkdayBtn").onclick=endWorkday;
$("manageCategoriesBtn").onclick=()=>{renderCategoryManager();$("categoriesDialog").showModal()};
$("addCategoryBtn").onclick=()=>{const v=$("newCategoryName").value.trim();if(v&&!state.categories.some(c=>c.toLowerCase()===v.toLowerCase())){state.categories.push(v);$("newCategoryName").value="";saveState();renderCategoryManager();}};
$("categoryManager").addEventListener("change",e=>{if(e.target.matches("[data-cat-index]")){const i=Number(e.target.dataset.catIndex),old=state.categories[i],v=e.target.value.trim();if(!v){e.target.value=old;return}state.categories[i]=v;state.activities.forEach(a=>{if(a.category===old)a.category=v});saveState();render();}});
$("restoreInput").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{const obj=JSON.parse(await f.text()),data=obj.data||obj;if(!Array.isArray(data.activities)||!Array.isArray(data.categories))throw new Error();if(!confirm("Restore this backup? Current diary data will be replaced."))return;state={categories:data.categories,activities:data.activities,workdayEnds:data.workdayEnds||{}};saveState();render();toast("Backup restored.");}catch(err){toast("That file is not a valid Time Poverty Diary backup.");}e.target.value="";});
$("prevDayBtn").onclick=()=>{const d=parseLocalDate(selectedDate);d.setDate(d.getDate()-1);selectedDate=localDateKey(d);render()};
$("nextDayBtn").onclick=()=>{const d=parseLocalDate(selectedDate);d.setDate(d.getDate()+1);selectedDate=localDateKey(d);render()};
$("todayBtn").onclick=()=>{selectedDate=localDateKey(new Date());render()};
$("datePicker").onchange=e=>{selectedDate=e.target.value;render()};
setInterval(()=>{document.querySelectorAll("[data-timer-id]").forEach(el=>{const a=state.activities.find(x=>x.id===el.dataset.timerId);if(a)el.textContent=fmtDuration(activityDayMs(a,selectedDate));});renderSummary();renderLog();},1000);
render();
})();