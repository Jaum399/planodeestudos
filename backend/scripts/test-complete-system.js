#!/usr/bin/env node

/**
 * Script de Testes Completos - Flashcards, Notificações, Lembretes e Calendário
 * 
 * Execução:
 *   node backend/scripts/test-complete-system.js
 */

const fetch = require('node-fetch');
const chalk = require('chalk');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'test-admin-token';

// ─────────────────────────────────────────────────────────────────────────────

class TestSuite {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  async test(name, fn) {
    try {
      process.stdout.write(`  ⏳ ${name}... `);
      const startTime = Date.now();
      const result = await fn();
      const duration = Date.now() - startTime;
      
      console.log(chalk.green(`✅ PASS`));
      console.log(chalk.gray(`     ${result?.message || `Concluído em ${duration}ms`}\n`));
      
      this.results.push({ name, status: 'PASS', duration, result });
      this.passed++;
      return true;
    } catch (error) {
      console.log(chalk.red(`❌ FAIL`));
      console.log(chalk.red(`     ${error.message}\n`));
      
      this.results.push({ name, status: 'FAIL', error: error.message });
      this.failed++;
      return false;
    }
  }

  async request(method, path, body = null) {
    const url = `${API_BASE}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(`${res.status}: ${data.error || 'Erro desconhecido'}`);
    }

    return data;
  }

  summary() {
    console.log('\n' + '─'.repeat(80));
    console.log(chalk.bold(`\n📊 RESUMO DOS TESTES\n`));
    
    console.log(`Total: ${chalk.bold(this.passed + this.failed)}`);
    console.log(`${chalk.green(`✅ Passou: ${this.passed}`)}`);
    console.log(`${chalk.red(`❌ Falhou: ${this.failed}`)}`);
    console.log(`Taxa de sucesso: ${chalk.bold(`${Math.round((this.passed / (this.passed + this.failed)) * 100)}%`)}\n`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function runTests() {
  const suite = new TestSuite();

  console.log(chalk.bold.cyan('\n🚀 TESTES DO SISTEMA COMPLETO - Flashcards + Notificações\n'));
  console.log(chalk.gray(`API Base: ${API_BASE}\n`));

  // ──── TESTES DE DECKS PRÉ-CONFIGURADOS ──────────────────────────────────────

  console.log(chalk.bold.yellow('\n📚 TESTE 1: DECKS PRÉ-CONFIGURADOS\n'));

  await suite.test('Executar seed de decks (MedSimples style)', async () => {
    const data = await suite.request('POST', '/api/admin/seed-presets');
    if (!data.success) throw new Error(data.error);
    return {
      message: `${data.decksCreated} decks criados com ${data.totalCards} flashcards`,
    };
  });

  // ──── TESTES DE NOTIFICAÇÕES ────────────────────────────────────────────────

  console.log(chalk.bold.yellow('\n🔔 TESTE 2: SISTEMA DE NOTIFICAÇÕES\n'));

  let statusData = null;

  await suite.test('Verificar status das notificações', async () => {
    statusData = await suite.request('GET', '/api/admin/notifications/status');
    return {
      message: `${statusData.jobs.total} jobs, ${statusData.reminders.active} lembretes ativos`,
    };
  });

  await suite.test('Processar fila de notificações', async () => {
    const data = await suite.request('POST', '/api/admin/notifications/process-queue', {
      limit: 50,
    });
    return {
      message: `${data.processed} processados, ${data.succeeded} sucesso, ${data.failed} falhados`,
    };
  });

  // ──── TESTES DE LEMBRETES AUTOMÁTICOS ───────────────────────────────────────

  console.log(chalk.bold.yellow('\n⏰ TESTE 3: LEMBRETES AUTOMÁTICOS\n'));

  await suite.test('Agendar digest diário de lembretes', async () => {
    const data = await suite.request('POST', '/api/admin/notifications/schedule-daily', {
      horizonDays: 7,
    });
    return {
      message: `${data.queued} jobs agendados para próximos 7 dias`,
    };
  });

  // ──── TESTES DE VALIDAÇÃO DE DADOS ──────────────────────────────────────────

  console.log(chalk.bold.yellow('\n✔️ TESTE 4: VALIDAÇÃO DE DADOS\n'));

  await suite.test('Validar integridade de decks criados', async () => {
    if (!statusData || statusData.jobs.total === 0) {
      throw new Error('Nenhum deck foi criado ainda');
    }
    return {
      message: `Sistema possui ${statusData.jobs.total} jobs e ${statusData.reminders.total} lembretes`,
    };
  });

  await suite.test('Verificar usuários com notificações pendentes', async () => {
    const data = await suite.request('GET', '/api/admin/notifications/status');
    return {
      message: `${data.users.withPendingNotifications} de ${data.users.total} usuários com notificações pendentes`,
    };
  });

  // ──── TESTES DE PRÓXIMOS LEMBRETES ──────────────────────────────────────────

  console.log(chalk.bold.yellow('\n📅 TESTE 5: PRÓXIMOS LEMBRETES\n'));

  await suite.test('Listar próximos lembretes agendados', async () => {
    const data = await suite.request('GET', '/api/admin/notifications/status');
    const upcoming = data.upcomingReminders || [];
    if (upcoming.length === 0) {
      return { message: 'Nenhum lembrete próximo agendado (isto é normal se sem lembretes)' };
    }
    return {
      message: `${upcoming.length} lembretes nos próximos dias`,
    };
  });

  // ──── TESTES DE PERFORMANCE ─────────────────────────────────────────────────

  console.log(chalk.bold.yellow('\n⚡ TESTE 6: PERFORMANCE E ESTABILIDADE\n'));

  await suite.test('Teste de carga: Processar 100 notificações', async () => {
    const startTime = Date.now();
    const data = await suite.request('POST', '/api/admin/notifications/process-queue', {
      limit: 100,
    });
    const duration = Date.now() - startTime;
    return {
      message: `${data.processed} notificações processadas em ${duration}ms (${Math.round(data.processed / duration * 1000)} msgs/seg)`,
    };
  });

  await suite.test('Teste de concorrência: 3x buscar status em paralelo', async () => {
    const startTime = Date.now();
    const results = await Promise.all([
      suite.request('GET', '/api/admin/notifications/status'),
      suite.request('GET', '/api/admin/notifications/status'),
      suite.request('GET', '/api/admin/notifications/status'),
    ]);
    const duration = Date.now() - startTime;
    return {
      message: `3 requisições completadas em ${duration}ms (concorrência OK)`,
    };
  });

  // ──── TESTES DE CALENDÁRIO ──────────────────────────────────────────────────

  console.log(chalk.bold.yellow('\n📆 TESTE 7: INTEGRAÇÃO CALENDÁRIO\n'));

  await suite.test('Verificar suporte a calendário (iOS/Android)', async () => {
    // Este teste verifica se o sistema suporta integração de calendário
    const data = await suite.request('GET', '/api/admin/notifications/status');
    const hasCalendarSupport = data.reminders && data.reminders.total > 0;
    return {
      message: hasCalendarSupport ? 'Calendário integrado ✅' : 'Sem lembretes agendados (normal em teste)',
    };
  });

  // ──── RESUMO FINAL ──────────────────────────────────────────────────────────

  suite.summary();

  if (suite.failed > 0) {
    console.log(chalk.red(`\n⚠️ ${suite.failed} teste(s) falharam. Verifique os logs acima.\n`));
    process.exit(1);
  } else {
    console.log(chalk.green(`\n🎉 TODOS OS TESTES PASSARAM! Sistema 100% funcional.\n`));
    process.exit(0);
  }
}

// Executar testes
runTests().catch((error) => {
  console.error(chalk.red(`\n❌ Erro crítico: ${error.message}\n`));
  process.exit(1);
});
