function selecionarPlano(plano, valor) {
  document.getElementById('plano').value = plano;
  document.getElementById('valor').value = `R$ ${valor}`;

  document.getElementById('pedido').scrollIntoView({
    behavior: 'smooth'
  });
}

const form = document.getElementById('pedidoForm');

form.addEventListener('submit', function(e) {
  e.preventDefault();

  const nome = document.getElementById('nome').value;
  const email = document.getElementById('email').value;
  const telefone = document.getElementById('telefone').value;
  const instagram = document.getElementById('instagram').value;
  const plano = document.getElementById('plano').value;
  const valor = document.getElementById('valor').value;

  const mensagem = `Olá, quero finalizar meu pedido.%0A%0A` +
  `Nome: ${nome}%0A` +
  `Email: ${email}%0A` +
  `WhatsApp: ${telefone}%0A` +
  `Instagram: ${instagram}%0A` +
  `Plano: ${plano}%0A` +
  `Valor: ${valor}`;

  const numero = '5521999999999';

  window.open(`https://wa.me/${numero}?text=${mensagem}`, '_blank');
});
