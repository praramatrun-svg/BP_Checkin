const {createHmac,randomUUID}=require('node:crypto');
const COOKIE='__Host-bp-session';
const LOGIN=new Set(['loginBPLineIdToken','loginBPPassword','setBPPassword']);
const ALLOWED=new Set([...LOGIN,'getBPRegistrationOptions','registerBPAccount','requestBPPasswordReset','setBPPassword','getAttendanceData','getBPAttendanceHistory','getBPAccountState','linkBPLineIdToken','attendance','logoutBP']);
function cookieToken(req){const part=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));return part?part.slice(COOKIE.length+1):'';}
function sessionCookie(token){return COOKIE+'='+token+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age='+(token?21600:0);}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  const production=process.env.APP_ORIGIN||(process.env.VERCEL_PROJECT_PRODUCTION_URL?'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL:'');
  if(!production||req.headers.origin!==production)return res.status(403).json({error:'Origin not allowed'});
  try{
    const secret=process.env.BP_API_SECRET,url=process.env.GAS_WEB_APP_URL;
    if(!secret||secret.length<32||!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url||''))return res.status(503).json({error:'ยังไม่ได้ตั้งค่าการเชื่อมต่อระบบ'});
    let body=req.body;if(typeof body==='string'){if(body.length>16000)throw Error('คำขอใหญ่เกินกำหนด');body=JSON.parse(body);}
    if(!body||JSON.stringify(body).length>16000||!ALLOWED.has(body.action)||!Array.isArray(body.args)||body.args.length>3)return res.status(400).json({error:'คำขอไม่ถูกต้อง'});
    const token=cookieToken(req);
    if(['setBPPassword','getAttendanceData','getBPAttendanceHistory','getBPAccountState','linkBPLineIdToken','attendance','logoutBP'].includes(body.action)&&!token)return res.status(401).json({error:'AUTH_REQUIRED: กรุณาเข้าสู่ระบบ'});
    // Keep signed text and its HTTP envelope ASCII-only; JSON.parse restores Unicode.
    const payload=JSON.stringify({timestamp:Date.now(),nonce:randomUUID(),action:body.action,args:body.args,token,sessionProtocol:2}).replace(/[\u007f-\uffff]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));
    const signature=createHmac('sha256',secret).update(payload,'utf8').digest('hex');
    const upstream=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({payload,signature}),redirect:'follow',signal:AbortSignal.timeout(45000)});
    const text=await upstream.text();let envelope;try{envelope=JSON.parse(text);}catch{throw Error('Backend ไม่ตอบกลับเป็นข้อมูล กรุณาตรวจ Deployment Apps Script');}
    if(!upstream.ok||!envelope.ok){const error=String(envelope.error||'เชื่อมต่อ Backend ไม่สำเร็จ');if(error.includes('AUTH_REQUIRED')){res.setHeader('Set-Cookie',sessionCookie(''));return res.status(401).json({error});}return res.status(400).json({error});}
    const data=envelope.data;
    if(['registerBPAccount','requestBPPasswordReset'].includes(body.action))return res.status(200).json({ok:true,data:{status:data.status||'PENDING',message:data.message||'รอผู้ดูแลอนุมัติ'}});
    if(LOGIN.has(body.action)){
      if(!/^[a-f0-9-]{72}$/i.test(String(data?.token||'')))throw Error('เซสชันไม่ถูกต้อง');
      res.setHeader('Set-Cookie',sessionCookie(data.token));return res.status(200).json({ok:true,data:{user:data.user}});
    }
    if(body.action==='logoutBP')res.setHeader('Set-Cookie',sessionCookie(''));
    return res.status(200).json({ok:true,data});
  }catch(error){return res.status(502).json({error:error.name==='TimeoutError'?'ระบบใช้เวลาตอบกลับนาน กรุณาลองใหม่':String(error.message||'เชื่อมต่อระบบไม่สำเร็จ')});}
};
