/* Personal attendance history and consent-based LINE linking. */
document.addEventListener('DOMContentLoaded',()=>{
  const main=document.querySelector('main');if(!main||!document.getElementById('attendance'))return;
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
      const grid=dialog.querySelector('.history-grid');grid.replaceChildren();
      ['อา','จ','อ','พ','พฤ','ศ','ส'].forEach(day=>{const cell=document.createElement('span');cell.className='history-week';cell.textContent=day;grid.append(cell);});
      for(let i=0;i<date.getUTCDay();i++)grid.append(document.createElement('span'));
      const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
      for(let day=1;day<=last;day++){
        const key=dateString(date.getUTCFullYear(),date.getUTCMonth(),day),record=history.records.find(row=>row.Date===key),leave=history.leaves.find(row=>row.Date===key);
        const state=record?(record.CheckInTime&&record.CheckOutTime?'complete':'incomplete'):leave?'leave':'none';
        const button=document.createElement('button');button.type='button';button.className='history-day';button.dataset.date=key;button.dataset.state=state;button.textContent=day;
        if(key===history.today)button.setAttribute('aria-current','date');
        const summary={complete:'ลงเวลาครบ',incomplete:'ลงเวลาไม่ครบ',leave:'ลาอนุมัติ',none:'ไม่มีข้อมูลลงเวลา'}[state];button.setAttribute('aria-label',key+' '+summary);
        button.onclick=()=>{const format=value=>value?String(value).includes('T')?String(value).slice(11,16):String(value).slice(0,5):'—';dialog.querySelector('.history-detail').textContent=key+' · '+summary+(record?' · เข้างาน '+format(record.CheckInTime)+' · ออกงาน '+format(record.CheckOutTime):'')+(leave?' · '+leave.LeaveType+' (อนุมัติแล้ว)':'');};grid.append(button);
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
  if(sessionStorage.getItem('bp-line-link-pending')==='1')status.textContent='กลับจาก LINE แล้ว กรุณากดผูกบัญชี LINE อีกครั้งเพื่อยืนยัน';
});
