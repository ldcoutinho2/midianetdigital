require('dotenv').config();
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.SITE_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Configuração do order bump: 500 curtidas brasileiras, divididas em até 2 publicações (250 cada)
const BUMP_SERVICO = 'curtidas-brasileiras';
const BUMP_PLANO = '500';
const BUMP_SMM_ID = SERVICO_MAP[`${BUMP_SERVICO}__${BUMP_PLANO}`];
const BUMP_VALOR_CENTAVOS = PRECOS[`${BUMP_SERVICO}__${BUMP_PLANO}`]; // 800 centavos = R$ 8,00 (preço de custo de referência)
const BUMP_MAX_PUBLICACOES = 2;

const pedidos = {};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function dinheiroBR(valorCentavos) {
  return (valorCentavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function incrementarDetalhe(obj, nome) {
  if (!nome) return;
  obj[nome] = (obj[nome] || 0) + 1;
}

async function registrarEvento(tipo, nome = '', valor = 0) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('[SUPABASE] URL ou KEY ausente');
    return;
  }

  await axios.post(
    `${SUPABASE_URL}/rest/v1/eventos`,
    { tipo, nome, valor },
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      }
    }
  );
}

async function buscarEventos(filtros = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  let url = `${SUPABASE_URL}/rest/v1/eventos?select=*&order=created_at.desc&limit=10000`;

  if (filtros.start) {
    url += `&created_at=gte.${encodeURIComponent(filtros.start + 'T00:00:00-03:00')}`;
  }

  if (filtros.end) {
    url += `&created_at=lte.${encodeURIComponent(filtros.end + 'T23:59:59-03:00')}`;
  }

  const resp = await axios.get(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  return resp.data || [];
}

function montarDashboard(eventos) {
  const dados = {
    visitantes: 0,
    servicos: 0,
    planos: 0,
    checkout: 0,
    pix: 0,
    vendas: 0,
    faturamento: 0,
    servicosDetalhes: {},
    planosDetalhes: {},
    pixDetalhes: [],
    vendasDetalhes: [],
    dias: {},
    funil: {}
  };

  eventos.forEach(e => {
    const tipo = e.tipo;
    const nome = e.nome || '';
    const valorCentavos = Math.round(Number(e.valor || 0) * 100);
    const data = new Date(e.created_at);
    const dia = data.toLocaleDateString('pt-BR');

    if (!dados.dias[dia]) {
      dados.dias[dia] = {
        visitantes: 0,
        servicos: 0,
        planos: 0,
        checkout: 0,
        pix: 0,
        vendas: 0,
        faturamento: 0
      };
    }

    if (tipo === 'visitante') {
      dados.visitantes++;
      dados.dias[dia].visitantes++;
    }

    if (tipo === 'servico') {
      dados.servicos++;
      dados.dias[dia].servicos++;
      incrementarDetalhe(dados.servicosDetalhes, nome);
    }

    if (tipo === 'plano') {
      dados.planos++;
      dados.dias[dia].planos++;
      incrementarDetalhe(dados.planosDetalhes, nome);
    }

    if (tipo === 'checkout') {
      dados.checkout++;
      dados.dias[dia].checkout++;
    }

    if (tipo === 'pix') {
      dados.pix++;
      dados.dias[dia].pix++;

      dados.pixDetalhes.push({
        hora: data.toLocaleString('pt-BR'),
        info: nome || 'Pedido',
        valor: dinheiroBR(valorCentavos)
      });
    }

    if (tipo === 'venda') {
      dados.vendas++;
      dados.dias[dia].vendas++;
      dados.faturamento += valorCentavos;
      dados.dias[dia].faturamento += valorCentavos;

      dados.vendasDetalhes.push({
        hora: data.toLocaleString('pt-BR'),
        info: nome || 'Venda',
        valor: dinheiroBR(valorCentavos)
      });
    }
  });

  function pct(a, b) {
    if (!b || b <= 0) return '0.00%';
    return ((a / b) * 100).toFixed(2) + '%';
  }

  function queda(a, b) {
    if (!a || a <= 0) return '0.00%';
    return (((a - b) / a) * 100).toFixed(2) + '%';
  }

  dados.funil = {
    visitanteServico: pct(dados.servicos, dados.visitantes),
    servicoPlano: pct(dados.planos, dados.servicos),
    planoCheckout: pct(dados.checkout, dados.planos),
    checkoutPix: pct(dados.pix, dados.checkout),
    pixVenda: pct(dados.vendas, dados.pix),

    quedaVisitanteServico: queda(dados.visitantes, dados.servicos),
    quedaServicoPlano: queda(dados.servicos, dados.planos),
    quedaPlanoCheckout: queda(dados.planos, dados.checkout),
    quedaCheckoutPix: queda(dados.checkout, dados.pix),
    quedaPixVenda: queda(dados.pix, dados.vendas)
  };

  const etapas = [
    { nome: 'Visitante → Serviço', queda: Number(dados.funil.quedaVisitanteServico.replace('%','')) },
    { nome: 'Serviço → Plano', queda: Number(dados.funil.quedaServicoPlano.replace('%','')) },
    { nome: 'Plano → Checkout', queda: Number(dados.funil.quedaPlanoCheckout.replace('%','')) },
    { nome: 'Checkout → Pix', queda: Number(dados.funil.quedaCheckoutPix.replace('%','')) },
    { nome: 'Pix → Venda', queda: Number(dados.funil.quedaPixVenda.replace('%','')) }
  ];

  etapas.sort((a, b) => b.queda - a.queda);

  const ticketMedio = dados.vendas > 0 ? Math.round(dados.faturamento / dados.vendas) : 0;

  return {
    ...dados,
    faturamentoFormatado: dinheiroBR(dados.faturamento),
    ticketMedioFormatado: dinheiroBR(ticketMedio),
    conversaoGeral: pct(dados.vendas, dados.visitantes),
    maiorGargalo: etapas[0]?.nome || 'Sem dados',
    maiorGargaloPercentual: etapas[0] ? etapas[0].queda.toFixed(2) + '%' : '0.00%'
  };
}

/**
 * Envia um pedido para a API SMM.
 * Aceita pedido.instagram como string única ou JSON com array de links.
 * Divide pedido.plano (quantidade) igualmente entre os links informados.
 * pedido.smmId define qual serviço da API SMM é usado (permite reaproveitar
 * essa função tanto para o pedido principal quanto para o order bump).
 */
async function enviarPedidoSMM(pedido) {
  let links = [];

  try {
    links = JSON.parse(pedido.instagram);
    if (!Array.isArray(links)) links = [pedido.instagram];
  } catch (e) {
    links = [pedido.instagram];
  }

  links = links.filter(link => link && String(link).trim());

  if (!links.length) {
    throw new Error('Nenhum link válido para enviar ao SMM');
  }

  const quantidadeTotal = Number(pedido.plano);
  const quantidadePorLink = Math.floor(quantidadeTotal / links.length);

  const resultados = [];

  for (const linkOriginal of links) {
    const link = String(linkOriginal).trim();

    const smmResp = await axios.post(
      process.env.SMM_API_URL,
      new URLSearchParams({
        key: process.env.SMM_API_KEY,
        action: 'add',
        service: pedido.smmId,
        link: link.startsWith('http')
          ? link
          : `https://instagram.com/${link.replace('@', '')}`,
        quantity: quantidadePorLink,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    resultados.push(smmResp.data);
  }

  return {
    multiplos: links.length > 1,
    quantidadeTotal,
    quantidadePorLink,
    totalLinks: links.length,
    pedidos: resultados,
    order: resultados.map(r => r.order).filter(Boolean).join(', ')
  };
}

/**
 * Envia o pedido do order bump (curtidas extras) separadamente do pedido principal.
 * pedido.bump_publicacao pode ser:
 *  - uma string única (1 link de publicação)
 *  - uma string JSON com até BUMP_MAX_PUBLICACOES links (ex: '["url1","url2"]')
 * A quantidade total do bump (BUMP_PLANO = 500) é dividida igualmente entre
 * os links informados pela própria lógica de enviarPedidoSMM (250 cada, se forem 2 links).
 */
async function enviarBumpSMM(pedido) {
  if (!pedido.bump || !pedido.bump_publicacao) return null;

  // Garante que não ultrapasse o máximo de publicações permitido para o bump
  let links;
  try {
    links = JSON.parse(pedido.bump_publicacao);
    if (!Array.isArray(links)) links = [pedido.bump_publicacao];
  } catch (e) {
    links = [pedido.bump_publicacao];
  }
  links = links.filter(l => l && String(l).trim()).slice(0, BUMP_MAX_PUBLICACOES);

  if (!links.length) return null;

  const bumpData = await enviarPedidoSMM({
    instagram: JSON.stringify(links),
    plano: BUMP_PLANO,
    smmId: pedido.bumpSmmId || BUMP_SMM_ID
  });

  return bumpData;
}

async function enviarPurchaseMeta(pedido) {
  try {
    if (!process.env.META_PIXEL_ID || !process.env.META_ACCESS_TOKEN) {
      console.log('[META] META_PIXEL_ID ou META_ACCESS_TOKEN ausente');
      return;
    }

    const valorReais = Number((pedido.valor / 100).toFixed(2));
    const eventId = `purchase_${pedido.id}`;

    const payload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: 'website',
          event_source_url: process.env.SITE_URL || 'https://midianetdigital.vercel.app',
          user_data: {},
          custom_data: {
            currency: 'BRL',
            value: valorReais,
            content_name: `${pedido.servico} ${pedido.plano}`,
            content_type: 'product',
            order_id: pedido.id
          }
        }
      ]
    };

    const url = `https://graph.facebook.com/v19.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_ACCESS_TOKEN}`;

    const resp = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('[META] Purchase enviado:', resp.data);
  } catch (err) {
    console.error('[META] Erro ao enviar Purchase:', err.response?.data || err.message);
  }
}

app.post('/evento', async (req, res) => {
  try {
    const { tipo, servico, plano, nome, valor } = req.body;
    const nomeEvento = nome || servico || plano || '';

    await registrarEvento(tipo, nomeEvento, valor || 0);

    return res.json({ ok: true });
  } catch (err) {
    console.error('[ERRO evento Supabase]', err.response?.data || err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/dashboard-data', async (req, res) => {
  try {
    const senha = req.query.senha;
    const start = req.query.start || '';
    const end = req.query.end || '';

    if (process.env.DASHBOARD_PASSWORD && senha !== process.env.DASHBOARD_PASSWORD) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const eventos = await buscarEventos({ start, end });
    const dados = montarDashboard(eventos);

    return res.json(dados);
  } catch (err) {
    console.error('[ERRO dashboard-data]', err.response?.data || err.message);
    return res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});





app.get('/dashboard', (req, res) => {
  const usuario = req.query.usuario;
  const senha = req.query.senha;

  if (usuario !== 'admin' || senha !== process.env.DASHBOARD_PASSWORD) {
    return res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Login Dashboard</title>
<style>
body{margin:0;background:#080810;color:#fff;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh}
.box{width:360px;background:#111120;border:1px solid rgba(255,255,255,.08);padding:30px;border-radius:18px}
h2{text-align:center;margin-bottom:20px}
input{width:100%;padding:13px;margin:8px 0;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#181828;color:#fff}
button{width:100%;padding:13px;margin-top:12px;border:0;border-radius:999px;background:#e8ff47;color:#080810;font-weight:800;cursor:pointer}
</style>
</head>
<body>
<div class="box">
<h2>MidiaNetDigital Dashboard</h2>
<form action="/dashboard">
<input type="text" name="usuario" placeholder="Usuário" required>
<input type="password" name="senha" placeholder="Senha" required>
<button type="submit">Entrar</button>
</form>
</div>
</body>
</html>
    `);
  }

  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Dashboard Profissional</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:Arial,sans-serif}
body{background:#080810;color:#f5f5ff;padding:22px}
.top{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:22px}
h1{font-size:28px}
.sub{color:#8888aa;margin-top:4px}
.filters{display:flex;gap:8px;flex-wrap:wrap;align-items:end;background:#111120;border:1px solid rgba(255,255,255,.08);padding:14px;border-radius:16px}
.filters label{font-size:12px;color:#8888aa;display:block;margin-bottom:4px}
input,select{background:#181828;color:#fff;border:1px solid rgba(255,255,255,.12);padding:10px;border-radius:10px}
button{background:#e8ff47;color:#080810;border:0;padding:10px 15px;border-radius:999px;font-weight:800;cursor:pointer}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:18px}
.card{background:#111120;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:18px}
.num{font-size:27px;font-weight:900;color:#e8ff47}
.lbl{color:#8888aa;font-size:13px;margin-top:5px}
.section{background:#111120;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:18px;margin-bottom:18px}
.section h2{font-size:18px;margin-bottom:14px}
.row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(255,255,255,.07);padding:10px 0;color:#ddd;font-size:14px}
.row:last-child{border-bottom:0}
.bar{height:11px;background:#181828;border-radius:999px;overflow:hidden;margin-top:6px}
.fill{height:100%;background:#e8ff47;border-radius:999px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.paginacao{display:flex;gap:8px;align-items:center;margin-top:14px;flex-wrap:wrap}
.paginacao span{color:#8888aa;font-size:13px}
.bad{color:#ff6b6b}
.good{color:#34d399}
.small{font-size:12px;color:#8888aa}
@media(max-width:800px){.two{grid-template-columns:1fr}.top{align-items:flex-start}}
</style>
</head>
<body>

<div class="top">
  <div>
    <h1>MidiaNetDigital Dashboard</h1>
    <div class="sub">Funil, pedidos, vendas e gargalos de conversão</div>
  </div>

  <div class="filters">
    <div>
      <label>Período rápido</label>
      <select id="preset" onchange="setPreset()">
        <option value="today">Hoje</option>
        <option value="yesterday">Ontem</option>
        <option value="7">Últimos 7 dias</option>
        <option value="30">Últimos 30 dias</option>
        <option value="month">Este mês</option>
        <option value="custom">Personalizado</option>
      </select>
    </div>
    <div>
      <label>Data inicial</label>
      <input type="date" id="start">
    </div>
    <div>
      <label>Data final</label>
      <input type="date" id="end">
    </div>
    <button onclick="carregar()">Filtrar</button>
  </div>
</div>

<div class="grid">
  <div class="card"><div class="num" id="visitantes">0</div><div class="lbl">👀 Visitantes</div></div>
  <div class="card"><div class="num" id="servicos">0</div><div class="lbl">📦 Serviços clicados</div></div>
  <div class="card"><div class="num" id="planos">0</div><div class="lbl">📋 Planos clicados</div></div>
  <div class="card"><div class="num" id="checkout">0</div><div class="lbl">💳 Checkouts</div></div>
  <div class="card"><div class="num" id="pix">0</div><div class="lbl">🟢 Pix gerados</div></div>
  <div class="card"><div class="num" id="vendas">0</div><div class="lbl">🛒 Vendas</div></div>
  <div class="card"><div class="num" id="faturamento">R$0</div><div class="lbl">💰 Faturamento</div></div>
  <div class="card"><div class="num" id="ticket">R$0</div><div class="lbl">🎯 Ticket médio</div></div>
</div>

<div class="section">
  <h2>⚠️ Principal ponto de perda</h2>
  <div class="row"><span id="gargalo">Calculando...</span><strong class="bad" id="gargaloPct">0%</strong></div>
  <div class="small">Mostra onde mais clientes estão parando no período escolhido.</div>
</div>

<div class="section">
  <h2>📊 Funil de conversão</h2>
  <div id="funil"></div>
</div>

<div class="two">
  <div class="section">
    <h2>🔥 Serviços mais clicados</h2>
    <div id="servicosDetalhes"></div>
    <div id="pagServicos" class="paginacao"></div>
  </div>

  <div class="section">
    <h2>🏆 Planos mais clicados</h2>
    <div id="planosDetalhes"></div>
    <div id="pagPlanos" class="paginacao"></div>
  </div>
</div>

<div class="two">
  <div class="section">
    <h2>🟢 Pedidos / Pix Gerados</h2>
    <div id="ultimosPix"></div>
    <div id="pagPix" class="paginacao"></div>
  </div>

  <div class="section">
    <h2>🛒 Vendas Confirmadas</h2>
    <div id="ultimasVendas"></div>
    <div id="pagVendas" class="paginacao"></div>
  </div>
</div>

<div class="section">
  <h2>📅 Resultado por dia</h2>
  <div id="dias"></div>
  <div id="pagDias" class="paginacao"></div>
</div>

<script>
const senha = new URLSearchParams(location.search).get('senha') || '';
let dadosGlobais = null;

const paginas = {
  servicos: 0,
  planos: 0,
  pix: 0,
  vendas: 0,
  dias: 0
};

const porPagina = 10;

function brDate(d){
  return d.toISOString().slice(0,10);
}

function setPreset(){
  const p = document.getElementById('preset').value;
  const hoje = new Date();
  let ini = new Date();
  let fim = new Date();

  if(p === 'today'){ ini = hoje; fim = hoje; }
  if(p === 'yesterday'){ ini.setDate(hoje.getDate() - 1); fim.setDate(hoje.getDate() - 1); }
  if(p === '7'){ ini.setDate(hoje.getDate() - 6); fim = hoje; }
  if(p === '30'){ ini.setDate(hoje.getDate() - 29); fim = hoje; }
  if(p === 'month'){ ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1); fim = hoje; }

  if(p !== 'custom'){
    document.getElementById('start').value = brDate(ini);
    document.getElementById('end').value = brDate(fim);
    carregar();
  }
}

function paginar(arr, pagina){
  const inicio = pagina * porPagina;
  return arr.slice(inicio, inicio + porPagina);
}

function botoesPaginacao(total, pagina, tipo, el){
  const totalPaginas = Math.ceil(total / porPagina) || 1;

  document.getElementById(el).innerHTML =
    '<button onclick="mudarPagina(\\''+tipo+'\\', -1)">← Anterior</button>' +
    '<span>Página '+(pagina + 1)+' de '+totalPaginas+'</span>' +
    '<button onclick="mudarPagina(\\''+tipo+'\\', 1)">Próximos 10 →</button>';
}

function mudarPagina(tipo, dir){
  const listas = montarListas();
  const total = listas[tipo].length;
  const max = Math.max(0, Math.ceil(total / porPagina) - 1);

  paginas[tipo] = Math.min(max, Math.max(0, paginas[tipo] + dir));

  renderizarListas();
}

function montarListas(){
  const d = dadosGlobais || {};

  return {
    servicos: Object.entries(d.servicosDetalhes || {}).sort((a,b)=>b[1]-a[1]),
    planos: Object.entries(d.planosDetalhes || {}).sort((a,b)=>b[1]-a[1]),
    pix: d.pixDetalhes || [],
    vendas: d.vendasDetalhes || [],
    dias: Object.entries(d.dias || {}).reverse()
  };
}

function renderRanking(arr, pagina, el, pagEl, tipo){
  const itens = paginar(arr, pagina);

  document.getElementById(el).innerHTML = itens.length ? itens.map(([k,v]) =>
    '<div class="row"><span>'+k+'</span><strong>'+v+'</strong></div>'
  ).join('') : '<div class="row"><span>Nenhum dado</span><strong>0</strong></div>';

  botoesPaginacao(arr.length, pagina, tipo, pagEl);
}

function renderEventos(arr, pagina, el, pagEl, tipo){
  const itens = paginar(arr, pagina);

  document.getElementById(el).innerHTML = itens.length ? itens.map(i =>
    '<div class="row"><span>'+i.hora+'<br><small>'+i.info+'</small></span><strong>'+i.valor+'</strong></div>'
  ).join('') : '<div class="row"><span>Nenhum dado</span><strong>-</strong></div>';

  botoesPaginacao(arr.length, pagina, tipo, pagEl);
}

function renderDias(arr, pagina){
  const itens = paginar(arr, pagina);

  document.getElementById('dias').innerHTML = itens.length ? itens.map(([dia,x]) =>
    '<div class="row"><span>'+dia+'</span><strong>Pix: '+x.pix+' | Vendas: '+x.vendas+' | Fat: '+formatBR(x.faturamento)+'</strong></div>'
  ).join('') : '<div class="row"><span>Nenhum dado</span><strong>-</strong></div>';

  botoesPaginacao(arr.length, pagina, 'dias', 'pagDias');
}

function renderizarListas(){
  const listas = montarListas();

  renderRanking(listas.servicos, paginas.servicos, 'servicosDetalhes', 'pagServicos', 'servicos');
  renderRanking(listas.planos, paginas.planos, 'planosDetalhes', 'pagPlanos', 'planos');
  renderEventos(listas.pix, paginas.pix, 'ultimosPix', 'pagPix', 'pix');
  renderEventos(listas.vendas, paginas.vendas, 'ultimasVendas', 'pagVendas', 'vendas');
  renderDias(listas.dias, paginas.dias);
}

function etapa(nome, atual, anterior, conversao, queda){
  const largura = anterior > 0 ? Math.min(100, (atual / anterior) * 100) : 0;

  return '<div style="margin-bottom:14px">'+
    '<div class="row"><span>'+nome+'</span><strong>'+atual+' <small class="good">('+conversao+')</small> <small class="bad">queda '+queda+'</small></strong></div>'+
    '<div class="bar"><div class="fill" style="width:'+largura+'%"></div></div>'+
  '</div>';
}

async function carregar(){
  const start = document.getElementById('start').value;
  const end = document.getElementById('end').value;

  const url = '/dashboard-data?senha=' + encodeURIComponent(senha) +
    '&start=' + encodeURIComponent(start) +
    '&end=' + encodeURIComponent(end);

  const r = await fetch(url);
  const d = await r.json();
  dadosGlobais = d;

  paginas.servicos = 0;
  paginas.planos = 0;
  paginas.pix = 0;
  paginas.vendas = 0;
  paginas.dias = 0;

  document.getElementById('visitantes').textContent = d.visitantes;
  document.getElementById('servicos').textContent = d.servicos;
  document.getElementById('planos').textContent = d.planos;
  document.getElementById('checkout').textContent = d.checkout;
  document.getElementById('pix').textContent = d.pix;
  document.getElementById('vendas').textContent = d.vendas;
  document.getElementById('faturamento').textContent = d.faturamentoFormatado;
  document.getElementById('ticket').textContent = d.ticketMedioFormatado;

  document.getElementById('gargalo').textContent = d.maiorGargalo;
  document.getElementById('gargaloPct').textContent = d.maiorGargaloPercentual;

  document.getElementById('funil').innerHTML =
    etapa('Visitante → Serviço', d.servicos, d.visitantes, d.funil.visitanteServico, d.funil.quedaVisitanteServico) +
    etapa('Serviço → Plano', d.planos, d.servicos, d.funil.servicoPlano, d.funil.quedaServicoPlano) +
    etapa('Plano → Checkout', d.checkout, d.planos, d.funil.planoCheckout, d.funil.quedaPlanoCheckout) +
    etapa('Checkout → Pix', d.pix, d.checkout, d.funil.checkoutPix, d.funil.quedaCheckoutPix) +
    etapa('Pix → Venda', d.vendas, d.pix, d.funil.pixVenda, d.funil.quedaPixVenda);

  renderizarListas();
}

function formatBR(centavos){
  return (centavos / 100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

setPreset();
setInterval(carregar, 30000);
</script>

</body>
</html>
  `);
});



app.get('/instagram/perfil', async (req, res) => {
  try {
    const user = String(req.query.user || '')
      .replace('@', '')
      .replace('https://www.instagram.com/', '')
      .replace('https://instagram.com/', '')
      .split('/')[0]
      .split('?')[0]
      .trim();

    if (!user) {
      return res.status(400).json({
        success:false,
        error:'Usuário inválido'
      });
    }

    const run = await axios.post(
      'https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items',
      {
        usernames: [user]
      },
      {
        params: {
          token: APIFY_TOKEN
        }
      }
    );

    const perfil = run.data?.[0];

    if (!perfil) {
      return res.json({
        success:false,
        error:'Perfil não encontrado'
      });
    }

    return res.json({
  success:true,
  username: perfil.username,
  nome: perfil.fullName || perfil.username,
  seguidores: perfil.followersCount || 0,
  seguindo: perfil.followsCount || 0,
  posts: perfil.postsCount || 0,
  foto: perfil.profilePicUrl,
  link: `https://instagram.com/${perfil.username}`
});

  } catch(err) {
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      success:false,
      error:'Erro ao consultar Instagram'
    });
  }
});
app.get('/instagram/posts', async (req, res) => {
  try {
    const user = String(req.query.user || '')
      .replace('@', '')
      .replace('https://www.instagram.com/', '')
      .replace('https://instagram.com/', '')
      .split('/')[0]
      .split('?')[0]
      .trim();

    if (!user) {
      return res.status(400).json({ success:false, posts:[] });
    }

    const run = await axios.post(
      'https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items',
      {
        directUrls: [`https://www.instagram.com/${user}/`],
        resultsType: 'posts',
       resultsLimit: 50,
        searchType: 'user'
      },
      {
        params: {
          token: APIFY_TOKEN
        }
      }
    );

    const posts = (run.data || [])
      .slice(0, 12)
      .map(post => ({
        url: post.url || `https://www.instagram.com/p/${post.shortCode || post.shortcode}/`,
        thumb: post.displayUrl || post.imageUrl || post.thumbnailUrl || post.videoUrl || '',
        caption: post.caption || '',
        tipo: post.type || post.productType || ''
      }))
      .filter(post => post.url);

    return res.json({
      success: true,
      posts
    });

  } catch (err) {
    console.error('[ERRO instagram posts]', err.response?.data || err.message);
    return res.status(500).json({ success:false, posts:[] });
  }
});

app.get('/proxy-img', async (req, res) => {
  try {
    const url = req.query.url;

    if (!url || !url.startsWith('https://')) {
      return res.status(400).send('URL inválida');
    }

    const img = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.instagram.com/'
      }
    });

    res.set('Content-Type', img.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');

    return res.send(img.data);

  } catch (err) {
    console.error('[ERRO proxy-img]', err.message);
    return res.status(500).send('Erro ao carregar imagem');
  }
});

app.post('/criar-pedido', async (req, res) => {
  try {
    const {
      nome,
      telefone,
      instagram,
      servico,
      plano,
      pagamento,
      bump,
      bump_publicacao
    } = req.body;

    if (!nome || !telefone || !instagram || !servico || !plano) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const chave = `${servico}__${plano}`;
    const valorBaseCentavos = PRECOS[chave];
    const smmId = SERVICO_MAP[chave];

    if (!valorBaseCentavos || !smmId) {
      return res.status(400).json({ error: 'Servico ou plano invalido' });
    }

    // Se o order bump (500 curtidas) estiver ativo, soma o valor dele ao total cobrado.
    // O valor do bump cobrado ao cliente é o que o checkout calculou (R$ 4,90 promocional);
    // aqui usamos o valor informado pelo front (req.body.valor) como fonte de verdade do total,
    // caindo de volta no cálculo manual se não vier.
    const bumpAtivo = bump === true;
    const valorTotalCentavos = req.body.valor
      ? Math.round(Number(req.body.valor) * 100)
      : valorBaseCentavos + (bumpAtivo ? BUMP_VALOR_CENTAVOS : 0);

    const pedidoId = uuidv4();
    const valorReais = Number((valorTotalCentavos / 100).toFixed(2));

    let gateway = 'pushinpay';
    let payment = null;
    let pixData = null;

    try {
      const pushResp = await axios.post(
        'https://api.pushinpay.com.br/api/pix/cashIn',
        {
          value: valorTotalCentavos,
          webhook_url: 'https://midianetdigital.onrender.com/webhook-pushinpay'
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PUSHINPAY_TOKEN}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      payment = pushResp.data;
      console.log("PUSHIN RETORNO:");
console.log(JSON.stringify(payment, null, 2));

      pixData = {
        qr_code: payment.qr_code,
        qr_code_base64: payment.qr_code_base64
      };

      console.log(`[PUSHINPAY] Pix criado: ${payment.id}`);

    } catch (pushErr) {
      console.error('[PUSHINPAY] Erro, tentando Mercado Pago:', pushErr.response?.data || pushErr.message);

      gateway = 'mercado_pago';

      const mpResp = await axios.post(
        'https://api.mercadopago.com/v1/payments',
        {
          transaction_amount: valorReais,
          description: `MidiaNetDigital - ${servico} ${plano}`,
          payment_method_id: 'pix',
          external_reference: pedidoId,
          notification_url: 'https://midianetdigital.onrender.com/webhook-mercadopago',
          payer: {
            email: `cliente_${pedidoId.slice(0, 8)}@midianetdigital.com`,
            first_name: nome
          }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': pedidoId
          }
        }
      );

      payment = mpResp.data;
      pixData = payment.point_of_interaction?.transaction_data;

      console.log(`[MERCADO PAGO] Pix criado como backup: ${payment.id}`);
    }

    pedidos[pedidoId] = {
      id: pedidoId,
      nome,
      telefone,
      instagram,
      servico,
      plano,
      pagamento: 'pix',
      valor: valorTotalCentavos,
      smmId,
      // ── Order bump (500 curtidas brasileiras, divididas em até 2 publicações) ──
      bump: bumpAtivo,
      bump_publicacao: bump_publicacao || null,
      bumpSmmId: BUMP_SMM_ID,
      status: 'aguardando_pagamento',
      gateway,
      paymentId: payment.id,
      mercadoPagoPaymentId: gateway === 'mercado_pago' ? payment.id : null,
      pushinPayPaymentId: gateway === 'pushinpay' ? payment.id : null,
      criadoEm: new Date().toISOString(),
    };

    await registrarEvento(
      'pix',
      `${nome} | ${telefone} | ${instagram} | ${servico} ${plano}${bumpAtivo ? ' + bump 500 curtidas' : ''}`,
      valorReais
    );

console.log("BASE64:", pixData?.qr_code_base64?.substring(0,50));

return res.json({
  success: true,
  pedidoId,
  gateway,
  valor: valorReais.toFixed(2),
  pix: {
    copia_e_cola: pixData?.qr_code || null,
qr_code_image: pixData?.qr_code_base64 || null,
    expira_em: null,
  },
  paymentId: payment.id
});

  } catch (err) {
    console.error('[ERRO criar-pedido]', err.response?.data || err.message);
    return res.status(500).json({
      error: 'Erro ao criar pedido',
      detail: err.response?.data || err.message
    });
  }
});

app.post('/webhook-pushinpay', async (req, res) => {
  try {
    console.log('[WEBHOOK PUSHINPAY]', JSON.stringify(req.body, null, 2));

    const paymentId = req.body?.id;
    const status = req.body?.status;

    if (!paymentId || status !== 'paid') {
      return res.status(200).json({ received: true });
    }

    const pedido = Object.values(pedidos).find(p =>
  String(p.pushinPayPaymentId).toLowerCase() === String(paymentId).toLowerCase()
);

    if (!pedido) {
      console.warn(`[PUSHINPAY] Pedido nao encontrado: ${paymentId}`);
      return res.status(200).json({ received: true });
    }

    if (pedido.status !== 'aguardando_pagamento') {
  console.log(`[PUSHINPAY] Pedido ${pedido.id} já está em processamento ou concluído: ${pedido.status}`);
  return res.status(200).json({ received: true });
}

pedido.status = 'processando_smm';

console.log(`[SMM] Enviando pedido PushinPay para plataforma SMM: ${pedido.instagram}`);

const smmData = await enviarPedidoSMM(pedido);

    // ── Order bump: se o cliente comprou as 500 curtidas extras, envia um segundo
    // pedido SMM para a(s) publicação(ões) selecionada(s) no bump, separado do pedido principal.
    let bumpData = null;
    try {
      bumpData = await enviarBumpSMM(pedido);
      if (bumpData) {
        console.log(`[SMM BUMP] 500 curtidas enviadas para a publicação do bump. Order: ${bumpData.order}`);
      }
    } catch (bumpErr) {
      console.error('[ERRO SMM BUMP - PushinPay]', bumpErr.response?.data || bumpErr.message);
      // Não derruba o pedido principal por causa de falha no bump; loga e segue.
    }

    pedido.status = 'concluido';
    pedido.smmOrderId = smmData.order;
    pedido.bumpSmmOrderId = bumpData ? bumpData.order : null;
    pedido.concluidoEm = new Date().toISOString();

    await registrarEvento(
      'venda',
      `${pedido.nome} | ${pedido.telefone} | ${pedido.instagram} | ${pedido.servico} ${pedido.plano}${pedido.bump ? ' + bump 500 curtidas' : ''}`,
      Number((pedido.valor / 100).toFixed(2))
    );

    await enviarPurchaseMeta(pedido);

    console.log(`[SUCESSO PUSHINPAY] Pedido ${pedido.id} concluido. SMM: ${smmData.order}${bumpData ? ' | Bump SMM: ' + bumpData.order : ''}`);

    return res.status(200).json({ received: true, smmOrder: smmData.order, bumpOrder: bumpData ? bumpData.order : null });

  } catch (err) {
    console.error('[ERRO webhook PushinPay]', err.response?.data || err.message);
    return res.status(200).json({ received: true });
  }
});

app.post('/webhook-mercadopago', async (req, res) => {
  try {
    console.log('[WEBHOOK MP]', JSON.stringify(req.body, null, 2));

    const paymentId =
      req.body?.data?.id ||
      req.query?.id ||
      req.query?.['data.id'];

    if (!paymentId) {
      return res.status(200).json({ received: true });
    }

    const paymentResp = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        }
      }
    );

    const payment = paymentResp.data;

    if (payment.status !== 'approved') {
      console.log(`[MP] Pagamento ainda nao aprovado: ${payment.status}`);
      return res.status(200).json({ received: true });
    }

    const pedidoId = payment.external_reference;
    const pedido = pedidos[pedidoId];

    if (!pedido) {
      console.warn(`[MP] Pedido nao encontrado: ${pedidoId}`);
      return res.status(200).json({ received: true });
    }

    if (pedido.status !== 'aguardando_pagamento') {
  console.log(`[MP] Pedido ${pedidoId} já está em processamento ou concluído: ${pedido.status}`);
  return res.status(200).json({ received: true });
}

pedido.status = 'processando_smm';

console.log(`[SMM] Enviando pedido para plataforma SMM: ${pedido.instagram}`);

const smmData = await enviarPedidoSMM(pedido);

    // ── Order bump: mesmo tratamento aplicado no webhook do PushinPay ──
    let bumpData = null;
    try {
      bumpData = await enviarBumpSMM(pedido);
      if (bumpData) {
        console.log(`[SMM BUMP] 500 curtidas enviadas para a publicação do bump. Order: ${bumpData.order}`);
      }
    } catch (bumpErr) {
      console.error('[ERRO SMM BUMP - Mercado Pago]', bumpErr.response?.data || bumpErr.message);
    }

    pedidos[pedidoId].status = 'concluido';
    pedidos[pedidoId].smmOrderId = smmData.order;
    pedidos[pedidoId].bumpSmmOrderId = bumpData ? bumpData.order : null;
    pedidos[pedidoId].concluidoEm = new Date().toISOString();

    await registrarEvento(
      'venda',
      `${pedido.servico} ${pedido.plano}${pedido.bump ? ' + bump 500 curtidas' : ''}`,
      Number((pedido.valor / 100).toFixed(2))
    );

    await enviarPurchaseMeta(pedidos[pedidoId]);

    console.log(`[SUCESSO] Pedido ${pedidoId} concluido. SMM: ${smmData.order}${bumpData ? ' | Bump SMM: ' + bumpData.order : ''}`);

    return res.status(200).json({ received: true, smmOrder: smmData.order, bumpOrder: bumpData ? bumpData.order : null });

  } catch (err) {
    console.error('[ERRO webhook MP]', err.response?.data || err.message);
    return res.status(200).json({ received: true });
  }
});

app.get('/status/:pedidoId', (req, res) => {
  const pedido = pedidos[req.params.pedidoId];

  if (!pedido) {
    return res.status(404).json({ error: 'Pedido nao encontrado' });
  }

  return res.json({
    pedidoId: pedido.id,
    status: pedido.status,
    servico: pedido.servico,
    plano: pedido.plano,
    instagram: pedido.instagram,
    smmOrderId: pedido.smmOrderId || null,
    bump: pedido.bump || false,
    bumpSmmOrderId: pedido.bumpSmmOrderId || null,
  });
});

app.get('/servicos-smm', async (req, res) => {
  try {
    const resp = await axios.post(
      process.env.SMM_API_URL,
      new URLSearchParams({
        key: process.env.SMM_API_KEY,
        action: 'services',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const servicos = Array.isArray(resp.data)
      ? resp.data.filter(s =>
          s.name?.toLowerCase().includes('instagram') ||
          s.category?.toLowerCase().includes('instagram')
        )
      : resp.data;

    return res.json(servicos);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/health', async (req, res) => {
  const eventos = await buscarEventos();

  res.json({
    status: 'ok',
    gateway: 'mercado_pago',
    supabase: SUPABASE_URL ? 'configurado' : 'ausente',
    meta_pixel: process.env.META_PIXEL_ID ? 'configurado' : 'ausente',
    pedidos_em_memoria: Object.keys(pedidos).length,
    eventos_salvos: eventos.length,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════╗
  ║  MidiaNetDigital Backend           ║
  ║  Rodando na porta ${PORT}             ║
  ║  Mercado Pago + EngajaMidia + Meta ║
  ║  Dashboard com Supabase ativo      ║
  ╚════════════════════════════════════╝
  `);
});
