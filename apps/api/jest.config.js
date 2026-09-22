/**
 * Config mínima pra rodar os testes unitários com ts-jest. Escopo inicial:
 * lógica pura (sem banco) e serviços críticos de segurança testados com
 * PrismaService mockado — não precisa de Postgres rodando pra passar.
 * Ver docs/testes.md pra como rodar e o que cada suíte cobre.
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    // tsconfig.spec.json liga isolatedModules: transpila sem checagem de
    // tipo cruzando arquivos. Necessário porque o tipo gerado do Prisma
    // Client (a partir dos includes/relations do schema) só existe depois
    // de "prisma generate" rodar com acesso à internet pra baixar o engine
    // — o Dockerfile de build já faz isso normalmente. Sem isso, o teste
    // dependeria de rodar exatamente no mesmo ambiente que gerou o client,
    // o que é frágil. A checagem de tipo "de verdade" continua acontecendo
    // no build (nest build / tsc, com tsconfig.json normal) antes de
    // qualquer deploy — essa config vale só pros testes.
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
  },
  testEnvironment: 'node',
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
};
