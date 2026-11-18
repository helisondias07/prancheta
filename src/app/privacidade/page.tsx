export default function Privacidade() {
  return (
    <section style={{ maxWidth: "65ch" }}>
      <h1>Privacidade (LGPD)</h1>
      <p>
        A Prancheta processa o texto que você cola ou extrai de um PDF <strong>neste navegador</strong>{" "}
        (localStorage), inclusive a comparação currículo × vaga × projetos cadastrados. PDF e backup JSON são
        lidos ou gerados no navegador. O backup simples não é criptografado; há também opção criptografada. Se a conta estiver configurada, você pode optar por enviar uma cópia dos dados ao servidor. Isso inclui o texto do currículo, não o PDF. Não enviamos currículo a empregadores.
      </p>
      <ul>
        <li>Base: seu consentimento ao usar o app (art. 7º, I, Lei 13.709/2018).</li>
        <li>Você pode exportar, restaurar backup validado ou apagar os dados no dashboard.</li>
        <li>Excluir a cópia remota não apaga a conta. A exclusão da conta também remove a cópia remota, mas não apaga dados locais ou backups de infraestrutura; a retenção desses backups precisa ser definida.</li>
        <li>
          Importação Greenhouse/Remotar/Lever envia apenas o token ou identificador do quadro à rota deste app,
          que busca a lista pública em host fixo. Seu currículo e portfólio não vão nessa requisição.
        </li>
        <li>Não use este site para guardar documentos de terceiros sem autorização.</li>
      </ul>
      <p>Operador: o responsável pelo repositório GitHub deste projeto, quando você hospeda a cópia.</p>
    </section>
  );
}
