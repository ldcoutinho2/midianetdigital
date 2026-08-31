MidiaNetDigital V6 — Correção final do checkout de combos

ALTERAÇÕES:
- Removido completamente o Order Bump de 500 curtidas do checkout.
- Combos de engajamento agora são tratados como pacote completo.
- O resumo mostra seguidores + curtidas + visualizações quando o pacote possuir esses itens.
- O cliente verifica o perfil, vê o perfil encontrado e confirma o perfil.
- Para combos com curtidas/visualizações, as publicações são buscadas automaticamente após a verificação.
- Depois de confirmar o perfil, o cliente escolhe as publicações.
- É possível adicionar manualmente o link de uma publicação que não apareceu.
- A distribuição de curtidas/visualizações é validada antes de gerar o Pix.
- O pedido envia a distribuição completa ao backend.
- O backend não aceita mais valor adicional de Order Bump.
- O envio automático do combo continua separado em seguidores, curtidas e visualizações.
- Endpoint de publicações do Instagram foi reforçado com o Instagram API Scraper da Apify e fallback para o scraper anterior.
- Pixel e fluxo de pagamento foram preservados.

TESTE RECOMENDADO:
1. Abrir um combo de 1.500 seguidores.
2. Confirmar que o checkout mostra 1.500 seguidores + 700 curtidas + 700 visualizações.
3. Verificar o @ do Instagram.
4. Aguardar a busca automática das publicações.
5. Confirmar o perfil.
6. Selecionar 1 ou mais publicações.
7. Conferir a distribuição automática.
8. Gerar o Pix.
