const form = document.getElementById('pedidoForm');

if (form) {
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const telefone = document.getElementById('telefone').value;
    const instagram = document.getElementById('instagram').value;
    const pagamento = document.getElementById('pagamento').value;

    const mensagem = `Olá, quero finalizar meu pedido.%0A%0A Nome: ${nome}%0A Email: ${email}%0A WhatsApp: ${telefone}%0A Instagram: ${instagram}%0A Forma de pagamento: ${pagamento}`;

    const numero = '5521999999999';

    window.open(`https://wa.me/${2199689838}?text=${mensagem}`, '_blank');
  });
}
