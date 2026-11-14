export default function Privacidade() {
  return (
    <section style={{ maxWidth: "65ch" }}>
      <h1>Privacidade (LGPD)</h1>
      <p>
        A Prancheta processa o texto que você cola ou extrai de um PDF <strong>neste navegador</strong>{" "}
        (localStorage), inclusive a comparação currículo × vaga × projetos cadastrados. PDF e backup JSON são
        lidos ou gerados no navegador; o backup não é criptografado, então guarde-o em local privado. Nada disso
        é enviado a servidor. Não criamos conta, não vendemos dado e não enviamos currículo a empregadores.
      </p>
      <ul>
        <li>Base: seu consentimento ao usar o app (art. 7º, I, Lei 13.709/2018).</li>
        <li>Você pode exportar, restaurar backup validado ou apagar os dados no dashboard.</li>
        <li>
          Importação Greenhouse/Remotar pede só o endereço público da lista, sem o seu currículo.
        </li>
        <li>Não use este site para guardar documentos de terceiros sem autorização.</li>
      </ul>
      <p>Operador: o responsável pelo repositório GitHub deste projeto, quando você hospeda a cópia.</p>
    </section>
  );
}
