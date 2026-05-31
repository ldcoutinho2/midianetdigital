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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    gateway: 'mercado_pago',
    meta_pixel: process.env.META_PIXEL_ID ? 'configurado' : 'ausente',
    pedidos_em_memoria: Object.keys(pedidos).length,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════╗
  ║  MidiaNetDigital Backend           ║
  ║  Rodando na porta ${PORT}             ║
  ║  Mercado Pago + EngajaMidia + Meta ║
  ╚════════════════════════════════════╝
  `);
});
