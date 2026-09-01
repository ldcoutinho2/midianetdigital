MIDIANET GROWTH V6 — CORREÇÃO FINAL DO CHECKOUT

Correções desta versão:
1. Verificação do perfil com mensagem de erro real (não mascara erro de API).
2. Perfil encontrado -> busca automática das publicações.
3. O botão CONFIRMAR ESTE PERFIL só aparece depois que as publicações carregam.
4. Combo não confirma o perfil automaticamente.
5. Depois de confirmar, o cliente seleciona as publicações e distribui curtidas/visualizações.
6. Adicionado o rótulo de 1.500 seguidores no resumo.
7. CORS do server.js preparado para aceitar o frontend Vercel.

IMPORTANTE:
- checkout.html/index/etc. vão no Vercel.
- server.js precisa ser redeployado no backend/Render para a correção de CORS entrar em vigor.
- Não altere APIFY_TOKEN, PUSHINPAY_TOKEN, MERCADO_PAGO_ACCESS_TOKEN ou SMM_API_KEY.
