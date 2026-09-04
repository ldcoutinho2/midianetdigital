const fs=require('fs'),path=require('path'),axios=require('axios');
const app=require('express/lib/application');
const og=app.get,op=app.post;
const ui=fs.readFileSync(path.join(__dirname,'dashboard-admin.html'),'utf8');

function ok(req){return req.query.senha===process.env.DASHBOARD_PASSWORD||req.headers['x-dashboard-password']===process.env.DASHBOARD_PASSWORD}
const H={apikey:process.env.SUPABASE_KEY,Authorization:'Bearer '+process.env.SUPABASE_KEY,'Content-Type':'application/json'};
const titles={
  'seguidores-brasileiros':'Seguidores Brasileiros','seguidores-mundiais':'Seguidores Mundiais','seguidores-organicos':'Seguidores Orgânicos',
  'curtidas-brasileiras':'Curtidas Brasileiras','visualizacoes':'Visualizações de Reels','comentarios':'Comentários',
  'engajamento-30-70':'30% BRASILEIROS + 70% Mundiais','engajamento-60-40':'60% BRASILEIROS + 40% Mundiais',
  'engajamento-br':'100% Brasileiros','engajamento-premium':'BR Premium Ativos'
};
const ids={
  'seguidores-brasileiros': '322','seguidores-mundiais':'321','seguidores-organicos':'250',
  'curtidas-brasileiras':'324','visualizacoes':'349','comentarios':'580'
};
const defaultPrices={
 'seguidores-brasileiros__250':1500,'seguidores-brasileiros__500':2500,'seguidores-brasileiros__1000':4500,'seguidores-brasileiros__2000':6500,'seguidores-brasileiros__3000':8500,'seguidores-brasileiros__4000':11000,'seguidores-brasileiros__5000':12500,'seguidores-brasileiros__10000':23500,
 'seguidores-mundiais__500':500,'seguidores-mundiais__1000':1000,'seguidores-mundiais__2000':2000,'seguidores-mundiais__3000':3000,'seguidores-mundiais__4000':4000,'seguidores-mundiais__5000':5000,'seguidores-mundiais__10000':10000,
 'seguidores-organicos__250':2490,'seguidores-organicos__500':4490,'seguidores-organicos__1000':7990,'seguidores-organicos__2000':13990,
 'curtidas-brasileiras__500':800,'curtidas-brasileiras__1000':1500,'curtidas-brasileiras__2500':3000,'curtidas-brasileiras__5000':5500,'curtidas-brasileiras__10000':10000,'curtidas-brasileiras__20000':20000,
 'visualizacoes__500':800,'visualizacoes__1000':1500,'visualizacoes__2500':3000,'visualizacoes__5000':5500,'visualizacoes__10000':10000,'visualizacoes__25000':25000,
 'engajamento-30-70__500':500,'engajamento-30-70__1000':1399,'engajamento-30-70__1500':2099,'engajamento-30-70__2000':2799,'engajamento-30-70__3000':4199,'engajamento-30-70__4000':5599,'engajamento-30-70__5000':6999,
 'engajamento-60-40__500':899,'engajamento-60-40__1000':1799,'engajamento-60-40__2000':3598,'engajamento-60-40__3000':5397,'engajamento-60-40__4000':7196,'engajamento-60-40__5000':8995,
 'engajamento-br__250':1500,'engajamento-br__500':2500,'engajamento-br__1000':4500,'engajamento-br__2000':6500,'engajamento-br__3000':8500,'engajamento-br__4000':11000,'engajamento-br__5000':12500,
 'engajamento-premium__500':8000,'engajamento-premium__1000':16000,'engajamento-premium__2000':32000,'engajamento-premium__3000':49700,'engajamento-premium__4000':65700,'engajamento-premium__5000':84700
};
function defaults(){
 const servicos={};
 for(const [chave,preco] of Object.entries(defaultPrices)){
   const [servico,plano]=chave.split('__');
   const combo=servico.startsWith('engajamento-');
   servicos[chave]={chave,servico,plano,qtd:plano,nome:titles[servico]||servico,id:combo?({ 'engajamento-30-70':'463','engajamento-60-40':'457'}[servico]||''):ids[servico]||'',custo:0,preco:Number(preco),ativo:true,destaque:false,descricao:'',icone:'📦',por:''};
 }
 return {servicos,anuncios:[]};
}
async function readConfig(){
 const base=defaults();
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_KEY)return base;
 try{
  const u=process.env.SUPABASE_URL+'/rest/v1/eventos?select=*&tipo=in.(config_servico,config_anuncio)&order=created_at.desc&limit=2000';
  const r=await axios.get(u,{headers:H}); const seen=new Set();
  for(const e of r.data||[]){
   try{const p=JSON.parse(e.nome||'{}');
    if(e.tipo==='config_servico'){
      const k=p.chave||(p.servico&&p.plano?p.servico+'__'+p.plano:''); if(!k||seen.has('s:'+k))continue;
      base.servicos[k]={...(base.servicos[k]||{}),...p,chave:k};seen.add('s:'+k);
    }else{
      const k=p.id||e.created_at;if(seen.has('a:'+k))continue;base.anuncios.push(p);seen.add('a:'+k);
    }
   }catch(_){}
  }
 }catch(e){console.error('[ADMIN CONFIG]',e.response?.data||e.message)}
 return base;
}
async function saveEvent(tipo,payload){
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_KEY)throw new Error('Supabase não configurado');
 await axios.post(process.env.SUPABASE_URL+'/rest/v1/eventos',{tipo,nome:JSON.stringify(payload),valor:0},{headers:{...H,Prefer:'return=minimal'}});
}

app.get=function(p,...h){
 if(p==='/dashboard')return og.call(this,p,(req,res)=>{if(req.query.usuario!=='admin'||!ok(req))return res.status(401).send('Não autorizado');res.send(ui)});
 if(p==='/admin/config')return og.call(this,p,async(req,res)=>{if(!ok(req))return res.status(401).json({error:'Não autorizado'});res.json(await readConfig())});
 if(p==='/admin/site-config')return og.call(this,p,async(req,res)=>{if(!ok(req))return res.status(401).json({error:'Não autorizado'});try{if(!process.env.SUPABASE_URL||!process.env.SUPABASE_KEY)return res.json({});const u=process.env.SUPABASE_URL+'/rest/v1/eventos?select=*&tipo=eq.config_site&order=created_at.desc&limit=1';const r=await axios.get(u,{headers:H});res.json(r.data&&r.data[0]?JSON.parse(r.data[0].nome||'{}'):{});}catch(e){res.status(500).json({error:'Erro ao carregar site'})}});
 return og.call(this,p,...h);
};
app.post=function(p,...h){
 if(p==='/admin/config/servico')return op.call(this,p,async(req,res)=>{if(!ok(req))return res.status(401).json({error:'Não autorizado'});try{const b=req.body||{};const item={chave:String(b.chave||((b.servico||'')+'__'+(b.plano||''))),servico:String(b.servico||''),plano:String(b.plano||''),qtd:String(b.qtd||b.plano||''),nome:String(b.nome||''),id:String(b.id||''),custo:Number(b.custo||0),preco:Math.round(Number(b.preco||0)),ativo:b.ativo!==false,destaque:b.destaque===true,descricao:String(b.descricao||''),icone:String(b.icone||'📦'),por:String(b.por||'')};if(!item.servico||!item.plano)return res.status(400).json({ok:false,error:'Serviço e pacote são obrigatórios'});await saveEvent('config_servico',item);res.json({ok:true,item});}catch(e){res.status(500).json({ok:false,error:e.message||'Erro'})}});
 if(p==='/admin/config/anuncio')return op.call(this,p,async(req,res)=>{if(!ok(req))return res.status(401).json({error:'Não autorizado'});try{const b=req.body||{};const item={id:b.id||Date.now().toString(),data:String(b.data||new Date().toISOString().slice(0,10)),plataforma:String(b.plataforma||'Meta Ads'),campanha:String(b.campanha||''),valor:Number(b.valor||0)};if(!item.data||item.valor<=0)return res.status(400).json({ok:false,error:'Data e investimento são obrigatórios'});await saveEvent('config_anuncio',item);res.json({ok:true,item});}catch(e){res.status(500).json({ok:false,error:e.message||'Erro'})}});
 if(p==='/admin/site-config')return op.call(this,p,async(req,res)=>{if(!ok(req))return res.status(401).json({error:'Não autorizado'});try{const b={nome:String(req.body?.nome||''),whatsapp:String(req.body?.whatsapp||''),horario:String(req.body?.horario||''),garantia:String(req.body?.garantia||''),texto:String(req.body?.texto||'')};await saveEvent('config_site',b);res.json({ok:true,item:b});}catch(e){res.status(500).json({ok:false,error:e.message||'Erro'})}});
 return op.call(this,p,...h);
};