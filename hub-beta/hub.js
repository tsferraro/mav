/* Hub Mandū · Beta — a lançadora (PT13, PT14 do sig-mandu).
   Quem vê o quê:  ?org=<id>  → tela F da organização (só a dela) · ?equipe=1 → tela G (Painel da equipe).
   Sem parâmetro, vale o que o aparelho guardou; na 1ª vez, a organização padrão (D12); sem lista no HTML (R2), nenhuma: o Porteiro diz qual.
   Persistência no aparelho (tudo em try/catch: navegador privado ou bloqueado não quebra a tela):
     hub_perfil_v1      {tipo:'org'|'equipe', org}       quem está usando este aparelho
     hub_ultimo_v1      {id, nome, url, org, modo, em}    o último app aberto → reabrir o Hub volta a ele
     hub_org_equipe_v1  id                                a última organização que a equipe escolheu
     (sessão) hub_auto_v1                                 já voltou sozinho nesta abertura: não volta de novo
   ?hub=1 = «fiquei no Hub» (é o endereço que o botão Hub do SGO usa): não volta sozinho ao último app. */
(function () {
  'use strict';
  var D = window.HUB_ORGS || { orgs: [], links: {} };
  var ORGS = D.orgs || [];
  var SEM_LISTA = !!D.semLista;   /* R2 (Beta, CONTRATO-porteiro-v1-lista): o HTML não traz organização; a lista chega só pelo # do Porteiro */
  var ID_OK = /^[a-z0-9-]{1,60}$/;
  var LINKS = D.links || {};
  var CH = { perfil: 'hub_perfil_v1', ultimo: 'hub_ultimo_v1', orgEquipe: 'hub_org_equipe_v1', auto: 'hub_auto_v1' };
  var ESPERA_MS = 1600;

  /* ---------- armazenamento seguro ---------- */
  function ler(chave, sessao) {
    try { var v = (sessao ? sessionStorage : localStorage).getItem(chave); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function gravar(chave, valor, sessao) {
    try { (sessao ? sessionStorage : localStorage).setItem(chave, JSON.stringify(valor)); } catch (e) { /* aparelho sem armazenamento: segue sem lembrar */ }
  }
  function apagar(chave) { try { localStorage.removeItem(chave); } catch (e) {} }

  function orgNaLista(id) { for (var i = 0; i < ORGS.length; i++) if (ORGS[i].id === id) return ORGS[i]; return null; }
  /* sem lista, um id bem formado vindo do link vale (o SGO confere no servidor); o nome fica em branco até a lista chegar */
  function orgPorId(id) { return orgNaLista(id) || (SEM_LISTA && ID_OK.test(id || '') ? { id: id, nome: '', grupo: '' } : null); }
  function $(id) { return document.getElementById(id); }

  /* ---------- cenas (frações da ilustração; mesmas caixas do montar-hub-v2.py) ---------- */
  var B1 = [
    { id: 'operacao', x: 0, y: 0, w: .5, h: .305, nome: 'Operação', estado: 'ativo', abre: 'sgo' },
    { id: 'financas', x: .5, y: 0, w: .5, h: .305, nome: 'Finanças', estado: 'breve' },
    { id: 'negociacao', x: 0, y: .305, w: .5, h: .32, nome: 'Negociação', estado: 'breve' },
    { id: 'viabilidade', x: .5, y: .305, w: .5, h: .32, nome: 'Viabilidade', estado: 'breve' },
    { id: 'aceleracao', x: 0, y: .625, w: .5, h: .375, nome: 'Plano de Aceleração', estado: 'breve' },
    { id: 'fale', x: .5, y: .625, w: .5, h: .375, nome: 'Fale com a Mandū', estado: 'breve' }
  ];
  var B2 = [
    { id: 'amanda', x: 0, y: 0, w: 1, h: .56, nome: 'Amanda', estado: 'breve', placaEsq: .60, compacto: true },
    { id: 'sala', x: 0, y: .5, w: .5, h: .5, nome: 'Sala de Aula', sub: 'Caderno de Estudos', estado: 'novo', abre: 'manual' },
    { id: 'videos', x: .5, y: .5, w: .5, h: .5, nome: 'Vídeos Como usar', sub: '27 vídeos', estado: 'ativo', abre: 'videos' }
  ];
  var B3 = [
    { id: 'organizacoes', x: 0, y: 0, w: .333, h: .5, nome: 'Organizações', estado: 'admin', abre: 'painel', compacto: true },
    { id: 'pessoas', x: .333, y: 0, w: .334, h: .5, nome: 'Pessoas', estado: 'admin', abre: 'painel', compacto: true },
    { id: 'links', x: .667, y: 0, w: .333, h: .5, nome: 'Links e QR', estado: 'admin', abre: 'painel', compacto: true },
    { id: 'agenda', x: 0, y: .5, w: .333, h: .5, nome: 'Agenda', estado: 'breve', compacto: true },
    { id: 'cronograma', x: .333, y: .5, w: .334, h: .5, nome: 'Cronograma', estado: 'breve', compacto: true },
    { id: 'maturidade', x: .667, y: .5, w: .333, h: .5, nome: 'Maturidade', estado: 'breve', compacto: true }   /* D28: sai do Hub; volta pela casca do SGO (PT41), nunca o Painel MAV (PT28) */
  ];
  /* «Maturidade» abre a página da Avaliação só onde o montar.py a pôs (destino /hub/, PT30/D4); no Beta do GitHub fica «em breve» */
  /* PT41 / H10-749: com a casca no SGO (D.maturidade = /exec longo), a equipe escolhe a organização e abre ?org=<id>&maturidade=1 */
  var MAT_CASCA = D.maturidade || '';
  if (LINKS.maturidade || MAT_CASCA) B3.forEach(function (c) { if (c.id === 'maturidade') { c.estado = 'admin'; c.abre = 'maturidade'; } });
  var IMG = {
    cena1: { src: 'img/cena-trabalhar.webp', w: 1024, h: 1536, alt: 'Floresta com o galpão, a roça, a feira, o barco e o trapiche da organização', prio: true },
    cena2: { src: 'img/cena-aprender.webp', w: 1536, h: 1024, alt: 'A Amanda, uma roda de conversa, a sala de aula e a rede com o celular' },
    cena3: { src: 'img/cena-administrar.webp', w: 1536, h: 1024, alt: 'Vila, equipe reunida, placa de QR, quadro de agenda, trilha com bandeiras e medidor' }
  };

  /* computador (≥ 1100 px, PT23): uma panorâmica por faixa, as cenas lado a lado — 6 colunas em «Para trabalhar» e
     «Administrar», 3 em «Para aprender». Bordas das colunas medidas olhando cada imagem (prompts P*-panorama.md). */
  function colunas(lista, xs) {
    return lista.map(function (c, i) {
      var n = {}; for (var k in c) n[k] = c[k];
      n.x = xs[i]; n.w = xs[i + 1] - xs[i]; n.y = 0; n.h = 1; delete n.placaEsq;
      n.empilha = !n.sub;   /* coluna estreita: o selo desce para baixo do nome, e as placas da faixa ficam da mesma altura */
      return n;
    });
  }
  var LARGO = {
    cena1: { lista: colunas(B1, [0, .172, .340, .505, .670, .835, 1]),
      img: { src: 'img/faixa-trabalhar.webp', w: 1672, h: 635, alt: IMG.cena1.alt, prio: true } },
    cena2: { lista: colunas(B2, [0, 1 / 3, 2 / 3, 1]),
      img: { src: 'img/faixa-aprender.webp', w: 1672, h: 635, alt: IMG.cena2.alt } },
    cena3: { lista: colunas(B3, [0, .195, .360, .500, .665, .835, 1]),
      img: { src: 'img/faixa-administrar.webp', w: 1672, h: 635, alt: IMG.cena3.alt } }
  };
  var mqLargo = window.matchMedia ? window.matchMedia('(min-width: 1100px)') : { matches: false };

  var SETA = '<span class="seta" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span>';
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pct(v) { return (v * 100).toFixed(2) + '%'; }

  function htmlApp(c) {
    var breve = c.estado === 'breve';
    var chip = breve ? '<span class="chip chip-cinza">em breve</span>' : (c.estado === 'novo' ? '<span class="chip chip-novo">novo</span>' : '');
    var seta = c.estado === 'ativo' ? SETA : '';
    var sub = c.sub && !breve && !c.compacto ? '<span class="placa-sub">' + esc(c.sub) + '</span>' : '';
    var empilha = c.empilha || (c.compacto && !c.placaEsq);   /* cena de 1/3 da largura: o selo desce para baixo do nome, sem cortá-lo */
    var placaEstilo = c.placaEsq ? ' style="left:' + pct(c.placaEsq) + '"' : '';
    var cls = 'app' + (breve ? ' breve' : '') + (c.compacto ? ' compacto' : '');
    var rotulo = c.nome + (breve ? ', em breve' : '');
    return '<button type="button" class="' + cls + '" data-app="' + c.id + '" aria-label="' + esc(rotulo) + '" ' +
      'style="left:' + pct(c.x) + ';top:' + pct(c.y) + ';width:' + pct(c.w) + ';height:' + pct(c.h) + '">' +
      '<span class="placa"' + placaEstilo + '><span class="placa-txt"><span class="placa-nome">' + esc(c.nome) + '</span>' + sub +
      (empilha ? chip : '') + '</span>' + (empilha ? '' : chip) + seta + '</span></button>';
  }
  function pintarCena(id, lista, extra) {
    var im = IMG[id];
    if (mqLargo.matches) { im = LARGO[id].img; lista = LARGO[id].lista; extra = ''; }
    $(id).style.aspectRatio = im.w + ' / ' + im.h;
    $(id).innerHTML ='<img class="fundo" src="' + im.src + '" width="' + im.w + '" height="' + im.h + '" alt="' + esc(im.alt) + '"' +
      (im.prio ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async">' + lista.map(htmlApp).join('') + (extra || '');
  }

  var APPS = {};
  B1.concat(B2, B3).forEach(function (c) { APPS[c.id] = c; });

  /* ---------- quem é (PT31 · Porteiro mínimo, 1ª fatia da onda A da Plataforma, D15) ----------
     hub_quem_v1  {tipo:'equipe'|'outro', fonte:'porteiro'|'link', em}  quem usa o aparelho; vale PORTEIRO.validadeH horas
     (sessão) hub_visao_v1     a visão trocada no «Beta»: só nesta aba (a equipe volta à tela da equipe na próxima abertura)
     (sessão) hub_porteiro_v1  já foi ao Porteiro nesta aba: não vai de novo (sem laço)
     Volta do Porteiro: ?via=porteiro&quem=equipe|outro|vazio. «outro» = não é equipe, NÃO quer dizer «é desta organização»
     (a organização certa e a recusa chegam com o índice pessoa → organização, A2/A3). «vazio» não grava nada.
     Com o Porteiro desligado (url vazia no montar.py), tudo vale como antes: a identidade não vence. */
  var PORTEIRO = D.porteiro || { url: '', validadeH: 24, instalado: 'auto' };
  CH.quem = 'hub_quem_v1'; CH.visao = 'hub_visao_v1'; CH.porteiro = 'hub_porteiro_v1';
  var params = new URLSearchParams(location.search);
  var agora = new Date().toISOString();
  var antigo = ler(CH.perfil);
  if (antigo && antigo.tipo === 'equipe') {   /* aparelho de antes do Porteiro: equipe guardada vira identidade «link» sem data (vence na 1ª abertura com o Porteiro ligado) */
    gravar(CH.quem, { tipo: 'equipe', fonte: 'link', em: '1970-01-01T00:00:00Z' }); apagar(CH.perfil); antigo = null;
  }
  var quem = ler(CH.quem);
  CH.orgs = 'hub_orgs_v1';   /* {orgs:[{id,nome,grupo}], em} · a lista que o Porteiro mandou pelo # (só id, nome e grupo, D29) */
  function listaDoHash() {
    var m = /[#&]hub=([^&]*)/.exec(location.hash || ''), j = null;
    if (!m) return null;
    try { j = JSON.parse(decodeURIComponent(m[1])); } catch (e) { return null; }
    if (!j || j.v !== 1 || !Array.isArray(j.orgs)) return null;
    return j.orgs.filter(function (o) { return o && ID_OK.test(String(o.id || '')); }).slice(0, 200).map(function (o) {
      return { id: o.id, nome: String(o.nome || o.id).slice(0, 80), grupo: o.grupo === 'producao' ? 'organizacoes' : 'testes' };
    });
  }
  /* auditoria (lente 1): `state` de uso único entre o Hub e o Porteiro. O Hub sorteia, guarda na aba e manda; o Porteiro devolve
     igual. Volta sem o state certo (link forjado com ?via=porteiro) não reescreve nada do aparelho. */
  /* auditoria Fable M1: o state mora no aparelho (localStorage), não na aba — a volta do Porteiro por outra aba ou Custom Tab
     ainda bate. Vale STATE_MIN minutos e é apagado na 1ª volta (certa ou não) ou quando vence. No iPhone, o Hub instalado não
     divide o armazenamento com o Safari: lá vale o PORTEIRO_INSTALADO = "botao" (sonda b). */
  CH.state = 'hub_state_v1';
  var STATE_MIN = 10;
  var stGuardado = ler(CH.state), stIdade = stGuardado ? Date.now() - Date.parse(stGuardado.em || 0) : -1;
  var stateGuardado = stGuardado && stIdade >= 0 && stIdade < STATE_MIN * 60e3 ? stGuardado.s : null;
  if (params.get('via') === 'porteiro' || (stGuardado && !stateGuardado)) apagar(CH.state);
  var veioDoPorteiro = params.get('via') === 'porteiro' && !!stateGuardado && params.get('state') === stateGuardado;
  /* H10-778: o motivo de não ter conta fica escrito na faixa de conta (antes, só num aviso de 2,6 s) */
  var motivoSemConta = '';
  if (params.get('via') === 'porteiro' && !veioDoPorteiro) motivoSemConta = 'Não consegui confirmar a sua conta nesta janela. Nada mudou neste aparelho.';
  if (veioDoPorteiro) {
    var q = params.get('quem');
    if (q === 'equipe' || q === 'outro' || q === 'org' || q === 'recusa') {
      quem = { tipo: q, fonte: 'porteiro', em: agora };
      /* auditoria S4: com várias contas no navegador, o Porteiro pode ter lido a conta errada. «recusa» e «outro» valem só nesta
         aba (nada fica no aparelho): a próxima abertura passa de novo pelo Porteiro, que mostra a conta e deixa trocar. */
      if (q === 'equipe' || q === 'org') { gravar(CH.quem, quem); gravar(CH.orgs, { orgs: listaDoHash() || [], em: agora }); }
      else { apagar(CH.quem); apagar(CH.orgs); }
    }
    else motivoSemConta = 'Não consegui ler a sua conta Google.';
  } else if (params.get('equipe') === '1' && !PORTEIRO.url) {
    quem = { tipo: 'equipe', fonte: 'link', em: agora }; gravar(CH.quem, quem);   /* Porteiro desligado: o botão «Hub Mandū» do SGO e o Painel mandam assim */
  }
  /* auditoria Fable G1: com o Porteiro ligado, só o Porteiro dá a visão da equipe. `?equipe=1` não grava nem renova (é ignorado
     e o Hub vai ao Porteiro); a identidade vale só com fonte «porteiro» e dentro da validade; a lista guardada também vence. */
  function dentroDaValidade(em) { var idade = Date.now() - Date.parse(em || 0); return idade >= 0 && idade < PORTEIRO.validadeH * 3600e3; }
  function quemValido() {
    if (!quem || !quem.tipo) return null;
    if (!PORTEIRO.url) return quem;   /* desligado: como antes, o guardado não vence */
    return quem.fonte === 'porteiro' && dentroDaValidade(quem.em) ? quem : null;
  }
  var equipeDoLink = params.get('equipe') === '1' && !PORTEIRO.url;

  if (SEM_LISTA) {
    var lg = ler(CH.orgs);
    ORGS = lg && Array.isArray(lg.orgs) && quemValido() && (!PORTEIRO.url || dentroDaValidade(lg.em)) ? lg.orgs : [];
  }

  /* ---------- visão (F = organização · G = equipe) ---------- */
  var perfil = null, visaoDoLink = false;
  var ehEquipe = quemValido() && quemValido().tipo === 'equipe';
  if (equipeDoLink) { perfil = { tipo: 'equipe' }; visaoDoLink = true; }
  else if (params.get('org')) {
    if (orgPorId(params.get('org'))) {
      perfil = { tipo: 'org', org: params.get('org') }; visaoDoLink = true;
      if (ehEquipe) gravar(CH.visao, perfil, true);   /* equipe abrindo o link de uma organização: só nesta aba */
      else gravar(CH.perfil, perfil);
    } else setTimeout(function () { avisar('Não achei essa organização no Hub. Abrindo a padrão.'); }, 300);
  }
  if (!perfil) perfil = ler(CH.visao, true);
  if (!perfil && ehEquipe) perfil = { tipo: 'equipe' };
  var qv = quemValido();
  if (!perfil && qv && qv.tipo === 'org' && SEM_LISTA)   /* pessoa de organização: a dela (a última escolhida, se ainda for dela) */
    perfil = { tipo: 'org', org: antigo && orgNaLista(antigo.org) ? antigo.org : (ORGS[0] || {}).id || null };
  if (!perfil && qv && qv.tipo === 'recusa') perfil = { tipo: 'org', org: null };
  if (!perfil) perfil = antigo;
  if (!perfil || perfil.tipo !== 'equipe' && !orgPorId(perfil.org)) perfil = { tipo: 'org', org: D.padrao || null };
  var recusado = !!(qv && qv.tipo === 'recusa');

  /* ---------- Porteiro: aba inteira ao /exec?quem=1 (nunca fetch: o login do Google não tem CORS) ---------- */
  var instalado = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  function sortearState() {
    var a = new Uint8Array(16), t = '';
    try { crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < a.length; j++) t += ('0' + a[j].toString(16)).slice(-2);
    return t;
  }
  /* H10-779: Porteiro pela forma curta (o Gmail entra) e pela longa para quem é da equipe — a curta cai em «Page introuvable»
     com 2 contas Google no navegador. `?equipe=1` só escolhe o endereço: quem diz que é da equipe continua sendo o Porteiro (G1). */
  function porteiroLongo() {
    return !!PORTEIRO.urlLonga && (params.get('equipe') === '1' || !!(quem && quem.tipo === 'equipe') || !!ler(CH.orgEquipe));
  }
  function urlPorteiro(st, longa) {
    return ((longa || porteiroLongo()) ? PORTEIRO.urlLonga : PORTEIRO.url) +
      '&volta=' + encodeURIComponent(location.origin + location.pathname) + '&state=' + st;
  }
  function irAoPorteiro(longa) {
    var st = sortearState();
    gravar(CH.state, { s: st, em: new Date().toISOString() });
    gravar(CH.porteiro, 1, true);
    mostrarAbrindo('Conferindo a sua conta Google');
    location.assign(urlPorteiro(st, longa));   /* assign, não replace: o «Voltar» de uma página de erro do Google volta ao Hub */
  }
  /* voltou do Google sem terminar (erro do Google, «Voltar»): a aba já foi ao Porteiro e não vai sozinha de novo — diz o porquê */
  /* ida ao Google que começou há menos de STATE_MIN e não voltou (página de erro do Google, ou parou no meio): reabrir o Hub, em
     qualquer aba, não vai sozinho de novo — o Chrome pula no «Voltar» a página que navegou sem toque, então o aviso fica aqui */
  var tentativaPendente = !!stateGuardado && params.get('via') !== 'porteiro';
  if (PORTEIRO.url && !motivoSemConta && !veioDoPorteiro && (ler(CH.porteiro, true) || tentativaPendente) && !quemValido())
    motivoSemConta = 'A entrada pelo Google não terminou.';
  /* `?equipe=1` com o Porteiro ligado não segura mais o Hub (G1); volta do Porteiro que não bateu não vai de novo (sem laço) */
  var indoAoPorteiro = !!PORTEIRO.url && !params.get('org') && !veioDoPorteiro && params.get('via') !== 'porteiro' &&
    !quemValido() && !ler(CH.porteiro, true) && !tentativaPendente && !(instalado && PORTEIRO.instalado === 'botao');

  function orgEquipe() { var id = ler(CH.orgEquipe); return orgPorId(id) ? id : null; }

  function enderecoLimpo() {   /* a visão que veio da conta não vai para o endereço: recarregar não pode virar «link» */
    if (!visaoDoLink) return location.pathname + (params.get('hub') === '1' ? '?hub=1' : '');
    return location.pathname + (perfil.tipo === 'equipe' ? '?equipe=1' : '?org=' + encodeURIComponent(perfil.org));
  }
  function hubVolta() { return location.origin + location.pathname + '?hub=1'; }

  /* ---------- destino de cada app ---------- */
  function urlDe(app, orgId) {
    if (app.abre === 'sgo') {
      var o = orgPorId(orgId);
      if (!o) return '';
      var curto = perfil.tipo === 'org';   /* D25/PT40: cooperado pela forma curta (Gmail entra); equipe pela longa do domínio */
      var base = o.sgo ? (curto && o.sgoCurto ? o.sgoCurto : o.sgo)
        : D.exec ? (curto ? D.exec.curto : D.exec.longo) + '?org=' + encodeURIComponent(o.id) : '';   /* sem lista: o SGO resolve o ?org= */
      if (!base) return '';
      return base + (base.indexOf('?') < 0 ? '?' : '&') + 'hub=' + encodeURIComponent(hubVolta());
    }
    if (app.abre === 'painel') return D.painel || '';
    if (app.abre === 'maturidade') {
      if (!MAT_CASCA) return LINKS.maturidade || '';
      if (!orgPorId(orgId)) return '';
      return MAT_CASCA + '?org=' + encodeURIComponent(orgId) + '&maturidade=1&hub=' + encodeURIComponent(hubVolta());
    }
    if (app.abre === 'manual') return LINKS.manual || '';
    if (app.abre === 'videos') return LINKS.videos || '';
    return '';
  }
  function nomeDe(app, orgId) {
    var o = orgPorId(orgId);
    if (app.abre === 'sgo') return app.nome + (o ? ' · ' + o.nome : '');
    if (app.abre === 'painel') return 'Painel da Mandū';
    if (app.abre === 'maturidade') return 'Maturidade' + (MAT_CASCA && o && o.nome ? ' · ' + o.nome : '');
    return app.nome;
  }
  /* PT26 · o Manual do SGO mostra «‹ Hub Mandū» quando sabe de onde veio (contrato MA-126 do Manual, RETORNO-manual-app.md itens 24–31):
     ?de=hub&volta=<este Hub com ?hub=1> antes do #; com ?hub=1 o Hub não volta sozinho para o último app. */
  var MANUAL = 'https://mandu-labs.lp.agentesamanda.com/manual-sgo/';
  function comOrigem(url) {
    if (!url || url.indexOf(MANUAL) !== 0 || !/^https:$/.test(location.protocol)) return url;
    var i = url.indexOf('#'), base = i < 0 ? url : url.slice(0, i), hash = i < 0 ? '' : url.slice(i);
    if (/[?&]de=/.test(base)) return url;   /* já tem a origem */
    return base + (base.indexOf('?') < 0 ? '?' : '&') + 'de=hub&volta=' + encodeURIComponent(location.origin + location.pathname + '?hub=1') + hash;
  }
  function abrir(app, orgId) {
    var url = comOrigem(urlDe(app, orgId));
    if (!url) { avisar('Este app ainda não tem endereço no Hub.'); return; }
    gravar(CH.ultimo, { id: app.id, nome: nomeDe(app, orgId), url: url, org: app.abre === 'sgo' || (app.abre === 'maturidade' && MAT_CASCA) ? orgId : null, modo: perfil.tipo, em: new Date().toISOString() });
    mostrarAbrindo(nomeDe(app, orgId));   /* o app do Google leva alguns segundos: o toque responde na hora (PT19) */
    location.href = url;
  }

  /* ---------- último app: continuar e voltar sozinho ---------- */
  function ultimoValido() {
    var u = ler(CH.ultimo);
    if (!u || !u.url || u.modo !== perfil.tipo) return null;
    if (perfil.tipo === 'org' && u.org && u.org !== perfil.org) return null;
    var app = APPS[u.id];
    if (app && app.estado === 'breve') return null;   /* app que saiu do ar (ex.: Maturidade do Painel MAV) não volta pelo «Continuar» */
    if (app && (app.abre === 'sgo' || (app.abre === 'maturidade' && MAT_CASCA)) && u.org) u.url = urlDe(app, u.org) || u.url;   /* endereço guardado antes do D25 segue a forma da visão de agora */
    u.url = comOrigem(u.url);   /* PT26: endereço guardado antes da origem também volta com «‹ Hub» no Manual */
    return u;
  }
  /* «Continuar de onde parou»: no celular, faixa abaixo do topo; do tablet em diante, cartão ao lado do título (PT28) */
  function pintarContinuar() {
    var u = ultimoValido();
    $('faixaContinuar').hidden = !u; $('continuarTopo').hidden = !u;
    if (!u) return;
    [['continuar', 'continuarNome'], ['continuarTopo', 'continuarTopoNome']].forEach(function (par) {
      var a = $(par[0]);
      $(par[1]).textContent = u.nome;
      a.href = u.url;
      a.onclick = function () { var v = ler(CH.ultimo); if (v) { v.em = new Date().toISOString(); gravar(CH.ultimo, v); } };
    });
  }
  var timerVolta = null;
  function cancelarVolta() { if (timerVolta) clearTimeout(timerVolta); timerVolta = null; $('abrindo').hidden = true; $('abrindo').classList.remove('correndo', 'saindo'); }
  function mostrarAbrindo(nome) {
    $('abrindoRotulo').textContent = 'Abrindo';
    $('abrindoNome').textContent = nome;
    $('btFicar').hidden = true;
    $('abrindo').hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { $('abrindo').classList.add('saindo'); }); });
  }
  function talvezVoltarSozinho() {
    if (params.get('hub') === '1') { gravar(CH.auto, 1, true); return; }
    if (ler(CH.auto, true)) return;
    var u = ultimoValido();
    if (!u) return;
    gravar(CH.auto, 1, true);
    $('abrindoRotulo').textContent = 'Voltando para';
    $('btFicar').hidden = false;
    $('abrindoNome').textContent = u.nome;
    $('abrindo').hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { $('abrindo').classList.add('correndo'); }); });
    timerVolta = setTimeout(function () { timerVolta = null; location.href = u.url; }, ESPERA_MS);
    $('btFicar').focus();
  }

  /* ---------- escolher organização (equipe) ---------- */
  var aoEscolher = null;
  function escolherOrg(titulo, sub, depois) {
    var ult = orgEquipe(), grupos = [['organizacoes', 'Organizações'], ['testes', 'Demonstrações e testes']], h = '';
    grupos.forEach(function (g) {
      var lista = ORGS.filter(function (o) { return o.grupo === g[0]; });
      if (!lista.length) return;
      lista.sort(function (a, b) { return (a.id === ult ? -1 : 0) - (b.id === ult ? -1 : 0); });
      h += '<p class="dlg-grupo">' + g[1] + '</p>';
      lista.forEach(function (o) {
        h += '<button type="button" class="bt-opcao' + (o.id === ult ? ' ultima' : '') + '" data-org="' + esc(o.id) + '">' + esc(o.nome) +
          '<small>' + esc(o.id === ult ? 'a última que você abriu' : (o.local || o.ambienteTxt || '')) + '</small></button>';
      });
    });
    if (!h) h = '<p class="dlg-sub">A lista de organizações chega quando você entra com a sua conta Google.</p>' +
      (PORTEIRO.url ? '<button type="button" class="bt-opcao" data-entrar="1">Entrar com a conta Google</button>' : '');
    $('dlgOrgTitulo').textContent = titulo;
    $('dlgOrgSub').textContent = sub;
    $('dlgOrgLista').innerHTML = h;
    aoEscolher = depois;
    abrirDialogo($('dlgOrg'));
  }
  $('dlgOrgLista').addEventListener('click', function (ev) {
    if (ev.target.closest('[data-entrar]')) { $('dlgOrg').close(); irAoPorteiro(); return; }
    var b = ev.target.closest('[data-org]'); if (!b) return;
    var id = b.getAttribute('data-org');
    if (perfil.tipo === 'org') { perfil = { tipo: 'org', org: id }; gravar(CH.perfil, perfil); $('dlgOrg').close(); pintarTudo(); return; }   /* pessoa de N organizações */
    gravar(CH.orgEquipe, id);
    $('dlgOrg').close();
    pintarTopo();
    if (aoEscolher) aoEscolher(id);
  });
  function abrirDialogo(d) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } }

  /* ---------- toques ---------- */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-app]'); if (!b) return;
    var app = APPS[b.getAttribute('data-app')]; if (!app) return;
    if (app.estado === 'breve') { avisar('«' + app.nome + '» chega em breve no Hub.'); return; }
    if (app.abre === 'sgo') {
      if (perfil.tipo === 'org' && !perfil.org) {   /* sem organização (sem lista, sem link, ou conta recusada) */
        /* H10-778: recusada, o Porteiro daria a mesma resposta (laço): aponta a faixa com «Entrar com outra conta» */
        if (recusado) { avisar('Esta conta Google não tem acesso a nenhuma organização. Toque em «Entrar com outra conta».', 6000); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        else if (PORTEIRO.url) irAoPorteiro(); else avisar('Abra o Hub pelo link da sua organização.');
        return;
      }
      if (perfil.tipo === 'org') { abrir(app, perfil.org); return; }
      escolherOrg('Abrir ' + app.nome + ' de qual organização?', 'O app abre com os dados da organização escolhida.', function (id) { abrir(app, id); });
      return;
    }
    if (app.abre === 'maturidade' && MAT_CASCA) {   /* casca do SGO: sempre de uma organização escolhida (só a equipe vê o botão) */
      if (perfil.tipo !== 'equipe') return;
      escolherOrg('Abrir a Maturidade de qual organização?', 'A avaliação abre com a planilha da organização escolhida.', function (id) { abrir(app, id); });
      return;
    }
    abrir(app, perfil.tipo === 'org' ? perfil.org : orgEquipe());
  });

  var avisoTimer = null;
  function avisar(t, ms) {
    var a = $('aviso'); a.textContent = t; a.hidden = false;
    if (avisoTimer) clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { a.hidden = true; }, ms || 2600);
  }

  /* ---------- pintura ---------- */
  function pintarTopo() {
    var eq = perfil.tipo === 'equipe';
    $('app').setAttribute('data-modo', eq ? 'equipe' : 'org');
    if (eq) {
      var o = orgPorId(orgEquipe());
      $('topoTitulo').textContent = 'Painel da equipe';
      $('topoSub').textContent = o && o.nome ? 'Mandū · vendo a ' + o.nome : 'Mandū · todas as organizações';
    } else {
      var org = orgPorId(perfil.org);
      $('topoTitulo').textContent = org && org.nome ? org.nome : 'Hub Mandū';
      $('topoSub').textContent = org ? 'Os apps da sua organização' : recusado ? 'Sem acesso com esta conta' : 'Entre para ver a sua organização';
    }
    /* H10-778: sem organização, a faixa de conta diz o porquê inteiro (o topoSub corta em 1 linha) e dá o botão */
    var semOrg = !eq && !orgPorId(perfil.org);
    $('faixaConta').hidden = !semOrg;
    if (semOrg) {
      $('contaMsg').textContent = recusado
        ? 'Esta conta Google não tem acesso a nenhuma organização. Peça acesso a quem cuida da sua organização ou entre com outra conta.'
        : PORTEIRO.url ? (motivoSemConta ? motivoSemConta + ' ' : '') + 'Entre com a sua conta Google para ver a sua organização.'
        : 'Abra o Hub pelo link da sua organização.';
      $('btConta').hidden = !PORTEIRO.url;
      $('btContaEquipe').hidden = !PORTEIRO.urlLonga;
      $('btConta').textContent = recusado ? 'Entrar com outra conta' : 'Entrar com a conta Google';
    }
    $('btTrocar').hidden = !eq && !(perfil.tipo === 'org' && ORGS.length > 1 && orgNaLista(perfil.org));   /* pessoa de N organizações também troca */
    $('admin').hidden = !eq;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', eq ? '#FF6E00' : '#005A50');
    document.title = (eq ? 'Painel da equipe' : ((orgPorId(perfil.org) || {}).nome || 'Hub')) + ' · Hub Mandū';
    var bo = orgPorId(perfil.tipo === 'org' ? perfil.org : D.padrao);
    $('betaOrgNome').textContent = bo ? bo.nome : '';
  }
  function pintarTudo() {
    pintarTopo();
    pintarCena('cena1', B1);
    pintarCena('cena2', B2, '<span class="titulo-cena" style="top:42%">Para aprender</span>');
    if (perfil.tipo === 'equipe') pintarCena('cena3', B3); else $('cena3').innerHTML = '';
    pintarContinuar();
    try { history.replaceState(null, '', enderecoLimpo()); } catch (e) {}
  }

  /* ---------- barra de baixo, Trocar, Beta ---------- */
  $('navInicio').addEventListener('click', function () { cancelarVolta(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $('navVoltar').addEventListener('click', function () {
    if (history.length > 1) { history.back(); return; }
    var u = ultimoValido();
    if (u) { location.href = u.url; return; }
    avisar('Você já está no início do Hub.');
  });
  $('btTrocar').addEventListener('click', function () {
    escolherOrg('Ver qual organização?', 'Os apps de «Para trabalhar» abrem com ela.', null);
  });
  $('btFicar').addEventListener('click', cancelarVolta);
  $('btBeta').addEventListener('click', function () {
    var u = ler(CH.ultimo);
    $('betaUltimo').textContent = u && u.nome ? 'guardado: ' + u.nome : 'nenhum guardado';
    abrirDialogo($('dlgBeta'));
  });
  /* «ver como os outros veem» (PT27) vale só nesta aba: a próxima abertura volta à visão de quem é (PT31) */
  $('betaOrg').addEventListener('click', function () {
    perfil = { tipo: 'org', org: perfil.tipo === 'org' ? perfil.org : D.padrao }; visaoDoLink = false;
    gravar(CH.visao, perfil, true); $('dlgBeta').close(); pintarTudo(); window.scrollTo(0, 0);
  });
  $('betaEquipe').addEventListener('click', function () {
    perfil = { tipo: 'equipe' }; visaoDoLink = false;
    gravar(CH.visao, perfil, true); $('dlgBeta').close(); pintarTudo(); window.scrollTo(0, 0);
  });
  /* auditoria H1 (tablet do galpão dividido): «Sair» esquece a conta, a lista, a visão e o último app deste aparelho */
  function temContaNoAparelho() { return !!(ler(CH.quem) || ler(CH.orgs) || ler(CH.ultimo) || ler(CH.perfil) || ler(CH.orgEquipe)); }
  function pintarSair() { $('navSair').hidden = $('betaSair').hidden = !temContaNoAparelho(); $('nav').classList.toggle('com-sair', !$('navSair').hidden); }
  function sair() {
    if (!window.confirm('Sair deste aparelho?\n\nO Hub esquece a conta, as organizações e o último app aberto aqui.')) return;
    [CH.quem, CH.orgs, CH.perfil, CH.ultimo, CH.orgEquipe, CH.state].forEach(apagar);
    try { sessionStorage.clear(); } catch (e) {}
    quem = null; ORGS = SEM_LISTA ? [] : (D.orgs || []); recusado = false; visaoDoLink = false;
    perfil = { tipo: 'org', org: D.padrao || null };
    try { $('dlgBeta').close(); } catch (e) {}
    pintarTudo(); pintarSair(); window.scrollTo(0, 0);
    avisar('Pronto: o Hub esqueceu esta conta. Antes de passar o aparelho, saia também da conta Google (no Gmail ou em accounts.google.com).', 9000);
  }
  $('navSair').addEventListener('click', sair);
  $('betaSair').addEventListener('click', sair);
  $('betaConta').hidden = !PORTEIRO.url;
  /* «Entrar com outra conta» (contrato v1): na recusa, vai à escolha de conta do Google e dali ao Porteiro, com state novo —
     o mesmo caminho do «Usar outra conta» do Porteiro, um toque a menos; sem recusa, vai ao Porteiro */
  $('btConta').addEventListener('click', function () {
    if (!recusado) { irAoPorteiro(); return; }
    var st = sortearState();
    gravar(CH.state, { s: st, em: new Date().toISOString() }); gravar(CH.porteiro, 1, true);
    mostrarAbrindo('Escolher outra conta Google');
    location.assign('https://accounts.google.com/AccountChooser?continue=' + encodeURIComponent(urlPorteiro(st)));
  });
  $('btContaEquipe').addEventListener('click', function () { irAoPorteiro(true); });
  $('betaEquipe').hidden = !!PORTEIRO.url && !ehEquipe;   /* G1: a visão da equipe só vem do Porteiro */
  $('betaConta').addEventListener('click', function () {   /* conta errada escolhida no Google, ou visão vencida: confere de novo */
    apagar(CH.quem); $('dlgBeta').close(); irAoPorteiro();
  });
  $('betaEsquecer').addEventListener('click', function () {
    apagar(CH.ultimo); $('dlgBeta').close(); pintarContinuar(); avisar('Pronto: o Hub não volta mais sozinho a um app.');
  });

  /* voltar pelo «Voltar» do navegador traz a página do cache: nunca reabrir o app por cima */
  window.addEventListener('pageshow', function (ev) {
    if (!ev.persisted) return;
    cancelarVolta(); pintarContinuar();
    if (PORTEIRO.url && !quemValido()) { motivoSemConta = motivoSemConta || 'A entrada pelo Google não terminou.'; pintarTudo(); }   /* «Voltar» do Google pelo cache da página */
  });
  window.addEventListener('pagehide', function () { if (timerVolta) cancelarVolta(); });

  /* a janela passou do limite do computador (ou voltou): troca ilustração e caixas, sem recarregar */
  function aoMudarLargura() { pintarTudo(); }
  if (mqLargo.addEventListener) mqLargo.addEventListener('change', aoMudarLargura);
  else if (mqLargo.addListener) mqLargo.addListener(aoMudarLargura);

  if (indoAoPorteiro) irAoPorteiro();
  else { pintarTudo(); pintarSair(); talvezVoltarSozinho(); }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
