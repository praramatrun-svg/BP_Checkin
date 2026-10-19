let loginPending=null;
async function api(action,...args){
  const response=await fetch('/api/employee',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({action,args})});
  const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'เชื่อมต่อระบบไม่สำเร็จ');return result.data;
}
async function bpServerCall(action,...args){
  if(!['getAttendanceData','attendance'].includes(action))throw Error('ไม่รองรับคำสั่งนี้');
  try{return await api(action,...args);}catch(error){if(!error.message.includes('AUTH_REQUIRED'))throw error;await ensureLogin();return api(action,...args);}
}
function ensureLogin(){
  if(loginPending)return loginPending;
  loginPending=new Promise(resolve=>{
    const layer=document.createElement('div');layer.className='bp-login-layer';
    layer.innerHTML=`<section class="bp-login-card" data-chooser-ready="true" aria-label="เข้าสู่ระบบ"><img class="bp-login-logo" src="/assets/brand-1.jpeg" alt="Honda Maliwan"><h1>เข้าสู่ระบบ</h1><p class="bp-login-description">เลือกวิธีเข้าใช้งานที่สะดวก</p><div class="bp-login-tabs"><button type="button" data-method="line"><strong>LINE</strong><span>เข้าใช้งานด้วยบัญชี LINE</span></button><button type="button" data-method="email"><strong>อีเมล</strong><span>รับรหัส OTP 6 หลัก</span></button><button type="button" data-method="password"><strong>ชื่อผู้ใช้และรหัสผ่าน</strong><span>สำหรับบัญชีที่ตั้งรหัสผ่านแล้ว</span></button></div><form id="emailForm" hidden><button type="button" class="bp-method-back">← เลือกวิธีอื่น</button><label>อีเมล<div class="bp-login-input"><input name="email" type="email" required autocomplete="email" placeholder="name@gmail.com"></div></label><button type="button" class="bp-request-code">ส่งรหัสทางอีเมล</button><label>รหัส 6 หลัก<div class="bp-login-input"><input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autocomplete="one-time-code" placeholder="000000"></div></label><button type="submit" class="bp-login-submit">เข้าสู่ระบบ</button></form><form id="passwordForm" hidden><button type="button" class="bp-method-back">← เลือกวิธีอื่น</button><label>ชื่อผู้ใช้<div class="bp-login-input"><input name="username" autocomplete="username" required></div></label><label>รหัสผ่าน<div class="bp-login-input"><input name="password" type="password" autocomplete="current-password" required></div></label><button type="submit" class="bp-login-submit">เข้าสู่ระบบ</button></form><div id="lineForm" hidden><button type="button" class="bp-method-back">← เลือกวิธีอื่น</button><p class="bp-login-hint">อนุญาตให้ระบบใช้บัญชี LINE เพื่อยืนยันตัวตนและจับคู่พนักงาน</p><button type="button" class="bp-line-login">ยินยอมและเข้าสู่ระบบด้วย LINE</button></div><p class="bp-login-message" role="status" aria-live="polite"></p></section>`;
    document.body.append(layer);
    const passwordPanel=layer.querySelector('#passwordForm');
    passwordPanel.insertAdjacentHTML('beforeend','<div class="bp-account-links"><button type="button" data-account="register">สมัครสมาชิก</button><button type="button" data-account="reset">ลืมรหัสผ่าน?</button></div>');
    const accountForm=document.createElement('form');accountForm.id='accountForm';accountForm.hidden=true;
    accountForm.innerHTML=`<button type="button" class="bp-method-back">← เลือกวิธีอื่น</button><h2 class="bp-account-title"></h2><p class="bp-login-hint">ใช้อีเมลพนักงานที่ผู้ดูแลอนุญาต ยืนยัน OTP ก่อนตั้งรหัสผ่าน</p><label>อีเมลพนักงาน<div class="bp-login-input"><input name="email" type="email" autocomplete="email" required placeholder="name@gmail.com"></div></label><button type="button" class="bp-request-code">ส่งรหัสยืนยันทางอีเมล</button><label>รหัส OTP 6 หลัก<div class="bp-login-input"><input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required placeholder="000000"></div></label><label>ชื่อผู้ใช้<div class="bp-login-input"><input name="username" pattern="[a-zA-Z0-9._-]{3,40}" minlength="3" maxlength="40" autocomplete="username" required placeholder="ตัวอักษรอังกฤษหรือตัวเลข 3–40 ตัว"></div></label><label>รหัสผ่านใหม่<div class="bp-login-input"><input name="password" type="password" minlength="12" autocomplete="new-password" required placeholder="อย่างน้อย 12 ตัวอักษร"></div></label><label>ยืนยันรหัสผ่าน<div class="bp-login-input"><input name="confirm" type="password" minlength="12" autocomplete="new-password" required></div></label><button type="submit" class="bp-login-submit">ยืนยันและบันทึกรหัสผ่าน</button>`;
    passwordPanel.after(accountForm);
    const card=layer.querySelector('.bp-login-card'),message=layer.querySelector('[role=status]'),email=layer.querySelector('#emailForm'),password=layer.querySelector('#passwordForm');
    function choose(method){card.dataset.method=method;for(const name of ['email','password','line','account'])layer.querySelector('#'+name+'Form').hidden=name!==method;message.textContent='';(method?layer.querySelector('#'+method+'Form input, #'+method+'Form .bp-line-login'):layer.querySelector('[data-method=line]'))?.focus();}
    const finish=()=>{layer.remove();loginPending=null;resolve();};
    async function run(button,fn){button.disabled=true;message.textContent='กำลังตรวจสอบ…';try{await fn();}catch(e){message.textContent=e.message;}finally{button.disabled=false;}}
    layer.querySelectorAll('.bp-login-tabs button').forEach(button=>button.onclick=()=>choose(button.dataset.method));
    layer.querySelectorAll('.bp-method-back').forEach(button=>button.onclick=()=>choose(''));
    layer.querySelectorAll('[data-account]').forEach(button=>button.onclick=()=>{accountForm.reset();accountForm.querySelector('h2').textContent=button.dataset.account==='register'?'สมัครสมาชิก':'ตั้งรหัสผ่านใหม่';choose('account');});
    accountForm.querySelector('.bp-request-code').onclick=e=>{if(!accountForm.elements.email.reportValidity())return;run(e.currentTarget,async()=>{const data=await api('requestBPLogin',accountForm.elements.email.value);message.textContent=data.message;accountForm.elements.code.focus();});};
    accountForm.onsubmit=e=>{e.preventDefault();const fields=accountForm.elements;if(fields.password.value!==fields.confirm.value){message.textContent='รหัสผ่านทั้งสองช่องไม่ตรงกัน';fields.confirm.focus();return;}run(accountForm.querySelector('[type=submit]'),async()=>{await api('verifyBPLogin',fields.email.value,fields.code.value);await api('setBPPassword',fields.username.value,fields.password.value);fields.password.value='';fields.confirm.value='';finish();});};
    email.querySelector('.bp-request-code').onclick=e=>{if(!email.elements.email.reportValidity())return;run(e.currentTarget,async()=>{const data=await api('requestBPLogin',email.elements.email.value);message.textContent=data.message;email.elements.code.focus();});};
    email.onsubmit=e=>{e.preventDefault();run(email.querySelector('[type=submit]'),async()=>{await api('verifyBPLogin',email.elements.email.value,email.elements.code.value);finish();});};
    password.onsubmit=e=>{e.preventDefault();run(password.querySelector('[type=submit]'),async()=>{await api('loginBPPassword',password.elements.username.value,password.elements.password.value);finish();});};
    layer.querySelector('.bp-line-login').onclick=e=>run(e.currentTarget,async()=>{
      if(!window.liff)throw Error('โหลด LINE ไม่สำเร็จ กรุณาเปิดหน้าใหม่');
      await liff.init({liffId:window.BP_LIFF_ID});
      if(!liff.isLoggedIn()){liff.login({redirectUri:location.origin+'/'});return;}
      const token=liff.getIDToken();if(!token)throw Error('กรุณาเปิดใช้งาน scope openid ใน LIFF');
      await api('loginBPLineIdToken',token);finish();
    });
    choose('');
  });return loginPending;
}
