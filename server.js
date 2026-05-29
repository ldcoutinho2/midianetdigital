require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const cors    = require('cors');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARES ────────────────────────────────────────────
app.use(cors({ origin: process.env.SITE_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── MAPEAMENTO: servico+plano → ID do serviço na EngajaMidia
// IMPORTANTE: troque os números pelos IDs reais do seu painel
// Acesse https://engajamidia.com e veja os IDs na lista de serviços
const SERVICO_MAP = {
  // formato: "servico__quantidade": id_na_engajamidia
  'seguidores-brasileiros__100':   '1095',
  'seguidores-brasileiros__250':   '1095',
  'seguidores-brasileiros__500':   '1095',
  'seguidores-brasileiros__1000':  '1095',
  'seguidores-brasileiros__2000':  '1095',
  'seguidores-brasileiros__5000':  '1095',

  'seguidores-mundiais__100':      '1172',
  'seguidores-mundiais__250':      '1172',
  'seguidores-mundiais__500':      '1172',
  'seguidores-mundiais__1000':     '1172',
  'seguidores-mundiais__2000':     '1172',
  'seguidores-mundiais__5000':     '1172',

  'seguidores-organicos__250':     '1125',
  'seguidores-organicos__500':     '1125',
  'seguidores-organicos__1000':    '1125',
  'seguidores-organicos__2000':    '1125',

  'curtidas-brasileiras__50':      '1234',
  'curtidas-brasileiras__100':     '1234',
  'curtidas-brasileiras__250':     '1234',
  'curtidas-brasileiras__500':     '1234',
  'curtidas-brasileiras__1000':    '1234',
  'curtidas-brasileiras__2000':    '1234',

  'visualizacoes__500':            '1013',
  'visualizacoes__1000':           '1013',
  'visualizacoes__2500':           '1013',
  'visualizacoes__5000':           '1013',
  'visualizacoes__10000':          '1013',
  'visualizacoes__25000':          '1013',

  'comentarios__10':               '580',
  'comentarios__25':               '580',
  'comentarios__50':               '580',
  'comentarios__100':              '580',
};

// ─── TABELA DE PREÇOS (em centavos para o PagBank) ──────────
const PRECOS = {
  'seguidores-brasileiros__100':   890,
  'seguidores-brasileiros__250':   1490,
  'seguidores-brasileiros__500':   2490,
  'seguidores-brasileiros__1000':  3990,
  'seguidores-brasileiros__2000':  6990,
  'seguidores-brasileiros__5000':  14990,

  'seguidores-mundiais__100':      490,
  'seguidores-mundiais__250':      890,
  'seguidores-mundiais__500':      1490,
  'seguidores-mundiais__1000':     2490,
  'seguidores-mundiais__2000':     4490,
  'seguidores-mundiais__5000':     8990,

  'seguidores-organicos__250':     2490,
  'seguidores-organicos__500':     4490,
  'seguidores-organicos__1000':    7990,
  'seguidores-organicos__2000':    13990,

  'curtidas-brasileiras__50':      390,
  'curtidas-brasileiras__100':     490,
  'curtidas-brasileiras__250':     990,
  'curtidas-brasileiras__500':     1490,
  'curtidas-brasileiras__1000':    2490,
  'curtidas-brasileiras__2000':    3990,

  'visualizacoes__500':            390,
  'visualizacoes__1000':           590,
  'visualizacoes__2500':           990,
  'visualizacoes__5000':           1490,
  'visualizacoes__10000':          2490,
  'visualizacoes__25000':          4490,

  'comentarios__10':               1290,
  'comentarios__25':               2490,
  'comentarios__50':               3990,
  'comentarios__100':              6990,
};

// ─── PEDIDOS EM MEMÓRIA (em produção use um banco de dados) ──
// Para persistência real, use Railway + PostgreSQL ou MongoDB Atlas
const pedidos = {};

// ════════════════════════════════════════════════════════════
// ROTA 1: Criar pedido + gerar Pix no PagBank
// POST /criar-pedido
// Body: { nome, instagram, servico, plano, pagamento }
// ════════════════════════════════════════════════════════════
app.post('/criar-pedido', async (req, res) => {
  try {
    const { nome, instagram, servico, plano, pagamento } = req.body;

    // Validação básica
    if (!nome || !instagram || !servico || !plano) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const chave = `${servico}__${plano}`;
    const valor = PRECOS[chave];
    const smmId = SERVICO_MAP[chave];

    if (!valor) {
      return res.status(400).json({ error: 'Servico ou plano invalido' });
    }

    const pedidoId = uuidv4();

    // ── Gerar cobrança no PagBank ──────────────────────────
    const pagbankBody = {
      reference_id: pedidoId,
      customer: {
        name: nome,
        email: `cliente_${pedidoId.slice(0,8)}@midianetdigital.com`,
        tax_id: '00000000000', // CPF generico - idealmente peça no formulário
      },
      items: [{
        reference_id: chave,
        name: `${servico} - ${plano}`,
        quantity: 1,
        unit_amount: valor,
      }],
      qr_codes: [{
        amount: { value: valor },
        expiration_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
      }],
      notification_urls: [
        `${process.env.SITE_URL || 'https://seu-backend.railway.app'}/webhook-pagbank`
      ],
    };

    const pagbankResp = await axios.post(
      `${process.env.PAGBANK_BASE_URL}/orders`,
      pagbankBody,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const order = pagbankResp.data;
    const qrCode = order.qr_codes?.[0];

    // Salva pedido em memória enquanto aguarda pagamento
    pedidos[pedidoId] = {
      id: pedidoId,
      nome,
      instagram,
      servico,
      plano,
      pagamento,
      valor,
      smmId,
      status: 'aguardando_pagamento',
      pagbankOrderId: order.id,
      criadoEm: new Date().toISOString(),
    };

    console.log(`[PEDIDO] Criado: ${pedidoId} | ${servico} ${plano} | ${nome} | ${instagram}`);

    return res.json({
      success: true,
      pedidoId,
      valor: (valor / 100).toFixed(2),
      pix: {
        copia_e_cola: qrCode?.text,
        qr_code_image: qrCode?.links?.find(l => l.media === 'image/png')?.href,
        expira_em: qrCode?.expiration_date,
      },
      pagbankOrderId: order.id,
    });

  } catch (err) {
    console.error('[ERRO criar-pedido]', err.response?.data || err.message);
    return res.status(500).json({
      error: 'Erro ao criar pedido',
      detail: err.response?.data || err.message
    });
  }
});

// ════════════════════════════════════════════════════════════
// ROTA 2: Webhook do PagBank — chamado automaticamente
// POST /webhook-pagbank
// ════════════════════════════════════════════════════════════
app.post('/webhook-pagbank', async (req, res) => {
  try {
    const evento = req.body;
    console.log('[WEBHOOK]', JSON.stringify(evento, null, 2));

    // PagBank envia: { event: "CHARGE.PAID", charges: [...] }
    // ou: { event: "ORDER.PAID", reference_id: "...", charges: [...] }
    const isPago = evento.event === 'CHARGE.PAID' || evento.event === 'ORDER.PAID';

    if (!isPago) {
      return res.status(200).json({ received: true }); // ignora outros eventos
    }

    // Pega o reference_id (nosso pedidoId)
    const pedidoId = evento.reference_id ||
                     evento.charges?.[0]?.reference_id ||
                     evento.order?.reference_id;

    const pedido = pedidos[pedidoId];
    if (!pedido) {
      console.warn(`[WEBHOOK] Pedido nao encontrado: ${pedidoId}`);
      return res.status(200).json({ received: true });
    }

    if (pedido.status === 'concluido') {
      console.log(`[WEBHOOK] Pedido ja processado: ${pedidoId}`);
      return res.status(200).json({ received: true });
    }

    // ── Dispara pedido na EngajaMidia ──────────────────────
    console.log(`[SMM] Disparando pedido para ${pedido.instagram} | servico ID: ${pedido.smmId}`);

    const smmResp = await axios.post(
      process.env.SMM_API_URL,
      new URLSearchParams({
        key:      process.env.SMM_API_KEY,
        action:   'add',
        service:  pedido.smmId,
        link:     pedido.instagram.startsWith('http')
                    ? pedido.instagram
                    : `https://instagram.com/${pedido.instagram.replace('@', '')}`,
        quantity: pedido.plano,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const smmData = smmResp.data;
    console.log('[SMM] Resposta:', smmData);

    // Atualiza status do pedido
    pedidos[pedidoId].status       = 'concluido';
    pedidos[pedidoId].smmOrderId   = smmData.order;
    pedidos[pedidoId].concluidoEm  = new Date().toISOString();

    console.log(`[SUCESSO] Pedido ${pedidoId} concluido! SMM order: ${smmData.order}`);

    return res.status(200).json({ received: true, smmOrder: smmData.order });

  } catch (err) {
    console.error('[ERRO webhook]', err.response?.data || err.message);
    // Retorna 200 para o PagBank nao tentar de novo
    return res.status(200).json({ received: true });
  }
});

// ════════════════════════════════════════════════════════════
// ROTA 3: Verificar status do pedido (polling do frontend)
// GET /status/:pedidoId
// ════════════════════════════════════════════════════════════
app.get('/status/:pedidoId', (req, res) => {
  const pedido = pedidos[req.params.pedidoId];
  if (!pedido) {
    return res.status(404).json({ error: 'Pedido nao encontrado' });
  }
  return res.json({
    pedidoId:  pedido.id,
    status:    pedido.status,
    servico:   pedido.servico,
    plano:     pedido.plano,
    instagram: pedido.instagram,
    smmOrderId: pedido.smmOrderId || null,
  });
});

// ════════════════════════════════════════════════════════════
// ROTA 4: Listar serviços disponíveis na EngajaMidia
// GET /servicos-smm  (use para pegar os IDs reais)
// ════════════════════════════════════════════════════════════
app.get('/servicos-smm', async (req, res) => {
  try {
    const resp = await axios.post(
      process.env.SMM_API_URL,
      new URLSearchParams({
        key:    process.env.SMM_API_KEY,
        action: 'services',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    // Filtra só Instagram
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

// ════════════════════════════════════════════════════════════
// ROTA 5: Health check
// ════════════════════════════════════════════════════════════
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    pedidos_em_memoria: Object.keys(pedidos).length,
    timestamp: new Date().toISOString()
  });
});

// ─── START ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════╗
  ║  MidiaNetDigital Backend           ║
  ║  Rodando na porta ${PORT}             ║
  ║  PagBank + EngajaMidia             ║
  ╚════════════════════════════════════╝
  `);
});
