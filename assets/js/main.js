/* Configuração do projeto: preencher a partir do briefing.md.
   IDs vazios = nenhum script de terceiros é carregado e o banner de cookies não aparece. */
const CONFIG = {
  ga4Id: '', // ex.: 'G-XXXXXXXXXX'
  metaPixelId: '', // ex.: '123456789012345'
};

const CHAVE_CONSENTIMENTO = 'ul-consentimento';

// data-track → eventos disparados (ver _docs/padrao-whatsapp.md)
const EVENTOS = {
  whatsapp: { ga: 'click_whatsapp', meta: 'Contact' },
  ifood: { ga: 'click_ifood' },
  keeta: { ga: 'click_keeta' },
  '99food': { ga: 'click_99food' },
  instagram: { ga: 'click_instagram' },
  'avaliar-google': { ga: 'click_avaliar_google' },
  'como-chegar': { ga: 'click_como_chegar', meta: 'FindLocation' },
};

let analyticsCarregado = false;

function lerConsentimento() {
  try {
    return localStorage.getItem(CHAVE_CONSENTIMENTO);
  } catch {
    return null;
  }
}

function salvarConsentimento(valor) {
  try {
    localStorage.setItem(CHAVE_CONSENTIMENTO, valor);
  } catch {
    // Sem armazenamento (aba anônima restrita): vale só para esta visita.
  }
}

function carregarAnalytics() {
  if (analyticsCarregado) return;
  analyticsCarregado = true;

  if (CONFIG.ga4Id) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.ga4Id}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', CONFIG.ga4Id);
  }

  if (CONFIG.metaPixelId) {
    /* Snippet oficial do Meta Pixel */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', CONFIG.metaPixelId);
    window.fbq('track', 'PageView');
  }
}

function iniciarConsentimento() {
  const usaAnalytics = Boolean(CONFIG.ga4Id || CONFIG.metaPixelId);
  const banner = document.getElementById('consentimento');
  const botoesAbrir = document.querySelectorAll('[data-abrir-consentimento]');

  if (!usaAnalytics) {
    botoesAbrir.forEach((b) => (b.hidden = true));
    return;
  }

  const abrir = () => {
    if (!banner) return;
    banner.hidden = false;
    document.body.classList.add('consentimento-aberto');
  };
  const fechar = () => {
    if (!banner) return;
    banner.hidden = true;
    document.body.classList.remove('consentimento-aberto');
  };

  const escolha = lerConsentimento();
  if (escolha === 'aceito') carregarAnalytics();
  else if (!escolha) abrir();

  banner?.querySelector('[data-consentimento="aceitar"]')?.addEventListener('click', () => {
    salvarConsentimento('aceito');
    fechar();
    carregarAnalytics();
  });

  banner?.querySelector('[data-consentimento="recusar"]')?.addEventListener('click', () => {
    salvarConsentimento('recusado');
    fechar();
    // Scripts já carregados só saem da página com um recarregamento.
    if (analyticsCarregado) location.reload();
  });

  botoesAbrir.forEach((b) => b.addEventListener('click', abrir));
}

function iniciarTracking() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-track]');
    if (!link || !analyticsCarregado) return;
    const evento = EVENTOS[link.dataset.track];
    if (!evento) return;
    const origem = link.dataset.origem || '';
    if (window.gtag && evento.ga) window.gtag('event', evento.ga, { origem });
    if (window.fbq && evento.meta) window.fbq('track', evento.meta, { origem });
  });
}

function iniciarModalPedido() {
  const modal = document.getElementById('modal-pedido');
  if (!modal) return;

  document.querySelectorAll('[data-abrir-pedido]').forEach((b) => {
    b.addEventListener('click', () => modal.showModal());
  });

  // Fecha ao escolher um app (abre em nova aba) ou ao clicar fora da caixa
  // (no ::backdrop, que é o próprio <dialog>)
  modal.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => modal.close()));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });
}

/* Banner com destaques: o trilho é um scroll-snap nativo (funciona com swipe e sem JS);
   aqui entram setas, pontos e a troca automática. A troca para quando o visitante interage,
   quando o mouse ou o foco está no banner e com prefers-reduced-motion. */
function iniciarBanner() {
  const raiz = document.querySelector('[data-banner]');
  const trilho = raiz?.querySelector('[data-banner-trilho]');
  if (!trilho) return;

  const slides = [...trilho.children];
  const pontos = [...raiz.querySelectorAll('[data-banner-ponto]')];
  const controles = raiz.querySelector('[data-banner-controles]');
  const btnPausa = raiz.querySelector('[data-banner-pausa]');
  const INTERVALO = 7000;
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let atual = 0;
  let parado = movimentoReduzido; // parado pelo visitante (ou pela preferência do sistema)
  let emEspera = false; // mouse ou foco dentro do banner
  let timer = null;

  if (controles) controles.hidden = false;

  const marcar = (i) => {
    atual = i;
    pontos.forEach((p, n) => p.setAttribute('aria-current', n === i ? 'true' : 'false'));
    // Só o destaque visível recebe foco pelo teclado
    slides.forEach((s, n) => (s.inert = n !== i));
  };

  const irPara = (i) => {
    const alvo = (i + slides.length) % slides.length;
    trilho.scrollTo({ left: slides[alvo].offsetLeft, behavior: movimentoReduzido ? 'auto' : 'smooth' });
    marcar(alvo);
  };

  const atualizarPausa = () => {
    if (!btnPausa) return;
    btnPausa.setAttribute('aria-label', parado ? 'Retomar troca automática' : 'Pausar troca automática');
    btnPausa.querySelector('[data-icone="pausa"]').hidden = parado;
    btnPausa.querySelector('[data-icone="tocar"]').hidden = !parado;
  };

  const agendar = () => {
    clearInterval(timer);
    timer = null;
    if (parado || emEspera) return;
    timer = setInterval(() => {
      if (!document.hidden) irPara(atual + 1);
    }, INTERVALO);
  };

  const pararPeloVisitante = () => {
    parado = true;
    atualizarPausa();
    agendar();
  };

  // Atualiza o ponto ativo quando o visitante arrasta o banner
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((e) => {
        if (e.isIntersecting) marcar(slides.indexOf(e.target));
      });
    },
    { root: trilho, threshold: 0.6 }
  );
  slides.forEach((s) => observador.observe(s));

  raiz.querySelector('[data-banner-anterior]')?.addEventListener('click', () => {
    pararPeloVisitante();
    irPara(atual - 1);
  });
  raiz.querySelector('[data-banner-proximo]')?.addEventListener('click', () => {
    pararPeloVisitante();
    irPara(atual + 1);
  });
  pontos.forEach((p) =>
    p.addEventListener('click', () => {
      pararPeloVisitante();
      irPara(Number(p.dataset.bannerPonto));
    })
  );
  btnPausa?.addEventListener('click', () => {
    parado = !parado;
    atualizarPausa();
    agendar();
  });

  trilho.addEventListener('pointerdown', pararPeloVisitante, { passive: true });
  raiz.addEventListener('mouseenter', () => { emEspera = true; agendar(); });
  raiz.addEventListener('mouseleave', () => { emEspera = false; agendar(); });
  raiz.addEventListener('focusin', () => { emEspera = true; agendar(); });
  raiz.addEventListener('focusout', (e) => {
    if (raiz.contains(e.relatedTarget)) return;
    emEspera = false;
    agendar();
  });

  marcar(0);
  atualizarPausa();
  agendar();
}

iniciarConsentimento();
iniciarTracking();
iniciarModalPedido();
iniciarBanner();
