// ============================================================
// CONFIGURAÇÃO GERAL
// ============================================================
let currentPhase = 0;
let score = 0;
let phaseScore = 0;
let locked = false;
let calmMode = false;

const PHASES = [
  { id:1, name:'Fase 1', title:'Mundo das Cores', emoji:'🎨', desc:'Qual das opções tem a mesma cor que a caixinha abaixo? Toque para escolher!' },
  { id:2, name:'Fase 2', title:'Terra das Formas', emoji:'🔷', desc:'Qual forma combina com a descrita? Toque na que você acha!' },
  { id:3, name:'Fase 3', title:'Rio das Sequências', emoji:'🌊', desc:'Veja o padrão e descubra o que vem a seguir!' },
  { id:4, name:'Fase 4', title:'Caverna da Memória', emoji:'🧠', desc:'Vire as peças e encontre os pares iguais!' },
  { id:5, name:'Fase 5', title:'Jardim das Emoções', emoji:'😊', desc:'Olhe o rosto e escolha como ele está se sentindo!' },
];

// ============================================================
// SONS DE FEEDBACK — estilo jogo infantil
// ============================================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function makeOsc(freq, type, startT, dur, vol, freqEnd) {
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startT);
  if (freqEnd !== undefined)
    osc.frequency.linearRampToValueAtTime(freqEnd, startT + dur);
  gain.gain.setValueAtTime(0, startT);
  gain.gain.linearRampToValueAtTime(vol, startT + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startT + dur);
  osc.start(startT);
  osc.stop(startT + dur);
}

function playSound(type) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const t = audioCtx.currentTime;

  if (type === 'correct') {
    // Fanfarra kids: tres notinhas alegres subindo + shimmer
    makeOsc(523, 'square', t,        0.13, 0.18);
    makeOsc(523, 'sine',   t,        0.13, 0.10);
    makeOsc(659, 'square', t + 0.13, 0.13, 0.18);
    makeOsc(659, 'sine',   t + 0.13, 0.13, 0.10);
    makeOsc(784, 'square', t + 0.26, 0.28, 0.20);
    makeOsc(784, 'sine',   t + 0.26, 0.28, 0.12);
    makeOsc(1568, 'sine',  t + 0.26, 0.28, 0.06);
  } else {
    // "Ou-ou" descendo: dois pufs graves tipicos de jogo kids
    makeOsc(380, 'sine',     t,        0.30, 0.22, 200);
    makeOsc(380, 'triangle', t,        0.30, 0.10, 200);
    makeOsc(260, 'sine',     t + 0.32, 0.35, 0.20, 140);
    makeOsc(260, 'triangle', t + 0.32, 0.35, 0.08, 140);
  }
}

// ============================================================
// ESTRELINHAS DE FUNDO
// ============================================================
function buildStars() {
  const bg = document.getElementById('starsBg');
  for(let i=0;i<35;i++){
    const d = document.createElement('div');
    d.className='star-dot';
    const s = Math.random()*2.5+0.5;
    d.style.cssText=`width:${s}px;height:${s}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--dur:${(Math.random()*2+1.5).toFixed(1)}s;opacity:${(Math.random()*0.6+0.2).toFixed(2)}`;
    bg.appendChild(d);
  }
}
// ============================================================
// MODO CALMO
// ============================================================

function toggleCalmMode() {
  calmMode = !calmMode;

  document.body.classList.toggle('calm-mode');

  const btn = document.getElementById('calmModeBtn');

  if (calmMode) {
    btn.textContent = '🌙 Modo Calmo: ON'
  }else{
    btn.textContent = '🌙 Modo Calmo: OFF'
  }
}


// ============================================================
// DOTS DE PROGRESSO
// ============================================================
function renderDots() {
  const c = document.getElementById('phaseDots');
  c.innerHTML = PHASES.map((p,i)=>`
    <div class="phase-dot ${i<currentPhase?'done':''} ${i===currentPhase?'active':''}">
      ${i<currentPhase?'✓':p.emoji}
    </div>`).join('');
}

function updateScore(pts) {
  score += pts;
  document.getElementById('scoreVal').textContent = score;
}

// ============================================================
// UTILIDADES HTML
// ============================================================
function feedback(msg, type='info') {
  const el = document.getElementById('fb');
  if(!el) return;
  el.textContent = msg;
  el.className = `feedback-box show ${type}`;
}

function nextPhaseBtn(label='Próxima Fase ➜') {
  return `<div class="btn-row"><button class="btn btn-primary" onclick="advancePhase()">${label}</button></div>`;
}

// ============================================================
// AVANÇAR FASE
// ============================================================
function advancePhase() {
  currentPhase++;
  locked = false;
  if(currentPhase >= PHASES.length) { renderWin(); return; }
  renderDots();
  renderPhase(currentPhase);
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================
function renderPhase(idx) {
  const fns = [renderPhase1, renderPhase2, renderPhase3, renderPhase4, renderPhase5];
  fns[idx]();
}

// ============================================================
// FASE 1 – CORES
// ============================================================
const COLORS = [
  { name:'Vermelho', hex:'#FF5C5C', emoji:'🔴' },
  { name:'Azul',     hex:'#5599FF', emoji:'🔵' },
  { name:'Verde',    hex:'#4DC97A', emoji:'🟢' },
  { name:'Amarelo',  hex:'#FFD93D', emoji:'🟡' },
  { name:'Roxo',     hex:'#B57BFF', emoji:'🟣' },
  { name:'Laranja',  hex:'#FF9050', emoji:'🟠' },
  { name:'Rosa',     hex:'#FF85C0', emoji:'🌸' },
  { name:'Ciano',    hex:'#3FD6D6', emoji:'🩵' },
];

let p1State = { questions:[], qi:0, correct:0 };

function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }

function buildP1Questions() {
  const pool = shuffle([...COLORS]);
  return pool.slice(0,5).map(target => {
    let opts = [target];
    let others = shuffle(COLORS.filter(c=>c.hex!==target.hex));
    opts = opts.concat(others.slice(0,7));
    return { target, options: shuffle(opts) };
  });
}

function renderPhase1() {
  p1State.questions = buildP1Questions();
  p1State.qi = 0; p1State.correct = 0;
  renderP1Round();
}

function renderP1Round() {

speak('Encontre a cor igual à mostrada na tela')

  locked = false;
  const { target, options } = p1State.questions[p1State.qi];
  const area = document.getElementById('gameArea');
  area.innerHTML = `
    <div class="panel">
      <div class="phase-tag">${PHASES[0].name} · Pergunta ${p1State.qi+1}/5</div>
      <div class="phase-title">${PHASES[0].title}</div>
      <p class="phase-desc">${PHASES[0].desc}</p>
      <p class="target-label">Encontre esta cor:</p>
      <div class="target-color-box" style="background:${target.hex}">
        <span style="font-size:1.3rem;font-weight:800;color:rgba(0,0,0,0.55)">${target.name}</span>
      </div>
      <div class="colors-grid" id="colGrid">
        ${options.map((c,i)=>`
          <button class="color-btn" style="background:${c.hex}" onclick="checkP1(${i})" data-correct="${c.hex===target.hex}" aria-label="${c.name}"></button>
        `).join('')}
      </div>
      <div class="feedback-box" id="fb"></div>
    </div>`;
}

function checkP1(i) {
  if(locked) return; locked=true;
  const btns = document.querySelectorAll('.color-btn');
  const q = p1State.questions[p1State.qi];
  const chosen = q.options[i];
  const isCorrect = chosen.hex === q.target.hex;
  btns[i].classList.add(isCorrect?'correct':'wrong');
  if(!isCorrect) btns.forEach((b,j)=>{ if(b.dataset.correct==='true') b.classList.add('correct'); });
  if(isCorrect){ playSound('correct'); feedback('✨ Incrível! Você encontrou a cor certa!','ok'); p1State.correct++; updateScore(20); }
  else { playSound('wrong'); feedback('Boa tentativa! Vamos tentar novamente 😊','info'); }
  setTimeout(()=>{
    p1State.qi++;
    if(p1State.qi<p1State.questions.length) { renderP1Round(); }
    else { endP1(); }
  },1600);
}

function endP1() {
  const area = document.getElementById('gameArea');
  area.innerHTML = `
    <div class="panel" style="text-align:center">
      <div class="phase-tag">${PHASES[0].name} · Completa!</div>
      <div class="phase-title">Você terminou a Fase 1! 🎉</div>
      <p class="phase-desc" style="margin-top:.5rem">Você acertou <strong style="color:var(--teal)">${p1State.correct} de 5</strong> cores. Cada cor é única, assim como você!</p>
      ${nextPhaseBtn()}
    </div>`;
}

// ============================================================
// FASE 2 – FORMAS
// ============================================================
const SHAPES = [
  { name:'círculo',    svg:`<svg width="60" height="60"><circle cx="30" cy="30" r="26" fill="#a8d8ff"/></svg>` },
  { name:'quadrado',  svg:`<svg width="60" height="60"><rect x="6" y="6" width="48" height="48" rx="4" fill="#c8a8ff"/></svg>` },
  { name:'triângulo', svg:`<svg width="60" height="60"><polygon points="30,5 56,54 4,54" fill="#a8f0d4"/></svg>` },
  { name:'estrela',   svg:`<svg width="60" height="60"><polygon points="30,4 37,22 56,22 41,35 46,54 30,43 14,54 19,35 4,22 23,22" fill="#ffe87c"/></svg>` },
  { name:'coração',   svg:`<svg width="60" height="60"><path d="M30 52 C30 52 5 35 5 20 C5 12 12 6 20 8 C24 9 28 13 30 17 C32 13 36 9 40 8 C48 6 55 12 55 20 C55 35 30 52 30 52Z" fill="#ffcba4"/></svg>` },
  { name:'diamante',  svg: `<svg width="60" height="60" viewBox="0 0 100 100"> <polygon points="20,35 80,35 95,50 50,95 5,50"fill="white"stroke="black"stroke-width="5"/><line x1="20" y1="35" x2="50" y2="95" stroke="black" stroke-width="4"/><line x1="80" y1="35" x2="50" y2="95" stroke="black" stroke-width="4"/><line x1="35" y1="35" x2="50" y2="50" stroke="black" stroke-width="4"/><line x1="65" y1="35" x2="50" y2="50" stroke="black" stroke-width="4"/><line x1="5" y1="50" x2="95" y2="50" stroke="black" stroke-width="4"/></svg>`}
];

let p2State = { qi:0, correct:0, questions:[] };

function buildP2Qs() {
  const pool = shuffle([...SHAPES]);
  return pool.slice(0,5).map(target=>{
    let opts = [target, ...shuffle(SHAPES.filter(s=>s.name!==target.name)).slice(0,3)];
    return { target, options: shuffle(opts) };
  });
}

function renderPhase2() {
  p2State.questions = buildP2Qs(); p2State.qi=0; p2State.correct=0;
  renderP2Round();
}

function renderP2Round() {
  locked=false;
  const { target, options } = p2State.questions[p2State.qi];

  speak(`Qual delas é um ${target.name}?`);
  document.getElementById('gameArea').innerHTML = `
    <div class="panel">
      <div class="phase-tag">${PHASES[1].name} · Pergunta ${p2State.qi+1}/5</div>
      <div class="phase-title">${PHASES[1].title}</div>
      <p class="phase-desc">Qual delas é um <strong style="color:var(--star-gold)">${target.name}</strong>? Toque na forma certa!</p>
      <div class="shapes-area" id="shapeArea">
        ${options.map((s,i)=>`
          <div class="shape-card" onclick="checkP2(${i})" data-correct="${s.name===target.name}" role="button" aria-label="${s.name}">
            ${s.svg}
          </div>`).join('')}
      </div>
      <div class="feedback-box" id="fb"></div>
    </div>`;
}

function checkP2(i) {
  if(locked) return; locked=true;
  const cards = document.querySelectorAll('.shape-card');
  const q = p2State.questions[p2State.qi];
  const isCorrect = q.options[i].name === q.target.name;
  cards[i].classList.add(isCorrect?'correct':'wrong');
  if(!isCorrect) cards.forEach(c=>{ if(c.dataset.correct==='true') c.classList.add('correct'); });
  if(isCorrect){ playSound('correct'); feedback('🌟 Perfeito! Você conhece as formas!','ok'); p2State.correct++; updateScore(20); }
  else { playSound('wrong'); feedback('Tudo bem! Você está aprendendo 💙','info'); }
  setTimeout(()=>{
    p2State.qi++;
    if(p2State.qi<p2State.questions.length) renderP2Round();
    else {
      document.getElementById('gameArea').innerHTML=`
        <div class="panel" style="text-align:center">
          <div class="phase-tag">${PHASES[1].name} · Completa!</div>
          <div class="phase-title">Fase 2 concluída! 🔷</div>
          <p class="phase-desc">Você acertou <strong style="color:var(--teal)">${p2State.correct} de 5</strong> formas. As formas estão por toda parte!</p>
          ${nextPhaseBtn()}
        </div>`;
    }
  },1600);
}

// ============================================================
// FASE 3 – SEQUÊNCIA
// ============================================================
const SEQ_EMOJIS = ['🌟','🍎','🐶','🌈','🎈','🦋','🌻','🐸'];

let p3State = { qi:0, correct:0, questions:[] };

function buildP3Qs() {

  const qs = [];

  for(let i = 0; i < 5; i++) {

    const symbols = shuffle([...SEQ_EMOJIS]);

    const a = symbols[0];
    const b = symbols[1];

    const pattern = [a, b, a, b, '❓'];

    const answer = a;

    const distractors = shuffle(
      SEQ_EMOJIS.filter(e => e !== answer)
    ).slice(0,3);

    const opts = shuffle([answer, ...distractors]);

    qs.push({
      seqShow: pattern,
      answer,
      opts
    });
  }

  return qs;
}

function renderPhase3() {
  p3State.questions = buildP3Qs(); p3State.qi=0; p3State.correct=0;
  renderP3Round();
}

function renderP3Round() {

  speak('Descubra qual síbolo completa o padrão');

  locked=false;
  const q = p3State.questions[p3State.qi];
  document.getElementById('gameArea').innerHTML=`
    <div class="panel">
      <div class="phase-tag">${PHASES[2].name} · Pergunta ${p3State.qi+1}/5</div>
      <div class="phase-title">${PHASES[2].title}</div>
      <p class="phase-desc">${PHASES[2].desc}</p>
      <p class="seq-label">O padrão se repete. O que vem no ❓?</p>
      <div class="seq-display">
        ${q.seqShow.map(e=>`<div class="seq-item">${e}</div>`).join('')}
      </div>
      <p class="seq-label" style="margin-top:1rem">Escolha a resposta:</p>
      <div class="seq-options" id="seqOpts">
        ${q.opts.map((e,i)=>`<div class="seq-opt" onclick="checkP3(${i})" data-correct="${e===q.answer}" role="button">${e}</div>`).join('')}
      </div>
      <div class="feedback-box" id="fb"></div>
    </div>`;
}

function checkP3(i) {
  if(locked) return; locked=true;
  const opts = document.querySelectorAll('.seq-opt');
  const q = p3State.questions[p3State.qi];
  const isCorrect = q.opts[i]===q.answer;
  opts[i].classList.add(isCorrect?'correct':'wrong');
  if(!isCorrect) opts.forEach(o=>{ if(o.dataset.correct==='true') o.classList.add('correct'); });
  if(isCorrect){ playSound('correct'); feedback('🌈 Você encontrou o padrão!','ok'); p3State.correct++; updateScore(20); }
  else { playSound('wrong'); feedback('Muito bom tentar novamente 🌈 ','info'); }
  setTimeout(()=>{
    p3State.qi++;
    if(p3State.qi<p3State.questions.length) renderP3Round();
    else {
      document.getElementById('gameArea').innerHTML=`
        <div class="panel" style="text-align:center">
          <div class="phase-tag">${PHASES[2].name} · Completa!</div>
          <div class="phase-title">Fase 3 concluída! 🌊</div>
          <p class="phase-desc">Você acertou <strong style="color:var(--teal)">${p3State.correct} de 5</strong> sequências. Seu cérebro é incrível!</p>
          ${nextPhaseBtn()}
        </div>`;
    }
  },1600);
}

// ============================================================
// FASE 4 – MEMÓRIA
// ============================================================
const MEM_POOL = ['🍕','🚀','🌸','🐱','⚽','🎵','🍦','🦄'];
let p4State = { cards:[], flipped:[], matched:0, total:0, moves:0 };

function renderPhase4() {
  const pairs = shuffle([...MEM_POOL]).slice(0,6);
  const allCards = shuffle([...pairs,...pairs]).map((e,i)=>({ id:i, emoji:e, flipped:false, matched:false }));
  p4State = { cards:allCards, flipped:[], matched:0, total:6, moves:0 };
  renderP4Board();
}

function renderP4Board() {
  document.getElementById('gameArea').innerHTML=`
    <div class="panel">
      <div class="phase-tag">${PHASES[3].name}</div>
      <div class="phase-title">${PHASES[3].title}</div>
      <p class="phase-desc">${PHASES[3].desc}</p>
      <div class="mem-grid" id="memGrid" style="grid-template-columns:repeat(4,1fr);max-width:360px;margin:0 auto"></div>
      <div class="feedback-box" id="fb"></div>
    </div>`;
  renderP4Cards();
}

function renderP4Cards() {
  const grid = document.getElementById('memGrid');
  grid.innerHTML = p4State.cards.map((c,i)=>`
    <div class="mem-card ${c.flipped||c.matched?'flipped':''} ${c.matched?'matched':''}" id="mc${i}" onclick="flipCard(${i})">
      <div class="mem-face front">✦</div>
      <div class="mem-face back">${c.emoji}</div>
    </div>`).join('');
}

function flipCard(i) {
  const s = p4State;
  if(locked) return;
  if(s.flipped.length>=2) return;
  if(s.cards[i].flipped||s.cards[i].matched) return;
  s.cards[i].flipped=true;
  s.flipped.push(i);
  document.getElementById('mc'+i).classList.add('flipped');
  if(s.flipped.length===2){
    locked=true; s.moves++;
    const [a,b]=s.flipped;
    if(s.cards[a].emoji===s.cards[b].emoji){
      s.cards[a].matched=s.cards[b].matched=true;
      s.matched++;
      updateScore(30);
      setTimeout(()=>{
        document.getElementById('mc'+a).classList.add('matched');
        document.getElementById('mc'+b).classList.add('matched');
        s.flipped=[];
        playSound('correct');
        feedback('🎉 Par encontrado!','ok');
        locked=false;
        if(s.matched===s.total){
          setTimeout(()=>{
            document.getElementById('gameArea').innerHTML=`
              <div class="panel" style="text-align:center">
                <div class="phase-tag">${PHASES[3].name} · Completa!</div>
                <div class="phase-title">Fase 4 concluída! 🧠</div>
                <p class="phase-desc">Você encontrou todos os ${s.total} pares em <strong style="color:var(--teal)">${s.moves} tentativas</strong>. Memória excelente!</p>
                ${nextPhaseBtn()}
              </div>`;
          },900);
        }
      },300);
    } else {
      playSound('wrong');
      feedback('Esses não combinam, tente de novo 😊','info');
      setTimeout(()=>{
        s.cards[a].flipped=s.cards[b].flipped=false;
        document.getElementById('mc'+a).classList.remove('flipped');
        document.getElementById('mc'+b).classList.remove('flipped');
        s.flipped=[];
        locked=false;
      },1100);
    }
  }
}

// ============================================================
// FASE 5 – EMOÇÕES
// ============================================================
const EMOTIONS = [
  { emoji:'😊', name:'Feliz', hint:'Um sorriso grande!' },
  { emoji:'😢', name:'Triste', hint:'Lágrimas nos olhos.' },
  { emoji:'😠', name:'Bravo', hint:'Sobrancelhas franzidas.' },
  { emoji:'😮', name:'Surpreso', hint:'Boca aberta!' },
];

let p5State = { qi:0, correct:0, questions:[] };

function buildP5Qs() {
  const pool = shuffle([...EMOTIONS]);
  return pool.slice(0,5).map(target=>{
    const others = shuffle(EMOTIONS.filter(e=>e.emoji!==target.emoji)).slice(0,3);
    return { target, options: shuffle([target,...others]) };
  });
}

function renderPhase5() {
  p5State.questions=buildP5Qs(); p5State.qi=0; p5State.correct=0;
  renderP5Round();
}

function renderP5Round() {
  locked=false;
  const q = p5State.questions[p5State.qi];

  speak(`Qual emoção representa ${q.target.name}?`);
  document.getElementById('gameArea').innerHTML=`
    <div class="panel">
      <div class="phase-tag">${PHASES[4].name} · Pergunta ${p5State.qi+1}/5</div>
      <div class="phase-title">${PHASES[4].title}</div>
      <p class="phase-desc">${PHASES[4].desc}</p>
      <div class="emotion-display">${q.target.emoji}</div>
      <p style="text-align:center;color:var(--text-muted);font-size:.9rem;margin-bottom:.5rem">Dica: ${q.target.hint}</p>
      <div class="emotion-options" id="emoOpts">
        ${q.options.map((e,i)=>`
          <div class="emotion-opt" onclick="checkP5(${i})" data-correct="${e.emoji===q.target.emoji}" role="button">
            <span class="opt-emoji">${e.emoji}</span>
            <span>${e.name}</span>
          </div>`).join('')}
      </div>
      <div class="feedback-box" id="fb"></div>
    </div>`;
}

function checkP5(i) {
  if(locked) return; locked=true;
  const opts = document.querySelectorAll('.emotion-opt');
  const q = p5State.questions[p5State.qi];
  const isCorrect = q.options[i].emoji===q.target.emoji;
  opts[i].classList.add(isCorrect?'correct':'wrong');
  if(!isCorrect) opts.forEach(o=>{ if(o.dataset.correct==='true') o.classList.add('correct'); });
  if(isCorrect){ playSound('correct'); feedback('💛 Você conhece os sentimentos!','ok'); p5State.correct++; updateScore(20); }
  else { playSound('wrong'); feedback('Todo sentimento é válido! A certa ficou verde 😊','info'); }
  setTimeout(()=>{
    p5State.qi++;
    if(p5State.qi<p5State.questions.length) renderP5Round();
    else {
      setTimeout(()=>{ renderWin(); }, 400);
    }
  },1600);
}

// ============================================================
// TELA DE VITÓRIA
// ============================================================
function renderWin() {
  renderDots();
  const stars = score >= 400 ? '⭐⭐⭐' : score >= 250 ? '⭐⭐' : '⭐';
  document.getElementById('gameArea').innerHTML=`
    <div class="panel win-screen">
      <div class="phase-tag">🎉 Parabéns!</div>
      <div class="win-stars">${stars}</div>
      <div class="win-title">Você completou a Jornada!</div>
      <div class="win-score">Total: ${score} pontos ✨</div>
      <p class="win-msg">
        Você explorou cores, formas, sequências, memória e emoções.<br>
        Cada fase mostrou o quanto você é capaz. Continue explorando o mundo do seu jeito! 💙
      </p>
      <div class="confetti">🌟 🎈 🦋 🌈 🎉 💛 🎊 🌸</div>
      <div class="btn-row" style="justify-content:center">
        <button class="btn btn-teal" onclick="restartGame()">Jogar de Novo 🔄</button>
        <button class="btn btn-ghost" onclick="abrirCreditos()">🌟 Créditos</button>
      </div>
    </div>`;
}

function restartGame() {
  currentPhase=0; score=0; locked=false;
  document.getElementById('scoreVal').textContent='0';
  renderDots();
  renderPhase(0);
}

const calmBtn = document.getElementById('calmModeBtn');

if(calmBtn){
  calmBtn.addEventListener('click', toggleCalmMode)
}

function speak(text){
  if(!('speechSynthesis' in window)) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 0.9;
  utterance.pitch = 1;

  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);

}


// ============================================================
// CRÉDITOS — modal inline fiel ao creditos.html
// ============================================================
function abrirCreditos() {
  const overlay = document.createElement('div');
  overlay.id = 'creditosOverlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:999;
    background:rgba(10,10,35,0.97);
    backdrop-filter:blur(10px);
    display:flex;align-items:flex-start;justify-content:center;
    padding:1.5rem 1rem 2rem;
    overflow-y:auto;
    animation:fadeInOv 0.35s ease;
  `;

  overlay.innerHTML = `
    <style>
      @keyframes fadeInOv  { from{opacity:0} to{opacity:1} }
      @keyframes fadeDown2 { from{opacity:0;transform:translateY(-18px)} to{opacity:1;transform:translateY(0)} }
      @keyframes fadeUp2   { from{opacity:0;transform:translateY(18px)}  to{opacity:1;transform:translateY(0)} }

      /* ── página ── */
      .cr-page {
        position:relative;
        width:100%;max-width:640px;
        display:flex;flex-direction:column;align-items:center;
        gap:1.6rem;
        padding-top:1rem;
      }

      /* ── Cruzeiro do Sul ── */
      .cr-sul {
        position:fixed;top:18px;right:22px;z-index:1001;
        filter:drop-shadow(0 0 10px rgba(255,215,0,.55));
      }

      /* ── estrelinhas ── */
      .cr-star-dot {
        position:fixed;border-radius:50%;background:white;pointer-events:none;
        animation:twCr var(--dur2) ease-in-out infinite alternate;
      }
      @keyframes twCr {
        from{opacity:.15;transform:scale(.8)}
        to  {opacity:.9 ;transform:scale(1.2)}
      }

      /* ── cabeçalho ── */
      .cr-header { text-align:center; animation:fadeDown2 .6s ease both; }
      .cr-tag {
        display:inline-block;
        background:rgba(255,215,0,.12);border:1px solid rgba(255,215,0,.35);
        border-radius:20px;padding:4px 16px;
        font-size:.75rem;font-weight:700;color:#FFD700;
        letter-spacing:1px;text-transform:uppercase;margin-bottom:.8rem;
      }
      .cr-title {
        font-family:'Baloo 2',cursive;font-size:2.1rem;font-weight:800;
        color:#FFD700;text-shadow:0 0 26px rgba(255,215,0,.4);
        line-height:1.1;margin-bottom:.35rem;
      }
      .cr-sub { font-size:.93rem;color:#b8aad8; }

      /* ── cards ── */
      .cr-card {
        width:100%;
        background:rgba(255,255,255,.07);
        border:1.5px solid rgba(255,255,255,.13);
        border-radius:22px;
        padding:1.6rem 1.8rem;
        backdrop-filter:blur(8px);
        animation:fadeUp2 .65s ease both;
      }
      .cr-card.gold-card {
        background:rgba(255,215,0,.06);
        border-color:rgba(255,215,0,.22);
      }

      /* ── section label ── */
      .cr-label {
        font-size:.7rem;font-weight:800;letter-spacing:1.5px;
        text-transform:uppercase;color:#00d4aa;
        display:flex;align-items:center;gap:8px;
        margin-bottom:1rem;
      }
      .cr-label.gold { color:#FFD700; }
      .cr-label::after {
        content:\'\';flex:1;height:1px;background:rgba(0,212,170,.25);
      }
      .cr-label.gold::after { background:rgba(255,215,0,.25); }

      /* ── grade 2 colunas ── */
      .cr-grid {
        display:grid;grid-template-columns:1fr 1fr;gap:10px;
      }

      /* ── linha de crédito ── */
      .cr-row {
        display:flex;align-items:center;gap:.7rem;
        padding:.55rem .7rem;
        background:rgba(255,255,255,.05);
        border-radius:12px;
        border:1px solid rgba(255,255,255,.08);
      }
      .cr-row.single {
        background:transparent;border:none;padding:.6rem 0;
      }

      /* ── avatar ── */
      .cr-av {
        width:38px;height:38px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:1.15rem;flex-shrink:0;
        border:2px solid rgba(255,255,255,.1);
      }
      .av-pp { background:rgba(200,168,255,.18); }
      .av-tt { background:rgba(0,212,170,.18); }
      .av-gg { background:rgba(255,215,0,.15); }
      .av-cc { background:rgba(255,124,110,.18); }
      .av-bb { background:rgba(168,216,255,.18); }

      .cr-name { font-weight:800;font-size:.92rem;color:#f0eaff;line-height:1.2; }
      .cr-role { font-size:.75rem;color:#b8aad8;margin-top:1px; }

      /* ── agradecimentos ── */
      .cr-thanks {
        width:100%;
        background:rgba(255,215,0,.06);border:1.5px solid rgba(255,215,0,.2);
        border-radius:18px;padding:1.3rem 1.6rem;text-align:center;
        animation:fadeUp2 .8s ease both;
      }
      .cr-thanks-emoji { font-size:2rem;margin-bottom:.4rem; }
      .cr-thanks-txt   { font-size:.92rem;color:#b8aad8;line-height:1.7; }
      .cr-thanks-txt strong { color:#ffe87c; }

      /* ── versão ── */
      .cr-version { font-size:.72rem;color:rgba(184,170,216,.4);text-align:center; }

      /* ── botão fechar ── */
      .cr-btn {
        display:inline-block;padding:.82rem 2.2rem;border-radius:50px;
        font-family:'Nunito',sans-serif;font-size:1rem;font-weight:800;
        cursor:pointer;border:none;
        background:linear-gradient(135deg,#FFD700,#ff9f43);
        color:#2d1b00;box-shadow:0 4px 20px rgba(255,215,0,.3);
        transition:transform .15s,box-shadow .15s;
        animation:fadeUp2 .9s ease both;
      }
      .cr-btn:hover { transform:scale(1.05);box-shadow:0 6px 28px rgba(255,215,0,.45); }
      .cr-btn:active{ transform:scale(.97); }

      @media(max-width:480px){
        .cr-grid { grid-template-columns:1fr; }
        .cr-title { font-size:1.7rem; }
        .cr-card  { padding:1.3rem 1.1rem; }
        .cr-sul   { top:12px;right:12px; }
        .cr-sul svg { width:58px;height:58px; }
      }
    </style>

    <!-- Cruzeiro do Sul -->
    <!-- Logo Cruzeiro do Sul -->
<img 
  class="cr-sul"
  src="logosul.png"
  alt="Cruzeiro do Sul"
  style="
    width:180px;
    height:auto;
    position:fixed;
    top:18px;
    right:22px;
    z-index:1001;
    filter:drop-shadow(0 0 12px rgba(255,215,0,.35));
  "
>

    <div class="cr-page" id="crPage">

      <!-- Cabeçalho -->
      <div class="cr-header">
        <div class="cr-tag">🌟 Créditos</div>
        <div class="cr-title">Jornada das Estrelas</div>
        <div class="cr-sub">Feito com carinho para crianças explorarem o mundo ✨</div>
      </div>

      <!-- Equipe -->
      <div class="cr-card">
        <div class="cr-label">Equipe</div>
        <div class="cr-grid">
          <div class="cr-row"><div class="cr-av av-pp">🎮</div><div><div class="cr-name">José Rodrigo</div><div class="cr-role">Desenvolvedor</div></div></div>
          <div class="cr-row"><div class="cr-av av-tt">🎮</div><div><div class="cr-name">Tiago Vianna</div><div class="cr-role">Desenvolvedor</div></div></div>
          <div class="cr-row"><div class="cr-av av-gg">🎮</div><div><div class="cr-name">Guilherme Cillo</div><div class="cr-role">Desenvolvedor</div></div></div>
          <div class="cr-row"><div class="cr-av av-cc">🎮</div><div><div class="cr-name">Mateus Caetano</div><div class="cr-role">Desenvolvedor</div></div></div>
          <div class="cr-row"><div class="cr-av av-bb">🎮</div><div><div class="cr-name">Henrico Trevizani</div><div class="cr-role">Desenvolvedor</div></div></div>
          <div class="cr-row"><div class="cr-av av-pp">🎮</div><div><div class="cr-name">Vinicius Cremonezi</div><div class="cr-role">Desenvolvedor</div></div></div>
          <div class="cr-row"><div class="cr-av av-tt">🎮</div><div><div class="cr-name">Pedro Araujo</div><div class="cr-role">Desenvolvedor</div></div></div>
          <div class="cr-row"><div class="cr-av av-gg">🎮</div><div><div class="cr-name">Arthur Ferreira</div><div class="cr-role">Desenvolvedor</div></div></div>
          <div class="cr-row"><div class="cr-av av-cc">🎮</div><div><div class="cr-name">Sara Leoni</div><div class="cr-role">Desenvolvedora</div></div></div>
        </div>
      </div>

      <!-- Professor -->
      <div class="cr-card gold-card">
        <div class="cr-label gold">Professor Orientador</div>
        <div class="cr-row single">
          <div class="cr-av av-gg" style="width:44px;height:44px;font-size:1.4rem;">👨‍🏫</div>
          <div><div class="cr-name">Prof. João Roberto</div><div class="cr-role">Orientação &amp; Supervisão</div></div>
        </div>
      </div>

      <!-- Agradecimentos -->
      <div class="cr-thanks">
        <div class="cr-thanks-emoji">💙</div>
        <p class="cr-thanks-txt">
          Este projeto foi desenvolvido com carinho para proporcionar
          aprendizado, inclusão e diversão para todas as crianças.<br>
          Obrigado a todos que fizeram parte desta jornada especial. 💙
        </p>
      </div>

      <!-- Versão -->
      <div class="cr-version">Projeto Itinerário · 2026</div>

      <!-- Botão fechar -->
      <button class="cr-btn" onclick="document.getElementById('creditosOverlay').remove()">⬅ Voltar ao Jogo</button>

    </div>
  `;

  document.body.appendChild(overlay);

  // Gera estrelinhas de fundo dentro do overlay
  const page = overlay.querySelector('#crPage');
  for (let i = 0; i < 30; i++) {
    const d = document.createElement('div');
    d.className = 'cr-star-dot';
    const s = Math.random() * 2.2 + 0.5;
    d.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;top:${Math.random()*100}%;z-index:0;--dur2:${(Math.random()*2+1.4).toFixed(1)}s;opacity:${(Math.random()*0.5+0.15).toFixed(2)}`;
    overlay.appendChild(d);
  }

  // Fecha clicando no fundo escuro
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ============================================================
// INICIAR
// ============================================================
buildStars();
renderDots();
renderPhase(0);