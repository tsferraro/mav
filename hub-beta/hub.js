/* Hub Mandū · Beta — a lançadora (PT13, PT14 do sig-mandu).
   Quem vê o quê:  ?org=<id>  → tela F da organização (só a dela) · ?equipe=1 → tela G (Painel da equipe).
   Sem parâmetro, vale o que o aparelho guardou; na 1ª vez, a organização padrão do Beta (Camtauá, D12).
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

  function orgPorId(id) { for (var i = 0; i < ORGS.length; i++) if (ORGS[i].id === id) return ORGS[i]; return null; }
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
    { id: 'maturidade', x: .667, y: .5, w: .333, h: .5, nome: 'Maturidade', estado: 'admin', abre: 'maturidade', compacto: true }
  ];
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

  /* ---------- perfil ---------- */
  var params = new URLSearchParams(location.search);
  var perfil = ler(CH.perfil) || null;
  if (params.get('equipe') === '1') perfil = { tipo: 'equipe' };
  else if (params.get('org')) {
    if (orgPorId(params.get('org'))) perfil = { tipo: 'org', org: params.get('org') };
    else setTimeout(function () { avisar('Não achei essa organização no Hub. Abrindo a padrão.'); }, 300);
  }
  if (!perfil || (perfil.tipo === 'org' && !orgPorId(perfil.org))) perfil = { tipo: 'org', org: D.padrao };
  gravar(CH.perfil, perfil);

  function orgEquipe() { var id = ler(CH.orgEquipe); return orgPorId(id) ? id : null; }

  function enderecoLimpo() {
    return location.pathname + (perfil.tipo === 'equipe' ? '?equipe=1' : '?org=' + encodeURIComponent(perfil.org));
  }
  function hubVolta() { return location.origin + location.pathname + '?hub=1'; }

  /* ---------- destino de cada app ---------- */
  function urlDe(app, orgId) {
    if (app.abre === 'sgo') {
      var o = orgPorId(orgId);
      return o ? o.sgo + (o.sgo.indexOf('?') < 0 ? '?' : '&') + 'hub=' + encodeURIComponent(hubVolta()) : '';
    }
    if (app.abre === 'painel') return D.painel || '';
    if (app.abre === 'maturidade') return LINKS.maturidade || '';
    if (app.abre === 'manual') return LINKS.manual || '';
    if (app.abre === 'videos') return LINKS.videos || '';
    return '';
  }
  function nomeDe(app, orgId) {
    var o = orgPorId(orgId);
    if (app.abre === 'sgo') return app.nome + (o ? ' · ' + o.nome : '');
    if (app.abre === 'painel') return 'Painel da Mandū';
    if (app.abre === 'maturidade') return 'Maturidade · Painel MAV';
    return app.nome;
  }
  function abrir(app, orgId) {
    var url = urlDe(app, orgId);
    if (!url) { avisar('Este app ainda não tem endereço no Hub.'); return; }
    gravar(CH.ultimo, { id: app.id, nome: nomeDe(app, orgId), url: url, org: app.abre === 'sgo' ? orgId : null, modo: perfil.tipo, em: new Date().toISOString() });
    mostrarAbrindo(nomeDe(app, orgId));   /* o app do Google leva alguns segundos: o toque responde na hora (PT19) */
    location.href = url;
  }

  /* ---------- último app: continuar e voltar sozinho ---------- */
  function ultimoValido() {
    var u = ler(CH.ultimo);
    if (!u || !u.url || u.modo !== perfil.tipo) return null;
    if (perfil.tipo === 'org' && u.org && u.org !== perfil.org) return null;
    return u;
  }
  function pintarContinuar() {
    var u = ultimoValido(), a = $('continuar');
    if (!u) { $('faixaContinuar').hidden = true; return; }
    $('continuarNome').textContent = u.nome;
    a.href = u.url; $('faixaContinuar').hidden = false;
    a.onclick = function () { var v = ler(CH.ultimo); if (v) { v.em = new Date().toISOString(); gravar(CH.ultimo, v); } };
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
    $('dlgOrgTitulo').textContent = titulo;
    $('dlgOrgSub').textContent = sub;
    $('dlgOrgLista').innerHTML = h;
    aoEscolher = depois;
    abrirDialogo($('dlgOrg'));
  }
  $('dlgOrgLista').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-org]'); if (!b) return;
    var id = b.getAttribute('data-org');
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
      if (perfil.tipo === 'org') { abrir(app, perfil.org); return; }
      escolherOrg('Abrir ' + app.nome + ' de qual organização?', 'O app abre com os dados da organização escolhida.', function (id) { abrir(app, id); });
      return;
    }
    abrir(app, perfil.tipo === 'org' ? perfil.org : orgEquipe());
  });

  var avisoTimer = null;
  function avisar(t) {
    var a = $('aviso'); a.textContent = t; a.hidden = false;
    if (avisoTimer) clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { a.hidden = true; }, 2600);
  }

  /* ---------- pintura ---------- */
  function pintarTopo() {
    var eq = perfil.tipo === 'equipe';
    $('app').setAttribute('data-modo', eq ? 'equipe' : 'org');
    if (eq) {
      var o = orgPorId(orgEquipe());
      $('topoTitulo').textContent = 'Painel da equipe';
      $('topoSub').textContent = o ? 'Mandū · vendo a ' + o.nome : 'Mandū · todas as organizações';
    } else {
      var org = orgPorId(perfil.org);
      $('topoTitulo').textContent = org ? org.nome : 'Hub Mandū';
      $('topoSub').textContent = 'Os apps da sua organização';
    }
    $('btTrocar').hidden = !eq;
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
  $('betaOrg').addEventListener('click', function () {
    perfil = { tipo: 'org', org: perfil.tipo === 'org' ? perfil.org : D.padrao };
    gravar(CH.perfil, perfil); $('dlgBeta').close(); pintarTudo(); window.scrollTo(0, 0);
  });
  $('betaEquipe').addEventListener('click', function () {
    perfil = { tipo: 'equipe' };
    gravar(CH.perfil, perfil); $('dlgBeta').close(); pintarTudo(); window.scrollTo(0, 0);
  });
  $('betaEsquecer').addEventListener('click', function () {
    apagar(CH.ultimo); $('dlgBeta').close(); pintarContinuar(); avisar('Pronto: o Hub não volta mais sozinho a um app.');
  });

  /* voltar pelo «Voltar» do navegador traz a página do cache: nunca reabrir o app por cima */
  window.addEventListener('pageshow', function (ev) { if (ev.persisted) { cancelarVolta(); pintarContinuar(); } });
  window.addEventListener('pagehide', function () { if (timerVolta) cancelarVolta(); });

  /* a janela passou do limite do computador (ou voltou): troca ilustração e caixas, sem recarregar */
  function aoMudarLargura() { pintarTudo(); }
  if (mqLargo.addEventListener) mqLargo.addEventListener('change', aoMudarLargura);
  else if (mqLargo.addListener) mqLargo.addListener(aoMudarLargura);

  pintarTudo();
  talvezVoltarSozinho();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
