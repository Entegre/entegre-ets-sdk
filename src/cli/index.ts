#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * CLI konfigürasyonu
 */
interface CliConfig {
  baseUrl?: string;
  integrator?: string;
  partyId?: string;
  username?: string;
  password?: string;
  token?: string;
}

/**
 * Renk kodları
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

/**
 * Çıktı helpers
 */
function success(msg: string): void {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function error(msg: string): void {
  console.error(`${colors.red}✗${colors.reset} ${msg}`);
}

function info(msg: string): void {
  console.log(`${colors.blue}ℹ${colors.reset} ${msg}`);
}

function warn(msg: string): void {
  console.log(`${colors.yellow}⚠${colors.reset} ${msg}`);
}

/**
 * Config dosya yolu
 */
const CONFIG_FILE = resolve(process.env.HOME || '.', '.ets-cli.json');

/**
 * Config yükle
 */
function loadConfig(): CliConfig {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return {};
}

/**
 * Config kaydet
 */
function saveConfig(config: CliConfig): void {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Yardım metni
 */
const HELP = `
${colors.cyan}ETS CLI${colors.reset} - Entegre ETS SDK Command Line Interface

${colors.yellow}Kullanım:${colors.reset}
  ets-cli <komut> [seçenekler]

${colors.yellow}Komutlar:${colors.reset}
  ${colors.green}config${colors.reset}              Konfigürasyon ayarları
    --set <key>=<value>  Değer ayarla
    --get <key>          Değer göster
    --list               Tüm ayarları göster
    --clear              Ayarları sil

  ${colors.green}auth${colors.reset}                Kimlik doğrulama
    --party-id <id>      VKN/TCKN
    --username <user>    Kullanıcı adı
    --password <pass>    Şifre

  ${colors.green}check-user${colors.reset} <vkn>    E-Fatura mükellef kontrolü

  ${colors.green}aliases${colors.reset} <vkn>       Kullanıcı alias'larını listele

  ${colors.green}send${colors.reset} <dosya.json>   Fatura gönder
    --draft              Taslak olarak gönder
    --archive            E-Arşiv olarak gönder

  ${colors.green}status${colors.reset} <uuid>       Fatura durumu sorgula

  ${colors.green}pdf${colors.reset} <uuid>          PDF indir
    --output <dosya>     Çıktı dosyası

  ${colors.green}validate${colors.reset} <dosya>    Fatura doğrula (göndermeden)

  ${colors.green}diff${colors.reset} <f1> <f2>      İki faturayı karşılaştır

${colors.yellow}Genel Seçenekler:${colors.reset}
  --help, -h           Bu yardım metnini göster
  --version, -v        Versiyon bilgisi
  --json               JSON formatında çıktı
  --quiet, -q          Sessiz mod

${colors.yellow}Örnekler:${colors.reset}
  ${colors.dim}# Konfigürasyon${colors.reset}
  ets-cli config --set baseUrl=https://ets.bulutix.com
  ets-cli config --set integrator=UYM

  ${colors.dim}# Kimlik doğrulama${colors.reset}
  ets-cli auth --party-id 1234567890 --username user --password pass

  ${colors.dim}# Mükellef kontrolü${colors.reset}
  ets-cli check-user 9876543210

  ${colors.dim}# Fatura gönderme${colors.reset}
  ets-cli send invoice.json
  ets-cli send invoice.json --draft

  ${colors.dim}# Durum sorgulama${colors.reset}
  ets-cli status 12345678-1234-1234-1234-123456789012
`;

/**
 * Versiyon
 */
function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

/**
 * Argüman parser
 */
function parseArgs(args: string[]): { command: string; args: string[]; flags: Record<string, string | boolean> } {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (key.includes('=')) {
        const [k, v] = key.split('=');
        flags[k] = v;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[key] = args[++i];
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      flags[key] = true;
    } else {
      positional.push(arg);
    }
  }

  return {
    command: positional[0] || '',
    args: positional.slice(1),
    flags,
  };
}

/**
 * Config komutu
 */
function handleConfig(args: string[], flags: Record<string, string | boolean>): void {
  const config = loadConfig();

  if (flags.list) {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (flags.clear) {
    saveConfig({});
    success('Konfigürasyon temizlendi');
    return;
  }

  if (flags.get) {
    const key = flags.get as string;
    const value = (config as Record<string, unknown>)[key];
    if (value !== undefined) {
      console.log(value);
    } else {
      error(`${key} bulunamadı`);
    }
    return;
  }

  if (flags.set) {
    const [key, value] = (flags.set as string).split('=');
    (config as Record<string, unknown>)[key] = value;
    saveConfig(config);
    success(`${key} = ${value}`);
    return;
  }

  console.log(HELP);
}

/**
 * Auth komutu
 */
async function handleAuth(flags: Record<string, string | boolean>): Promise<void> {
  const config = loadConfig();
  const partyId = (flags['party-id'] as string) || config.partyId;
  const username = (flags.username as string) || config.username;
  const password = (flags.password as string) || config.password;

  if (!partyId || !username || !password) {
    error('--party-id, --username ve --password gerekli');
    return;
  }

  info(`Kimlik doğrulanıyor: ${partyId}`);

  // Dynamic import to avoid loading all SDK at startup
  const { EtsClient } = await import('../client');

  const client = new EtsClient({
    baseUrl: config.baseUrl,
    integrator: config.integrator as 'UYM' | 'UYK' | 'IZI' | 'DGN' | 'MYS',
  });

  try {
    const result = await client.authenticate({ partyId, username, password });
    if (result.success && result.data) {
      config.token = result.data.token;
      config.partyId = partyId;
      config.username = username;
      saveConfig(config);
      success('Kimlik doğrulama başarılı');
    } else {
      error('Kimlik doğrulama başarısız');
    }
  } catch (e) {
    error(`Hata: ${e instanceof Error ? e.message : 'Bilinmeyen hata'}`);
  }
}

/**
 * Check user komutu
 */
async function handleCheckUser(vkn: string, flags: Record<string, string | boolean>): Promise<void> {
  const config = loadConfig();

  if (!vkn) {
    error('VKN/TCKN gerekli');
    return;
  }

  const { EtsClient } = await import('../client');

  const client = new EtsClient({
    baseUrl: config.baseUrl,
    integrator: config.integrator as 'UYM' | 'UYK' | 'IZI' | 'DGN' | 'MYS',
  });

  if (config.token) {
    client.setToken(config.token);
  }

  try {
    const result = await client.checkEInvoiceUser(vkn);

    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.data?.isActive) {
      success(`${vkn} E-Fatura mükellefi`);
    } else {
      warn(`${vkn} E-Fatura mükellefi değil`);
    }
  } catch (e) {
    error(`Hata: ${e instanceof Error ? e.message : 'Bilinmeyen hata'}`);
  }
}

/**
 * Send komutu
 */
async function handleSend(file: string, flags: Record<string, string | boolean>): Promise<void> {
  const config = loadConfig();

  if (!file) {
    error('Fatura dosyası gerekli');
    return;
  }

  if (!existsSync(file)) {
    error(`Dosya bulunamadı: ${file}`);
    return;
  }

  if (!config.token) {
    error('Önce auth komutu ile giriş yapın');
    return;
  }

  const { EtsClient } = await import('../client');

  const client = new EtsClient({
    baseUrl: config.baseUrl,
    integrator: config.integrator as 'UYM' | 'UYK' | 'IZI' | 'DGN' | 'MYS',
  });
  client.setToken(config.token);

  try {
    const request = JSON.parse(readFileSync(file, 'utf-8'));

    info(`Fatura gönderiliyor: ${file}`);

    let result;
    if (flags.archive) {
      result = await client.sendEArchiveInvoice(request);
    } else if (flags.draft) {
      result = await client.sendDraftInvoice(request);
    } else {
      result = await client.sendInvoice(request);
    }

    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.success && result.data) {
      success(`Fatura gönderildi`);
      info(`UUID: ${result.data.uuid}`);
      info(`Numara: ${result.data.invoiceNumber}`);
    } else {
      error('Fatura gönderilemedi');
    }
  } catch (e) {
    error(`Hata: ${e instanceof Error ? e.message : 'Bilinmeyen hata'}`);
  }
}

/**
 * Status komutu
 */
async function handleStatus(uuid: string, flags: Record<string, string | boolean>): Promise<void> {
  const config = loadConfig();

  if (!uuid) {
    error('UUID gerekli');
    return;
  }

  if (!config.token) {
    error('Önce auth komutu ile giriş yapın');
    return;
  }

  const { EtsClient } = await import('../client');

  const client = new EtsClient({
    baseUrl: config.baseUrl,
    integrator: config.integrator as 'UYM' | 'UYK' | 'IZI' | 'DGN' | 'MYS',
  });
  client.setToken(config.token);

  try {
    const result = await client.getInvoiceStatus(uuid);

    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.success && result.data) {
      info(`UUID: ${uuid}`);
      info(`Durum: ${result.data.status}`);
    } else {
      error('Durum sorgulanamadı');
    }
  } catch (e) {
    error(`Hata: ${e instanceof Error ? e.message : 'Bilinmeyen hata'}`);
  }
}

/**
 * Diff komutu
 */
async function handleDiff(file1: string, file2: string, flags: Record<string, string | boolean>): Promise<void> {
  if (!file1 || !file2) {
    error('İki dosya gerekli');
    return;
  }

  if (!existsSync(file1)) {
    error(`Dosya bulunamadı: ${file1}`);
    return;
  }

  if (!existsSync(file2)) {
    error(`Dosya bulunamadı: ${file2}`);
    return;
  }

  const { diffInvoices, formatDiff } = await import('../diff');

  try {
    const invoice1 = JSON.parse(readFileSync(file1, 'utf-8'));
    const invoice2 = JSON.parse(readFileSync(file2, 'utf-8'));

    // Invoice veya InvoiceRequest olabilir
    const inv1 = invoice1.Invoice || invoice1;
    const inv2 = invoice2.Invoice || invoice2;

    const result = diffInvoices(inv1, inv2);

    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatDiff(result));
    }
  } catch (e) {
    error(`Hata: ${e instanceof Error ? e.message : 'Bilinmeyen hata'}`);
  }
}

/**
 * Ana fonksiyon
 */
async function main(): Promise<void> {
  const { command, args, flags } = parseArgs(process.argv.slice(2));

  // Global flags
  if (flags.help || flags.h || !command) {
    console.log(HELP);
    return;
  }

  if (flags.version || flags.v) {
    console.log(`ets-cli v${getVersion()}`);
    return;
  }

  // Komutlar
  switch (command) {
    case 'config':
      handleConfig(args, flags);
      break;

    case 'auth':
      await handleAuth(flags);
      break;

    case 'check-user':
      await handleCheckUser(args[0], flags);
      break;

    case 'aliases':
      // TODO: implement
      warn('Bu komut henüz implemente edilmedi');
      break;

    case 'send':
      await handleSend(args[0], flags);
      break;

    case 'status':
      await handleStatus(args[0], flags);
      break;

    case 'pdf':
      // TODO: implement
      warn('Bu komut henüz implemente edilmedi');
      break;

    case 'validate':
      // TODO: implement
      warn('Bu komut henüz implemente edilmedi');
      break;

    case 'diff':
      await handleDiff(args[0], args[1], flags);
      break;

    default:
      error(`Bilinmeyen komut: ${command}`);
      console.log(HELP);
  }
}

// Export for programmatic use
export { parseArgs, loadConfig, saveConfig };

// Run if called directly
if (require.main === module) {
  main().catch((e) => {
    error(e.message);
    process.exit(1);
  });
}
