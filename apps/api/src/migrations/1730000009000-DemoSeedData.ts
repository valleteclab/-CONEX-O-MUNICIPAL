import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dados de demonstração para desenvolvimento e apresentações.
 * Senha de todos os usuários demo: Demo1234
 *
 * Contas criadas:
 *   cidadao@demo.local  — papel citizen  (Ana Oliveira)
 *   mei@demo.local      — papel mei      (João da Silva Santos)
 *   empresa@demo.local  — papel company  (Maria Fernanda Costa)
 *   gestor@demo.local   — papel manager  (Carlos Eduardo Moreira)
 *
 * Também cria: 5 vitrines no diretório, 5 cotações, 4 cursos com aulas,
 * 1 negócio ERP com produtos, estoque e clientes/fornecedores.
 */
export class DemoSeedData1730000009000 implements MigrationInterface {
  name = 'DemoSeedData1730000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Usuários de demonstração (senha: Demo1234, hash bcrypt r=12)
    await queryRunner.query(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, is_active, email_verified)
      VALUES
        ('d0000001-demo-0000-0000-000000000001', 'cidadao@demo.local',
         '$2b$12$8VmeAeBOTzppiyDNJkE4FuDN3FeXyn0PoDwFQoKrvCPrGt30zfO8m',
         'Ana Oliveira', '(77) 99801-0001', 'citizen', true, true),
        ('d0000001-demo-0000-0000-000000000002', 'mei@demo.local',
         '$2b$12$8VmeAeBOTzppiyDNJkE4FuDN3FeXyn0PoDwFQoKrvCPrGt30zfO8m',
         'João da Silva Santos', '(77) 99802-0002', 'mei', true, true),
        ('d0000001-demo-0000-0000-000000000003', 'empresa@demo.local',
         '$2b$12$8VmeAeBOTzppiyDNJkE4FuDN3FeXyn0PoDwFQoKrvCPrGt30zfO8m',
         'Maria Fernanda Costa', '(77) 99803-0003', 'company', true, true),
        ('d0000001-demo-0000-0000-000000000004', 'gestor@demo.local',
         '$2b$12$8VmeAeBOTzppiyDNJkE4FuDN3FeXyn0PoDwFQoKrvCPrGt30zfO8m',
         'Carlos Eduardo Moreira', '(77) 99804-0004', 'manager', true, true)
      ON CONFLICT (email) DO NOTHING;
    `);

    // Vincular ao tenant de Luís Eduardo Magalhães
    await queryRunner.query(`
      INSERT INTO user_tenants (user_id, tenant_id, role, is_active)
      SELECT u.id, t.id, u.role, true
      FROM users u
      CROSS JOIN tenants t
      WHERE u.email IN (
        'cidadao@demo.local', 'mei@demo.local',
        'empresa@demo.local', 'gestor@demo.local'
      )
      AND t.slug = 'luis-eduardo-magalhaes'
      ON CONFLICT (user_id, tenant_id) DO NOTHING;
    `);

    // Vitrines no diretório (aprovadas e publicadas)
    await queryRunner.query(`
      INSERT INTO directory_listings
        (id, tenant_id, slug, trade_name, description, category, modo,
         owner_user_id, is_published, moderation_status)
      SELECT
        gen_random_uuid(), t.id, v.slug, v.trade_name, v.description,
        v.category, v.modo, u.id, true, 'approved'
      FROM (VALUES
        ('padaria-pao-dourado',
         'Padaria Pão Dourado',
         'Padaria artesanal com 20 anos de tradição em Luís Eduardo Magalhães. Pães frescos, bolos no capricho e salgados feitos diariamente. Entregamos no centro da cidade.',
         'Alimentação', 'loja', 'mei@demo.local'),
        ('atelie-moda-fem',
         'Ateliê Moda Feminina da Lu',
         'Roupas femininas sob medida, ajustes e customizações. Atendimento personalizado com hora marcada. Especialidade em vestidos de festa e trajes sociais.',
         'Moda e Confecção', 'loja', 'empresa@demo.local'),
        ('consultoria-contabil-lem',
         'Contabilidade & Negócios LEM',
         'Serviços de contabilidade para MEI, ME e EPP. Abertura de empresa, imposto de renda, folha de pagamento e orientação fiscal. Mais de 200 clientes ativos no município.',
         'Serviços Contábeis', 'perfil', 'empresa@demo.local'),
        ('barbearia-top-cut',
         'Barbearia Top Cut',
         'Corte masculino, barba e bigode. Ambiente climatizado, Wi-Fi, agendamento pelo WhatsApp. Localizada no centro de Luís Eduardo Magalhães.',
         'Beleza e Estética', 'loja', 'mei@demo.local'),
        ('informatica-conecta',
         'Conecta Informática e Serviços',
         'Manutenção de computadores, notebooks e impressoras. Instalação de redes, CFTV e suporte técnico remoto. Atendemos residências e empresas.',
         'Tecnologia', 'perfil', 'mei@demo.local')
      ) AS v(slug, trade_name, description, category, modo, owner_email)
      JOIN tenants t ON t.slug = 'luis-eduardo-magalhaes'
      JOIN users u ON u.email = v.owner_email
      ON CONFLICT (tenant_id, slug) DO NOTHING;
    `);

    // Cotações abertas
    await queryRunner.query(`
      INSERT INTO quotation_requests
        (tenant_id, requester_user_id, title, description, status)
      SELECT t.id, u.id, v.title, v.description, v.status
      FROM (VALUES
        ('cidadao@demo.local',
         'Reforma elétrica em escritório 60m²',
         'Preciso de um eletricista para reformar a fiação de um escritório com 60m² no centro. Trocar tomadas, disjuntores e instalar iluminação em LED.',
         'open'),
        ('cidadao@demo.local',
         'Uniforme corporativo para equipe de 8 pessoas',
         'Camisa polo manga curta com bordado de logo, calça social e crachá. Cores: azul marinho e branco. Tamanhos P ao GG.',
         'open'),
        ('empresa@demo.local',
         'Consultoria em marketing digital para pequeno negócio',
         'Diagnóstico e proposta para redes sociais (Instagram, Facebook) e estratégia de delivery para negócio alimentício local.',
         'open'),
        ('mei@demo.local',
         'Equipamentos para padaria: forno e batedeira industrial',
         'Forno turbo 8 assadeiras e batedeira industrial 20L. Interesse em financiamento ou consórcio de equipamentos.',
         'in_progress'),
        ('cidadao@demo.local',
         'Pintura residencial — casa de 3 quartos',
         'Pintura interna completa com massa corrida e tinta acrílica. Solicitar visita para medição e orçamento.',
         'open')
      ) AS v(owner_email, title, description, status)
      JOIN tenants t ON t.slug = 'luis-eduardo-magalhaes'
      JOIN users u ON u.email = v.owner_email;
    `);

    // Cursos da Academia
    await queryRunner.query(`
      INSERT INTO academy_courses
        (id, tenant_id, title, slug, summary, category, duration_minutes,
         is_published, is_featured, gamification_points)
      SELECT
        v.cid::UUID, t.id, v.title, v.slug, v.summary, v.category,
        v.dur::INT, true, v.feat::BOOLEAN, v.pts::INT
      FROM (VALUES
        ('d0000009-demo-acad-0000-000000000001',
         'Como Abrir o Seu MEI',
         'como-abrir-seu-mei',
         'Passo a passo para formalizar sua atividade como Microempreendedor Individual. Do cadastro no Portal do Empreendedor ao CNPJ em mãos.',
         'Formalização', '60', 'true', '100'),
        ('d0000009-demo-acad-0000-000000000002',
         'Gestão Financeira para Pequenos Negócios',
         'gestao-financeira-pequenos-negocios',
         'Controle de fluxo de caixa, precificação correta, DRE simplificado e como separar o dinheiro do negócio do pessoal.',
         'Finanças', '90', 'true', '150'),
        ('d0000009-demo-acad-0000-000000000003',
         'Marketing Digital para MEI e Pequenas Empresas',
         'marketing-digital-mei',
         'Como criar presença online do zero: Instagram, WhatsApp Business, Google Meu Negócio e estratégias sem custo para atrair clientes locais.',
         'Marketing', '75', 'false', '120'),
        ('d0000009-demo-acad-0000-000000000004',
         'Nota Fiscal Eletrônica Descomplicada',
         'nota-fiscal-eletronica',
         'NF-e, NFC-e e NFS-e: quando emitir cada uma, como usar o SEFAZ-BA e evitar multas. Conteúdo prático para quem nunca emitiu nota.',
         'Fiscal', '45', 'false', '80')
      ) AS v(cid, title, slug, summary, category, dur, feat, pts)
      JOIN tenants t ON t.slug = 'luis-eduardo-magalhaes'
      ON CONFLICT (tenant_id, slug) DO NOTHING;
    `);

    // Aulas — Curso 1: Como Abrir o Seu MEI
    await queryRunner.query(`
      INSERT INTO academy_lessons
        (course_id, title, content_md, video_url, lesson_kind, sort_order, duration_minutes)
      VALUES
        ('d0000009-demo-acad-0000-000000000001',
         'O que é MEI e quem pode ser',
         'O MEI é uma categoria criada para formalizar autônomos e pequenos negócios. Vantagens: CNPJ, INSS, emissão de nota fiscal e acesso a crédito bancário.',
         'https://www.youtube.com/watch?v=x7j6SdP4kX4',
         'youtube', 1, 15),
        ('d0000009-demo-acad-0000-000000000001',
         'Cadastro no Portal do Empreendedor',
         'Acesse gov.br/mei, preencha dados pessoais, escolha a atividade (CNAE) e conclua o registro. Em minutos você recebe o CNPJ e o CCMEI.',
         'https://www.youtube.com/watch?v=M9n3V6W8CaU',
         'youtube', 2, 20),
        ('d0000009-demo-acad-0000-000000000001',
         'Obrigações mensais e DAS',
         'O MEI paga um boleto mensal chamado DAS. Valores, como gerar e pagar, o que acontece se atrasar, e a declaração anual DASN-SIMEI.',
         'https://www.youtube.com/watch?v=7eQoKP5HWXM',
         'youtube', 3, 15),
        ('d0000009-demo-acad-0000-000000000001',
         'Benefícios e direitos do MEI',
         'Aposentadoria por idade, auxílio-doença, salário-maternidade. Como funciona a cobertura previdenciária e como garantir seus direitos.',
         'https://www.youtube.com/watch?v=_1k0oB6Dk88',
         'youtube', 4, 10)
      ON CONFLICT DO NOTHING;
    `);

    // Aulas — Curso 2: Gestão Financeira
    await queryRunner.query(`
      INSERT INTO academy_lessons
        (course_id, title, content_md, video_url, lesson_kind, sort_order, duration_minutes)
      VALUES
        ('d0000009-demo-acad-0000-000000000002',
         'Separar finanças pessoais e do negócio',
         'O erro mais comum do empreendedor é misturar o dinheiro próprio com o da empresa. Abra conta PJ, defina pró-labore e trate o negócio como entidade separada.',
         'https://www.youtube.com/watch?v=ZbkCqKVWl3E',
         'youtube', 1, 20),
        ('d0000009-demo-acad-0000-000000000002',
         'Fluxo de caixa na prática',
         'Controle de tudo que entra e sai. Como montar uma planilha simples, entender o saldo projetado e identificar quando vai faltar dinheiro antes que aconteça.',
         'https://www.youtube.com/watch?v=mDkHxYxblzE',
         'youtube', 2, 25),
        ('d0000009-demo-acad-0000-000000000002',
         'Como precificar produtos e serviços',
         'Preço errado = prejuízo. Calcule custos fixos, variáveis, margem de contribuição e lucro. Fórmula de markup e comparação com a concorrência local.',
         'https://www.youtube.com/watch?v=OT_vDm1bTyY',
         'youtube', 3, 25),
        ('d0000009-demo-acad-0000-000000000002',
         'DRE simplificado para micro empresas',
         'A Demonstração do Resultado mostra se o negócio lucrou. Modelo simplificado para quem não tem contador e quer entender os números mensalmente.',
         'https://www.youtube.com/watch?v=VIJ_LFSC3tU',
         'youtube', 4, 20)
      ON CONFLICT DO NOTHING;
    `);

    // Aulas — Curso 3: Marketing Digital
    await queryRunner.query(`
      INSERT INTO academy_lessons
        (course_id, title, content_md, video_url, lesson_kind, sort_order, duration_minutes)
      VALUES
        ('d0000009-demo-acad-0000-000000000003',
         'Instagram para negócios locais',
         'Crie perfil profissional, configure Instagram Business e aprenda a postar conteúdo que atrai clientes da sua cidade. Bio, stories e reels sem precisar aparecer.',
         'https://www.youtube.com/watch?v=e5fDarXXFaM',
         'youtube', 1, 25),
        ('d0000009-demo-acad-0000-000000000003',
         'WhatsApp Business: atendimento e catálogo',
         'Catálogo de produtos, respostas automáticas, etiquetas e link direto. Configure tudo em menos de 30 minutos e profissionalize seu atendimento.',
         'https://www.youtube.com/watch?v=MF5Gaz22dHY',
         'youtube', 2, 25),
        ('d0000009-demo-acad-0000-000000000003',
         'Google Meu Negócio: apareça nas buscas locais',
         'Configure o Google Meu Negócio, adicione fotos, horário de funcionamento e colete avaliações para aparecer quando buscarem seu segmento na cidade.',
         'https://www.youtube.com/watch?v=4e2qo_7E0ww',
         'youtube', 3, 25)
      ON CONFLICT DO NOTHING;
    `);

    // Aulas — Curso 4: Nota Fiscal
    await queryRunner.query(`
      INSERT INTO academy_lessons
        (course_id, title, content_md, video_url, lesson_kind, sort_order, duration_minutes)
      VALUES
        ('d0000009-demo-acad-0000-000000000004',
         'NF-e, NFC-e e NFS-e: qual emitir?',
         'NF-e é para venda entre empresas. NFC-e é o cupom eletrônico para o consumidor final. NFS-e é para serviços. Entenda quando usar cada uma e evite multas.',
         'https://www.youtube.com/watch?v=G68WNj6QFOU',
         'youtube', 1, 15),
        ('d0000009-demo-acad-0000-000000000004',
         'Emitindo NFC-e pelo SEFAZ-BA',
         'Passo a passo para emitir cupom fiscal eletrônico no sistema da SEFAZ da Bahia: cadastro, certificado digital A1, preenchimento e transmissão.',
         'https://www.youtube.com/watch?v=0k_xtS9TJoU',
         'youtube', 2, 20),
        ('d0000009-demo-acad-0000-000000000004',
         'Corrigindo erros na nota fiscal',
         E'Os erros mais comuns na emissão de NF-e/NFC-e: como usar carta de correção, cancelamento dentro do prazo e o que fazer quando o SEFAZ rejeita a nota.',
         null,
         'text', 3, 10)
      ON CONFLICT DO NOTHING;
    `);

    // Negócio ERP de demo (Padaria Pão Dourado)
    await queryRunner.query(`
      INSERT INTO erp_businesses
        (id, tenant_id, trade_name, legal_name, document, is_active, moderation_status)
      SELECT
        'd0000009-demo-erp0-0000-000000000001'::UUID,
        t.id,
        'Padaria Pão Dourado (Demo)',
        'João da Silva Santos ME',
        '12345678000190',
        true,
        'approved'
      FROM tenants t WHERE t.slug = 'luis-eduardo-magalhaes'
      ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO erp_business_users (user_id, business_id, role)
      SELECT u.id, 'd0000009-demo-erp0-0000-000000000001'::UUID, 'empresa_owner'
      FROM users u WHERE u.email = 'mei@demo.local'
      ON CONFLICT (user_id, business_id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO erp_stock_locations
        (id, tenant_id, business_id, name, is_default)
      SELECT
        'd0000009-demo-erp0-0000-000000000010'::UUID,
        t.id,
        'd0000009-demo-erp0-0000-000000000001'::UUID,
        'Depósito Principal',
        true
      FROM tenants t WHERE t.slug = 'luis-eduardo-magalhaes'
      ON CONFLICT (id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO erp_products
        (id, tenant_id, business_id, sku, name, unit, cost, price, min_stock, is_active)
      SELECT
        v.pid::UUID,
        t.id,
        'd0000009-demo-erp0-0000-000000000001'::UUID,
        v.sku, v.name, v.unit,
        v.cost::DECIMAL(18,4),
        v.price::DECIMAL(18,4),
        v.min_stock::DECIMAL(18,4),
        true
      FROM (VALUES
        ('d0000009-demo-erp0-0000-000000000020', 'PAO-001', 'Pão Francês (kg)',          'KG',  '8.00',  '12.50', '5.00'),
        ('d0000009-demo-erp0-0000-000000000021', 'PAO-002', 'Pão de Forma 500g',         'UN',  '4.50',   '8.90', '10.00'),
        ('d0000009-demo-erp0-0000-000000000022', 'BOL-001', 'Bolo de Chocolate (fatia)', 'UN',  '3.00',   '7.00',  '5.00'),
        ('d0000009-demo-erp0-0000-000000000023', 'SAL-001', 'Coxinha de Frango (un)',    'UN',  '1.80',   '4.50', '20.00'),
        ('d0000009-demo-erp0-0000-000000000024', 'BEB-001', 'Café Expresso (un)',        'UN',  '0.80',   '3.00',  '0.00')
      ) AS v(pid, sku, name, unit, cost, price, min_stock)
      JOIN tenants t ON t.slug = 'luis-eduardo-magalhaes'
      ON CONFLICT (business_id, sku) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO erp_stock_balances
        (tenant_id, business_id, product_id, location_id, quantity)
      SELECT
        t.id,
        'd0000009-demo-erp0-0000-000000000001'::UUID,
        v.pid::UUID,
        'd0000009-demo-erp0-0000-000000000010'::UUID,
        v.qty::DECIMAL(18,4)
      FROM (VALUES
        ('d0000009-demo-erp0-0000-000000000020', '18.00'),
        ('d0000009-demo-erp0-0000-000000000021', '24.00'),
        ('d0000009-demo-erp0-0000-000000000022', '12.00'),
        ('d0000009-demo-erp0-0000-000000000023', '45.00'),
        ('d0000009-demo-erp0-0000-000000000024',  '0.00')
      ) AS v(pid, qty)
      JOIN tenants t ON t.slug = 'luis-eduardo-magalhaes'
      ON CONFLICT (business_id, product_id, location_id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO erp_parties
        (id, tenant_id, business_id, type, name, document, email, phone, is_active)
      SELECT
        v.pid::UUID,
        t.id,
        'd0000009-demo-erp0-0000-000000000001'::UUID,
        v.type, v.name, v.document, v.email, v.phone, true
      FROM (VALUES
        ('d0000009-demo-erp0-0000-000000000030', 'customer', 'Prefeitura Municipal de LEM',
         '00000000000100', 'compras@lem.ba.gov.br', '(77) 3628-0000'),
        ('d0000009-demo-erp0-0000-000000000031', 'customer', 'Escola Municipal Centro',
         null, null, null),
        ('d0000009-demo-erp0-0000-000000000032', 'supplier', 'Distribuidora de Farináceos BA',
         '98765432000101', 'vendas@farinaceos.com', '(71) 3500-9900'),
        ('d0000009-demo-erp0-0000-000000000033', 'both',     'Supermercado Bom Preço LEM',
         '11223344000155', null, '(77) 3628-1122')
      ) AS v(pid, type, name, document, email, phone)
      JOIN tenants t ON t.slug = 'luis-eduardo-magalhaes'
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM erp_stock_balances
      WHERE business_id = 'd0000009-demo-erp0-0000-000000000001';
    `);
    await queryRunner.query(`
      DELETE FROM erp_parties WHERE id IN (
        'd0000009-demo-erp0-0000-000000000030',
        'd0000009-demo-erp0-0000-000000000031',
        'd0000009-demo-erp0-0000-000000000032',
        'd0000009-demo-erp0-0000-000000000033'
      );
    `);
    await queryRunner.query(`
      DELETE FROM erp_products WHERE business_id = 'd0000009-demo-erp0-0000-000000000001';
    `);
    await queryRunner.query(`
      DELETE FROM erp_stock_locations WHERE id = 'd0000009-demo-erp0-0000-000000000010';
    `);
    await queryRunner.query(`
      DELETE FROM erp_business_users WHERE business_id = 'd0000009-demo-erp0-0000-000000000001';
    `);
    await queryRunner.query(`
      DELETE FROM erp_businesses WHERE id = 'd0000009-demo-erp0-0000-000000000001';
    `);
    await queryRunner.query(`
      DELETE FROM academy_lessons WHERE course_id IN (
        'd0000009-demo-acad-0000-000000000001',
        'd0000009-demo-acad-0000-000000000002',
        'd0000009-demo-acad-0000-000000000003',
        'd0000009-demo-acad-0000-000000000004'
      );
    `);
    await queryRunner.query(`
      DELETE FROM academy_courses WHERE id IN (
        'd0000009-demo-acad-0000-000000000001',
        'd0000009-demo-acad-0000-000000000002',
        'd0000009-demo-acad-0000-000000000003',
        'd0000009-demo-acad-0000-000000000004'
      );
    `);
    await queryRunner.query(`
      DELETE FROM quotation_requests
      WHERE requester_user_id IN (
        SELECT id FROM users WHERE email IN (
          'cidadao@demo.local', 'mei@demo.local', 'empresa@demo.local'
        )
      );
    `);
    await queryRunner.query(`
      DELETE FROM directory_listings WHERE slug IN (
        'padaria-pao-dourado', 'atelie-moda-fem', 'consultoria-contabil-lem',
        'barbearia-top-cut', 'informatica-conecta'
      );
    `);
    await queryRunner.query(`
      DELETE FROM user_tenants WHERE user_id IN (
        SELECT id FROM users WHERE email IN (
          'cidadao@demo.local', 'mei@demo.local',
          'empresa@demo.local', 'gestor@demo.local'
        )
      );
    `);
    await queryRunner.query(`
      DELETE FROM users WHERE email IN (
        'cidadao@demo.local', 'mei@demo.local',
        'empresa@demo.local', 'gestor@demo.local'
      );
    `);
  }
}
