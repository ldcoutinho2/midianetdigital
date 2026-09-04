(() => {
'use strict';
const senha=new URLSearchParams(location.search).get('senha')||'';
let cfg={servicos:{},anuncios:[],site:{}}, data=null, editingSlug='';
const $=id=>document.getElementById(id);
const titles={
 dashboard:['Dashboard','Visão geral da operação'],
 services:['Serviços','Crie, edite e publique seus serviços'],
 plans:['Preços & Planos','Controle preços, custos e destaques'],
 ids:['IDs / Provedor','Gerencie os IDs usados nas novas vendas'],
 ads:['Anúncios','Registre investimento por dia e campanha'],
 orders:['Pedidos','Acompanhe Pix e vendas registradas'],
 site:['Site','Edite informações públicas sem código'],
 integrations:['Integrações','Status das conexões']
};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const localDate=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const api=(u,o={})=>{o.headers=Object.assign({'X-Dashboard-Password':senha,'Content-Type':'application/json'},o.headers||{});o.cache='no-store';return fetch(u,o)};
function toast(t){const el=$('toast');if(!el)return;el.textContent=t;el.classList.add('on');setTimeout(()=>el.classList.remove('on'),2200)}
function show(id){
 document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('on',b.dataset.s===id));
 document.querySelectorAll('.section').forEach(s=>s.classList.toggle('on',s.id===id));
 if(titles[id]){$('title').textContent=titles[id][0];$('subtitle').textContent=titles[id][1]}
 if(id==='services')renderServices();
 if(id==='plans')renderPlans();
 if(id==='ids')renderIds();
 if(id==='ads'){renderAds();adSummary()}
 if(id==='site')loadSite();
 if(id==='integrations')health();
 history.replaceState(null,'','#'+id);
}
window.show=show;
document.addEventListener('click',e=>{const b=e.target.closest('.nav');if(b){e.preventDefault();show(b.dataset.s)}});
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(titles[id])show(id)});
function preset(){
 const p=$('preset').value,h=new Date(),a=new Date(h),b=new Date(h);
 if(p==='yesterday'){a.setDate(h.getDate()-1);b.setDate(h.getDate()-1)}
 else if(p==='7')a.setDate(h.getDate()-6);
 else if(p==='30')a.setDate(h.getDate()-29);
 else if(p==='month')a.setDate(1);
 if(p!=='custom'){$('start').value=localDate(a);$('end').value=localDate(b);dashboard()}
}
window.preset=preset;
function chart(id,vals,labels,stroke){
 const el=$(id);if(!el)return;
 const w=720,h=235,p={l:32,r:10,t:15,b:27},iw=w-p.l-p.r,ih=h-p.t-p.b,max=Math.max(1,...vals);
 const step=labels.length>1?iw/(labels.length-1):iw/2;let s='';
 for(let i=0;i<4;i++){const y=p.t+ih*i/3;s+=`<line x1="${p.l}" y1="${y}" x2="${w-p.r}" y2="${y}" stroke="#193149"/>`}
 const pts=vals.map((v,i)=>[p.l+(labels.length>1?step*i:iw/2),p.t+ih-(v/max)*ih]);
 if(pts.length){const path=pts.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' ');s+=`<path d="${path}" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>`;pts.forEach(q=>s+=`<circle cx="${q[0]}" cy="${q[1]}" r="3.5" fill="${stroke}"/>`)}
 labels.forEach((x,i)=>{if(i%Math.max(1,Math.ceil(labels.length/7))===0)s+=`<text x="${p.l+(labels.length>1?step*i:iw/2)}" y="${h-6}" text-anchor="middle" fill="#667b91" font-size="10">${esc(x)}</text>`});
 el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${s}</svg>`;
}
async function dashboard(){
 try{
  const r=await fetch('/dashboard-data?senha='+encodeURIComponent(senha)+'&start='+encodeURIComponent($('start').value)+'&end='+encodeURIComponent($('end').value)+'&_='+Date.now(),{cache:'no-store'});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Erro no dashboard');data=d;
  $('v').textContent=d.visitantes||0;$('sv').textContent=d.servicos||0;$('pl').textContent=d.planos||0;$('co').textContent=d.checkout||0;$('px').textContent=d.pix||0;$('sales').textContent=d.vendas||0;$('fat').textContent=d.faturamentoFormatado||money(0);$('conv').textContent=Number(d.conversaoGeral||0).toFixed(2).replace('.',',')+'%';
  const days=Object.entries(d.dias||{}),labels=days.map(x=>x[0].slice(0,5));chart('visChart',days.map(x=>x[1].visitantes||0),labels,'#1683ff');chart('salesChart',days.map(x=>x[1].vendas||0),labels,'#7546ff');
  const z=d.funil||{},steps=[['Visitante → Serviço',d.visitantes,d.servicos,z.visitanteServico,z.quedaVisitanteServico],['Serviço → Plano',d.servicos,d.planos,z.servicoPlano,z.quedaServicoPlano],['Plano → Checkout',d.planos,d.checkout,z.planoCheckout,z.quedaPlanoCheckout],['Checkout → Pix',d.checkout,d.pix,z.checkoutPix,z.quedaCheckoutPix],['Pix → Venda',d.pix,d.vendas,z.pixVenda,z.quedaPixVenda]];
  $('funnel').innerHTML=steps.map(s=>`<div class="frow"><span>${s[0]}</span><div><div class="bar"><div class="fill" style="width:${Math.min(100,Number(s[1]||0)?Number(s[2]||0)/Number(s[1])*100:0)}%"></div></div><small class="muted">${esc(s[3]||'0%')}</small></div><b>${s[2]||0} <span style="color:#ff626b">↓${esc(s[4]||'0%')}</span></b></div>`).join('');
  $('loss').textContent=d.maiorGargalo&&d.maiorGargalo!=='Sem dados'?'Maior perda: '+d.maiorGargalo+' '+d.maiorGargaloPercentual:'';
  const f=d.financeiro||{};$('finance').innerHTML=[['Custo dos serviços',money((f.custosServicos||0)/100),''],['Anúncios',money((f.investimentoAds||0)/100),'negative'],['Lucro antes dos anúncios',money((f.lucroBruto||0)/100),'positive'],['Lucro líquido',money((f.lucroLiquido||0)/100),'positive'],['ROAS',Number(f.roas||0).toFixed(2).replace('.',',')+'x','yellow'],['Margem líquida',Number(f.margem||0).toFixed(2).replace('.',',')+'%','yellow']].map(x=>`<div class="money"><strong class="${x[2]}">${x[1]}</strong><small>${x[0]}</small></div>`).join('');
  rank('topServices',Object.entries(d.servicosDetalhes||{}));rank('topPlans',Object.entries(d.planosDetalhes||{}));
  $('daily').innerHTML=days.slice().reverse().slice(0,8).map(x=>`<div class="row"><span>${esc(x[0])}</span><b>${x[1].vendas||0} vendas • ${money((x[1].faturamento||0)/100)}</b></div>`).join('')||'<div class="empty">Nenhum dado</div>';
  $('pixList').innerHTML=(d.pixDetalhes||[]).slice(0,8).map(x=>`<div class="row"><span>${esc(x.hora)}<br><small>${esc(x.info)}</small></span><b>${esc(x.valor)}</b></div>`).join('')||'<div class="empty">Nenhum Pix</div>';
  $('salesList').innerHTML=(d.vendasDetalhes||[]).slice(0,8).map(x=>`<div class="row"><span>${esc(x.hora)}<br><small>${esc(x.info)}</small></span><b>${esc(x.valor)}</b></div>`).join('')||'<div class="empty">Nenhuma venda</div>';
  $('ordersTable').innerHTML=[...(d.pixDetalhes||[]).map(x=>({tipo:'Pix',...x})),...(d.vendasDetalhes||[]).map(x=>({tipo:'Venda',...x}))].slice(0,80).map(x=>`<tr><td>${esc(x.hora)}</td><td><span class="pill">${x.tipo}</span></td><td>${esc(x.info)}</td><td><b>${esc(x.valor)}</b></td></tr>`).join('')||'<tr><td colspan="4"><div class="empty">Nenhum evento</div></td></tr>';
  adSummary();
 }catch(e){toast('Dashboard: '+e.message)}
}
window.dashboard=dashboard;
function rank(id,a){a=a.sort((x,y)=>y[1]-x[1]).slice(0,7);$(id).innerHTML=a.length?a.map((x,i)=>`<div class="rankrow"><span class="ranknum">${i+1}</span><div><b style="font-size:10px">${esc(x[0])}</b><div class="progress"><span style="width:${Math.min(100,x[1]/Math.max(1,a[0][1])*100)}%"></span></div></div><b>${x[1]}</b></div>`).join(''):'<div class="empty">Nenhum dado</div>'}
async function loadConfig(){
 try{const r=await api('/admin/config'),j=await r.json();if(!r.ok)throw Error(j.error||'Não autorizado');cfg=j;cfg.servicos=cfg.servicos||{};cfg.anuncios=cfg.anuncios||[];cfg.site=cfg.site||{};renderServices();renderPlans();renderIds();renderAds()}
 catch(e){toast('Configuração: '+e.message)}
}
function groups(){const g={};Object.values(cfg.servicos||{}).forEach(x=>{(g[x.servico]??=[]).push(x)});return g}
function renderServices(){
 const q=($('serviceSearch')?.value||'').toLowerCase(),flt=$('serviceFilter')?.value||'all',g=groups();let out='';
 Object.entries(g).sort((a,b)=>Number(a[1][0].ordem||100)-Number(b[1][0].ordem||100)).forEach(([slug,items])=>{
  const arr=items.filter(x=>(slug+' '+x.nome+' '+x.plano+' '+x.qtd).toLowerCase().includes(q)&&(flt==='all'||(flt==='active'?x.ativo!==false:x.ativo===false)));if(!arr.length)return;const base=items[0];
  out+=`<div class="service" draggable="true" data-service-slug="${esc(slug)}"><div class="servicehead"><div class="serviceinfo"><span class="drag" title="Arraste para ordenar">☰</span><div class="serviceicon">${esc(base.icone||'📦')}</div><div><b>${esc(base.nome||slug)}</b><small>${esc(slug)} • ${items.length} pacote(s)</small></div></div><div class="service-actions"><span class="pill ${items.some(x=>x.ativo!==false)?'':'off'}">${items.some(x=>x.ativo!==false)?'Ativo':'Off'}</span><button class="btn" onclick="editService('${esc(slug)}')">✎ Editar serviço</button></div></div><div class="packages">${arr.map(packageCard).join('')}</div></div>`;
 });$('servicesList').innerHTML=out||'<div class="empty">Nenhum serviço encontrado.</div>';
 const list=$('servicesList'); let dragSlug=null;
 list.querySelectorAll('.service').forEach(el=>{
   el.addEventListener('dragstart',()=>{dragSlug=el.dataset.serviceSlug;el.classList.add('dragging')});
   el.addEventListener('dragend',()=>{el.classList.remove('dragging');list.querySelectorAll('.service').forEach(x=>x.classList.remove('drag-over'));});
   el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drag-over')});
   el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
   el.addEventListener('drop',async e=>{e.preventDefault();el.classList.remove('drag-over');if(!dragSlug||dragSlug===el.dataset.serviceSlug)return;
     const nodes=[...list.querySelectorAll('.service')],from=nodes.findIndex(n=>n.dataset.serviceSlug===dragSlug),to=nodes.findIndex(n=>n.dataset.serviceSlug===el.dataset.serviceSlug);if(from<0||to<0)return;
     const target=nodes.splice(from,1)[0];nodes.splice(to,0,target);
     const itens=[];nodes.forEach((n,i)=>(groups()[n.dataset.serviceSlug]||[]).forEach(x=>itens.push({chave:x.chave,ordem:i+1})));
     try{const r=await api('/admin/config/ordem',{method:'POST',body:JSON.stringify({itens})}),j=await r.json();if(!j.ok)throw Error(j.error||'Erro');itens.forEach(it=>{if(cfg.servicos[it.chave])cfg.servicos[it.chave].ordem=it.ordem});renderServices();toast('Ordem salva');}catch(err){toast(err.message)}
   });
 });
}
function packageCard(x){const k=esc(x.chave);return `<div class="package"><div class="ptop"><div><b>${esc(x.plano||x.qtd)}</b><br><small>${esc(x.qtd||x.plano)} • ID ${esc(x.id||'—')}</small></div><span class="pill ${x.ativo===false?'off':''}">${x.ativo===false?'Off':'Ativo'}</span></div><div class="pfields"><div class="field"><label>Nome</label><input id="pn_${k}" class="input" value="${esc(x.nome||'')}"></div><div class="field"><label>Quantidade</label><input id="pq_${k}" class="input" value="${esc(x.qtd||x.plano||'')}"></div><div class="field"><label>Preço R$</label><input id="pp_${k}" class="input" type="number" step=".01" value="${(Number(x.preco||0)/100).toFixed(2)}"></div><div class="field"><label>Custo R$</label><input id="pc_${k}" class="input" type="number" step=".01" value="${Number(x.custo||0)}"></div><div class="field wide"><label>Descrição</label><input id="pd_${k}" class="input" value="${esc(x.descricao||'')}"></div></div><div class="checks"><label><input id="ph_${k}" type="checkbox" ${x.destaque?'checked':''}> Destaque</label><label><input id="pa_${k}" type="checkbox" ${x.ativo!==false?'checked':''}> Publicado</label></div><div style="text-align:right"><button class="btn primary" onclick="savePackage('${k}')">Salvar pacote</button></div></div>`}
function get(k){return cfg.servicos[k]||Object.values(cfg.servicos||{}).find(x=>x.chave===k)}
async function savePayload(x){const r=await api('/admin/config/servico',{method:'POST',body:JSON.stringify(x)}),j=await r.json();if(!j.ok)throw Error(j.error||'Erro ao salvar');cfg.servicos[x.chave]=j.item;toast('Salvo com sucesso');renderServices();renderPlans();renderIds();dashboard()}
async function savePackage(k){const x=get(k);if(!x)return;try{await savePayload({...x,chave:k,nome:$('pn_'+k).value,qtd:$('pq_'+k).value,preco:Math.round(Number($('pp_'+k).value||0)*100),custo:Number($('pc_'+k).value||0),descricao:$('pd_'+k).value,destaque:$('ph_'+k).checked,ativo:$('pa_'+k).checked})}catch(e){toast(e.message)}}
window.savePackage=savePackage;
function editService(slug){const it=groups()[slug]||[];if(!it.length)return;editingSlug=slug;$('mname').value=it[0].nome||'';$('micon').value=it[0].icone||'📦';$('mdesc').value=it[0].descricao||'';$('mactive').value=it.some(x=>x.ativo!==false)?'1':'0';$('modal').classList.add('on')}
window.editService=editService;
async function saveServiceMeta(){const it=groups()[editingSlug]||[],name=$('mname').value.trim(),icon=$('micon').value.trim()||'📦',desc=$('mdesc').value.trim(),active=$('mactive').value==='1';try{for(const x of it)await savePayload({...x,nome:name,icone:icon,descricao:desc,ativo:active});closeModal()}catch(e){toast(e.message)}}
window.saveServiceMeta=saveServiceMeta;
function closeModal(){$('modal').classList.remove('on')}window.closeModal=closeModal;
function toggleNew(force){$('newBox').style.display=force===false?'none':$('newBox').style.display==='none'?'block':'none'}window.toggleNew=toggleNew;
async function createPackage(){
 const slug=$('nslug').value.trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,''),pl=$('nplan').value.trim();
 const x={chave:slug+'__'+pl,servico:slug,plano:pl,qtd:$('nqty').value.trim()||pl,nome:$('nname').value.trim(),id:$('nid').value.trim(),custo:Number($('ncost').value||0),preco:Math.round(Number($('nprice').value||0)*100),icone:$('nicon').value.trim()||'📦',descricao:$('ndesc').value.trim(),por:$('npor').value.trim(),destaque:$('nhot').checked,ativo:$('nactive').checked,ordem:existing.length?Number(existing[0].ordem||100):Object.keys(cfg.servicos||{}).length+1};
 if(!slug||!pl||!x.nome||!x.id||x.preco<=0)return toast('Preencha slug, nome, pacote, ID e preço');
 try{await savePayload(x);['nslug','nname','nplan','nqty','nid','ncost','nprice','ndesc','npor'].forEach(i=>$(i).value='');$('nicon').value='📦';$('nhot').checked=false;$('nactive').checked=true;$('newBox').style.display='none'}catch(e){toast(e.message)}
}
window.createPackage=createPackage;
function filtered(search,svc){const q=($(search).value||'').toLowerCase(),s=$(svc).value;return Object.values(cfg.servicos||{}).filter(x=>(s==='all'||x.servico===s)&&(x.servico+' '+x.nome+' '+x.plano+' '+x.qtd).toLowerCase().includes(q))}
function renderPlans(){const vals=[...new Set(Object.values(cfg.servicos||{}).map(x=>x.servico))].sort();$('planService').innerHTML='<option value="all">Todos os serviços</option>'+vals.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');const a=filtered('planSearch','planService').sort((x,y)=>(x.servico+x.plano).localeCompare(y.servico+y.plano));$('plansTable').innerHTML=a.map(x=>{const k=esc(x.chave);return `<tr><td><b>${esc(x.nome||x.servico)}</b><br><small class="muted">${esc(x.servico)}</small></td><td>${esc(x.plano)}</td><td><input class="input" id="tq_${k}" value="${esc(x.qtd||x.plano)}"></td><td><input class="input" id="tp_${k}" type="number" step=".01" value="${(Number(x.preco||0)/100).toFixed(2)}"></td><td><input class="input" id="tc_${k}" type="number" step=".01" value="${Number(x.custo||0)}"></td><td><input id="th_${k}" type="checkbox" ${x.destaque?'checked':''}></td><td><span class="pill ${x.ativo===false?'off':''}">${x.ativo===false?'Off':'Ativo'}</span></td><td><button class="btn primary" onclick="savePlan('${k}')">Salvar</button></td></tr>`}).join('')||'<tr><td colspan="8"><div class="empty">Nenhum plano encontrado.</div></td></tr>'}
window.renderPlans=renderPlans;
async function savePlan(k){const x=get(k);try{await savePayload({...x,qtd:$('tq_'+k).value,preco:Math.round(Number($('tp_'+k).value||0)*100),custo:Number($('tc_'+k).value||0),destaque:$('th_'+k).checked})}catch(e){toast(e.message)}}window.savePlan=savePlan;
function renderIds(){const q=($('idSearch')?.value||'').toLowerCase(),a=Object.values(cfg.servicos||{}).filter(x=>(x.servico+' '+x.nome+' '+x.plano+' '+x.qtd).toLowerCase().includes(q)).sort((x,y)=>(x.servico+x.plano).localeCompare(y.servico+y.plano));$('idsTable').innerHTML=a.map(x=>{const k=esc(x.chave);return `<tr><td><b>${esc(x.nome||x.servico)}</b><br><small class="muted">${esc(x.servico)}</small></td><td>${esc(x.plano)}</td><td>${esc(x.qtd||x.plano)}</td><td><code>${esc(x.id||'—')}</code></td><td><input class="input" id="id_${k}" value="${esc(x.id||'')}"></td><td><span class="pill ${x.ativo===false?'off':''}">${x.ativo===false?'Off':'Ativo'}</span></td><td><button class="btn primary" onclick="saveId('${k}')">Salvar ID</button></td></tr>`}).join('')||'<tr><td colspan="7"><div class="empty">Nenhum pacote encontrado.</div></td></tr>'}
async function saveId(k){const x=get(k),id=$('id_'+k).value.trim();if(!id)return toast('Informe o ID');try{await savePayload({...x,id})}catch(e){toast(e.message)}}window.saveId=saveId;
function renderAds(){const a=cfg.anuncios||[];$('adsList').innerHTML=a.slice().sort((x,y)=>String(y.data).localeCompare(String(x.data))).map(x=>`<div class="row"><span><b>${esc(x.data)}</b> • ${esc(x.plataforma)} • ${esc(x.campanha||'Sem campanha')}</span><b>${money(x.valor)}</b></div>`).join('')||'<div class="empty">Nenhum investimento</div>'}
async function saveAd(){const date=$('adDate').value,val=Number($('adValue').value||0);if(!date||val<=0)return toast('Informe data e valor');const r=await api('/admin/config/anuncio',{method:'POST',body:JSON.stringify({data:date,plataforma:$('adPlatform').value,campanha:$('adCampaign').value.trim(),valor:val})}),j=await r.json();if(!j.ok)return toast(j.error||'Erro');cfg.anuncios.push(j.item);$('adValue').value='';$('adCampaign').value='';renderAds();adSummary();dashboard();toast('Investimento salvo')}window.saveAd=saveAd;
function adSummary(){const f=data?.financeiro||{};$('adSummary').innerHTML=[['Anúncios',money((f.investimentoAds||0)/100),'negative'],['Faturamento',money((data?.faturamento||0)/100),'positive'],['ROAS',Number(f.roas||0).toFixed(2).replace('.',',')+'x','yellow'],['Lucro líquido',money((f.lucroLiquido||0)/100),'positive']].map(x=>`<div class="money"><strong class="${x[2]}">${x[1]}</strong><small>${x[0]}</small></div>`).join('')}
async function loadSite(){try{const r=await api('/admin/site-config'),x=await r.json();if(!r.ok)throw Error(x.error||'Erro');$('siteName').value=x.nome||'';$('siteWhats').value=x.whatsapp||'';$('siteHours').value=x.horario||'';$('siteGuarantee').value=x.garantia||'';$('siteText').value=x.texto||''}catch(e){$('siteStatus').textContent='❌ '+e.message}}
async function saveSite(){const r=await api('/admin/site-config',{method:'POST',body:JSON.stringify({nome:$('siteName').value,whatsapp:$('siteWhats').value,horario:$('siteHours').value,garantia:$('siteGuarantee').value,texto:$('siteText').value})}),j=await r.json();$('siteStatus').textContent=j.ok?'✅ Site salvo':'❌ '+(j.error||'Erro');if(j.ok)toast('Site salvo')}window.saveSite=saveSite;
async function health(){try{const r=await fetch('/health?_='+Date.now(),{cache:'no-store'}),x=await r.json();$('sup').textContent=x.supabase==='configurado'?'conectado':'ausente';$('meta').textContent=x.meta_pixel==='configurado'?'conectado':'ausente'}catch(e){$('sup').textContent='erro'}}
async function reloadAll(){await loadConfig();await dashboard();toast('Painel atualizado')}window.reloadAll=reloadAll;
document.addEventListener('DOMContentLoaded',()=>{
 $('adDate').value=localDate();
 $('serviceSearch')?.addEventListener('input',renderServices);$('serviceFilter')?.addEventListener('change',renderServices);
 $('planSearch')?.addEventListener('input',renderPlans);$('planService')?.addEventListener('change',renderPlans);
 $('idSearch')?.addEventListener('input',renderIds);
 const initial=location.hash.slice(1);show(titles[initial]?initial:'dashboard');
 loadConfig();dashboard();
});
})();