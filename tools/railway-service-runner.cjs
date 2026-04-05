const { spawnSync } = require('node:child_process');

const action = process.argv[2];
const serviceName = process.env.RAILWAY_SERVICE_NAME || '';

const commandsByAction = {
  build: {
    api: ['npm', ['run', 'build', '-w', 'api']],
    'conexao-municipal': ['npm', ['run', 'build', '-w', 'web']],
  },
  start: {
    api: ['npm', ['run', 'start:prod', '-w', 'api']],
    'conexao-municipal': ['npm', ['run', 'start', '-w', 'web']],
  },
};

const commands = commandsByAction[action];

if (!commands) {
  console.error(`Ação inválida: ${action}`);
  process.exit(1);
}

const command = commands[serviceName];

if (!command) {
  console.error(`Serviço Railway sem mapeamento para '${action}': ${serviceName || '(vazio)'}`);
  process.exit(1);
}

const [bin, args] = command;
const result = spawnSync(bin, args, { stdio: 'inherit', shell: process.platform === 'win32' });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
