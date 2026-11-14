export default function Privacidade() {
  return (
    <main className="wrap" style={{ maxWidth: "65ch" }}>
      <p>
        <a href="/">← Prancheta</a>
      </p>
      <h1>Privacidade (LGPD)</h1>
      <p>
        A Prancheta processa o texto que você cola <strong>neste navegador</strong> (localStorage). Não criamos
        conta, não vendemos dado e não enviamos currículo a empregadores.
      </p>
      <ul>
        <li>Base: seu consentimento ao usar o app (art. 7º, I, Lei 13.709/2018).</li>
        <li>Você pode exportar ou apagar os dados na página inicial.</li>
        <li>
          Importação Greenhouse/Remotar pede só o endereço público da lista, sem o seu currículo.
        </li>
        <li>Não use este site para guardar documentos de terceiros sem autorização.</li>
      </ul>
      <p>Operador: o responsável pelo repositório GitHub deste projeto, quando você hospeda a cópia.</p>
    </main>
  );
}
