#!/usr/bin/env node

/**
 * Script de Configuração Automática de Webhook - Asaas
 * Configura webhook para receber eventos de pagamento
 *
 * Uso:
 *   ASAAS_API_KEY=sua_chave node configure-webhook.js
 *   ASAAS_API_KEY=sua_chave ASAAS_ENV=production node configure-webhook.js
 */

const https = require('https');
const url = require('url');

class AsaasWebhookConfigurator {
  constructor() {
    this.apiKey = process.env.ASAAS_API_KEY;
    this.env = process.env.ASAAS_ENV || 'production';

    if (!this.apiKey) {
      this.error('ASAAS_API_KEY não configurado');
      process.exit(1);
    }

    this.apiBase = this.env === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';

    this.webhookUrl = this.env === 'production'
      ? 'https://app-planodeestudos.vercel.app/api/payment/webhook'
      : 'https://sandbox-app-planodeestudos.vercel.app/api/payment/webhook';

    this.events = [
      'PAYMENT_RECEIVED',
      'PAYMENT_CONFIRMED',
      'PAYMENT_CREATED',
      'PAYMENT_AWAITING_RISK_ANALYSIS',
      'PAYMENT_OVERDUE',
      'PAYMENT_DELETED',
      'PAYMENT_REFUNDED',
      'PAYMENT_REFUND_IN_PROGRESS',
      'PAYMENT_CHARGEBACK_REQUESTED',
      'PAYMENT_CHARGEBACK_DISPUTE',
      'PAYMENT_REPROVED_BY_RISK_ANALYSIS'
    ];
  }

  log(message) {
    console.log(`ℹ️  ${message}`);
  }

  success(message) {
    console.log(`✅ ${message}`);
  }

  error(message) {
    console.error(`❌ ${message}`);
  }

  warn(message) {
    console.log(`⚠️  ${message}`);
  }

  async request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const urlObj = new url.URL(`${this.apiBase}${path}`);
      const options = {
        method,
        hostname: urlObj.hostname,
        path: `${urlObj.pathname}${urlObj.search}`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Webhook-Configurator/1.0'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};

            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject({
                statusCode: res.statusCode,
                data: parsed,
                message: parsed?.errors?.[0]?.description || parsed?.message || 'Erro na requisição'
              });
            }
          } catch (e) {
            reject({ statusCode: res.statusCode, message: 'Erro ao parsear JSON', data });
          }
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  async listWebhooks() {
    this.log('Verificando webhooks existentes...');
    try {
      const result = await this.request('GET', '/webhooks');

      if (Array.isArray(result.data)) {
        const existingWebhooks = result.data.filter(w => w.url.includes('payment/webhook'));

        if (existingWebhooks.length > 0) {
          this.log(`Encontrados ${existingWebhooks.length} webhook(s) existente(s):`);
          existingWebhooks.forEach((w, i) => {
            console.log(`  ${i + 1}. ${w.url}`);
            console.log(`     ID: ${w.id}`);
            console.log(`     Status: ${w.status || 'ativo'}`);
          });
          return existingWebhooks;
        }
      }

      this.log('Nenhum webhook de pagamento encontrado');
      return [];
    } catch (err) {
      this.warn(`Erro ao listar webhooks: ${err.message}`);
      return [];
    }
  }

  async createWebhook() {
    this.log('');
    this.log('Criando novo webhook...');

    const payload = {
      url: this.webhookUrl,
      events: this.events
    };

    try {
      const result = await this.request('POST', '/webhooks', payload);

      if (result.id) {
        this.success(`Webhook criado com sucesso!`);
        console.log(`   ID: ${result.id}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Eventos: ${result.events?.length || this.events.length}`);
        return result;
      }

      throw new Error('Nenhum ID retornado');
    } catch (err) {
      this.error(`Erro ao criar webhook: ${err.message}`);

      if (err.statusCode === 401 || err.message.includes('INVALID_BEARER_TOKEN')) {
        this.error('Verifique se ASAAS_API_KEY está correto');
      }

      throw err;
    }
  }

  async testWebhook(webhookId) {
    this.log('');
    this.log('Testando webhook...');

    try {
      const result = await this.request('POST', `/webhooks/${webhookId}/test`, {});

      if (result.success || result.received) {
        this.success('Teste do webhook bem-sucedido!');
        this.log('O webhook está recebendo eventos corretamente');
        return true;
      }

      this.warn('Teste enviado, mas sem confirmação de sucesso');
      return false;
    } catch (err) {
      this.warn(`Teste do webhook retornou erro: ${err.message}`);
      this.warn('Webhook foi criado, mas o teste falhou');
      this.warn('Verifique os logs: vercel logs --tail');
      return false;
    }
  }

  async configure() {
    console.log('\n🚀 Configuração Automática de Webhook - Asaas');
    console.log('============================================\n');

    console.log(`🔧 Configurações:`);
    console.log(`  API Base: ${this.apiBase}`);
    console.log(`  Webhook URL: ${this.webhookUrl}`);
    console.log(`  Ambiente: ${this.env}`);
    console.log(`  Eventos: ${this.events.length}`);
    console.log('');

    try {
      // 1. Listar webhooks existentes
      const existing = await this.listWebhooks();

      // 2. Criar novo webhook
      const webhook = await this.createWebhook();

      // 3. Testar webhook
      await this.testWebhook(webhook.id);

      console.log('');
      console.log('✅ Configuração completa!');
      console.log('');
      console.log('📝 Próximos passos:');
      console.log('1. Verifique em: https://www.asaas.com (Dashboard > Webhooks)');
      console.log('2. O webhook deve estar listado com status "ativo"');
      console.log('3. Para monitorar eventos: vercel logs --tail');
      console.log('4. Teste a página: https://app-planodeestudos.vercel.app/app/upgrade');
      console.log('');

      process.exit(0);
    } catch (err) {
      console.log('');
      this.error('Falha na configuração!');
      console.log(`Detalhes: ${err.message}`);
      process.exit(1);
    }
  }
}

// Executar
const configurator = new AsaasWebhookConfigurator();
configurator.configure().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
