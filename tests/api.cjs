const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const handler=require('../api/employee.js');
const origin='https://bp-checkin.example',secret='test-only-'+ 'x'.repeat(40),session='a'.repeat(72);
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(v){this.statusCode=v;return this;},json(v){this.body=v;return this;}};}
async function call(body,headers={origin}){const res=response();await handler({method:'POST',headers,body},res);return res;}
test('API bridge and HttpOnly session isolation',async t=>{
  const oldFetch=global.fetch,oldEnv={...process.env};
  process.env.APP_ORIGIN=origin;process.env.BP_API_SECRET=secret;process.env.GAS_WEB_APP_URL='https://script.google.com/macros/s/test/exec';
  let outgoing;
  global.fetch=async(url,options)=>{outgoing=JSON.parse(options.body);return {ok:true,text:async()=>JSON.stringify({ok:true,data:{token:session,user:{Role:'BP_STAFF'}}})};};
  try{
    await t.test('Cross-origin request rejected',async()=>assert.equal((await call({action:'loginBPPassword',args:[]},{origin:'https://evil.example'})).statusCode,403));
    await t.test('Admin API action rejected',async()=>assert.equal((await call({action:'saveBranch',args:[]})).statusCode,400));
    await t.test('Attendance requires session cookie',async()=>assert.equal((await call({action:'attendance',args:[]})).statusCode,401));
    await t.test('Password setup requires verified session cookie',async()=>assert.equal((await call({action:'setBPPassword',args:['staff','LongPassword123!']})).statusCode,401));
    await t.test('Password setup forwards cookie, never a client supplied token',async()=>{
      const result=await call({action:'setBPPassword',args:['staff','LongPassword123!'],token:'forged'},{origin,cookie:'__Host-bp-session='+session});
      assert.equal(result.statusCode,200);assert.equal(JSON.parse(outgoing.payload).token,session);
    });
    await t.test('Login sets Secure HttpOnly cookie and strips token',async()=>{
      const res=await call({action:'loginBPPassword',args:['user','password']});assert.equal(res.statusCode,200);assert.match(res.headers['Set-Cookie'],/HttpOnly; Secure; SameSite=Lax/);assert.equal(res.body.data.token,undefined);assert.ok(!JSON.stringify(res.body).includes(session));
      assert.equal(outgoing.signature,crypto.createHmac('sha256',secret).update(outgoing.payload).digest('hex'));assert.equal(JSON.parse(outgoing.payload).action,'loginBPPassword');
    });
    await t.test('Session token forwarded only server to server',async()=>{
      await call({action:'getAttendanceData',args:[]},{origin,cookie:'__Host-bp-session='+session});assert.equal(JSON.parse(outgoing.payload).token,session);
    });
    await t.test('Expired session clears browser cookie',async()=>{
      global.fetch=async()=>({ok:true,text:async()=>JSON.stringify({ok:false,error:'AUTH_REQUIRED: expired'})});const res=await call({action:'getAttendanceData',args:[]},{origin,cookie:'__Host-bp-session='+session});assert.equal(res.statusCode,401);assert.match(res.headers['Set-Cookie'],/Max-Age=0/);
    });
    await t.test('HTML upstream response handled safely',async()=>{
      global.fetch=async()=>({ok:true,text:async()=>'<html>Login</html>'});assert.equal((await call({action:'requestBPLogin',args:['test@example.com']})).statusCode,502);
    });
  }finally{global.fetch=oldFetch;for(const key of Object.keys(process.env))if(!(key in oldEnv))delete process.env[key];Object.assign(process.env,oldEnv);}
});
