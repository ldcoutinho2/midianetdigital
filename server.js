require('dotenv').config();
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

app.use(cors({
  origin: true,
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Dashboard-Password']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/dashboard-data', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const SERVICO_MAP = {
  'seguidores-brasileiros__250': '322',
  'seguidores-brasileiros__500': '322',
  'seguidores-brasileiros__1000': '322',
  'seguidores-brasileiros__2000': '322',
  'seguidores-brasileiros__3000': '322',
  'seguidores-brasileiros__4000': '322',
  'seguidores-brasileiros__5000': '322',
  'seguidores-brasileiros__10000': '322',
  'seguidores-mundiais__500': '321',
  'seguidores-mundiais__1000': '321',
  'seguidores-mundiais__2000': '321',
  'seguidores-mundiais__3000': '321',
  'seguidores-mundiais__4000': '321',
  'seguidores-mundiais__5000': '321',
  'seguidores-mundiais__10000': '321',
  'seguidores-organicos__250': '250',
  'seguidores-organicos__500': '250',
  'seguidores-organicos__1000': '250',
  'seguidores-organicos__2000': '250',
  'curtidas-brasileiras__500': '324',
  'curtidas-brasileiras__1000': '324',
  'curtidas-brasileiras__2500': '324',
  'curtidas-brasileiras__5000': '324',
  'curtidas-brasileiras__10000': '324',
  'curtidas-brasileiras__20000': '324',
  'visualizacoes__500': '349',
  'visualizacoes__1000': '349',
  'visualizacoes__2500': '349',
  'visualizacoes__5000': '349',
  'visualizacoes__10000': '349',
  'visualizacoes__25000': '349',
  'comentarios__10': '580',
  'comentarios__25': '580',
  'comentarios__50': '580',
  'comentarios__100': '580',
};

const PRECOS = {
  'seguidores-brasileiros__250': 1500,
  'seguidores-brasileiros__500': 2500,
  'seguidores-brasileiros__1000': 4500,
  'seguidores-brasileiros__2000': 6500,
  'seguidores-brasileiros__3000': 8500,
  'seguidores-brasileiros__4000': 11000,
  'seguidores-brasileiros__5000': 12500,
  'seguidores-brasileiros__10000': 23500,
  'seguidores-mundiais__500': 500,
  'seguidores-mundiais__1000': 1000,
  'seguidores-mundiais__2000': 2000,
  'seguidores-mundiais__3000': 3000,
  'seguidores-mundiais__4000': 4000,
  'seguidores-mundiais__5000': 5000,
  'seguidores-mundiais__10000': 10000,
  'seguidores-organicos__250': 2490,
  'seguidores-organicos__500': 4490,
  'seguidores-organicos__1000': 7990,
  'seguidores-organicos__2000': 13990,
  'curtidas-brasileiras__500': 800,
  'curtidas-brasileiras__1000': 1500,
  'curtidas-brasileiras__2500': 3000,
  'curtidas-brasileiras__5000': 5500,
  'curtidas-brasileiras__10000': 10000,
  'curtidas-brasileiras__20000': 20000,
  'visualizacoes__500': 800,
  'visualizacoes__1000': 1500,
  'visualizacoes__2500': 3000,
  'visualizacoes__5000': 5500,
  'visualizacoes__10000': 10000,
  'visualizacoes__25000': 25000,
};

const COMBOS = {
  'engajamento-30-70': { followerServiceId: '463', followerSplit: [['seguidores-brasileiros', 0.30], ['seguidores-mundiais', 0.70]], bonus: { likes: true, views: true } },
  'engajamento-60-40': { followerServiceId: '457', followerSplit: [['seguidores-brasileiros', 0.60], ['seguidores-mundiais', 0.40]], bonus: { likes: true, views: true } },
  'engajamento-br': { followerSplit: [['seguidores-brasileiros', 1]], bonus: { likes: true, views: true } },
  'engajamento-premium': { followerSplit: [['seguidores-organicos', 1]], bonus: { likes: true, views: true } }
};

const COMBO_PRECOS = {
  'engajamento-30-70__500': 500,
  'engajamento-30-70__1000': 1399,
  'engajamento-30-70__1500': 2099,
  'engajamento-30-70__2000': 2799,
  'engajamento-30-70__3000': 4199,
  'engajamento-30-70__4000': 5599,
  'engajamento-30-70__5000': 6999,
  'engajamento-60-40__500': 899,
  'engajamento-60-40__1000': 1799,
  'engajamento-60-40__2000': 3598,
  'engajamento-60-40__3000': 5397,
  'engajamento-60-40__4000': 7196,
  'engajamento-60-40__5000': 8995,
  'engajamento-br__250': 1500,
  'engajamento-br__500': 2500,
  'engajamento-br__1000': 4500,
  'engajamento-br__2000': 6500,
  'engajamento-br__3000': 8500,
  'engajamento-br__4000': 11000,
  'engajamento-br__5000': 12500,
  'engajamento-premium__500': 8000,
  'engajamento-premium__1000': 16000,
  'engajamento-premium__2000': 32000,
  'engajamento-premium__3000': 49700,
  'engajamento-premium__4000': 65700,
  'engajamento-premium__5000': 84700
};

function dividirInteiro(total, partes) {
  const n = Math.max(1, partes.length);
  const base = Math.floor(total / n);
  let resto = total - base * n;
  return partes.map(() => base + (resto-- > 0 ? 1 : 0));
}

async function enviarComponenteSMM({ servico, quantidade, links, nome, smmId: smmIdOverride }) {
  if (!quantidade || quantidade <= 0) return null;
  const smmId = smmIdOverride || SERVICO_MAP[`${servico}__${String(quantidade)}`] || SERVICO_MAP[`${servico}__500`];
  if (!smmId) throw new Error(`Serviço SMM não configurado: ${servico}`);
  const resultados = [];
  const alvoLinks = links && links.length ? links : [nome];
  const qtds = dividirInteiro(quantidade, alvoLinks);
  for (let i = 0; i < alvoLinks.length; i++) {
    const link = String(alvoLinks[i]).trim();
    if (!link) continue;
    const smmResp = await axios.post(process.env.SMM_API_URL, new URLSearchParams({
      key: process.env.SMM_API_KEY, action: 'add', service: smmId,
      link: link.startsWith('http') ? link : `https://instagram.com/${link.replace('@', '')}`,
      quantity: qtds[i]
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    if(smmResp.data?.error)return Promise.reject(new Error(String(smmResp.data.error)));resultados.push({ service: servico, quantity: qtds[i], link, order: smmResp.data?.order || null });
  }
  return resultados;
}

async function enviarComboSMM(pedido) {
  const combo = COMBOS[pedido.servico];
  if (!combo) return null;
  const quantidade = Number(pedido.plano);
  const links = Array.isArray(pedido.distribuicao?.publicacoes) ? pedido.distribuicao.publicacoes : [];
  const result = { seguidores: [], curtidas: [], visualizacoes: [] };
  if (combo.followerServiceId) {
    result.seguidores.push(...(await enviarComponenteSMM({ servico: 'seguidores-mistos', quantidade, links: [pedido.instagram], nome: pedido.instagram, smmId: pedido.smmId || combo.followerServiceId }) || []));
  } else {
    for (const [svc, pct] of combo.followerSplit) {
      const qtd = Math.round(quantidade * pct);
      if (qtd > 0) result.seguidores.push(...(await enviarComponenteSMM({ servico: svc, quantidade: qtd, links: [pedido.instagram], nome: pedido.instagram, smmId: pedido.smmId }) || []));
    }
  }
  const distLikes = links.map(x => ({ link: x.link, quantidade: Number(x.curtidas || 0) })).filter(x => x.quantidade > 0);
  const distViews = links.map(x => ({ link: x.link, quantidade: Number(x.visualizacoes || 0) })).filter(x => x.quantidade > 0);
  for (const item of distLikes) result.curtidas.push(...(await enviarComponenteSMM({ servico: 'curtidas-brasileiras', quantidade: item.quantidade, links: [item.link], nome: item.link }) || []));
  for (const item of distViews) result.visualizacoes.push(...(await enviarComponenteSMM({ servico: 'visualizacoes', quantidade: item.quantidade, links: [item.link], nome: item.link }) || []));
  return result;
}

const BUMP_SERVICO = 'curtidas-brasileiras';
const BUMP_PLANO = '500';
const BUMP_SMM_ID = SERVICO_MAP[`${BUMP_SERVICO}__${BUMP_PLANO}`];
const BUMP_VALOR_CENTAVOS = PRECOS[`${BUMP_SERVICO}__${BUMP_PLANO}`];
const BUMP_MAX_PUBLICACOES = 2;

const pedidos = {};
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function dinheiroBR(valorCentavos) { return (valorCentavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function incrementarDetalhe(obj, nome) { if (nome) obj[nome] = (obj[nome] || 0) + 1; }

async function registrarEvento(tipo, nome = '', valor = 0) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  await axios.post(`${SUPABASE_URL}/rest/v1/eventos`, { tipo, nome, valor }, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' } });
}

async function buscarEventos(filtros = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  let url = `${SUPABASE_URL}/rest/v1/eventos?select=*&order=created_at.desc&limit=10000`;
  if (filtros.start) url += `&created_at=gte.${encodeURIComponent(filtros.start + 'T00:00:00-03:00')}`;
  if (filtros.end) url += `&created_at=lte.${encodeURIComponent(filtros.end + 'T23:59:59-03:00')}`;
  const resp = await axios.get(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  return resp.data || [];
}

const CONFIG_TIPO_SERVICO = 'config_servico';
const CONFIG_TIPO_PEDIDO = 'pedido';
const CONFIG_TIPO_ANUNCIO = 'config_anuncio';
const CONFIG_TIPO_SITE = 'config_site';
const SERVICO_TITULOS = {
  'seguidores-brasileiros': 'Seguidores Brasileiros', 'seguidores-mundiais': 'Seguidores Mundiais', 'seguidores-organicos': 'Seguidores Orgânicos',
  'curtidas-brasileiras': 'Curtidas Brasileiras', 'visualizacoes': 'Visualizações de Reels', 'comentarios': 'Comentários',
  'engajamento-30-70': '30% BRASILEIROS + 70% Mundiais', 'engajamento-60-40': '60% BRASILEIROS + 40% Mundiais',
  'engajamento-br': '100% Brasileiros', 'engajamento-premium': 'BR Premium Ativos'
};

function ordemPadraoServico(servico) {
  const ordem = {
    'engajamento-30-70': 1,
    'engajamento-60-40': 2,
    'engajamento-br': 3,
    'curtidas-brasileiras': 4,
    'curtidas-mundiais': 5,
    'visualizacoes': 6,
    'visualizacoes-reels': 6
  };
  return ordem[servico] || 100;
}

function montarConfiguracaoPadrao() {
  const servicos = {};
  for (const [chave, preco] of Object.entries(PRECOS)) {
    const [servico, plano] = chave.split('__');
    servicos[chave] = { servico, plano, id: SERVICO_MAP[chave] || '', preco: Number(preco || 0), custo: 0, ativo: true, nome: SERVICO_TITULOS[servico] || servico, qtd: plano, chave, ordem: ordemPadraoServico(servico) };
  }
  for (const [chave, preco] of Object.entries(COMBO_PRECOS)) {
    const [servico, plano] = chave.split('__');
    servicos[chave] = { servico, plano, id: COMBOS[servico]?.followerServiceId || '', preco: Number(preco || 0), custo: 0, ativo: true, nome: SERVICO_TITULOS[servico] || servico, qtd: plano, chave, ordem: ordemPadraoServico(servico) };
  }
  return { servicos, anuncios: [], site: { nome: 'MidiaNetDigital', whatsapp: '5521991689838', horario: '09:00 às 22:00', garantia: '30 dias', texto: '' } };
}

async function buscarConfiguracao() {
  const base = montarConfiguracaoPadrao();
  if (!SUPABASE_URL || !SUPABASE_KEY) return base;
  try {
    const url = `${SUPABASE_URL}/rest/v1/eventos?select=*&tipo=in.(${CONFIG_TIPO_SERVICO},${CONFIG_TIPO_ANUNCIO},${CONFIG_TIPO_SITE})&order=created_at.desc&limit=2000`;
    const resp = await axios.get(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    const vistos = new Set();
    for (const e of resp.data || []) {
      try {
        const payload = JSON.parse(e.nome || '{}');
        if (e.tipo === CONFIG_TIPO_SERVICO) {
          const chave = payload.chave || (payload.servico && payload.plano ? `${payload.servico}__${payload.plano}` : '');
          if (!chave || vistos.has(`s:${chave}`)) continue;
          base.servicos[chave] = { ...(base.servicos[chave] || {}), ...payload, chave };
          vistos.add(`s:${chave}`);
        } else if (e.tipo === CONFIG_TIPO_ANUNCIO) {
          const id = payload.id || e.created_at;
          if (vistos.has(`a:${id}`)) continue;
          base.anuncios.push(payload);
          vistos.add(`a:${id}`);
        }
      } catch (_) {}
    }
    return base;
  } catch (err) {
    console.error('[CONFIG]', err.response?.data || err.message);
    return base;
  }
}

async function salvarPedidoPersistido(pedido){await registrarEvento(CONFIG_TIPO_PEDIDO,JSON.stringify(pedido),0);return pedido;}
async function buscarPedidosPersistidos(){if(!SUPABASE_URL||!SUPABASE_KEY)return Object.values(pedidos);try{const eventos=await buscarEventos();const mapa=new Map();for(const e of eventos.filter(x=>x.tipo===CONFIG_TIPO_PEDIDO)){try{const p=JSON.parse(e.nome||'{}');if(p.id)mapa.set(p.id,{...p,atualizadoEm:e.created_at});}catch(_){}}return Array.from(mapa.values()).sort((a,b)=>String(b.atualizadoEm||b.criadoEm||'').localeCompare(String(a.atualizadoEm||a.criadoEm||'')));}catch(e){console.error('[PEDIDOS]',e.message);return Object.values(pedidos);}}
async function localizarPedido(paymentId,campo){const mem=Object.values(pedidos).find(p=>String(p[campo]||'').toLowerCase()===String(paymentId).toLowerCase());if(mem)return mem;const lista=await buscarPedidosPersistidos();return lista.find(p=>String(p[campo]||'').toLowerCase()===String(paymentId).toLowerCase())||null;}
async function carregarPedidoAdmin(id){if(pedidos[id])return pedidos[id];const lista=await buscarPedidosPersistidos();const p=lista.find(x=>String(x.id)===String(id));if(p)pedidos[p.id]=p;return p||null;}
async function confirmarPagamento(pedido){if(!pedido||pedido.status==='concluido')return;pedido.status='aguardando_aprovacao';pedido.pagamentoConfirmadoEm=new Date().toISOString();await salvarPedidoPersistido(pedido);}

async function salvarConfiguracaoServico(item) {
  const chave = item.chave || `${item.servico}__${item.plano}`;
  const payload = {
    chave, servico: String(item.servico || '').trim(), plano: String(item.plano || '').trim(), id: String(item.id || '').trim(),
    preco: Math.round(Number(item.preco || 0)), custo: Number(item.custo || 0), ativo: item.ativo !== false,
    nome: String(item.nome || SERVICO_TITULOS[item.servico] || item.servico || '').trim(),
    qtd: String(item.qtd || item.plano || '').trim(),
    descricao: String(item.descricao || '').trim(), icone: String(item.icone || '📦').trim(),
    destaque: item.destaque === true, por: String(item.por || '').trim(), ordem: Number.isFinite(Number(item.ordem)) ? Number(item.ordem) : 100,
    bonusCurtidas: Number(item.bonusCurtidas || 0), bonusVisualizacoes: Number(item.bonusVisualizacoes || 0), excluido: item.excluido === true
  };
  await registrarEvento(CONFIG_TIPO_SERVICO, JSON.stringify(payload), 0);
  return payload;
}

async function salvarAnuncio(anuncio) {
  const payload = { id: anuncio.id || uuidv4(), data: String(anuncio.data || new Date().toISOString().slice(0,10)), plataforma: String(anuncio.plataforma || 'Meta Ads'), campanha: String(anuncio.campanha || ''), valor: Number(anuncio.valor || 0) };
  await registrarEvento(CONFIG_TIPO_ANUNCIO, JSON.stringify(payload), 0);
  return payload;
}

async function salvarSiteConfig(site) {
  const payload = {
    nome: String(site.nome || 'MidiaNetDigital').trim(),
    whatsapp: String(site.whatsapp || '').replace(/\D/g, ''),
    horario: String(site.horario || '').trim(),
    garantia: String(site.garantia || '').trim(),
    texto: String(site.texto || '').trim()
  };
  await registrarEvento(CONFIG_TIPO_SITE, JSON.stringify(payload), 0);
  return payload;
}

function custoDoPedidoConfig(eventoNome, config) {
  const texto = String(eventoNome || '');
  const chave = Object.keys(config.servicos || {}).find(k => {
    const [svc, plano] = k.split('__');
    return texto.includes(`${svc} ${plano}`);
  });
  return chave ? Number(config.servicos[chave].custo || 0) : 0;
}

function montarDashboard(eventos, config = montarConfiguracaoPadrao(), filtros = {}) {
  const dados = { visitantes: 0, servicos: 0, planos: 0, checkout: 0, pix: 0, vendas: 0, faturamento: 0, servicosDetalhes: {}, planosDetalhes: {}, pixDetalhes: [], vendasDetalhes: [], dias: {}, funil: {} };
  for (const e of eventos) {
    const tipo = e.tipo, nome = e.nome || '', valorCentavos = Math.round(Number(e.valor || 0) * 100), data = new Date(e.created_at), dia = data.toLocaleDateString('pt-BR', {timeZone:'America/Sao_Paulo'});
    if (!dados.dias[dia]) dados.dias[dia] = { visitantes:0, servicos:0, planos:0, checkout:0, pix:0, vendas:0, faturamento:0 };
    if (tipo==='visitante') { dados.visitantes++; dados.dias[dia].visitantes++; }
    if (tipo==='servico') { dados.servicos++; dados.dias[dia].servicos++; incrementarDetalhe(dados.servicosDetalhes,nome); }
    if (tipo==='plano') { dados.planos++; dados.dias[dia].planos++; incrementarDetalhe(dados.planosDetalhes,nome); }
    if (tipo==='checkout') { dados.checkout++; dados.dias[dia].checkout++; }
    if (tipo==='pix') { dados.pix++; dados.dias[dia].pix++; dados.pixDetalhes.push({hora:data.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}),info:nome||'Pedido',valor:dinheiroBR(valorCentavos)}); }
    if (tipo==='venda') { dados.vendas++; dados.dias[dia].vendas++; dados.faturamento+=valorCentavos; dados.dias[dia].faturamento+=valorCentavos; dados.vendasDetalhes.push({hora:data.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}),info:nome||'Venda',valor:dinheiroBR(valorCentavos)}); }
  }
  const pct=(a,b)=>!b||b<=0?'0.00%':((a/b)*100).toFixed(2)+'%';
  const queda=(a,b)=>!a||a<=0?'0.00%':(((a-b)/a)*100).toFixed(2)+'%';
  dados.funil={visitanteServico:pct(dados.servicos,dados.visitantes),servicoPlano:pct(dados.planos,dados.servicos),planoCheckout:pct(dados.checkout,dados.planos),checkoutPix:pct(dados.pix,dados.checkout),pixVenda:pct(dados.vendas,dados.pix),quedaVisitanteServico:queda(dados.visitantes,dados.servicos),quedaServicoPlano:queda(dados.servicos,dados.planos),quedaPlanoCheckout:queda(dados.planos,dados.checkout),quedaCheckoutPix:queda(dados.checkout,dados.pix),quedaPixVenda:queda(dados.pix,dados.vendas)};
  const etapas=[['Visitante → Serviço',dados.funil.quedaVisitanteServico],['Serviço → Plano',dados.funil.quedaServicoPlano],['Plano → Checkout',dados.funil.quedaPlanoCheckout],['Checkout → Pix',dados.funil.quedaCheckoutPix],['Pix → Venda',dados.funil.quedaPixVenda]].map(x=>({nome:x[0],queda:Number(String(x[1]).replace('%',''))})).sort((a,b)=>b.queda-a.queda);
  const ticketMedio=dados.vendas>0?Math.round(dados.faturamento/dados.vendas):0;
  let custosServicos=0,vendasComCusto=0;
  for(const e of eventos) if(e.tipo==='venda'){ const custo=custoDoPedidoConfig(e.nome,config); if(custo>0){ custosServicos+=Math.round(custo*100); vendasComCusto++; } }
  const adsNoPeriodo=(config.anuncios||[]).filter(a=>(!filtros.start||String(a.data)>=String(filtros.start))&&(!filtros.end||String(a.data)<=String(filtros.end)));
  const investimentoAds=Math.round(adsNoPeriodo.reduce((s,a)=>s+Number(a.valor||0),0)*100);
  const lucroBruto=dados.faturamento-custosServicos, lucroLiquido=lucroBruto-investimentoAds, roas=investimentoAds>0?dados.faturamento/investimentoAds:0, roi=investimentoAds>0?lucroLiquido/investimentoAds:0;
  return {...dados,faturamentoFormatado:dinheiroBR(dados.faturamento),ticketMedioFormatado:dinheiroBR(ticketMedio),conversaoGeral:pct(dados.vendas,dados.visitantes),maiorGargalo:etapas[0]?.nome||'Sem dados',maiorGargaloPercentual:etapas[0]?etapas[0].queda.toFixed(2)+'%':'0.00%',financeiro:{custosServicos,investimentoAds,lucroBruto,lucroLiquido,roas,roi,margem:dados.faturamento>0?(lucroLiquido/dados.faturamento)*100:0,vendasComCusto,custoMedio:dados.vendas>0?custosServicos/dados.vendas:0}};
}

async function enviarPedidoSMM(pedido) {
  let links=[]; try { links=JSON.parse(pedido.instagram); if(!Array.isArray(links)) links=[pedido.instagram]; } catch { links=[pedido.instagram]; }
  links=links.filter(x=>x&&String(x).trim()); if(!links.length) throw new Error('Nenhum link válido para enviar ao SMM');
  const total=Number(pedido.plano), porLink=Math.floor(total/links.length), resultados=[];
  for(const linkOriginal of links){ const link=String(linkOriginal).trim(); const r=await axios.post(process.env.SMM_API_URL,new URLSearchParams({key:process.env.SMM_API_KEY,action:'add',service:pedido.smmId,link:link.startsWith('http')?link:`https://instagram.com/${link.replace('@','')}`,quantity:porLink}),{headers:{'Content-Type':'application/x-www-form-urlencoded'}}); if(r.data?.error)throw new Error(String(r.data.error)); resultados.push(r.data); }
  return {multiplos:links.length>1,quantidadeTotal:total,quantidadePorLink:porLink,totalLinks:links.length,pedidos:resultados,order:resultados.map(r=>r.order).filter(Boolean).join(', ')};
}

async function enviarBumpSMM(pedido){
  if(!pedido.bump||!pedido.bump_publicacao) return null;
  let links; try{ links=JSON.parse(pedido.bump_publicacao); if(!Array.isArray(links)) links=[pedido.bump_publicacao]; }catch{ links=[pedido.bump_publicacao]; }
  links=links.filter(l=>l&&String(l).trim()).slice(0,BUMP_MAX_PUBLICACOES); if(!links.length) return null;
  const config=await buscarConfiguracao(); const bump=config.servicos?.[`${BUMP_SERVICO}__${BUMP_PLANO}`];
  return enviarPedidoSMM({instagram:JSON.stringify(links),plano:BUMP_PLANO,smmId:pedido.bumpSmmId||bump?.id||BUMP_SMM_ID});
}

function normalizarMeta(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');}
function hashMeta(v){const x=normalizarMeta(v);return x?crypto.createHash('sha256').update(x).digest('hex'):undefined;}
function hashTelefoneMeta(v){let x=String(v||'').replace(/\D/g,'');if(x.length===10||x.length===11)x='55'+x;return x?crypto.createHash('sha256').update(x).digest('hex'):undefined;}
async function enviarPurchaseMeta(pedido){
  try{
    if(!process.env.META_PIXEL_ID||!process.env.META_ACCESS_TOKEN)return {ok:false,skipped:true};
    const valorReais=Number((Number(pedido.valor||0)/100).toFixed(2)),eventId=`purchase_${pedido.id}`,meta=pedido.meta||{},userData={};
    const ph=hashTelefoneMeta(pedido.telefone),partes=normalizarMeta(pedido.nome).split(' ').filter(Boolean),fn=hashMeta(partes[0]||''),ln=hashMeta(partes.length>1?partes.slice(1).join(' '):'');
    if(ph)userData.ph=[ph];if(fn)userData.fn=[fn];if(ln)userData.ln=[ln];if(meta.fbp)userData.fbp=meta.fbp;if(meta.fbc)userData.fbc=meta.fbc;if(meta.client_ip_address)userData.client_ip_address=meta.client_ip_address;if(meta.client_user_agent)userData.client_user_agent=meta.client_user_agent;
    const payload={data:[{event_name:'Purchase',event_time:Math.floor(Date.now()/1000),event_id:eventId,action_source:'website',event_source_url:process.env.SITE_URL||'https://midianetdigital.vercel.app/checkout.html',user_data:userData,custom_data:{currency:'BRL',value:valorReais,content_name:`${pedido.servico} ${pedido.plano}`,content_type:'product',order_id:pedido.id,num_items:1}}]};
    const graphVersion=process.env.META_GRAPH_VERSION||'v23.0',url=`https://graph.facebook.com/${graphVersion}/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_ACCESS_TOKEN}`;
    const resp=await axios.post(url,payload,{headers:{'Content-Type':'application/json'},timeout:15000}); console.log('[META] Purchase enviado:',JSON.stringify(resp.data)); return {ok:true,eventId,response:resp.data};
  }catch(err){console.error('[META] Erro ao enviar Purchase:',err.response?.data||err.message);return {ok:false,error:err.response?.data||err.message};}
}

app.post('/evento',async(req,res)=>{try{const{tipo,servico,plano,nome,valor}=req.body||{};const tipos=new Set(['visitante','servico','plano','checkout','pix','venda']);if(!tipos.has(tipo))return res.status(400).json({ok:false,error:'Tipo de evento invalido'});await registrarEvento(tipo,nome||servico||plano||'',valor||0);return res.json({ok:true});}catch(err){console.error('[EVENTO]',err.response?.data||err.message);return res.status(500).json({ok:false,error:err.message});}});

app.get('/dashboard-data',async(req,res)=>{try{const senha=req.query.senha||'';const start=req.query.start||'';const end=req.query.end||'';if(process.env.DASHBOARD_PASSWORD&&senha!==process.env.DASHBOARD_PASSWORD)return res.status(401).json({error:'Senha incorreta'});const eventos=await buscarEventos({start,end});const config=await buscarConfiguracao();return res.json(montarDashboard(eventos,config,{start,end}));}catch(err){console.error('[DASHBOARD]',err.response?.data||err.message);return res.status(500).json({error:'Erro ao carregar dashboard'});}});

app.get('/config/public',async(req,res)=>{try{
  const config=await buscarConfiguracao();
  const servico=String(req.query.servico||'');
  const itens=Object.values(config.servicos||{}).filter(x=>x.excluido!==true&&(!servico||x.servico===servico));
  return res.json({servicos:itens.map(x=>({
    chave:x.chave||String(x.servico)+'__'+String(x.plano),
    servico:x.servico,plano:x.plano,preco:Number(x.preco||0)/100,custo:Number(x.custo||0),
    ativo:x.ativo!==false,nome:x.nome||SERVICO_TITULOS[x.servico]||x.servico,qtd:x.qtd||x.plano,
    descricao:x.descricao||'',icone:x.icone||'📦',destaque:x.destaque===true,por:x.por||'',ordem:Number(x.ordem||100),bonusCurtidas:Number(x.bonusCurtidas||0),bonusVisualizacoes:Number(x.bonusVisualizacoes||0),excluido:x.excluido===true
  })),titulos:SERVICO_TITULOS,site:config.site||{}});
}catch{res.status(500).json({error:'Erro ao carregar configuração pública'});}});
function senhaAdminValida(req){return req.query.senha===process.env.DASHBOARD_PASSWORD||req.headers['x-dashboard-password']===process.env.DASHBOARD_PASSWORD;}
app.get('/admin/config',async(req,res)=>{if(!senhaAdminValida(req))return res.status(401).json({error:'Não autorizado'});try{return res.json(await buscarConfiguracao());}catch{return res.status(500).json({error:'Erro ao carregar configurações'});}});
app.post('/admin/config/servico',async(req,res)=>{if(!senhaAdminValida(req))return res.status(401).json({error:'Não autorizado'});try{return res.json({ok:true,item:await salvarConfiguracaoServico(req.body||{})});}catch(err){return res.status(500).json({ok:false,error:err.message||'Erro ao salvar serviço'});}});
app.post('/admin/config/ordem',async(req,res)=>{if(!senhaAdminValida(req))return res.status(401).json({error:'Não autorizado'});try{const itens=Array.isArray(req.body?.itens)?req.body.itens:[];const config=await buscarConfiguracao();const salvos=[];for(const it of itens){const x=config.servicos?.[it.chave];if(!x)continue;salvos.push(await salvarConfiguracaoServico({...x,ordem:Number(it.ordem||100)}));}return res.json({ok:true,itens:salvos});}catch(err){return res.status(500).json({ok:false,error:err.message||'Erro ao salvar ordem'});}});
app.post('/admin/config/anuncio',async(req,res)=>{if(!senhaAdminValida(req))return res.status(401).json({error:'Não autorizado'});try{return res.json({ok:true,item:await salvarAnuncio(req.body||{})});}catch(err){return res.status(500).json({ok:false,error:err.message||'Erro ao salvar anúncio'});}});
app.get('/admin/site-config',async(req,res)=>{if(!senhaAdminValida(req))return res.status(401).json({error:'Não autorizado'});try{return res.json((await buscarConfiguracao()).site||{});}catch(err){return res.status(500).json({error:'Erro ao carregar configuração do site'});}});
app.post('/admin/site-config',async(req,res)=>{if(!senhaAdminValida(req))return res.status(401).json({error:'Não autorizado'});try{return res.json({ok:true,item:await salvarSiteConfig(req.body||{})});}catch(err){return res.status(500).json({ok:false,error:err.message||'Erro ao salvar configuração do site'});}});

app.get('/dashboard-admin.js',(req,res)=>{
  res.setHeader('Content-Type','application/javascript; charset=utf-8');
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma','no-cache');
  res.setHeader('Expires','0');
  try { return res.send(fs.readFileSync(path.join(__dirname, 'dashboard-admin.js'), 'utf8')); }
  catch (e) { return res.status(500).send('console.error('+JSON.stringify('Erro ao carregar painel: '+e.message)+');'); }
});

app.get('/dashboard',(req,res)=>{
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma','no-cache');
  res.setHeader('Expires','0');
  const usuario=req.query.usuario,senha=req.query.senha;
  if(usuario!=='admin'||senha!==process.env.DASHBOARD_PASSWORD)return res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Login Dashboard</title><style>body{margin:0;background:#080810;color:#fff;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh}.box{width:360px;background:#111120;border:1px solid rgba(255,255,255,.08);padding:30px;border-radius:18px}h2{text-align:center;margin-bottom:20px}input{width:100%;padding:13px;margin:8px 0;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#181828;color:#fff}button{width:100%;padding:13px;margin-top:12px;border:0;border-radius:999px;background:#e8ff47;color:#080810;font-weight:800;cursor:pointer}</style></head><body><div class="box"><h2>MidiaNetDigital Dashboard</h2><form action="/dashboard"><input type="text" name="usuario" placeholder="Usuário" required><input type="password" name="senha" placeholder="Senha" required><button type="submit">Entrar</button></form></div></body></html>`);
  // Dashboard administrativo modular: uma única fonte de UI, separada da lógica do servidor.
  return res.send(fs.readFileSync(path.join(__dirname, 'dashboard-admin.html'), 'utf8'));

  res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Dashboard Profissional</title><style>
*{box-sizing:border-box;margin:0;padding:0;font-family:Arial,sans-serif}body{background:#080810;color:#f5f5ff;padding:22px}.top{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:22px}h1{font-size:28px}.sub{color:#8888aa;margin-top:4px}.filters{display:flex;gap:8px;flex-wrap:wrap;align-items:end;background:#111120;border:1px solid rgba(255,255,255,.08);padding:14px;border-radius:16px}.filters label{font-size:12px;color:#8888aa;display:block;margin-bottom:4px}input,select{background:#181828;color:#fff;border:1px solid rgba(255,255,255,.12);padding:10px;border-radius:10px}button{background:#e8ff47;color:#080810;border:0;padding:10px 15px;border-radius:999px;font-weight:800;cursor:pointer}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:18px}.card{background:#111120;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:18px}.num{font-size:27px;font-weight:900;color:#e8ff47}.lbl{color:#8888aa;font-size:13px;margin-top:5px}.section{background:#111120;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:18px;margin-bottom:18px}.section h2{font-size:18px;margin-bottom:14px}.row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(255,255,255,.07);padding:10px 0;color:#ddd;font-size:14px}.row:last-child{border-bottom:0}.bar{height:11px;background:#181828;border-radius:999px;overflow:hidden;margin-top:6px}.fill{height:100%;background:#e8ff47;border-radius:999px}.two{display:grid;grid-template-columns:1fr 1fr;gap:18px}.paginacao{display:flex;gap:8px;align-items:center;margin-top:14px;flex-wrap:wrap}.paginacao span{color:#8888aa;font-size:13px}.bad{color:#ff6b6b}.good{color:#34d399}.small{font-size:12px;color:#8888aa}.admin-table{display:flex;flex-direction:column;gap:0}.admin-row{display:grid;grid-template-columns:1.25fr 1.35fr .7fr .7fr .7fr .65fr auto;gap:8px;align-items:center;border-bottom:1px solid rgba(255,255,255,.07);padding:12px 0}.admin-row input{width:100%}.admin-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.admin-toolbar input{flex:1;min-width:220px}.btn-secondary{background:#181828;color:#fff;border:1px solid rgba(255,255,255,.12)}.admin-new,.admin-ads{background:#0d0d18;border:1px solid rgba(232,255,71,.16);border-radius:14px;padding:14px;margin:12px 0 16px}.admin-new-title{font-weight:800;margin-bottom:10px}.admin-form-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.admin-form-grid input{width:100%}.admin-checks{display:flex;gap:18px;flex-wrap:wrap;margin:10px 0;color:#aaa}.admin-checks input{width:auto}.admin-actions{display:flex;gap:8px}.admin-table-head{display:grid;grid-template-columns:1.25fr 1.35fr .7fr .7fr .7fr .65fr auto;gap:8px;color:#8888aa;font-size:11px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.1);text-transform:uppercase}.admin-row .admin-fields{display:grid;grid-template-columns:1fr;gap:6px}.admin-row .admin-main{min-width:0}.admin-row .admin-main b{display:block}.admin-row .admin-main small{color:#8888aa}.admin-row .admin-buttons{display:flex;gap:5px;flex-wrap:wrap}.admin-row button{padding:8px 10px;font-size:12px}.admin-row .danger{background:#4b1616;color:#fff}.admin-row .status-pill{font-size:11px;padding:5px 8px;border-radius:999px;background:#123c2c;color:#34d399;display:inline-block}.admin-row .status-off{background:#3a2020;color:#ff7777}.ads-grid{grid-template-columns:1fr 1.2fr 1.5fr 1fr auto}@media(max-width:1100px){.admin-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-table-head{display:none}.admin-row{grid-template-columns:1fr 1fr}.admin-row .admin-buttons{grid-column:1/-1}.ads-grid{grid-template-columns:1fr 1fr}}@media(max-width:600px){.admin-form-grid,.ads-grid{grid-template-columns:1fr}.admin-row{grid-template-columns:1fr}.admin-toolbar input{min-width:100%}}@media(max-width:850px){.admin-row{grid-template-columns:1fr 1fr}.two{grid-template-columns:1fr}.top{align-items:flex-start}}
</style></head><body>
<div class="top"><div><h1>MidiaNetDigital Dashboard</h1><div class="sub">Funil, pedidos, vendas e gargalos de conversão</div></div><div class="filters"><div><label>Período rápido</label><select id="preset" onchange="setPreset()"><option value="today">Hoje</option><option value="yesterday">Ontem</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="month">Este mês</option><option value="custom">Personalizado</option></select></div><div><label>Data inicial</label><input type="date" id="start"></div><div><label>Data final</label><input type="date" id="end"></div><button onclick="carregar()">Filtrar</button></div></div>
<div class="grid"><div class="card"><div class="num" id="visitantes">0</div><div class="lbl">👀 Visitantes</div></div><div class="card"><div class="num" id="servicos">0</div><div class="lbl">📦 Serviços clicados</div></div><div class="card"><div class="num" id="planos">0</div><div class="lbl">📋 Planos clicados</div></div><div class="card"><div class="num" id="checkout">0</div><div class="lbl">💳 Checkouts</div></div><div class="card"><div class="num" id="pix">0</div><div class="lbl">🟢 Pix gerados</div></div><div class="card"><div class="num" id="vendas">0</div><div class="lbl">🛒 Vendas</div></div><div class="card"><div class="num" id="faturamento">R$0</div><div class="lbl">💰 Faturamento</div></div><div class="card"><div class="num" id="ticket">R$0</div><div class="lbl">🎯 Ticket médio</div></div></div>
<div class="section" id="admin-config">
<h2>⚙️ Gerenciar site</h2>
<div class="small" style="margin-bottom:14px">Controle o site público sem editar código: crie serviços e pacotes, altere nome, quantidade, preço, custo, ID SMM, descrição, ícone, destaque e status. Tudo fica salvo no Supabase.</div>
<div id="adminStatus" class="small" style="margin-bottom:12px"></div>
<div class="admin-toolbar">
  <input id="adminBusca" placeholder="🔎 Buscar serviço ou pacote..." oninput="renderAdmin()">
  <button type="button" onclick="abrirNovoServico()">＋ Novo serviço / pacote</button>
  <button type="button" class="btn-secondary" onclick="carregarAdmin()">↻ Atualizar</button>
</div>
<div id="novoServico" class="admin-new" style="display:none">
  <div class="admin-new-title">➕ Criar novo serviço/pacote</div>
  <div class="admin-form-grid">
    <input id="novoSlug" placeholder="Slug ex.: seguidores-premium">
    <input id="novoNome" placeholder="Nome público">
    <input id="novoPlano" placeholder="Pacote ex.: 1000">
    <input id="novoQtd" placeholder="Texto da quantidade ex.: 1.000 Seguidores">
    <input id="novoId" placeholder="ID SMM">
    <input id="novoCusto" type="number" step="0.01" min="0" placeholder="Custo (R$)">
    <input id="novoPreco" type="number" step="0.01" min="0" placeholder="Preço cliente (R$)">
    <input id="novoIcone" placeholder="Ícone ex.: 🇧🇷" value="📦">
    <input id="novoDescricao" placeholder="Descrição">
    <input id="novoPor" placeholder="Texto por unidade (opcional)">
  </div>
  <div class="admin-checks"><label><input id="novoDestaque" type="checkbox"> ⭐ Destaque</label><label><input id="novoAtivo" type="checkbox" checked> Ativo no site</label></div>
  <div class="admin-actions"><button type="button" onclick="criarServico()">💾 Criar e publicar</button><button type="button" class="btn-secondary" onclick="fecharNovoServico()">Cancelar</button></div>
</div>
<div class="admin-table-head"><span>Serviço / pacote</span><span>Nome / descrição</span><span>ID SMM</span><span>Custo</span><span>Venda</span><span>Status</span><span>Ações</span></div>
<div class="admin-table" id="servicosAdmin"></div>
<div class="admin-ads">
  <div class="admin-new-title">📢 Investimento em anúncios</div>
  <div class="small" style="margin-bottom:10px">Informe o gasto de cada dia/campanha. O valor entra automaticamente no lucro líquido, ROAS e margem do período.</div>
  <div class="admin-form-grid ads-grid">
    <input type="date" id="adsData">
    <input id="adsPlataforma" value="Meta Ads" placeholder="Plataforma">
    <input id="adsCampanha" placeholder="Campanha">
    <input type="number" id="adsValor" min="0" step="0.01" placeholder="Valor gasto (R$)">
    <button type="button" onclick="salvarAds()">💾 Salvar investimento</button>
  </div>
  <div id="adsLista" style="margin-top:12px"></div>
</div>
</div>
<div class="section"><h2>💰 Controle financeiro</h2><div class="grid"><div class="card"><div class="num" id="finCusto">R$0</div><div class="lbl">Custo dos serviços</div></div><div class="card"><div class="num" id="finAds">R$0</div><div class="lbl">Investimento em anúncios</div></div><div class="card"><div class="num" id="finLucroBruto">R$0</div><div class="lbl">Lucro antes dos anúncios</div></div><div class="card"><div class="num" id="finLucro">R$0</div><div class="lbl">Lucro líquido</div></div><div class="card"><div class="num" id="finRoas">0,00x</div><div class="lbl">ROAS</div></div><div class="card"><div class="num" id="finMargem">0,00%</div><div class="lbl">Margem líquida</div></div></div><div class="small">Os custos, preços e investimentos são controlados acima pelo próprio dashboard e ficam salvos no Supabase.</div></div>
<div class="section"><h2>⚠️ Principal ponto de perda</h2><div class="row"><span id="gargalo">Calculando...</span><strong class="bad" id="gargaloPct">0%</strong></div><div class="small">Mostra onde mais clientes estão parando no período escolhido.</div></div>
<div class="section"><h2>📊 Funil de conversão</h2><div id="funil"></div></div>
<div class="two"><div class="section"><h2>🔥 Serviços mais clicados</h2><div id="servicosDetalhes"></div><div id="pagServicos" class="paginacao"></div></div><div class="section"><h2>🏆 Planos mais clicados</h2><div id="planosDetalhes"></div><div id="pagPlanos" class="paginacao"></div></div></div>
<div class="two"><div class="section"><h2>🟢 Pedidos / Pix Gerados</h2><div id="ultimosPix"></div><div id="pagPix" class="paginacao"></div></div><div class="section"><h2>🛒 Vendas Confirmadas</h2><div id="ultimasVendas"></div><div id="pagVendas" class="paginacao"></div></div></div>
<div class="section"><h2>📅 Resultado por dia</h2><div id="dias"></div><div id="pagDias" class="paginacao"></div></div>
<script>
const senha=new URLSearchParams(location.search).get('senha')||'';let dadosGlobais=null,adminConfig=null;const paginas={servicos:0,planos:0,pix:0,vendas:0,dias:0};const porPagina=10;
function adminFetch(url,options){options=options||{};options.headers=Object.assign({'x-dashboard-password':senha,'Content-Type':'application/json'},options.headers||{});return fetch(url,options)}
function brDate(d){return d.toISOString().slice(0,10)}
function setPreset(){const p=document.getElementById('preset').value,h=new Date(),ini=new Date(),fim=new Date();if(p==='today'){ini.setTime(h.getTime());fim.setTime(h.getTime())}if(p==='yesterday'){ini.setDate(h.getDate()-1);fim.setDate(h.getDate()-1)}if(p==='7')ini.setDate(h.getDate()-6);if(p==='30')ini.setDate(h.getDate()-29);if(p==='month')ini.setDate(1);if(p!=='custom'){document.getElementById('start').value=brDate(ini);document.getElementById('end').value=brDate(fim);carregar()}}
function paginar(a,p){return a.slice(p*porPagina,p*porPagina+porPagina)}
function botoesPaginacao(total,p,tipo,el){const n=Math.ceil(total/porPagina)||1;document.getElementById(el).innerHTML='<button onclick="mudarPagina(\\''+tipo+'\\',-1)">← Anterior</button><span>Página '+(p+1)+' de '+n+'</span><button onclick="mudarPagina(\\''+tipo+'\\',1)">Próximos 10 →</button>'}
function montarListas(){const d=dadosGlobais||{};return{servicos:Object.entries(d.servicosDetalhes||{}).sort((a,b)=>b[1]-a[1]),planos:Object.entries(d.planosDetalhes||{}).sort((a,b)=>b[1]-a[1]),pix:d.pixDetalhes||[],vendas:d.vendasDetalhes||[],dias:Object.entries(d.dias||{}).reverse()}}
function mudarPagina(tipo,dir){const a=montarListas()[tipo]||[];const max=Math.max(0,Math.ceil(a.length/porPagina)-1);paginas[tipo]=Math.min(max,Math.max(0,paginas[tipo]+dir));renderizarListas()}
function renderRanking(a,p,e,pe,t){const it=paginar(a,p);document.getElementById(e).innerHTML=it.length?it.map(x=>'<div class="row"><span>'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join(''):'<div class="row"><span>Nenhum dado</span><strong>0</strong></div>';botoesPaginacao(a.length,p,t,pe)}
function renderEventos(a,p,e,pe,t){const it=paginar(a,p);document.getElementById(e).innerHTML=it.length?it.map(x=>'<div class="row"><span>'+x.hora+'<br><small>'+x.info+'</small></span><strong>'+x.valor+'</strong></div>').join(''):'<div class="row"><span>Nenhum dado</span><strong>-</strong></div>';botoesPaginacao(a.length,p,t,pe)}
function renderDias(a,p){const it=paginar(a,p);document.getElementById('dias').innerHTML=it.length?it.map(x=>'<div class="row"><span>'+x[0]+'</span><strong>Pix: '+x[1].pix+' | Vendas: '+formatBR(x[1].faturamento)+'</strong></div>').join(''):'<div class="row"><span>Nenhum dado</span><strong>-</strong></div>';botoesPaginacao(a.length,p,'dias','pagDias')}
function renderizarListas(){const l=montarListas();renderRanking(l.servicos,paginas.servicos,'servicosDetalhes','pagServicos','servicos');renderRanking(l.planos,paginas.planos,'planosDetalhes','pagPlanos','planos');renderEventos(l.pix,paginas.pix,'ultimosPix','pagPix','pix');renderEventos(l.vendas,paginas.vendas,'ultimasVendas','pagVendas','vendas');renderDias(l.dias,paginas.dias)}
function etapa(n,a,b,c,q){const w=b>0?Math.min(100,a/b*100):0;return '<div style="margin-bottom:14px"><div class="row"><span>'+n+'</span><strong>'+a+' <small class="good">('+c+')</small> <small class="bad">queda '+q+'</small></strong></div><div class="bar"><div class="fill" style="width:'+w+'%"></div></div></div>'}
async function carregar(){const st=document.getElementById('start').value,en=document.getElementById('end').value,r=await fetch('/dashboard-data?senha='+encodeURIComponent(senha)+'&start='+encodeURIComponent(st)+'&end='+encodeURIComponent(en)+'&_='+Date.now());const d=await r.json();dadosGlobais=d;Object.keys(paginas).forEach(k=>paginas[k]=0);document.getElementById('visitantes').textContent=d.visitantes;document.getElementById('servicos').textContent=d.servicos;document.getElementById('planos').textContent=d.planos;document.getElementById('checkout').textContent=d.checkout;document.getElementById('pix').textContent=d.pix;document.getElementById('vendas').textContent=d.vendas;document.getElementById('faturamento').textContent=d.faturamentoFormatado;document.getElementById('ticket').textContent=d.ticketMedioFormatado;const f=d.financeiro||{};document.getElementById('finCusto').textContent=formatBR(f.custosServicos||0);document.getElementById('finAds').textContent=formatBR(f.investimentoAds||0);document.getElementById('finLucroBruto').textContent=formatBR(f.lucroBruto||0);document.getElementById('finLucro').textContent=formatBR(f.lucroLiquido||0);document.getElementById('finRoas').textContent=Number(f.roas||0).toFixed(2).replace('.',',')+'x';document.getElementById('finMargem').textContent=Number(f.margem||0).toFixed(2).replace('.',',')+'%';document.getElementById('gargalo').textContent=d.maiorGargalo;document.getElementById('gargaloPct').textContent=d.maiorGargaloPercentual;document.getElementById('funil').innerHTML=etapa('Visitante → Serviço',d.servicos,d.visitantes,d.funil.visitanteServico,d.funil.quedaVisitanteServico)+etapa('Serviço → Plano',d.planos,d.servicos,d.funil.servicoPlano,d.funil.quedaServicoPlano)+etapa('Plano → Checkout',d.checkout,d.planos,d.funil.planoCheckout,d.funil.quedaPlanoCheckout)+etapa('Checkout → Pix',d.pix,d.checkout,d.funil.checkoutPix,d.funil.quedaCheckoutPix)+etapa('Pix → Venda',d.vendas,d.pix,d.funil.pixVenda,d.funil.quedaPixVenda);renderizarListas()}
function formatBR(c){return(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function escHtml(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
async function carregarAdmin(){try{const r=await adminFetch('/admin/config');if(!r.ok)throw new Error('Não autorizado');adminConfig=await r.json();renderAdmin();document.getElementById('adminStatus').textContent='✅ Configurações carregadas';}catch(e){document.getElementById('adminStatus').textContent='❌ '+e.message}}
function renderAdmin(){
 const el=document.getElementById('servicosAdmin'); if(!el||!adminConfig)return;
 const busca=(document.getElementById('adminBusca')?.value||'').toLowerCase();
 const itens=Object.values(adminConfig.servicos||{}).sort((a,b)=>(String(a.servico)+String(a.plano)).localeCompare(String(b.servico)+String(b.plano))).filter(x=>(String(x.servico)+' '+String(x.nome)+' '+String(x.plano)).toLowerCase().includes(busca));
 el.innerHTML=itens.length?itens.map(x=>{
   const chave=x.chave||String(x.servico)+'__'+String(x.plano);
   return '<div class="admin-row" data-chave="'+escHtml(chave)+'">'+
     '<div class="admin-main"><b>'+escHtml(x.icone||'📦')+' '+escHtml(x.servico)+'</b><small>Pacote: '+escHtml(x.plano)+' • qtd: '+escHtml(x.qtd||x.plano)+'</small></div>'+
     '<div class="admin-fields"><input data-field="nome" value="'+escHtml(x.nome||'')+'" placeholder="Nome público"><input data-field="descricao" value="'+escHtml(x.descricao||'')+'" placeholder="Descrição"></div>'+
     '<input data-field="id" value="'+escHtml(x.id||'')+'" placeholder="ID SMM">'+
     '<input data-field="custo" type="number" step="0.01" value="'+Number(x.custo||0)+'" placeholder="Custo">'+
     '<input data-field="preco" type="number" step="0.01" value="'+(Number(x.preco||0)/100).toFixed(2)+'" placeholder="Venda">'+
     '<div><span class="status-pill '+(x.ativo===false?'status-off':'')+'">'+(x.ativo===false?'Desativado':'Ativo')+'</span><br><label style="font-size:11px"><input data-field="ativo" type="checkbox" '+(x.ativo!==false?'checked':'')+'> Publicado</label></div>'+
     '<div class="admin-buttons"><button data-action="save">Salvar</button><button data-action="delete" class="danger">Excluir</button></div>'+
     '</div>';
 }).join(''):'<div class="small" style="padding:12px 0">Nenhum serviço encontrado.</div>';
 el.querySelectorAll('[data-action="save"]').forEach(b=>b.onclick=()=>salvarServico(b.closest('.admin-row')));
 el.querySelectorAll('[data-action="delete"]').forEach(b=>b.onclick=()=>excluirServico(b.closest('.admin-row')));
 renderAds();
}
function rowValue(row,field){return row.querySelector('[data-field="'+field+'"]')?.value||''}
async function salvarServico(row){
 const chave=row.dataset.chave,base=adminConfig.servicos[chave]||{};
 const payload={...base,chave,servico:base.servico,plano:base.plano,nome:rowValue(row,'nome'),descricao:rowValue(row,'descricao'),id:rowValue(row,'id'),custo:Number(rowValue(row,'custo')||0),preco:Math.round(Number(rowValue(row,'preco')||0)*100),ativo:!!row.querySelector('[data-field="ativo"]')?.checked};
 const r=await adminFetch('/admin/config/servico',{method:'POST',body:JSON.stringify(payload)}),j=await r.json();
 document.getElementById('adminStatus').textContent=j.ok?'✅ Salvo e publicado: '+chave:'❌ '+(j.error||'Erro');
 if(j.ok){adminConfig.servicos[chave]=j.item;renderAdmin();carregar();}
}
async function excluirServico(row){
 if(!confirm('Desativar este serviço/pacote no site?'))return;
 const chave=row.dataset.chave,base=adminConfig.servicos[chave]||{};
 const r=await adminFetch('/admin/config/servico',{method:'POST',body:JSON.stringify({...base,chave,ativo:false})}),j=await r.json();
 document.getElementById('adminStatus').textContent=j.ok?'✅ Serviço desativado':'❌ '+(j.error||'Erro');
 if(j.ok){adminConfig.servicos[chave]=j.item;renderAdmin();carregar();}
}
function abrirNovoServico(){document.getElementById('novoServico').style.display='block';document.getElementById('novoSlug').focus()}
function fecharNovoServico(){document.getElementById('novoServico').style.display='none'}
async function criarServico(){
 const slug=document.getElementById('novoSlug').value.trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'');
 const nome=document.getElementById('novoNome').value.trim(),plano=document.getElementById('novoPlano').value.trim(),qtd=document.getElementById('novoQtd').value.trim()||plano,id=document.getElementById('novoId').value.trim(),custo=Number(document.getElementById('novoCusto').value||0),preco=Number(document.getElementById('novoPreco').value||0),icone=document.getElementById('novoIcone').value.trim()||'📦',descricao=document.getElementById('novoDescricao').value.trim(),por=document.getElementById('novoPor').value.trim(),destaque=document.getElementById('novoDestaque').checked,ativo=document.getElementById('novoAtivo').checked;
 if(!slug||!nome||!plano||!id||preco<=0){document.getElementById('adminStatus').textContent='❌ Preencha slug, nome, pacote, ID SMM e preço.';return}
 const chave=slug+'__'+plano;
 const r=await adminFetch('/admin/config/servico',{method:'POST',body:JSON.stringify({chave,servico:slug,plano,qtd,nome,id,custo,preco:Math.round(preco*100),icone,descricao,por,destaque,ativo})}),j=await r.json();
 document.getElementById('adminStatus').textContent=j.ok?'✅ Novo serviço criado e publicado: '+chave:'❌ '+(j.error||'Erro');
 if(j.ok){adminConfig.servicos[chave]=j.item;['novoSlug','novoNome','novoPlano','novoQtd','novoId','novoCusto','novoPreco','novoDescricao','novoPor'].forEach(id=>document.getElementById(id).value='');document.getElementById('novoIcone').value='📦';document.getElementById('novoDestaque').checked=false;document.getElementById('novoAtivo').checked=true;fecharNovoServico();renderAdmin();carregar();}
}
function renderAds(){const el=document.getElementById('adsLista');if(!el)return;const ads=adminConfig?.anuncios||[];el.innerHTML=ads.slice().sort((a,b)=>String(b.data).localeCompare(String(a.data))).map(a=>'<div class="row"><span>'+escHtml(a.data)+' • '+escHtml(a.plataforma)+' • '+escHtml(a.campanha||'Sem campanha')+'</span><strong>'+Number(a.valor||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+'</strong></div>').join('')||'<div class="small">Nenhum investimento cadastrado.</div>'}
async function salvarAds(){const data=document.getElementById('adsData').value,plataforma=document.getElementById('adsPlataforma').value||'Meta Ads',campanha=document.getElementById('adsCampanha').value||'',valor=Number(document.getElementById('adsValor').value||0);if(!data||valor<=0){alert('Informe data e valor.');return}const r=await adminFetch('/admin/config/anuncio',{method:'POST',body:JSON.stringify({data,plataforma,campanha,valor})}),j=await r.json();document.getElementById('adminStatus').textContent=j.ok?'✅ Investimento salvo':'❌ '+(j.error||'Erro');if(j.ok){adminConfig.anuncios.push(j.item);document.getElementById('adsValor').value='';renderAds();carregar()}}
setPreset();carregarAdmin();setInterval(carregar,30000);
</script></body></html>`);
});

app.get('/instagram/perfil', async (req,res)=>{try{const user=String(req.query.user||'').replace('@','').replace('https://www.instagram.com/','').replace('https://instagram.com/','').split('/')[0].split('?')[0].trim();if(!user)return res.status(400).json({success:false,error:'Usuário inválido'});const run=await axios.post('https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items',{usernames:[user]},{params:{token:APIFY_TOKEN}});const perfil=run.data?.[0];if(!perfil)return res.json({success:false,error:'Perfil não encontrado'});return res.json({success:true,username:perfil.username,nome:perfil.fullName||perfil.username,seguidores:perfil.followersCount||0,seguindo:perfil.followsCount||0,posts:perfil.postsCount||0,foto:perfil.profilePicUrl,link:`https://instagram.com/${perfil.username}`});}catch(err){console.error(err.response?.data||err.message);return res.status(500).json({success:false,error:'Erro ao consultar Instagram'});}});
app.get('/instagram/posts',async(req,res)=>{try{const user=String(req.query.user||'').replace('@','').replace('https://www.instagram.com/','').replace('https://instagram.com/','').split('/')[0].split('?')[0].trim();if(!user)return res.status(400).json({success:false,posts:[]});const run=await axios.post('https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items',{directUrls:[`https://www.instagram.com/${user}/`],resultsType:'posts',resultsLimit:50,searchType:'user'},{params:{token:APIFY_TOKEN}});const posts=(run.data||[]).slice(0,12).map(post=>({url:post.url||`https://www.instagram.com/p/${post.shortCode||post.shortcode}/`,thumb:post.displayUrl||post.imageUrl||post.thumbnailUrl||post.videoUrl||'',caption:post.caption||'',tipo:post.type||post.productType||''})).filter(post=>post.url);return res.json({success:true,posts});}catch(err){console.error('[ERRO instagram posts]',err.response?.data||err.message);return res.status(500).json({success:false,posts:[]});}});
app.get('/proxy-img',async(req,res)=>{try{const url=req.query.url;if(!url||!url.startsWith('https://'))return res.status(400).send('URL inválida');const img=await axios.get(url,{responseType:'arraybuffer',headers:{'User-Agent':'Mozilla/5.0',Referer:'https://www.instagram.com/'}});res.set('Content-Type',img.headers['content-type']||'image/jpeg');res.set('Cache-Control','public, max-age=86400');return res.send(img.data);}catch(err){console.error('[ERRO proxy-img]',err.message);return res.status(500).send('Erro ao carregar imagem');}});

app.post('/criar-pedido',async(req,res)=>{try{const{nome,telefone,instagram,servico,plano,bump,bump_publicacao}=req.body;if(!nome||!telefone||!instagram||!servico||!plano)return res.status(400).json({error:'Dados incompletos'});const chave=`${servico}__${plano}`,combo=COMBOS[servico],configAtual=await buscarConfiguracao(),itemConfig=configAtual.servicos?.[chave];if(itemConfig?.ativo===false)return res.status(400).json({error:'Este serviço/plano está temporariamente indisponível'});const valorBaseCentavos=itemConfig?Number(itemConfig.preco||0):(combo?COMBO_PRECOS[chave]:PRECOS[chave]);const smmId=itemConfig?.id||(combo?'COMBO':SERVICO_MAP[chave]);if(!valorBaseCentavos||!smmId)return res.status(400).json({error:'Servico ou plano invalido'});const bumpAtivo=bump===true,valorTotalCentavos=valorBaseCentavos+(bumpAtivo?BUMP_VALOR_CENTAVOS:0),pedidoId=uuidv4(),valorReais=Number((valorTotalCentavos/100).toFixed(2));let gateway='pushinpay',payment=null,pixData=null;try{const pushResp=await axios.post('https://api.pushinpay.com.br/api/pix/cashIn',{value:valorTotalCentavos,webhook_url:'https://midianetdigital.onrender.com/webhook-pushinpay'},{headers:{Authorization:`Bearer ${process.env.PUSHINPAY_TOKEN}`,Accept:'application/json','Content-Type':'application/json'}});payment=pushResp.data;pixData={qr_code:payment.qr_code,qr_code_base64:payment.qr_code_base64};}catch(pushErr){gateway='mercado_pago';const mpResp=await axios.post('https://api.mercadopago.com/v1/payments',{transaction_amount:valorReais,description:`MidiaNetDigital - ${servico} ${plano}`,payment_method_id:'pix',external_reference:pedidoId,notification_url:'https://midianetdigital.onrender.com/webhook-mercadopago',payer:{email:`cliente_${pedidoId.slice(0,8)}@midianetdigital.com`,first_name:nome}},{headers:{Authorization:`Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,'Content-Type':'application/json','X-Idempotency-Key':pedidoId}});payment=mpResp.data;pixData=payment.point_of_interaction?.transaction_data;}
pedidos[pedidoId]={id:pedidoId,nome,telefone,instagram,servico,plano,pagamento:'pix',valor:valorTotalCentavos,smmId,combo:!!combo,distribuicao:req.body.distribuicao||null,bump:bumpAtivo,bump_publicacao:bump_publicacao||null,bumpSmmId:(configAtual.servicos?.[`${BUMP_SERVICO}__${BUMP_PLANO}`]?.id||BUMP_SMM_ID),bonusCurtidas:Number(itemConfig?.bonusCurtidas||0),bonusVisualizacoes:Number(itemConfig?.bonusVisualizacoes||0),status:'aguardando_pagamento',gateway,paymentId:payment.id,mercadoPagoPaymentId:gateway==='mercado_pago'?payment.id:null,pushinPayPaymentId:gateway==='pushinpay'?payment.id:null,meta:{fbp:req.body?.meta?.fbp||null,fbc:req.body?.meta?.fbc||null,fbclid:req.body?.meta?.fbclid||null,client_user_agent:req.get('user-agent')||'',client_ip_address:req.ip||req.socket?.remoteAddress||''},criadoEm:new Date().toISOString()};await salvarPedidoPersistido(pedidos[pedidoId]);const detalhesPedido=combo&&req.body.distribuicao?req.body.distribuicao.publicacoes.map((p,i)=>`Pub ${i+1}: ${p.link} | ❤️ ${p.curtidas||0} | 👁️ ${p.visualizacoes||0}`).join(' || '):'';await registrarEvento('pix',`${nome} | ${telefone} | Perfil: ${instagram} | ${servico} ${plano}${detalhesPedido?' | '+detalhesPedido:''}${bump?' + bump 500 curtidas | Publicação bump: '+bump_publicacao:''}`,valorReais);return res.json({success:true,pedidoId,gateway,valor:valorReais.toFixed(2),pix:{copia_e_cola:pixData?.qr_code||null,qr_code_image:pixData?.qr_code_base64||null,expira_em:null},paymentId:payment.id});}catch(err){console.error('[ERRO criar-pedido]',err.response?.data||err.message);return res.status(500).json({error:'Erro ao criar pedido',detail:err.response?.data||err.message});}});

app.post('/webhook-pushinpay',async(req,res)=>{try{const paymentId=req.body?.id,status=req.body?.status;if(!paymentId||status!=='paid')return res.status(200).json({received:true});const pedido=await localizarPedido(paymentId,'pushinPayPaymentId');if(!pedido)return res.status(200).json({received:true});await confirmarPagamento(pedido);return res.status(200).json({received:true,status:pedido.status});}catch(err){console.error('[WEBHOOK PUSH]',err.response?.data||err.message);return res.status(200).json({received:true});}});

app.post('/webhook-mercadopago',async(req,res)=>{try{const paymentId=req.body?.data?.id||req.query?.id||req.query?.['data.id'];if(!paymentId)return res.status(200).json({received:true});const paymentResp=await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`,{headers:{Authorization:`Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`}}),payment=paymentResp.data;if(payment.status!=='approved')return res.status(200).json({received:true});const pedido=await localizarPedido(payment.external_reference||paymentId,'id');if(!pedido)return res.status(200).json({received:true});pedido.mercadoPagoPaymentId=payment.id;await confirmarPagamento(pedido);return res.status(200).json({received:true,status:pedido.status});}catch(err){console.error('[WEBHOOK MP]',err.response?.data||err.message);return res.status(200).json({received:true});}});

app.get('/status/:pedidoId',async(req,res)=>{const p=await carregarPedidoAdmin(req.params.pedidoId);if(!p)return res.status(404).json({error:'Pedido nao encontrado'});return res.json({pedidoId:p.id,status:p.status,servico:p.servico,plano:p.plano,instagram:p.instagram,nome:p.nome,telefone:p.telefone,valor:p.valor,pagamento:p.pagamento,gateway:p.gateway,distribuicao:p.distribuicao||null,publicacoes:p.distribuicao?.publicacoes||[],smmOrderId:p.smmOrderId||null,bump:p.bump||false,bumpSmmOrderId:p.bumpSmmOrderId||null,metaEventId:`purchase_${p.id}`});});
async function enviarBonusConfigurado(pedido){
  const likes=Number(pedido.bonusCurtidas||0),views=Number(pedido.bonusVisualizacoes||0);
  if((likes<=0&&views<=0)||!pedido.distribuicao?.publicacoes?.length)return {likes:0,views:0,skipped:(likes>0||views>0)?'sem_publicacoes':null};
  const config=await buscarConfiguracao(),pubs=pedido.distribuicao.publicacoes;
  const likeId=config.servicos?.['curtidas-brasileiras__500']?.id||SERVICO_MAP['curtidas-brasileiras__500'];
  const viewId=config.servicos?.['visualizacoes__500']?.id||SERVICO_MAP['visualizacoes__500'];
  const out={likes:0,views:0,orders:[]};
  for(const p of pubs){const link=String(p.link||'').trim();if(!link)continue;if(likes>0&&likeId){const r=await enviarComponenteSMM({servico:'curtidas-brasileiras',quantidade:likes,links:[link],nome:link,smmId:likeId});out.likes+=likes;out.orders.push(...(r||[]));}if(views>0&&viewId){const r=await enviarComponenteSMM({servico:'visualizacoes',quantidade:views,links:[link],nome:link,smmId:viewId});out.views+=views;out.orders.push(...(r||[]));}}
  return out;
}

app.get('/admin/pedidos',async(req,res)=>{if(!senhaAdminValida(req))return res.status(401).json({error:'Não autorizado'});try{return res.json({pedidos:await buscarPedidosPersistidos()});}catch(e){return res.status(500).json({error:e.message})}});
app.post('/admin/pedidos/:id/aprovar',async(req,res)=>{if(!senhaAdminValida(req))return res.status(401).json({error:'Não autorizado'});const pedido=await carregarPedidoAdmin(req.params.id);if(!pedido)return res.status(404).json({error:'Pedido não encontrado'});if(pedido.status!=='aguardando_aprovacao'&&pedido.status!=='erro_smm')return res.status(400).json({error:'Pedido não está aguardando processamento'});try{pedido.status='processando_smm';pedido.aprovadoEm=new Date().toISOString();pedido.erroSmm=null;await salvarPedidoPersistido(pedido);const smmData=pedido.combo?await enviarComboSMM(pedido):await enviarPedidoSMM(pedido);let bonusData=null;try{bonusData=await enviarBonusConfigurado(pedido)}catch(e){console.error('[SMM BONUS]',e.response?.data||e.message);throw e}let bumpData=null;try{bumpData=await enviarBumpSMM(pedido)}catch(e){console.error('[SMM BUMP]',e.response?.data||e.message)}pedido.status='concluido';pedido.smmOrderId=pedido.combo?JSON.stringify(smmData):smmData?.order||null;pedido.bumpSmmOrderId=bumpData?bumpData.order:null;pedido.bonusData=bonusData||null;pedido.concluidoEm=new Date().toISOString();await salvarPedidoPersistido(pedido);const detalhesVenda=pedido.distribuicao?.publicacoes?.map((p,i)=>`Pub ${i+1}: ${p.link} | ❤️ ${p.curtidas||0} | 👁️ ${p.visualizacoes||0}`).join(' || ')||'';await registrarEvento('venda',`${pedido.nome} | ${pedido.telefone} | Perfil: ${pedido.instagram} | ${pedido.servico} ${pedido.plano}${detalhesVenda?' | '+detalhesVenda:''}${pedido.bump?' + bump 500 curtidas | Publicação bump: '+pedido.bump_publicacao:''}`,Number((pedido.valor/100).toFixed(2)));await enviarPurchaseMeta(pedido);return res.json({ok:true,pedido});}catch(err){pedido.status='erro_smm';pedido.erroSmm=err.response?.data||err.message;await salvarPedidoPersistido(pedido);return res.status(500).json({ok:false,error:pedido.erroSmm,pedido});}});
app.get('/servicos-smm',async(req,res)=>{try{const r=await axios.post(process.env.SMM_API_URL,new URLSearchParams({key:process.env.SMM_API_KEY,action:'services'}),{headers:{'Content-Type':'application/x-www-form-urlencoded'}});return res.json(Array.isArray(r.data)?r.data.filter(s=>s.name?.toLowerCase().includes('instagram')||s.category?.toLowerCase().includes('instagram')):r.data);}catch(err){return res.status(500).json({error:err.message})}});
app.get('/health',async(req,res)=>{const eventos=await buscarEventos();res.json({status:'ok',supabase:SUPABASE_URL?'configurado':'ausente',meta_pixel:process.env.META_PIXEL_ID?'configurado':'ausente',pedidos_em_memoria:Object.keys(pedidos).length,eventos_salvos:eventos.length,timestamp:new Date().toISOString()})});

app.listen(PORT,()=>console.log(`MidiaNetDigital Backend rodando na porta ${PORT}`));
