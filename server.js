require('dotenv').config();
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
  'seguidores-brasileiros__100': '1095',
  'seguidores-brasileiros__250': '1095',
  'seguidores-brasileiros__500': '1095',
  'seguidores-brasileiros__1000': '1095',
  'seguidores-brasileiros__2000': '1095',
  'seguidores-brasileiros__5000': '1095',

  'seguidores-mundiais__100': '1172',
  'seguidores-mundiais__250': '1172',
  'seguidores-mundiais__500': '1172',
  'seguidores-mundiais__1000': '1172',
  'seguidores-mundiais__2000': '1172',
  'seguidores-mundiais__5000': '1172',

  'seguidores-organicos__250': '1125',
  'seguidores-organicos__500': '1125',
  'seguidores-organicos__1000': '1125',
  'seguidores-organicos__2000': '1125',

  'curtidas-brasileiras__50': '1234',
  'curtidas-brasileiras__100': '1234',
  'curtidas-brasileiras__250': '1234',
  'curtidas-brasileiras__500': '1234',
  'curtidas-brasileiras__1000': '1234',
  'curtidas-brasileiras__2000': '1234',

  'visualizacoes__500': '1013',
  'visualizacoes__1000': '1013',
  'visualizacoes__2500': '1013',
  'visualizacoes__5000': '1013',
  'visualizacoes__10000': '1013',
  'visualizacoes__25000': '1013',

  'comentarios__10': '580',
  'comentarios__25': '580',
  'comentarios__50': '580',
  'comentarios__100': '580',
};

const PRECOS = {
  'seguidores-brasileiros__100': 890,
  'seguidores-brasileiros__250': 1490,
  'seguidores-brasileiros__500': 2490,
  'seguidores-brasileiros__1000': 3990,
  'seguidores-brasileiros__2000': 6990,
  'seguidores-brasileiros__5000': 14990,

  'seguidores-mundiais__100': 490,
  'seguidores-mundiais__250': 890,
  'seguidores-mundiais__500': 1490,
  'seguidores-mundiais__1000': 2490,
  'seguidores-mundiais__2000': 4490,
  'seguidores-mundiais__5000': 8990,

  'seguidores-organicos__250': 2490,
  'seguidores-organicos__500': 4490,
  'seguidores-organicos__1000': 7990,
  'seguidores-organicos__2000': 13990,

  'curtidas-brasileiras__50': 390,
  'curtidas-brasileiras__100': 490,
  'curtidas-brasileiras__250': 990,
  'curtidas-brasileiras__500': 1490,
  'curtidas-brasileiras__1000': 2490,
  'curtidas-brasileiras__2000': 3990,

  'visualizacoes__500': 390,
  'visualizacoes__1000': 590,
  'visualizacoes__2500': 990,
  'visualizacoes__5000': 1490,
  'visualizacoes__10000': 2490,
  'visualizacoes__25000': 4490,

  'comentarios__10': 1290,
  'comentarios__25': 2490,
  'comentarios__50': 3990,
  'comentarios__100': 6990,
};

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

async function buscarEventos() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  const resp = await axios.get(
    `${SUPABASE_URL}/rest/v1/eventos?select=*&order=created_at.desc&limit=10000`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    }
  );

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
    ultimasVendas: []
  };

  eventos.forEach(e => {
    if (e.tipo === 'visitante') dados.visitantes++;

    if (e.tipo === 'servico') {
      dados.servicos++;
      incrementarDetalhe(dados.servicosDetalhes, e.nome);
    }

    if (e.tipo === 'plano') {
      dados.planos++;
      incrementarDetalhe(dados.planosDetalhes, e.nome);
    }

    if (e.tipo === 'checkout') dados.checkout++;
    if (e.tipo === 'pix') dados.pix++;

    if (e.tipo === 'venda') {
      dados.vendas++;
      dados.faturamento += Math.round(Number(e.valor || 0) * 100);
      dados.ultimasVendas.push({
        hora: new Date(e.created_at).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        servico: e.nome || 'Venda',
        plano: '',
        valor: dinheiroBR(Math.round(Number(e.valor || 0) * 100))
      });
    }
  });

  const conversao = dados.visitantes > 0
    ? ((dados.vendas / dados.visitantes) * 100).toFixed(2)
    : '0.00';

  return {
    ...dados,
    faturamentoFormatado: dinheiroBR(dados.faturamento),
    conversao: `${conversao}%`
  };
}

async function enviarPedidoSMM(pedido) {
  const smmResp = await axios.post(
    process.env.SMM_API_URL,
    new URLSearchParams({
      key: process.env.SMM_API_KEY,
      action: 'add',
      service: pedido.smmId,
      link: pedido.instagram.startsWith('http')
        ? pedido.instagram
        : `https://instagram.com/${pedido.instagram.replace('@', '')}`,
      quantity: pedido.plano,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  return smmResp.data;
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

    if (process.env.DASHBOARD_PASSWORD && senha !== process.env.DASHBOARD_PASSWORD) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const eventos = await buscarEventos();
    const dados = montarDashboard(eventos);

    return res.json(dados);
  } catch (err) {
    console.error('[ERRO dashboard-data]', err.response?.data || err.message);
    return res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

app.get('/dashboard', (req, res) => {
  const senha = req.query.senha;

  if (process.env.DASHBOARD_PASSWORD && senha !== process.env.DASHBOARD_PASSWORD) {
    return res.send(`
      <h2>Acesso restrito</h2>
      <p>Use: /dashboard?senha=SUA_SENHA</p>
    `);
  }

  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Dashboard MidiaNetDigital</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:Poppins,sans-serif}
body{background:#080810;color:#f0f0f8;padding:24px}
h1{font-size:28px;margin-bottom:6px}
.sub{color:#8888aa;margin-bottom:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:24px}
.card{background:#111120;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:18px}
.num{font-size:28px;font-weight:800;color:#e8ff47}
.lbl{color:#8888aa;font-size:13px;margin-top:4px}
.box{background:#111120;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:18px;margin-bottom:18px}
.row{display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.07);padding:10px 0;color:#ddd}
.row:last-child{border-bottom:0}
.sale{font-size:14px;color:#ccc}
button{background:#e8ff47;color:#080810;border:0;padding:10px 18px;border-radius:999px;font-weight:800;cursor:pointer;margin-bottom:18px}
</style>
</head>
<body>
<h1>MidiaNetDigital Dashboard</h1>
<div class="sub">Dados salvos no Supabase</div>

<button onclick="carregar()">Atualizar</button>

<div class="grid">
  <div class="card"><div class="num" id="visitantes">0</div><div class="lbl">👀 Visitantes</div></div>
  <div class="card"><div class="num" id="servicos">0</div><div class="lbl">📦 Serviços</div></div>
  <div class="card"><div class="num" id="planos">0</div><div class="lbl">📋 Planos</div></div>
  <div class="card"><div class="num" id="checkout">0</div><div class="lbl">💳 Checkout</div></div>
  <div class="card"><div class="num" id="pix">0</div><div class="lbl">🟢 Pix Gerados</div></div>
  <div class="card"><div class="num" id="vendas">0</div><div class="lbl">🛒 Vendas</div></div>
  <div class="card"><div class="num" id="faturamento">R$0</div><div class="lbl">💰 Faturamento</div></div>
  <div class="card"><div class="num" id="conversao">0%</div><div class="lbl">📈 Conversão</div></div>
</div>

<div class="box">
  <h2>Funil</h2>
  <div id="funil"></div>
</div>

<div class="box">
  <h2>Serviços mais clicados</h2>
  <div id="servicosDetalhes"></div>
</div>

<div class="box">
  <h2>Planos mais clicados</h2>
  <div id="planosDetalhes"></div>
</div>

<div class="box">
  <h2>Últimas vendas</h2>
  <div id="ultimasVendas"></div>
</div>

<script>
const senha = new URLSearchParams(location.search).get('senha') || '';

function lista(obj){
  const entries = Object.entries(obj || {}).sort((a,b)=>b[1]-a[1]);
  if(!entries.length) return '<div class="row"><span>Nenhum dado ainda</span></div>';
  return entries.map(([k,v]) => '<div class="row"><span>'+k+'</span><strong>'+v+'</strong></div>').join('');
}

async function carregar(){
  const r = await fetch('/dashboard-data?senha=' + encodeURIComponent(senha));
  const d = await r.json();

  visitantes.textContent = d.visitantes;
  servicos.textContent = d.servicos;
  planos.textContent = d.planos;
  checkout.textContent = d.checkout;
  pix.textContent = d.pix;
  vendas.textContent = d.vendas;
  faturamento.textContent = d.faturamentoFormatado;
  conversao.textContent = d.conversao;

  funil.innerHTML =
    '<div class="row"><span>👀 Visitantes</span><strong>'+d.visitantes+'</strong></div>'+
    '<div class="row"><span>📦 Serviço Selecionado</span><strong>'+d.servicos+'</strong></div>'+
    '<div class="row"><span>📋 Plano Selecionado</span><strong>'+d.planos+'</strong></div>'+
    '<div class="row"><span>💳 Checkout</span><strong>'+d.checkout+'</strong></div>'+
    '<div class="row"><span>🟢 Pix Gerados</span><strong>'+d.pix+'</strong></div>'+
    '<div class="row"><span>🛒 Vendas</span><strong>'+d.vendas+'</strong></div>';

  servicosDetalhes.innerHTML = lista(d.servicosDetalhes);
  planosDetalhes.innerHTML = lista(d.planosDetalhes);

  if(!d.ultimasVendas.length){
    ultimasVendas.innerHTML = '<div class="row"><span>Nenhuma venda ainda</span></div>';
  } else {
    ultimasVendas.innerHTML = d.ultimasVendas.map(v =>
      '<div class="row sale"><span>'+v.hora+' - '+v.servico+'</span><strong>'+v.valor+'</strong></div>'
    ).join('');
  }
}

carregar();
setInterval(carregar, 10000);
</script>
</body>
</html>
  `);
});

app.post('/criar-pedido', async (req, res) => {
  try {
    const { nome, instagram, servico, plano, pagamento } = req.body;

    if (!nome || !instagram || !servico || !plano) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const chave = `${servico}__${plano}`;
    const valorCentavos = PRECOS[chave];
    const smmId = SERVICO_MAP[chave];

    if (!valorCentavos || !smmId) {
      return res.status(400).json({ error: 'Servico ou plano invalido' });
    }

    const pedidoId = uuidv4();
    const valorReais = Number((valorCentavos / 100).toFixed(2));

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

    const payment = mpResp.data;
    const pixData = payment.point_of_interaction?.transaction_data;

    pedidos[pedidoId] = {
      id: pedidoId,
      nome,
      instagram,
      servico,
      plano,
      pagamento,
      valor: valorCentavos,
      smmId,
      status: 'aguardando_pagamento',
      mercadoPagoPaymentId: payment.id,
      criadoEm: new Date().toISOString(),
    };

    await registrarEvento('pix', `${servico} ${plano}`, valorReais);

    console.log(`[PEDIDO MP] Criado: ${pedidoId} | Payment ID: ${payment.id}`);

    return res.json({
      success: true,
      pedidoId,
      valor: valorReais.toFixed(2),
      pix: {
        copia_e_cola: pixData?.qr_code,
        qr_code_image: pixData?.qr_code_base64
          ? `data:image/png;base64,${pixData.qr_code_base64}`
          : null,
        expira_em: null,
      },
      mercadoPagoPaymentId: payment.id,
    });

  } catch (err) {
    console.error('[ERRO criar-pedido MP]', err.response?.data || err.message);
    return res.status(500).json({
      error: 'Erro ao criar pedido',
      detail: err.response?.data || err.message
    });
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

    if (pedido.status === 'concluido') {
      return res.status(200).json({ received: true });
    }

    console.log(`[SMM] Enviando pedido para EngajaMidia: ${pedido.instagram}`);

    const smmData = await enviarPedidoSMM(pedido);

    pedidos[pedidoId].status = 'concluido';
    pedidos[pedidoId].smmOrderId = smmData.order;
    pedidos[pedidoId].concluidoEm = new Date().toISOString();

    await registrarEvento(
      'venda',
      `${pedido.servico} ${pedido.plano}`,
      Number((pedido.valor / 100).toFixed(2))
    );

    await enviarPurchaseMeta(pedidos[pedidoId]);

    console.log(`[SUCESSO] Pedido ${pedidoId} concluido. SMM: ${smmData.order}`);

    return res.status(200).json({ received: true, smmOrder: smmData.order });

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
