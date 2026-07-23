import chalk from 'chalk';

const SECTIONS: Array<{ title: string; commands: Array<[string, string]> }> = [
  {
    title: 'auth',
    commands: [
      ['login', 'Autenticar na Conta Azul'],
      ['logout', 'Encerrar sessão da conta ativa'],
      ['refresh', 'Renovar access token'],
      ['whoami', 'Dados da conta · GET /v1/empresas'],
      ['ping', 'Testar credenciais e conexão com a API'],
      ['env', 'Detectar ambiente dev/prod (app + conta ERP)'],
    ],
  },
  {
    title: 'account',
    commands: [
      ['account list', 'Listar contas salvas'],
      ['account use <name>', 'Alternar conta ativa'],
      ['account add', 'Adicionar e autenticar nova conta'],
      ['account remove <name>', 'Remover conta salva'],
    ],
  },
  {
    title: 'cadastros',
    commands: [
      ['pessoas', 'Clientes e fornecedores · /v1/pessoas'],
      ['produtos', 'Catálogo de produtos · /v1/produtos'],
      ['categorias', 'Categorias de produtos · /v1/categorias'],
      ['servicos', 'Catálogo de serviços · /v1/servicos'],
    ],
  },
  {
    title: 'vendas',
    commands: [
      ['vendas', 'Pedidos de venda · /v1/vendas'],
      ['orcamentos', 'Orçamentos · /v1/orcamentos'],
      ['contratos', 'Contratos recorrentes · /v1/contratos'],
      ['notas', 'Notas fiscais · /v1/notas-fiscais'],
    ],
  },
  {
    title: 'financeiro',
    commands: [
      ['cobrancas', 'Contas a receber · /v1/financeiro/contasreceber'],
      ['contas-pagar', 'Contas a pagar · /v1/financeiro/contaspagar'],
      ['baixas', 'Baixas · /v1/financeiro/baixas'],
      ['centros-custo', 'Centros de custo · /v1/financeiro/centrosdecusto'],
      ['categorias-fin', 'Categorias financeiras · /v1/financeiro/categorias'],
      ['eventos', 'Eventos financeiros · /v1/financeiro/eventos'],
    ],
  },
  {
    title: 'config',
    commands: [
      ['config init', 'Configurar Client ID e Secret'],
      ['config show', 'Exibir configuração atual'],
    ],
  },
];

export function printRootHelp(): void {
  process.stdout.write(
    `usage: contaazul [--version] [--help] [--account <name>] <command> [<args>]\n\n`,
  );
  process.stdout.write(`CLI para a API Conta Azul v2.\n`);
  process.stdout.write(`Recursos em português (rotas da API) · ações em inglês (list, get, create…)\n\n`);

  for (const section of SECTIONS) {
    process.stdout.write(`${section.title}:\n`);
    const width = Math.max(...section.commands.map(([name]) => name.length), 0);
    for (const [name, desc] of section.commands) {
      process.stdout.write(`   ${name.padEnd(width)}  ${chalk.dim(desc)}\n`);
    }
    process.stdout.write('\n');
  }

  process.stdout.write(`actions: list · get · create · update · delete · link (notas)\n`);
  process.stdout.write(`flags:   --format · --page · --size · --all · --filter · --data\n\n`);
  process.stdout.write(`Run 'contaazul <resource> --help' for details.\n`);
}
