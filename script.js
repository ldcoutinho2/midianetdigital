const form = document.getElementById('pedidoForm');

if (form) {
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const telefone = document.getElementById('telefone').value;
    const instagram = document.getElementById('instagram').value;
    const pagamento = document.getElementById('pagamento').value;

    const mensagem =
`Olá, quero finalizar meu pedido.

Nome: ${nome}
Email: ${email}
WhatsApp: ${telefone}
Instagram: ${instagram}
Forma de pagamento: ${pagamento}`;

    const numero = '5521999999999';

    window.open(
      `https://wa.me/${21991689838}?text=${encodeURIComponent(mensagem)}`,
      '_blank'
    );
  });
}
