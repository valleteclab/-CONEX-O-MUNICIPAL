import {
  BusinessSegmentOnboardingAnswers,
  BusinessSegmentPresetDefinition,
  BusinessSegmentPresetKey,
  SegmentDirectorySuggestion,
  SegmentSeedProduct,
} from '../types/business-segment-preset.types';

function boolAnswer(
  answers: BusinessSegmentOnboardingAnswers,
  key: string,
): boolean {
  return answers[key] === true || answers[key] === 'true' || answers[key] === 'yes';
}

function selectAnswer(
  answers: BusinessSegmentOnboardingAnswers,
  key: string,
  fallback: string,
): string {
  const value = answers[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function numberAnswer(
  answers: BusinessSegmentOnboardingAnswers,
  key: string,
  fallback: number,
): number {
  const value = answers[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

const basePresets: BusinessSegmentPresetDefinition[] = [
  {
    key: 'beauty_salon',
    version: 1,
    name: 'Salão / Cabeleireiro',
    operationType: 'mixed',
    summary: 'Atendimento por agenda, serviços recorrentes e revenda opcional de produtos.',
    onboardingQuestions: [
      { key: 'appointment_only', label: 'Atende principalmente com horário marcado?', type: 'boolean' },
      { key: 'team_size', label: 'Quantos profissionais atendem no salão?', type: 'number', helperText: 'Usado só para personalizar os textos iniciais.' },
      { key: 'sells_products', label: 'Também revende produtos de beleza?', type: 'boolean' },
    ],
    seedProducts: [
      { sku: 'SRV-CORTE', name: 'Corte feminino', kind: 'service', unit: 'UN', price: '55.00' },
      { sku: 'SRV-ESCOVA', name: 'Escova', kind: 'service', unit: 'UN', price: '40.00' },
      { sku: 'SRV-HIDRAT', name: 'Hidratação capilar', kind: 'service', unit: 'UN', price: '70.00' },
      { sku: 'PRD-SHAMPOO', name: 'Shampoo profissional', kind: 'product', unit: 'UN', price: '39.90', minStock: '3' },
      { sku: 'PRD-MASCARA', name: 'Máscara capilar', kind: 'product', unit: 'UN', price: '49.90', minStock: '2' },
    ],
    financeCategories: {
      income: ['Serviços de beleza', 'Revenda de cosméticos', 'Pacotes promocionais'],
      expense: ['Produtos de uso interno', 'Comissões', 'Manutenção do salão'],
    },
    erpFocus: ['serviços', 'ordens de serviço', 'orçamentos', 'produtos'],
    directorySuggestion: {
      category: 'Beleza e estética',
      modo: 'perfil',
      publicHeadline: 'Atendimento de beleza com cuidado, praticidade e resultado.',
      description: 'Negócio local especializado em atendimento de beleza, com serviços pensados para rotina, eventos e autocuidado.',
      services: ['Corte', 'Escova', 'Hidratação', 'Coloração'],
      offerings: [
        { title: 'Corte feminino', kind: 'service', price: '55,00', description: 'Atendimento com finalização.' },
        { title: 'Hidratação capilar', kind: 'service', price: '70,00', description: 'Tratamento para rotina e recuperação.' },
      ],
      keywords: ['salão', 'cabeleireiro', 'beleza', 'escova', 'hidratação'],
    },
  },
  {
    key: 'bakery',
    version: 1,
    name: 'Padaria',
    operationType: 'mixed',
    summary: 'Produção própria, venda de balcão e encomendas.',
    onboardingQuestions: [
      { key: 'own_production', label: 'Produz internamente pães e salgados?', type: 'boolean' },
      { key: 'accepts_orders', label: 'Trabalha com encomendas?', type: 'boolean' },
      {
        key: 'delivery_mode',
        label: 'Como vende mais?',
        type: 'single_select',
        options: [
          { value: 'counter', label: 'Balcão / retirada' },
          { value: 'delivery', label: 'Entrega' },
          { value: 'both', label: 'Balcão e entrega' },
        ],
      },
    ],
    seedProducts: [
      { sku: 'PRD-PAOFRA', name: 'Pão francês', kind: 'product', unit: 'KG', price: '18.90', minStock: '5' },
      { sku: 'PRD-BOLO', name: 'Bolo simples', kind: 'product', unit: 'UN', price: '28.00', minStock: '2' },
      { sku: 'PRD-SALGADO', name: 'Salgado assado', kind: 'product', unit: 'UN', price: '7.00', minStock: '20' },
      { sku: 'SRV-ENCOM', name: 'Encomenda de bolo', kind: 'service', unit: 'UN', price: '65.00' },
    ],
    financeCategories: {
      income: ['Venda de balcão', 'Encomendas', 'Delivery'],
      expense: ['Insumos', 'Embalagens', 'Gás e energia'],
    },
    erpFocus: ['produtos', 'estoque', 'pedidos de venda', 'orçamentos'],
    directorySuggestion: {
      category: 'Alimentação',
      modo: 'loja',
      publicHeadline: 'Padaria local com itens frescos, encomendas e atendimento diário.',
      description: 'Padaria com produção própria e opções para consumo do dia a dia, café, lanches e encomendas.',
      services: ['Encomendas de bolo', 'Cestas de café', 'Entrega local'],
      offerings: [
        { title: 'Pão francês', kind: 'product', price: '18,90/kg', description: 'Produção diária.' },
        { title: 'Encomenda de bolo', kind: 'service', price: '65,00', description: 'Sob encomenda para datas especiais.' },
      ],
      keywords: ['padaria', 'bolo', 'pão', 'café', 'encomenda'],
    },
  },
  {
    key: 'mini_market',
    version: 1,
    name: 'Mercadinho',
    operationType: 'commerce',
    summary: 'Comércio de bairro com foco em estoque e giro rápido.',
    onboardingQuestions: [
      { key: 'sells_by_weight', label: 'Vende itens por peso?', type: 'boolean' },
      { key: 'has_perishables', label: 'Trabalha com perecíveis?', type: 'boolean' },
      { key: 'delivery_mode', label: 'Oferece entrega?', type: 'boolean' },
    ],
    seedProducts: [
      { sku: 'PRD-ARROZ', name: 'Arroz 5kg', kind: 'product', unit: 'UN', price: '32.90', minStock: '8' },
      { sku: 'PRD-FEIJAO', name: 'Feijão 1kg', kind: 'product', unit: 'UN', price: '9.90', minStock: '10' },
      { sku: 'PRD-LEITE', name: 'Leite integral 1L', kind: 'product', unit: 'UN', price: '5.90', minStock: '12' },
      { sku: 'PRD-CAFE', name: 'Café 250g', kind: 'product', unit: 'UN', price: '11.50', minStock: '8' },
    ],
    financeCategories: {
      income: ['Vendas no caixa', 'Entrega local'],
      expense: ['Reposição de estoque', 'Perecíveis', 'Despesas operacionais'],
    },
    erpFocus: ['produtos', 'estoque', 'pedidos de venda', 'financeiro'],
    directorySuggestion: {
      category: 'Mercado e conveniência',
      modo: 'loja',
      publicHeadline: 'Mercadinho de bairro com itens do dia a dia e atendimento próximo.',
      description: 'Comércio local com variedade para abastecimento rápido, conveniência e atendimento da vizinhança.',
      services: ['Entrega local', 'Separação de pedidos'],
      offerings: [
        { title: 'Cesta básica montada', kind: 'product', description: 'Itens essenciais para o dia a dia.' },
        { title: 'Entrega local', kind: 'service', description: 'Consulte disponibilidade no bairro.' },
      ],
      keywords: ['mercadinho', 'mercado', 'conveniência', 'bairro', 'entrega'],
    },
  },
  {
    key: 'auto_repair',
    version: 1,
    name: 'Oficina mecânica',
    operationType: 'mixed',
    summary: 'Serviços, peças e controle por ordem de serviço.',
    onboardingQuestions: [
      { key: 'works_with_parts', label: 'Também vende peças?', type: 'boolean' },
      {
        key: 'service_scope',
        label: 'Atende mais qual tipo de serviço?',
        type: 'single_select',
        options: [
          { value: 'general', label: 'Mecânica geral' },
          { value: 'suspension', label: 'Suspensão / freios' },
          { value: 'oil_change', label: 'Troca de óleo / revisão rápida' },
        ],
      },
      { key: 'home_service', label: 'Faz atendimento externo / socorro?', type: 'boolean' },
    ],
    seedProducts: [
      { sku: 'SRV-REVISAO', name: 'Revisão mecânica', kind: 'service', unit: 'UN', price: '180.00' },
      { sku: 'SRV-OLEO', name: 'Troca de óleo', kind: 'service', unit: 'UN', price: '90.00' },
      { sku: 'PRD-OLEO5W30', name: 'Óleo 5W30', kind: 'product', unit: 'UN', price: '42.00', minStock: '6' },
      { sku: 'PRD-FILTRO', name: 'Filtro de óleo', kind: 'product', unit: 'UN', price: '24.00', minStock: '5' },
    ],
    financeCategories: {
      income: ['Serviços mecânicos', 'Venda de peças', 'Atendimento externo'],
      expense: ['Compra de peças', 'Ferramentas e insumos', 'Terceiros'],
    },
    erpFocus: ['ordens de serviço', 'orçamentos', 'produtos', 'estoque'],
    directorySuggestion: {
      category: 'Automotivo',
      modo: 'perfil',
      publicHeadline: 'Oficina mecânica para revisão, manutenção e peças de reposição.',
      description: 'Atendimento automotivo com diagnóstico, manutenção e serviços programados para carros de passeio e utilitários.',
      services: ['Revisão', 'Troca de óleo', 'Freios', 'Suspensão'],
      offerings: [
        { title: 'Revisão mecânica', kind: 'service', price: '180,00', description: 'Avaliação e checklist básico.' },
        { title: 'Troca de óleo', kind: 'service', price: '90,00', description: 'Mão de obra com itens separados quando necessário.' },
      ],
      keywords: ['oficina', 'mecânica', 'automotivo', 'revisão', 'óleo'],
    },
  },
  {
    key: 'bike_repair',
    version: 1,
    name: 'Oficina de bicicleta',
    operationType: 'mixed',
    summary: 'Serviços rápidos, manutenção leve e venda de acessórios.',
    onboardingQuestions: [
      { key: 'works_with_parts', label: 'Também vende peças e acessórios?', type: 'boolean' },
      {
        key: 'service_profile',
        label: 'O que mais acontece no dia a dia?',
        type: 'single_select',
        options: [
          { value: 'quick_fix', label: 'Ajustes rápidos' },
          { value: 'maintenance', label: 'Manutenção completa' },
          { value: 'custom', label: 'Montagem / personalização' },
        ],
      },
      { key: 'appointment_only', label: 'Atende mais por agendamento?', type: 'boolean' },
    ],
    seedProducts: [
      { sku: 'SRV-REGULAGEM', name: 'Regulagem básica', kind: 'service', unit: 'UN', price: '35.00' },
      { sku: 'SRV-REVISAOBIKE', name: 'Revisão completa', kind: 'service', unit: 'UN', price: '120.00' },
      { sku: 'PRD-CAMARA29', name: 'Câmara aro 29', kind: 'product', unit: 'UN', price: '28.00', minStock: '5' },
      { sku: 'PRD-CORRENTE', name: 'Corrente para bicicleta', kind: 'product', unit: 'UN', price: '65.00', minStock: '3' },
    ],
    financeCategories: {
      income: ['Serviços de manutenção', 'Peças e acessórios'],
      expense: ['Compra de peças', 'Ferramentas', 'Consumíveis'],
    },
    erpFocus: ['ordens de serviço', 'produtos', 'estoque', 'orçamentos'],
    directorySuggestion: {
      category: 'Mobilidade e bicicletas',
      modo: 'perfil',
      publicHeadline: 'Oficina de bicicleta com ajustes rápidos, revisão e acessórios.',
      description: 'Atendimento para ciclistas com manutenção preventiva, regulagens e itens de reposição para uso urbano e esportivo.',
      services: ['Regulagem', 'Revisão', 'Troca de câmaras', 'Montagem de bike'],
      offerings: [
        { title: 'Regulagem básica', kind: 'service', price: '35,00', description: 'Ajustes rápidos para uso diário.' },
        { title: 'Revisão completa', kind: 'service', price: '120,00', description: 'Checagem geral e manutenção.' },
      ],
      keywords: ['bicicleta', 'bike', 'oficina', 'ciclista', 'revisão'],
    },
  },
  {
    key: 'locksmith',
    version: 1,
    name: 'Chaveiro',
    operationType: 'service',
    summary: 'Atendimento rápido, cópias e serviços emergenciais.',
    onboardingQuestions: [
      { key: 'emergency_service', label: 'Faz atendimento emergencial / plantão?', type: 'boolean' },
      { key: 'home_service', label: 'Faz atendimento externo?', type: 'boolean' },
      {
        key: 'main_focus',
        label: 'Principal tipo de serviço',
        type: 'single_select',
        options: [
          { value: 'copy_keys', label: 'Cópia de chaves' },
          { value: 'locks', label: 'Fechaduras e manutenção' },
          { value: 'automotive', label: 'Chave automotiva' },
        ],
      },
    ],
    seedProducts: [
      { sku: 'SRV-COPIA', name: 'Cópia simples de chave', kind: 'service', unit: 'UN', price: '15.00' },
      { sku: 'SRV-FECHA', name: 'Troca de fechadura', kind: 'service', unit: 'UN', price: '80.00' },
      { sku: 'SRV-PLANTAO', name: 'Atendimento emergencial', kind: 'service', unit: 'UN', price: '120.00' },
    ],
    financeCategories: {
      income: ['Cópias de chave', 'Atendimento externo', 'Troca de fechadura'],
      expense: ['Materiais e cilindros', 'Deslocamento', 'Ferramentas'],
    },
    erpFocus: ['ordens de serviço', 'orçamentos', 'financeiro'],
    directorySuggestion: {
      category: 'Serviços residenciais',
      modo: 'perfil',
      publicHeadline: 'Chaveiro local para cópias, fechaduras e atendimento rápido.',
      description: 'Serviços de chaveiro para residências, comércios e demandas urgentes, com atendimento sob consulta.',
      services: ['Cópia de chave', 'Troca de fechadura', 'Atendimento externo'],
      offerings: [
        { title: 'Cópia simples de chave', kind: 'service', price: '15,00', description: 'Serviço rápido para chaves comuns.' },
        { title: 'Troca de fechadura', kind: 'service', price: '80,00', description: 'Instalação e substituição conforme avaliação.' },
      ],
      keywords: ['chaveiro', 'fechadura', 'cópia de chave', 'plantão', 'atendimento externo'],
    },
  },
];

function personalizeSeedProducts(
  preset: BusinessSegmentPresetDefinition,
  answers: BusinessSegmentOnboardingAnswers,
): SegmentSeedProduct[] {
  const products = [...preset.seedProducts];
  if (preset.key === 'beauty_salon' && !boolAnswer(answers, 'sells_products')) {
    return products.filter((item) => item.kind === 'service');
  }
  if (preset.key === 'auto_repair' && !boolAnswer(answers, 'works_with_parts')) {
    return products.filter((item) => item.kind === 'service');
  }
  if (preset.key === 'bike_repair' && !boolAnswer(answers, 'works_with_parts')) {
    return products.filter((item) => item.kind === 'service');
  }
  return products;
}

function personalizeDirectorySuggestion(
  preset: BusinessSegmentPresetDefinition,
  answers: BusinessSegmentOnboardingAnswers,
): SegmentDirectorySuggestion {
  const suggestion: SegmentDirectorySuggestion = {
    ...preset.directorySuggestion,
    services: [...preset.directorySuggestion.services],
    offerings: preset.directorySuggestion.offerings.map((item) => ({ ...item })),
    keywords: [...preset.directorySuggestion.keywords],
  };

  if (preset.key === 'beauty_salon') {
    const teamSize = numberAnswer(answers, 'team_size', 1);
    if (teamSize > 1) {
      suggestion.description += ` Equipe com ${teamSize} profissionais para atender com mais flexibilidade.`;
    }
    if (boolAnswer(answers, 'appointment_only')) {
      suggestion.publicHeadline = 'Atendimento de beleza com horário marcado e experiência mais organizada.';
      suggestion.keywords.push('agendamento');
    }
    if (!boolAnswer(answers, 'sells_products')) {
      suggestion.offerings = suggestion.offerings.filter((item) => item.kind === 'service');
    }
  }

  if (preset.key === 'bakery') {
    if (boolAnswer(answers, 'accepts_orders')) {
      suggestion.services = Array.from(new Set([...suggestion.services, 'Encomendas para eventos']));
    }
    const deliveryMode = selectAnswer(answers, 'delivery_mode', 'counter');
    if (deliveryMode === 'delivery' || deliveryMode === 'both') {
      suggestion.publicHeadline = 'Padaria local com itens frescos, encomendas e entrega.';
      suggestion.keywords.push('delivery');
    }
  }

  if (preset.key === 'mini_market' && boolAnswer(answers, 'delivery_mode')) {
    suggestion.publicHeadline = 'Mercadinho de bairro com itens do dia a dia e entrega local.';
    suggestion.services = Array.from(new Set([...suggestion.services, 'Entrega local']));
  }

  if (preset.key === 'auto_repair' && boolAnswer(answers, 'home_service')) {
    suggestion.services = Array.from(new Set([...suggestion.services, 'Atendimento externo']));
    suggestion.keywords.push('socorro');
  }

  if (preset.key === 'bike_repair' && boolAnswer(answers, 'appointment_only')) {
    suggestion.publicHeadline = 'Oficina de bicicleta com atendimento organizado e manutenção especializada.';
  }

  if (preset.key === 'locksmith') {
    if (boolAnswer(answers, 'emergency_service')) {
      suggestion.publicHeadline = 'Chaveiro local com atendimento rápido e plantão sob consulta.';
      suggestion.keywords.push('urgência');
      suggestion.services = Array.from(new Set([...suggestion.services, 'Plantão sob consulta']));
    }
    if (boolAnswer(answers, 'home_service')) {
      suggestion.services = Array.from(new Set([...suggestion.services, 'Atendimento externo']));
    }
  }

  return suggestion;
}

export function listBusinessSegmentPresets(): BusinessSegmentPresetDefinition[] {
  return basePresets.map((preset) => ({
    ...preset,
    onboardingQuestions: preset.onboardingQuestions.map((question) => ({
      ...question,
      options: question.options?.map((option) => ({ ...option })),
    })),
    seedProducts: preset.seedProducts.map((item) => ({ ...item })),
    financeCategories: {
      income: [...preset.financeCategories.income],
      expense: [...preset.financeCategories.expense],
    },
    erpFocus: [...preset.erpFocus],
    directorySuggestion: {
      ...preset.directorySuggestion,
      services: [...preset.directorySuggestion.services],
      offerings: preset.directorySuggestion.offerings.map((item) => ({ ...item })),
      keywords: [...preset.directorySuggestion.keywords],
    },
  }));
}

export function getBusinessSegmentPreset(
  key: BusinessSegmentPresetKey,
): BusinessSegmentPresetDefinition | undefined {
  return listBusinessSegmentPresets().find((preset) => preset.key === key);
}

export function buildPresetApplication(
  key: BusinessSegmentPresetKey,
  answers: BusinessSegmentOnboardingAnswers,
) {
  const preset = getBusinessSegmentPreset(key);
  if (!preset) {
    return null;
  }

  return {
    preset,
    seedProducts: personalizeSeedProducts(preset, answers),
    directorySuggestion: personalizeDirectorySuggestion(preset, answers),
    financeCategories: {
      income: [...preset.financeCategories.income],
      expense: [...preset.financeCategories.expense],
    },
    erpFocus: [...preset.erpFocus],
  };
}
