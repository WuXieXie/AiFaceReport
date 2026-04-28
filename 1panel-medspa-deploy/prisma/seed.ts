import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      name: '超级管理员',
      role: 'super_admin',
    },
  });
  console.log('Created admin: admin / admin123');

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { id: 'demo-org' },
    update: {},
    create: {
      id: 'demo-org',
      name: '示范医美机构',
      address: '北京市朝阳区示范路1号',
      phone: '010-12345678',
      description: '示范用医美机构',
      credits: 100,
    },
  });
  console.log('Created organization:', org.name);

  // Create demo employee
  const empPassword = await bcrypt.hash('123456', 10);
  await prisma.employee.upsert({
    where: { username: 'demo' },
    update: {},
    create: {
      username: 'demo',
      password: empPassword,
      name: '张医生',
      phone: '13800138000',
      role: 'manager',
      organizationId: org.id,
    },
  });
  console.log('Created employee: demo / 123456');

  // Create default system configs
  const defaultConfigs = [
    { key: 'ai_analysis_provider', value: process.env.AI_ANALYSIS_PROVIDER || 'openai', label: '文本分析接口', group: 'api' },
    { key: 'ai_image_provider', value: process.env.AI_IMAGE_PROVIDER || 'openai', label: '提拉线图片接口', group: 'api' },
    { key: 'ai_image_mode', value: process.env.AI_IMAGE_MODE || 'edit', label: '图片生成方式', group: 'api' },
    { key: 'openai_api_key', value: process.env.OPENAI_API_KEY || 'sk-your-openai-api-key-here', label: 'API Key', group: 'api' },
    { key: 'openai_base_url', value: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1', label: 'API Base URL', group: 'api' },
    { key: 'openai_model', value: process.env.OPENAI_MODEL || 'gpt-5.4', label: '模型名称', group: 'api' },
    { key: 'openai_image_model', value: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1', label: 'OpenAI 图片模型', group: 'api' },
    { key: 'xai_api_key', value: process.env.XAI_API_KEY || 'xai-your-api-key-here', label: 'Grok API Key', group: 'api' },
    { key: 'xai_base_url', value: process.env.XAI_BASE_URL || 'https://api.x.ai/v1', label: 'Grok Base URL', group: 'api' },
    { key: 'xai_model', value: process.env.XAI_MODEL || 'grok-4.20', label: 'Grok 分析模型', group: 'api' },
    { key: 'xai_image_model', value: process.env.XAI_IMAGE_MODEL || 'grok-imagine-image', label: 'Grok 图片模型', group: 'api' },
    { key: 'credits_per_analysis', value: '1', label: '每次分析消耗积分', group: 'general' },
  ];

  for (const config of defaultConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }
  console.log('Created default configs');

  // Create default project categories
  const categories = [
    { name: '注射类', description: '玻尿酸、肉毒素等注射项目', sortOrder: 1 },
    { name: '光电类', description: '激光、射频、超声等光电项目', sortOrder: 2 },
    { name: '手术类', description: '双眼皮、隆鼻等手术项目', sortOrder: 3 },
    { name: '皮肤管理', description: '水光、刷酸等皮肤管理项目', sortOrder: 4 },
    { name: '抗衰项目', description: '提拉、紧致等抗衰项目', sortOrder: 5 },
  ];

  for (const cat of categories) {
    const existing = await prisma.projectCategory.findFirst({ where: { name: cat.name } });
    if (!existing) {
      await prisma.projectCategory.create({ data: cat });
    }
  }
  console.log('Created project categories');

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
