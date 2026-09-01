CORREÇÃO - Meta Purchase + Dashboard

1. O Purchase agora é enviado pelo backend no momento em que o pagamento é confirmado.
2. O evento CAPI inclui fbp/fbc quando disponíveis, telefone e nome com hash SHA-256, IP e User-Agent.
3. O Purchase do navegador usa o mesmo eventID do backend para deduplicação.
4. O pedido guarda os dados de atribuição Meta enviados pelo checkout.
5. O caminho do Mercado Pago agora grava no Dashboard as mesmas informações completas do pedido, incluindo perfil e publicações com quantidades.
6. O horário exibido no Dashboard foi ajustado para America/Sao_Paulo.
7. A confirmação da venda continua independente do retorno da Meta: se a Meta falhar, o pedido não é cancelado.
8. A versão da Graph API pode ser configurada por META_GRAPH_VERSION; padrão atual do código: v23.0.

Arquivos alterados:
- checkout.html
- server.js
