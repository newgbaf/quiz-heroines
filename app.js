// ------------------------
// Utilitaires
// ------------------------
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Départage d’égalité (logique, non “au pif”) :
// 1) si une lettre est ex-aequo max,
//    on regarde la dernière réponse parmi celles ex-aequo en remontant l’historique.
// 2) si toujours égal (cas rare), on prend celle qui arrive en premier (ordre A,B,C,D).
function tieBreakByRecency(winners, answersHistory) {
  for (let i = answersHistory.length - 1; i >= 0; i--) {
    const a = answersHistory[i];
    if (winners.includes(a)) return a;
  }
  const order = ["A", "B", "C", "D"];
  return winners.sort((x, y) => order.indexOf(x) - order.indexOf(y))[0];
}

function computeMajorityLetter(counts, answersHistory) {
  const entries = Object.entries(counts); // [["A",2],...]
  const max = Math.max(...entries.map(([, v]) => v));
  const winners = entries.filter(([, v]) => v === max).map(([k]) => k);
  if (winners.length === 1) return winners[0];
  return tieBreakByRecency(winners, answersHistory);
}

// ------------------------
// App
// ------------------------
const elApp = document.getElementById("app");
const elBack = document.getElementById("backBtn");
const elRestart = document.getElementById("restartBtn");
const elProgressText = document.getElementById("progressText");
const elProgressPct = document.getElementById("progressPct");
const elProgressFill = document.getElementById("progressFill");

// Options (tu peux les rendre configurables)
const OPTIONS = {
  shuffleQuestions: true,     // mélange des questions
  shuffleChoices: false       // optionnel : mélange des choix (garder A/B/C/D stable est souvent mieux)
};

let DATA = null;      // data.json
let QUESTIONS = [];   // questions.json

let currentIndex = 0;
let order = [];       // tableau des questions (éventuellement mélangé)
let answers = [];     // historique des lettres, dans l’ordre des questions affichées
let counts = { A: 0, B: 0, C: 0, D: 0 };

function resetState() {
  currentIndex = 0;
  answers = [];
  counts = { A: 0, B: 0, C: 0, D: 0 };

  order = OPTIONS.shuffleQuestions ? shuffleArray(QUESTIONS) : [...QUESTIONS];

  render();
}

function setProgress() {
  const total = order.length;
  const done = Math.min(currentIndex, total);
  const pct = Math.round((done / total) * 100);

  elProgressText.textContent = `Question ${Math.min(currentIndex + 1, total)} / ${total}`;
  elProgressPct.textContent = `${pct}%`;
  elProgressFill.style.width = `${pct}%`;
}

function render() {
  elRestart.disabled = false;
  elBack.disabled = currentIndex === 0;

  // fin -> résultat
  if (currentIndex >= order.length) {
    renderResult();
    return;
  }

  setProgress();

  const q = order[currentIndex];
  const choicesObj = q.choix;

  // On garde l’ordre A,B,C,D sauf si option de mélange des choix
  let labels = ["A", "B", "C", "D"];
  if (OPTIONS.shuffleChoices) labels = shuffleArray(labels);

  elApp.innerHTML = `
    <div>
      <div class="badge d-none">ID: ${q.id}</div>
      <h2>${q.texte}</h2>
      <div class="choices">
        ${labels.map(label => `
          <button class="choice" data-label="${label}">
            <strong>${label}</strong> ${choicesObj[label]}
          </button>
        `).join("")}
      </div>
    </div>
  `;

  elApp.querySelectorAll("button.choice").forEach(btn => {
    btn.addEventListener("click", () => {
      const label = btn.dataset.label;

      // enregistre
      answers.push(label);
      counts[label]++;

      currentIndex++;
      render();
    });
  });
}

function renderResult() {
  // Progress à 100%
  elProgressText.textContent = `Terminé • ${order.length} / ${order.length}`;
  elProgressPct.textContent = `100%`;
  elProgressFill.style.width = `100%`;

  const major = computeMajorityLetter(counts, answers);
  const fam = DATA.families[major];

  if (!fam) {
    elApp.innerHTML = `<p>Erreur: famille "${major}" introuvable dans data.json</p>`;
    return;
  }

  const perso = pickRandom(fam.personnages);

  elApp.innerHTML = `
    <div class="result">
      <h2 style="margin: 14px 0 6px;">Tu es ${perso.nom}</h2>
      <h3>${fam.qualite}</h3>
      <p>${fam.texte}</p>
      <p class="txt-gv">N'oublie pas, tu peux te reconnaître dans plusieurs héroïnes et c'est ça qui te rend unique!</p>      
      <img src="${perso.photo}" alt="${perso.nom}"/>

    </div>
  `;

  elBack.disabled = false; // on peut revenir consulter/modifier
}

function goBack() {
  if (currentIndex === 0) return;

  // on revient d’une question
  currentIndex--;

  // on retire la dernière réponse, et on décrémente le compteur
  const removed = answers.pop();
  if (removed) counts[removed]--;

  render();
}

// ------------------------
// Chargement des JSON
// ------------------------
async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Impossible de charger ${path} (HTTP ${res.status})`);
  return res.json();
}

async function init() {
  elApp.innerHTML = `<p class="meta">Chargement…</p>`;

  const [data, qdata] = await Promise.all([
    loadJson("./data.json"),
    loadJson("./questions.json")
  ]);

  DATA = data;
  QUESTIONS = qdata.questions;

  // mini validation
  if (!DATA?.families) throw new Error("data.json invalide : families manquant");
  if (!Array.isArray(QUESTIONS) || QUESTIONS.length !== 9) {
    throw new Error("questions.json invalide : il faut un tableau questions de longueur 9");
  }

  resetState();
}

// Boutons
elBack.addEventListener("click", goBack);
elRestart.addEventListener("click", resetState);

init().catch(err => {
  elApp.innerHTML = `<p>Erreur : ${err.message}</p>
  <p class="meta">Astuce : ouvre le projet via un petit serveur (Live Server / http.server), pas en double-clic.</p>`;
});
