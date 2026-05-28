// MidiaNetDigital — script.js
// Coleta dados do formulário e abre WhatsApp com mensagem formatada

const WHATSAPP_NUMBER = '5521991689838'; // ← seu número aqui

const btn = document.getElementById('finalizarBtn');

if (btn) {
  btn.addEventListener('click', function () {
    const nome      = document.getElementById('nome')?.value.trim();
    const email     = document.getElementById('email')?.value.trim();
    const telefone  = document.getElementById('telefone')?.value.trim();
    const instagram = document.getElementById('instagram')?.value.trim();

    if (!nome || !email || !telefone || !instagram) {
      alert('Por favor, preencha todos os campos antes de continuar.');
      return;
    }

    // Pega parâmetros da URL para incluir na mensagem
    const params   = new URLSearchParams(window.location.search);
    const pagamento = params.get('pagamento') || '';

    // Recupera serviço e plano do sessionStorage (definido ao clicar nos cards)
    const servico = sessionStorage.getItem('servico') || '';
    const plano   = sessionStorage.getItem('plano')   || '';

    const linhas = [
      '👋 Olá! Quero finalizar meu pedido na MidiaNetDigital.',
      '',
      `👤 *Nome:* ${nome}`,
      `📧 *E-mail:* ${email}`,
      `📱 *WhatsApp:* ${telefone}`,
      `📸 *Instagram:* ${instagram}`,
    ];

    if (servico) linhas.push(`🛒 *Serviço:* ${servico}`);
    if (plano)   linhas.push(`📦 *Plano:* ${plano}`);
    if (pagamento) linhas.push(`💳 *Pagamento:* ${pagamento === 'pix' ? 'Pix' : 'Cartão'}`);

    const mensagem = encodeURIComponent(linhas.join('\n'));
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${mensagem}`, '_blank');
  });
}

// Salva escolhas no sessionStorage ao clicar nos cards de serviço e plano
document.querySelectorAll('a[href*="planos.html"]').forEach(link => {
  link.addEventListener('click', function () {
    const params = new URLSearchParams(new URL(this.href, location.href).search);
    const servico = params.get('servico');
    if (servico) sessionStorage.setItem('servico', servico.replace(/-/g, ' '));
  });
});

document.querySelectorAll('a[href*="pagamento.html"]').forEach(link => {
  link.addEventListener('click', function () {
    const params = new URLSearchParams(new URL(this.href, location.href).search);
    const plano = params.get('plano');
    if (plano) sessionStorage.setItem('plano', plano + ' seguidores');
  });
});
