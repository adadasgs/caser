const express=require("express"),fs=require("fs"),path=require("path");
const app=express(),PORT=process.env.PORT||3000,DIR=process.env.DATA_DIR||path.join(__dirname,"data"),FILE=path.join(DIR,"agents.json");
fs.mkdirSync(DIR,{recursive:true});app.use(express.json({limit:"256kb"}));app.use(express.static(path.join(__dirname,"public")));
let db={};try{db=JSON.parse(fs.readFileSync(FILE,"utf8"))}catch{}
let chain=Promise.resolve();function persist(){const s=JSON.stringify(db);chain=chain.then(()=>{const t=FILE+".tmp";fs.writeFileSync(t,s);fs.renameSync(t,FILE)});return chain}
const valid=id=>typeof id==="string"&&/^[a-zA-Z0-9_-]{8,100}$/.test(id);
function clean(s){s=s&&typeof s==="object"?s:{};return{balance:Math.max(0,Math.min(1e9,Math.floor(Number(s.balance)||0))),items:Array.isArray(s.items)?s.items.slice(0,500).map(x=>[String(x?.[0]||"Предмет").slice(0,100),String(x?.[1]||"🎁").slice(0,12),Math.max(0,Math.min(1e9,Math.floor(Number(x?.[2])||0)))]):[],name:String(s.name||"ShadowFox").replace(/[<>]/g,"").slice(0,40),avatar:String(s.avatar||"🥷").slice(0,12)}}
app.get("/api/health",(_,r)=>r.json({ok:true,service:"КЕЙСЕР"}));
app.get("/api/state/:id",(q,r)=>{if(!valid(q.params.id))return r.status(400).json({error:"bad id"});r.json({state:db[q.params.id]||null})});
app.put("/api/state/:id",async(q,r)=>{if(!valid(q.params.id))return r.status(400).json({error:"bad id"});db[q.params.id]=clean(q.body);try{await persist();r.json({ok:true})}catch(e){console.error(e);r.status(500).json({error:"save failed"})}});
app.get("*",(_,r)=>r.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log("КЕЙСЕР listening on "+PORT));