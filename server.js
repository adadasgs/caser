const express=require("express"),fs=require("fs"),path=require("path");
const app=express(),PORT=process.env.PORT||3000,DIR=process.env.DATA_DIR||path.join(__dirname,"data"),FILE=path.join(DIR,"agents.json");
fs.mkdirSync(DIR,{recursive:true});app.use(express.json({limit:"256kb"}));app.use(express.static(path.join(__dirname,"public")));
let db={};try{db=JSON.parse(fs.readFileSync(FILE,"utf8"))}catch{}
const presence=new Map(),activity=[];
const now=()=>Date.now();
function cleanPresence(){const cutoff=now()-45000;for(const [id,ts] of presence)if(ts<cutoff)presence.delete(id)}
app.post("/api/presence/:id",(q,r)=>{if(!valid(q.params.id))return r.status(400).json({error:"bad id"});presence.set(q.params.id,now());cleanPresence();r.json({ok:true,count:presence.size})});
app.get("/api/online",(_,r)=>{cleanPresence();r.json({count:presence.size})});
app.post("/api/activity/:id",(q,r)=>{const id=q.params.id;if(!valid(id))return r.status(400).json({error:"bad id"});const last=activity.find(x=>x.id===id);if(last&&now()-last.ts<1800)return r.status(429).json({error:"rate limited"});const b=q.body||{},name=String(db[id]?.name||"Игрок").replace(/[<>]/g,"").slice(0,40),item=String(b.item||"").replace(/[<>]/g,"").slice(0,100),image=String(b.image||"");let safeImage="";try{const u=new URL(image);if(u.protocol==="https:"&&(u.hostname==="caser.one"||u.hostname==="s3.caser.gg"))safeImage=u.href}catch{}if(!item)return r.status(400).json({error:"item required"});activity.unshift({id,name,item,image:safeImage,price:Math.max(0,Math.min(1e9,Number(b.price)||0)),ts:now()});activity.splice(20);r.json({ok:true})});
app.get("/api/activity",(_,r)=>r.json({items:activity.slice(0,12).map(({id,name,item,image,price,ts})=>({id,name,item,image,price,ts}))}));
let chain=Promise.resolve();function persist(){const s=JSON.stringify(db);chain=chain.then(()=>{const t=FILE+".tmp";fs.writeFileSync(t,s);fs.renameSync(t,FILE)});return chain}
const valid=id=>typeof id==="string"&&/^[a-zA-Z0-9_-]{8,100}$/.test(id);
function clean(s){s=s&&typeof s==="object"?s:{};return{balance:Math.max(0,Math.min(1e9,Math.floor(Number(s.balance)||0))),items:Array.isArray(s.items)?s.items.slice(0,500).map(x=>{let image="";try{const u=new URL(String(x?.[4]||""));if(u.protocol==="https:"&&(u.hostname==="caser.one"||u.hostname==="s3.caser.gg"))image=u.href}catch{}return[String(x?.[0]||"Предмет").slice(0,100),String(x?.[1]||"ITEM").slice(0,24),Math.max(0,Math.min(1e9,Math.floor(Number(x?.[2])||0))),String(x?.[3]||"common").slice(0,20),image]}):[],name:String(s.name||"ShadowFox").replace(/[<>]/g,"").slice(0,40),avatar:String(s.avatar||"🥷").slice(0,12)}}
app.get("/api/health",(_,r)=>r.json({ok:true,service:"КЕЙСЕР"}));
app.get("/api/state/:id",(q,r)=>{if(!valid(q.params.id))return r.status(400).json({error:"bad id"});r.json({state:db[q.params.id]||null})});
app.put("/api/state/:id",async(q,r)=>{if(!valid(q.params.id))return r.status(400).json({error:"bad id"});db[q.params.id]=clean(q.body);try{await persist();r.json({ok:true})}catch(e){console.error(e);r.status(500).json({error:"save failed"})}});
app.get("*",(_,r)=>r.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log("КЕЙСЕР listening on "+PORT));