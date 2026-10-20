/* Personal attendance history and consent-based LINE linking. */
document.addEventListener('DOMContentLoaded',()=>{
  const main=document.querySelector('main');if(!main||!document.getElementById('attendance'))return;
  const attendanceStyle=document.createElement('style');attendanceStyle.textContent=`
  .times{padding-bottom:20px;gap:12px}.time-box{position:relative;padding:17px 18px;border-radius:14px;background:#f7f9fc}.time-box small{font-size:12px;font-weight:500;margin-bottom:8px}.time-box strong{font-size:36px;line-height:1.2;letter-spacing:-1px}.time-box[data-recorded=true]{background:#edf8f2;border-color:#b4ddc8}.time-box[data-recorded=true] strong{color:#08734c}.time-box[data-recorded=false] strong{font-size:21px;letter-spacing:0;color:#64778e}.today-summary{display:flex;align-items:center;justify-content:center;gap:8px;margin:0 20px 18px;padding:11px 14px;border:1px solid #e8d49d;border-radius:11px;background:#fff7e6;color:#8a5b13;font-size:13px;font-weight:500}.today-summary[data-state=complete]{background:#eaf7ef;border-color:#b8deca;color:#0e714f}.today-summary[data-state=none]{background:#eff4fa;border-color:#d7e2ef;color:#526d89}.attendance-action{min-height:104px;border:1px solid transparent}.attendance-action small{font-size:13px;line-height:1.6;font-weight:500}.attendance-action span{font-size:16px}.attendance-action:disabled{opacity:1;background:#f0f4f8;border-color:#d8e2ed;color:#526a83}.attendance-action[data-state=done]:disabled{background:#edf8f2;border-color:#acd7c0;color:#08734c}.attendance-action[data-state=done] small{font-weight:600}.map-wrap:not(:has(iframe)){height:94px}.location-card:has(iframe) .map-wrap{height:180px}.location-head{background:#f7faff}.map-empty{font-size:11px;gap:4px}.map-empty strong{font-size:13px}.location-title{font-size:13px}.message.error{color:#a44134;background:#fff4ef;margin:0 20px 18px;padding:10px 12px;border-radius:9px}.clock-card:has(.message.error) .message{min-height:0}.message:empty{padding-bottom:0}
  @media(max-width:480px){.time-box{padding:15px 12px}.time-box strong{font-size:32px}.time-box[data-recorded=false] strong{font-size:18px}.today-summary{margin-inline:14px;font-size:12px}.attendance-action span{font-size:14px}.attendance-action small{font-size:12px}.attendance-action{min-height:100px}.message.error{margin-inline:14px}.location-card:has(iframe) .map-wrap{height:160px}}
  .history-dialog{box-sizing:border-box;width:min(660px,calc(100vw - 24px))}.history-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 18px}.history-summary>div{padding:12px 8px;border:1px solid #d9e4ee;border-radius:11px;text-align:center;background:#f4f7fb;font-size:11px}.history-summary strong{display:block;font-size:23px;line-height:1.3;margin-bottom:3px}.history-summary>div:first-child{background:#eaf7ef;color:#13724d;border-color:#bee0cc}.history-summary>div:nth-child(2){background:#fff5e2;color:#946010;border-color:#efdcab}.history-summary>div:nth-child(3){background:#eaf2ff;color:#245f9e;border-color:#c0d4f0}.history-dialog .history-day{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:3px;min-height:104px!important;padding:8px 3px!important;line-height:1.3}.history-number{font-size:16px;font-weight:600}.history-status{font-size:11px;font-weight:600;max-width:100%;overflow-wrap:anywhere}.history-time{display:block;font-size:10px;white-space:nowrap;font-variant-numeric:tabular-nums}.history-day[data-state=none]{background:#fbfcfe;color:#8190a1;border-color:#e2e8ef}.history-day[data-state=complete]{color:#0b7049}.history-day[data-state=incomplete]{color:#8b5c0f}.history-day[data-state=leave]{color:#245c99}.history-day[aria-pressed=true]{box-shadow:inset 0 0 0 2px #275f9c}
  @media(max-width:480px){.history-dialog{padding:16px 12px}.history-dialog h2{font-size:17px}.history-grid{gap:4px}.history-dialog .history-day{min-height:94px!important;padding:6px 1px!important;gap:4px}.history-number{font-size:14px}.history-status{font-size:10px}.history-time{font-size:10px}.history-summary{gap:5px}.history-summary>div{padding:10px 3px;font-size:10px}.history-summary strong{font-size:21px}}
  `;
  // These refinements do not change the existing clock size or attendance/GPS rules.
  document.head.append(attendanceStyle);
  const times=main.querySelector('.times'),locationCard=main.querySelector('.location-card');
  const summary=document.createElement('div');summary.className='today-summary';summary.setAttribute('role','status');
  if(times&&locationCard){locationCard.before(times);times.after(summary);}
  function refreshAttendancePresentation(){
    const checkin=document.getElementById('checkin'),checkout=document.getElementById('checkout');if(!checkin||!checkout)return;
    const entered=checkin.textContent!=='--:--',exited=checkout.textContent!=='--:--';
    checkin.closest('.time-box').dataset.recorded=String(entered);checkout.closest('.time-box').dataset.recorded=String(exited);
    for(const [id,recorded] of [['attendance',entered],['attendanceOut',exited]]){const button=document.getElementById(id);button.dataset.state=recorded?'done':button.disabled?'waiting':'ready';const label=button.querySelector('span');if(label?.lastChild?.nodeType===3)label.lastChild.nodeValue=id==='attendance'?(recorded?'เข้างานแล้ว':'ลงเวลาเข้างาน'):(recorded?'ออกงานแล้ว':'ลงเวลาออกงาน');}
    summary.dataset.state=entered&&exited?'complete':entered?'incomplete':'none';
    summary.textContent=entered&&exited?'✓ ลงเวลาเข้า–ออกครบแล้ววันนี้':entered?'! ลงเวลาเข้าแล้ว · ยังไม่ได้ลงเวลาออก':'ยังไม่มีรายการลงเวลาวันนี้';
  }
  const attendanceObserver=new MutationObserver(refreshAttendancePresentation);
  for(const id of ['checkin','checkout']){const element=document.getElementById(id);if(element)attendanceObserver.observe(element,{childList:true,characterData:true,subtree:true});}
  for(const id of ['attendance','attendanceOut']){const element=document.getElementById(id);if(element)attendanceObserver.observe(element,{attributes:true,attributeFilter:['disabled']});}
  refreshAttendancePresentation();
  const style=document.createElement('style');style.textContent='.employee-tools{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}.employee-tools button{flex:1;min-height:46px;padding:10px;border:1px solid #c8d8eb;border-radius:11px;background:white;color:#174477;font:14px Prompt,system-ui;cursor:pointer}.history-dialog{position:fixed;inset:0;margin:auto;width:min(580px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;border:1px solid #d5e1ef;border-radius:18px;padding:20px;color:#173c64;font:14px Prompt,system-ui}.history-dialog::backdrop{background:#10294388}.history-dialog header,.history-nav{display:flex;align-items:center;justify-content:space-between;gap:10px}.history-dialog h2{font-size:20px;margin:0}.history-dialog button{min-height:42px;padding:8px 12px;border:1px solid #cfdbeb;border-radius:9px;background:white;color:#173c64;font:inherit;cursor:pointer}.history-nav{margin:20px 0 14px}.history-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}.history-week{text-align:center;color:#74869b;padding:4px}.history-day{min-width:0;min-height:48px!important;padding:5px!important}.history-day[data-state=complete]{background:#e3f5eb;border-color:#95d0ae}.history-day[data-state=incomplete]{background:#fff2d9;border-color:#efc56d}.history-day[data-state=leave]{background:#e5f0ff;border-color:#9bc0ee}.history-day[aria-current=date]{outline:2px solid #225d9c;outline-offset:1px}.history-detail{margin-top:16px;padding:14px;border-radius:10px;background:#f1f5fa;line-height:1.8}.history-legend{font-size:12px;line-height:1.8;color:#60768d;margin:16px 0 0}';document.head.append(style);
  const tools=document.createElement('div');tools.className='employee-tools';
  tools.innerHTML='<button type="button" id="historyTrigger">ประวัติการลงเวลาของฉัน</button><button type="button" id="linkLineTrigger">ผูกบัญชี LINE</button><p id="employeeToolsStatus" role="status" style="width:100%;font-size:12px;margin:0;color:#58738f"></p>';main.append(tools);
  const call=(action,...args)=>bpServerCall(action,...args),status=tools.querySelector('[role=status]');
  let dialog,month='',history=null,historyBusy=false;
  function closeHistory(){dialog?.close();dialog?.remove();dialog=null;}
  function dateString(year,monthIndex,day){return year+'-'+String(monthIndex+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');}
  async function showHistory(offset=0){
    if(historyBusy)return;historyBusy=true;
    try{
      if(!month){const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit'}).formatToParts(new Date());month=today.find(x=>x.type==='year').value+'-'+today.find(x=>x.type==='month').value;}
      const [y,m]=month.split('-').map(Number),date=new Date(Date.UTC(y,m-1+offset,1));
      const target=dateString(date.getUTCFullYear(),date.getUTCMonth(),1).slice(0,7);
      history=await call('getBPAttendanceHistory',target);month=target;
      if(!dialog){dialog=document.createElement('dialog');dialog.className='history-dialog';dialog.setAttribute('aria-label','ประวัติการลงเวลาของฉัน');dialog.innerHTML='<header><h2>ประวัติการลงเวลาของฉัน</h2><button type="button" data-close>ปิด</button></header><div class="history-nav"><button type="button" data-prev aria-label="เดือนก่อน">‹</button><strong id="historyMonth"></strong><button type="button" data-next aria-label="เดือนถัดไป">›</button></div><div class="history-grid"></div><p class="history-legend">เขียว: ลงเวลาครบ · ส้ม: ลงเวลาไม่ครบ · ฟ้า: ลาอนุมัติ<br>วันที่ว่างหมายถึงไม่มีข้อมูลลงเวลา ไม่ได้สรุปว่าขาดงาน</p><div class="history-detail" role="status">เลือกวันที่เพื่อดูรายละเอียด</div>';document.body.append(dialog);dialog.querySelector('[data-close]').onclick=closeHistory;dialog.querySelector('[data-prev]').onclick=()=>showHistory(-1);dialog.querySelector('[data-next]').onclick=()=>showHistory(1);dialog.addEventListener('cancel',()=>{dialog.remove();dialog=null;});dialog.showModal();}
      dialog.querySelector('#historyMonth').textContent=new Intl.DateTimeFormat('th-TH',{timeZone:'UTC',month:'long',year:'numeric'}).format(date);
      let monthSummary=dialog.querySelector('.history-summary');
      if(!monthSummary){monthSummary=document.createElement('div');monthSummary.className='history-summary';monthSummary.setAttribute('aria-label','สรุปการลงเวลาเดือนนี้');dialog.querySelector('.history-grid').before(monthSummary);}
      const recordedDays=new Set(history.records.map(row=>row.Date));
      const completeDays=new Set(history.records.filter(row=>row.CheckInTime&&row.CheckOutTime).map(row=>row.Date));
      const leaveDays=new Set(history.leaves.map(row=>row.Date));
      monthSummary.replaceChildren();
      for(const [count,label] of [[completeDays.size,'ลงเวลาครบ (วัน)'],[[...recordedDays].filter(day=>!completeDays.has(day)).length,'ลงเวลาไม่ครบ (วัน)'],[leaveDays.size,'ลาอนุมัติ (วัน)']]){const item=document.createElement('div'),number=document.createElement('strong');number.textContent=count;item.append(number,document.createTextNode(label));monthSummary.append(item);}
      const grid=dialog.querySelector('.history-grid');grid.replaceChildren();
      ['อา','จ','อ','พ','พฤ','ศ','ส'].forEach(day=>{const cell=document.createElement('span');cell.className='history-week';cell.textContent=day;grid.append(cell);});
      for(let i=0;i<date.getUTCDay();i++)grid.append(document.createElement('span'));
      const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
      for(let day=1;day<=last;day++){
        const key=dateString(date.getUTCFullYear(),date.getUTCMonth(),day),record=history.records.find(row=>row.Date===key),leave=history.leaves.find(row=>row.Date===key);
        const state=record?(record.CheckInTime&&record.CheckOutTime?'complete':'incomplete'):leave?'leave':'none';
        const button=document.createElement('button');button.type='button';button.className='history-day';button.dataset.date=key;button.dataset.state=state;
        const dayNumber=document.createElement('strong');dayNumber.className='history-number';dayNumber.textContent=day;button.append(dayNumber);
        const stateLabel=document.createElement('span');stateLabel.className='history-status';stateLabel.textContent={complete:'✓ ครบ',incomplete:record?.CheckInTime?'! รอออก':'! ขาดเข้า',leave:'ลาอนุมัติ',none:'—'}[state];button.append(stateLabel);
        const shortTime=value=>value?String(value).includes('T')?String(value).slice(11,16):String(value).slice(0,5):'—';
        if(record){for(const [label,value] of [['เข้า',record.CheckInTime],['ออก',record.CheckOutTime]]){const time=document.createElement('span');time.className='history-time';time.textContent=label+' '+shortTime(value);button.append(time);}}
        else if(leave){const leaveType=document.createElement('span');leaveType.className='history-time';leaveType.textContent=leave.LeaveType;button.append(leaveType);}
        if(key===history.today)button.setAttribute('aria-current','date');
        const summary={complete:'ลงเวลาครบ',incomplete:'ลงเวลาไม่ครบ',leave:'ลาอนุมัติ',none:'ไม่มีข้อมูลลงเวลา'}[state];button.setAttribute('aria-label',key+' '+summary+(record?' เข้า '+shortTime(record.CheckInTime)+' ออก '+shortTime(record.CheckOutTime):leave?' '+leave.LeaveType:''));
        button.onclick=()=>{dialog.querySelectorAll('.history-day[aria-pressed]').forEach(day=>day.removeAttribute('aria-pressed'));button.setAttribute('aria-pressed','true');const format=value=>value?String(value).includes('T')?String(value).slice(11,16):String(value).slice(0,5):'—';dialog.querySelector('.history-detail').textContent=key+' · '+summary+(record?' · เข้างาน '+format(record.CheckInTime)+' · ออกงาน '+format(record.CheckOutTime):'')+(leave?' · '+leave.LeaveType+' (อนุมัติแล้ว)':'');};grid.append(button);
      }
      dialog.querySelector('.history-detail').textContent='เลือกวันที่เพื่อดูรายละเอียด';
    }catch(error){status.textContent=error.message;window.bpNotice?.(error.message,true);}finally{historyBusy=false;}
  }
  tools.querySelector('#historyTrigger').onclick=()=>showHistory();
  const link=tools.querySelector('#linkLineTrigger');
  link.onclick=async()=>{
    if(link.disabled)return;link.disabled=true;status.textContent='';
    try{
      const state=await call('getBPAccountState');if(state.lineLinked){status.textContent='บัญชีนี้ผูก LINE แล้ว';return;}
      if(window.top!==window.self)throw Error('กรุณาเปิดหน้าพนักงานบน Vercel เพื่อผูก LINE');
      if(!window.liff)throw Error('โหลด LINE ไม่สำเร็จ กรุณาเปิดใหม่');
      await liff.init({liffId:window.BP_LIFF_ID});
      if(!liff.isLoggedIn()){
        const consent=confirm('เปิด LINE เพื่อยืนยันตัวตนและผูกกับบัญชีพนักงานที่เข้าสู่ระบบนี้หรือไม่');if(!consent)return;
        // Only the intent is stored; no credential is placed in browser storage.
        sessionStorage.setItem('bp-line-link-pending','1');liff.login({redirectUri:location.origin+'/'});return;
      }
      if(!confirm('ยืนยันผูกบัญชี LINE ปัจจุบันกับบัญชีพนักงานนี้หรือไม่'))return;
      const idToken=liff.getIDToken();if(!idToken)throw Error('LINE ยังไม่ให้สิทธิ์ openid กรุณาเปิดใหม่');
      await call('linkBPLineIdToken',idToken);sessionStorage.removeItem('bp-line-link-pending');status.textContent='ผูกบัญชี LINE สำเร็จ ครั้งถัดไปใช้ LINE เข้าสู่ระบบได้';link.textContent='ผูก LINE แล้ว';window.bpNotice?.('ผูกบัญชี LINE สำเร็จ');
    }catch(error){status.textContent=error.message;window.bpNotice?.(error.message,true);}finally{link.disabled=false;}
  };
  attendanceStyle.textContent+=' .actions .attendance-action{min-height:68px;padding:12px 14px;gap:3px;box-shadow:none;border-radius:12px}.attendance-action small{font-size:11px}.attendance-action[data-state=done] small{display:none}.attendance-action[data-state=done] span:before{content:"✓";font-size:18px}.attendance-action[data-state=done] svg{display:none}.attendance-action span{font-size:16px}@media(max-width:480px){.attendance-action span{font-size:14px}}';
  document.head.append(attendanceStyle);
  if(sessionStorage.getItem('bp-line-link-pending')==='1')status.textContent='กลับจาก LINE แล้ว กรุณากดผูกบัญชี LINE อีกครั้งเพื่อยืนยัน';
});
