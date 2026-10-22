/* Shared asynchronous feedback for Apps Script and Vercel. */
let bpBusyCount=0,bpBusyLayer=null,bpBusyLocked=[],bpBusyFocus=null;
function bpNotice(text,error=false){
  document.getElementById('bpFeedbackToast')?.remove();
  const toast=document.createElement('div');toast.id='bpFeedbackToast';toast.setAttribute('role',error?'alert':'status');
  toast.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:500000;width:max-content;max-width:calc(100vw - 32px);padding:14px 20px;border-radius:12px;background:'+(error?'#9f2d36':'#126b50')+';color:white;font:14px/1.6 Prompt,system-ui;box-shadow:0 8px 28px #10294330';
  toast.textContent=text;document.body.append(toast);setTimeout(()=>toast.remove(),error?8000:4000);
}
async function bpWithBusy(label,task){
  if(!bpBusyCount++){
    bpBusyLayer=document.createElement('dialog');bpBusyLayer.id='bpBusyOverlay';bpBusyLayer.setAttribute('role','status');bpBusyLayer.setAttribute('aria-live','polite');bpBusyLayer.addEventListener('cancel',event=>event.preventDefault());
    bpBusyLayer.style.cssText='position:fixed;inset:0;z-index:400000;display:grid;place-items:center;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;border:0;padding:24px;background:#132e4d66;backdrop-filter:blur(2px)';
    bpBusyLayer.innerHTML='<style>@keyframes bp-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){#bpBusySpinner{animation:none!important}}</style><div style="width:min(320px,100%);padding:28px;border-radius:18px;background:white;text-align:center;color:#173b65;font:15px/1.6 Prompt,system-ui;box-shadow:0 18px 60px #10294333"><div id="bpBusySpinner" aria-hidden="true" style="width:36px;height:36px;margin:0 auto 16px;border:4px solid #e2edf9;border-top-color:#194b82;border-radius:50%;animation:bp-spin .8s linear infinite"></div><strong id="bpBusyLabel"></strong><p style="font-size:12px;color:#6d8199;margin:8px 0 0">กรุณารอสักครู่ ไม่ต้องกดซ้ำ</p></div>';
    bpBusyFocus=document.activeElement;
    document.body.append(bpBusyLayer);bpBusyLayer.showModal();document.body.setAttribute('aria-busy','true');
    bpBusyLocked=[...document.body.children].filter(el=>el!==bpBusyLayer&&!['SCRIPT','STYLE'].includes(el.tagName)&&!el.inert);
    bpBusyLocked.forEach(el=>el.inert=true);
  }
  bpBusyLayer.querySelector('#bpBusyLabel').textContent=label||'กำลังโหลดข้อมูล…';
  let timer;
  try{return await Promise.race([Promise.resolve().then(task),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('ไม่ได้รับการยืนยันจากเซิร์ฟเวอร์ กรุณาตรวจข้อมูลก่อนลองใหม่')),60000);})]);}
  finally{clearTimeout(timer);if(!--bpBusyCount){bpBusyLocked.forEach(el=>el.inert=false);bpBusyLocked=[];bpBusyLayer?.remove();bpBusyLayer=null;document.body.removeAttribute('aria-busy');if(bpBusyFocus?.isConnected)bpBusyFocus.focus();}}
}
function bpActionLabel(action){return action==='logoutBP'?'กำลังออกจากระบบ…':['attendance','setBPPassword','linkBPLineIdToken','upsertOperationalRow','saveBranch','prepareEmployeeAccount','createMemberAccess','issueMemberCode','activateBPAccount','recoverBPAccount'].includes(action)?'กำลังบันทึกข้อมูล…':action==='requestBPLogin'?'กำลังส่งรหัสยืนยัน…':/login|verify/i.test(action)?'กำลังเข้าสู่ระบบ…':'กำลังโหลดข้อมูล…';}
async function bpRunRequest(action,task){
  if(action==='pollBPLineLogin')return task();
  try{
    const result=await bpWithBusy(bpActionLabel(action),task);
    if(['attendance','setBPPassword','linkBPLineIdToken','upsertOperationalRow','saveBranch','prepareEmployeeAccount'].includes(action))bpNotice('บันทึกข้อมูลสำเร็จ');
    return result;
  }catch(error){if(!String(error.message).includes('AUTH_REQUIRED'))bpNotice(error.message||'ทำรายการไม่สำเร็จ กรุณาลองใหม่',true);throw error;}
}
